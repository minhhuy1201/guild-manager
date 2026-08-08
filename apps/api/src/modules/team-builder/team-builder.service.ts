import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MatchInput } from '@guild/shared/schemas';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  formatSessionLabel,
} from '@/modules/battle-sessions/battle-sessions.module';
import type {
  FormationWeekEntity,
  MatchFormation,
  SessionFormationEntity,
} from './entities/formation.entity';

/** Số ngày giữ lại đội hình cũ. Quá mốc này thì dọn. */
const RETENTION_DAYS = 56;

/** Số mili giây trong một ngày. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Một hàng FormationSlot sắp ghi xuống. */
interface SlotRow {
  slotId: string;
  characterId: string | null;
  note: string | null;
}

/**
 * Dựng các hàng FormationSlot của một trận.
 * Một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ, nên phải lấy hợp của hai tập
 * khoá — duyệt riêng slots sẽ đánh rơi ô chỉ có ghi chú.
 * @param match - Đội hình và ghi chú của một trận, characterId đã lọc sạch
 * @returns Mảng hàng để đưa vào nested create của Prisma
 */
function buildSlotRows(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([
    ...Object.keys(match.slots),
    ...Object.keys(match.notes),
  ]);

  return [...slotIds].map((slotId) => ({
    slotId,
    characterId: match.slots[slotId] ?? null,
    note: match.notes[slotId] ?? null,
  }));
}

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
   * @returns Mảng tuần, mới nhất trước, tuần đang mở mang cờ isActive
   */
  async getWeeks(now: Date = new Date()): Promise<FormationWeekEntity[]> {
    await this.purgeExpiredFormations(now);
    await this.battleSessions.listByWeek(undefined, now);

    const activeWeekStart = this.battleSessions.getActiveWeekStart(now);
    const sessions = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return sessions.map((session) => {
      const weekStart = session.weekStart.toISOString();

      return { weekStart, isActive: weekStart === activeWeekStart };
    });
  }

  /**
   * Xoá các đội hình cũ hơn RETENTION_DAYS.
   * Chỉ xoá đội hình — BattleSession và điểm danh là dữ liệu của module khác.
   * @param now - Thời điểm hiện tại
   * @returns Promise hoàn tất khi đã dọn
   */
  private async purgeExpiredFormations(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    await this.prisma.formationMatch.deleteMany({
      where: { session: { weekStart: { lt: cutoff } } },
    });
  }

  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * Tuần đang mở thì gọi qua BattleSessionsService để chắc chắn các trận đã có
   * trong database; tuần cũ chỉ đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng ngày đánh sắp theo thời gian, mỗi ngày kèm đội hình từng trận và cờ locked
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
      include: {
        formationMatches: {
          orderBy: { matchIndex: 'asc' },
          include: { slots: true },
        },
      },
    });
    if (sessions.length === 0) return [];

    return sessions.map((session) => ({
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: session.dateTime.getTime() < now.getTime(),
      matches: session.formationMatches.map((match) => ({
        slots: Object.fromEntries(
          match.slots
            .filter((slot) => slot.characterId !== null)
            .map((slot) => [slot.slotId, slot.characterId as string]),
        ),
        notes: Object.fromEntries(
          match.slots
            .filter((slot) => slot.note !== null)
            .map((slot) => [slot.slotId, slot.note as string]),
        ),
      })),
    }));
  }

  /**
   * Ghi đè đội hình CẢ NGÀY. Idempotent — gửi cùng payload nhiều lần cho cùng
   * kết quả. Xoá rồi tạo lại thay vì so từng ô: nhiều nhất ~120 hàng, và nhờ vậy
   * "bỏ trận 2" chỉ là gửi mảng một phần tử, không cần endpoint riêng.
   * @param sessionId - ID ngày đánh cần lưu đội hình
   * @param matches - Đội hình và ghi chú từng trận, theo thứ tự trận 1 → trận 2
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Ngày đánh kèm đội hình vừa ghi
   * @throws NotFoundException khi không có ngày đánh nào mang sessionId đó
   * @throws ConflictException khi ngày đánh đã qua giờ đánh
   */
  async saveFormation(
    sessionId: string,
    matches: MatchInput[],
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

    // Lọc TRƯỚC khi ghi: một nhân vật vừa bị xoá khỏi bang mà còn trong nháp sẽ
    // làm cả câu insert vỡ vì khoá ngoại. Ghi chú của ô đó thì giữ nguyên —
    // ghi chú mô tả vị trí, không mô tả người.
    const knownIds = await this.loadCharacterIds();
    const cleaned: MatchFormation[] = matches.map((match) => ({
      slots: Object.fromEntries(
        Object.entries(match.slots).filter(([, characterId]) =>
          knownIds.has(characterId),
        ),
      ),
      notes: match.notes,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.formationMatch.deleteMany({ where: { sessionId } });

      for (const [index, match] of cleaned.entries()) {
        await tx.formationMatch.create({
          data: {
            sessionId,
            matchIndex: index + 1,
            slots: { create: buildSlotRows(match) },
          },
        });
      }
    });

    return {
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: false,
      matches: cleaned,
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
}
