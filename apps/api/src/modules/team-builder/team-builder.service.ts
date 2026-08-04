import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AssignmentInput } from '@guild/shared/schemas';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  formatSessionLabel,
} from '@/modules/battle-sessions/battle-sessions.module';
import type {
  FormationWeekEntity,
  SessionFormationEntity,
} from './entities/formation.entity';

/** Số ngày giữ lại đội hình cũ. Quá mốc này thì dọn. */
const RETENTION_DAYS = 28;

/** Số mili giây trong một ngày. */
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TeamBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
  ) {}

  /**
   * Liệt kê các tuần còn dữ liệu đội hình, mới nhất trước.
   * Dọn dữ liệu quá hạn trước khi đọc — màn hình xếp team luôn gọi endpoint này
   * nên không cần cron riêng.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng tuần, mới nhất trước
   */
  async getWeeks(now: Date = new Date()): Promise<FormationWeekEntity[]> {
    await this.purgeExpiredFormations(now);
    await this.battleSessions.listByWeek(undefined, now);

    const sessions = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return sessions.map((session) => ({
      weekStart: session.weekStart.toISOString(),
    }));
  }

  /**
   * Xoá các đội hình cũ hơn RETENTION_DAYS.
   * Chỉ xoá bảng Formation — BattleSession và điểm danh là dữ liệu của module khác.
   * @param now - Thời điểm hiện tại
   * @returns Promise hoàn tất khi đã dọn
   */
  private async purgeExpiredFormations(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    await this.prisma.formation.deleteMany({
      where: { weekStart: { lt: cutoff } },
    });
  }

  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * Tuần đang mở thì gọi qua BattleSessionsService để chắc chắn các trận đã có
   * trong database; tuần cũ chỉ đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận sắp theo thời gian đánh, mỗi trận kèm assignment và cờ locked
   */
  async getFormations(
    weekStart?: string,
    now: Date = new Date(),
  ): Promise<SessionFormationEntity[]> {
    const activeWeekStart = this.battleSessions.getActiveWeekStart(now);
    const targetWeekStart = weekStart ?? activeWeekStart;

    // Tuần đang mở có thể chưa được sinh trận — để module lịch đánh lo việc đó.
    if (targetWeekStart === activeWeekStart) {
      await this.battleSessions.listByWeek(undefined, now);
    }

    const sessions = await this.prisma.battleSession.findMany({
      where: { weekStart: new Date(targetWeekStart) },
      orderBy: { dateTime: 'asc' },
    });
    if (sessions.length === 0) return [];

    const formations = await this.prisma.formation.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
    });
    const assignmentBySession = new Map(
      formations.map((formation) => [
        formation.sessionId,
        formation.assignment,
      ]),
    );

    const knownIds = await this.loadCharacterIds();

    return sessions.map((session) => ({
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: session.dateTime.getTime() < now.getTime(),
      assignment: this.pruneMissingCharacters(
        assignmentBySession.get(session.id),
        knownIds,
      ),
    }));
  }

  /**
   * Ghi đè đội hình của một trận. Idempotent — gửi cùng payload nhiều lần cho
   * cùng kết quả.
   * @param sessionId - ID trận cần lưu đội hình
   * @param assignment - slotId → characterId, ô trống thì không có khoá
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận kèm đội hình vừa ghi
   * @throws NotFoundException khi không có trận nào mang sessionId đó
   * @throws ConflictException khi trận đã qua giờ đánh
   */
  async saveFormation(
    sessionId: string,
    assignment: AssignmentInput,
    now: Date = new Date(),
  ): Promise<SessionFormationEntity> {
    const session = await this.prisma.battleSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (session.dateTime.getTime() < now.getTime()) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }

    await this.prisma.formation.upsert({
      where: { sessionId },
      create: { sessionId, weekStart: session.weekStart, assignment },
      update: { assignment },
    });

    const knownIds = await this.loadCharacterIds();

    return {
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: false,
      assignment: this.pruneMissingCharacters(assignment, knownIds),
    };
  }

  /**
   * Lấy id của mọi nhân vật còn trong bang.
   * @returns Tập id nhân vật
   */
  private async loadCharacterIds(): Promise<Set<string>> {
    const characters = await this.prisma.character.findMany({
      select: { id: true },
    });

    return new Set(characters.map((character) => character.id));
  }

  /**
   * Loại các ô trỏ tới nhân vật đã rời bang.
   * JSON không có khoá ngoại nên đây là chỗ bù lại — UI không bao giờ thấy ô ma.
   * @param raw - Giá trị assignment đọc từ cột Json (có thể null khi chưa xếp)
   * @param knownIds - Tập id nhân vật còn tồn tại
   * @returns Assignment đã lọc, rỗng nếu chưa xếp
   */
  private pruneMissingCharacters(
    raw: unknown,
    knownIds: Set<string>,
  ): Record<string, string> {
    if (typeof raw !== 'object' || raw === null) return {};

    const entries = Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && knownIds.has(entry[1]),
    );

    return Object.fromEntries(entries);
  }
}
