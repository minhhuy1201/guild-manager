import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FormationWeek,
  MatchFormation,
  MatchInput,
  SessionFormation,
} from '@guild/shared/schemas';

import { Clock } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  weekEndOf,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';

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
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Liệt kê các tuần còn dữ liệu đội hình, mới nhất trước.
   * Dọn dữ liệu quá hạn trước khi đọc — màn hình xếp team luôn gọi endpoint này
   * nên không cần cron riêng.
   * @returns Mảng tuần, mới nhất trước, tuần đang mở mang cờ isActive
   */
  async getWeeks(): Promise<FormationWeek[]> {
    await this.purgeExpiredFormations(this.clock.now());

    const activeWeekStart = this.battleSessions.getActiveWeekStart();

    // Sinh trước, đọc sau: tuần đang mở phải có trận thì mới xuất hiện ở đây.
    await this.battleSessions.ensureWeekMaterialized(activeWeekStart);

    const weekStarts = await this.battleSessions.listWeekAnchors();

    return weekStarts.map(
      (weekStart) =>
        ({
          weekStart,
          weekEnd: weekEndOf(new Date(weekStart)).toISOString(),
          isActive: weekStart === activeWeekStart,
        }) satisfies FormationWeek,
    );
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
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @returns Mảng ngày đánh sắp theo thời gian, mỗi ngày kèm đội hình từng trận và cờ locked
   */
  async getFormations(weekStart?: string): Promise<SessionFormation[]> {
    const now = this.clock.now();
    const targetWeekStart =
      weekStart ?? this.battleSessions.getActiveWeekStart();

    await this.battleSessions.ensureWeekMaterialized(targetWeekStart);

    const sessions =
      await this.battleSessions.readWeekSessions(targetWeekStart);
    if (sessions.length === 0) return [];

    const matchesBySession = await this.loadMatchesBySession(
      sessions.map((session) => session.id),
    );

    return sessions.map(
      (session) =>
        ({
          sessionId: session.id,
          label: session.label,
          opponent: session.opponent,
          dateTime: session.dateTime.toISOString(),
          isGuildWar: session.isGuildWar,
          locked: session.dateTime.getTime() < now.getTime(),
          matches: matchesBySession.get(session.id) ?? [],
        }) satisfies SessionFormation,
    );
  }

  /**
   * Đọc đội hình đã lưu của nhiều ngày đánh, gom theo sessionId.
   * @param sessionIds - Id các ngày đánh cần đọc
   * @returns Map từ sessionId sang mảng đội hình theo thứ tự trận 1 → trận 2
   */
  private async loadMatchesBySession(
    sessionIds: string[],
  ): Promise<Map<string, MatchFormation[]>> {
    const matches = await this.prisma.formationMatch.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { matchIndex: 'asc' },
      include: { slots: true },
    });

    const grouped = new Map<string, MatchFormation[]>();

    for (const match of matches) {
      const formation: MatchFormation = {
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
      };

      grouped.set(match.sessionId, [
        ...(grouped.get(match.sessionId) ?? []),
        formation,
      ]);
    }

    return grouped;
  }

  /**
   * Ghi đè đội hình CẢ NGÀY. Idempotent — gửi cùng payload nhiều lần cho cùng
   * kết quả. Xoá rồi tạo lại thay vì so từng ô: nhiều nhất ~120 hàng, và nhờ vậy
   * "bỏ trận 2" chỉ là gửi mảng một phần tử, không cần endpoint riêng.
   * @param sessionId - ID ngày đánh cần lưu đội hình
   * @param matches - Đội hình và ghi chú từng trận, theo thứ tự trận 1 → trận 2
   * @returns Ngày đánh kèm đội hình vừa ghi
   * @throws NotFoundException khi không có ngày đánh nào mang sessionId đó
   * @throws ConflictException khi ngày đánh đã qua giờ đánh
   */
  async saveFormation(
    sessionId: string,
    matches: MatchInput[],
  ): Promise<SessionFormation> {
    const now = this.clock.now();
    const session = await this.battleSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (new Date(session.dateTime).getTime() < now.getTime()) {
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
      label: session.label,
      opponent: session.opponent,
      dateTime: session.dateTime,
      isGuildWar: session.isGuildWar,
      locked: false,
      matches: cleaned,
    } satisfies SessionFormation;
  }

  /**
   * Lấy id của mọi nhân vật còn trong bang.
   * Bảng Character do module characters sở hữu — đọc qua service của nó, không tự truy vấn.
   * @returns Tập id nhân vật
   */
  private async loadCharacterIds(): Promise<Set<string>> {
    const characters = await this.characters.list();

    return new Set(characters.map((character) => character.id));
  }
}
