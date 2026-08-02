import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import type { SessionFormationEntity } from './entities/formation.entity';

@Injectable()
export class TeamBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
  ) {}

  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * Tuần đang mở thì gọi qua AttendanceService để chắc chắn các trận đã có trong
   * database; tuần cũ chỉ đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận sắp theo thời gian đánh, mỗi trận kèm assignment và cờ locked
   */
  async getFormations(
    weekStart?: string,
    now: Date = new Date(),
  ): Promise<SessionFormationEntity[]> {
    const activeWeekStart = this.attendance.getCurrentWeek(now).fromDate;
    const targetWeekStart = weekStart ?? activeWeekStart;

    // Tuần đang mở có thể chưa được sinh trận — để attendance lo việc đó.
    if (targetWeekStart === activeWeekStart) {
      await this.attendance.getSessions(now);
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
      formations.map((formation) => [formation.sessionId, formation.assignment]),
    );

    const knownIds = await this.loadCharacterIds();

    return sessions.map((session) => ({
      sessionId: session.id,
      label: session.label,
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
