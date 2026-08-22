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
  isSameWeek,
  isSessionLocked,
  parseWeekStart,
  weekEndOf,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { decodeMatch, encodeMatch } from './formation-grid';

/** Mã lỗi Prisma khi vi phạm khoá ngoại (ở đây là ô trỏ tới thành viên không còn tồn tại). */
const FOREIGN_KEY_VIOLATION = 'P2003';

/** Số ngày giữ lại đội hình cũ. Quá mốc này thì dọn. */
const RETENTION_DAYS = 56;

/** Số mili giây trong một ngày. */
const DAY_MS = 24 * 60 * 60 * 1000;

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
   * Chỉ đọc — việc dọn dữ liệu quá hạn là `purgeExpiredFormations`, do caller gọi.
   * @returns Mảng tuần, mới nhất trước, tuần đang mở mang cờ isActive
   */
  async getWeeks(): Promise<FormationWeek[]> {
    const activeWeek = this.battleSessions.getActiveWeek();

    // Sinh trước, đọc sau: tuần đang mở phải có trận thì mới xuất hiện ở đây.
    await this.battleSessions.ensureWeekMaterialized(activeWeek);

    const anchors = await this.battleSessions.listWeekAnchors();

    return anchors.map(
      (anchor) =>
        ({
          weekStart: anchor.toISOString(),
          weekEnd: weekEndOf(anchor).toISOString(),
          isActive: isSameWeek(anchor, activeWeek),
        }) satisfies FormationWeek,
    );
  }

  /**
   * Xoá các đội hình cũ hơn RETENTION_DAYS.
   * Chỉ xoá đội hình — BattleSession và điểm danh là dữ liệu của module khác.
   * @param now - Thời điểm hiện tại
   * @returns Số bản ghi đã xoá
   */
  async purgeExpiredFormations(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    const { count } = await this.prisma.formationMatch.deleteMany({
      where: { session: { weekStart: { lt: cutoff } } },
    });

    return count;
  }

  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * @param weekStart - Mốc ISO của tuần cần xem. Bỏ trống = tuần đang mở; mốc giữa tuần được quy về Thứ 2 của tuần đó
   * @returns Mảng ngày đánh sắp theo thời gian, mỗi ngày kèm đội hình từng trận và cờ locked
   * @throws BadRequestException khi `weekStart` không phải một mốc thời gian hợp lệ
   */
  async getFormations(weekStart?: string): Promise<SessionFormation[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.battleSessions.ensureWeekMaterialized(target);

    const sessions = await this.battleSessions.readWeekSessions(target);
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
          locked: isSessionLocked(session.dateTime, now),
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
      grouped.set(match.sessionId, [
        ...(grouped.get(match.sessionId) ?? []),
        decodeMatch(match.slots),
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
   * @throws ConflictException khi ngày đánh đã qua giờ đánh, hoặc khi một thành viên bị xoá đúng
   *   lúc đang ghi nên khoá ngoại vỡ
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

    const dateTime = new Date(session.dateTime);
    if (isSessionLocked(dateTime, now)) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }

    const savedMatches = await this.prisma
      .$transaction(async (tx) => {
        // Lọc TRƯỚC khi ghi: một nhân vật vừa bị xoá khỏi bang mà còn trong nháp sẽ
        // làm cả câu insert vỡ vì khoá ngoại. Ghi chú của ô đó thì giữ nguyên —
        // ghi chú mô tả vị trí, không mô tả người.
        // Đọc bằng `tx` chứ không phải client ngoài: thu hẹp khoảng hở giữa phép lọc và câu insert
        // xuống còn trong một transaction. READ COMMITTED nên đây không phải bảo đảm tuyệt đối —
        // một DELETE commit đúng vào giữa vẫn làm vỡ khoá ngoại — nhưng đọc ngoài transaction thì
        // khoảng hở đó rộng bằng cả request.
        const knownIds = await this.characters.listIds(tx);
        const cleaned: MatchFormation[] = matches.map((match) => ({
          slots: Object.fromEntries(
            Object.entries(match.slots).filter(([, characterId]) =>
              knownIds.has(characterId),
            ),
          ),
          notes: match.notes,
        }));

        await tx.formationMatch.deleteMany({ where: { sessionId } });

        for (const [index, match] of cleaned.entries()) {
          await tx.formationMatch.create({
            data: {
              sessionId,
              matchIndex: index + 1,
              slots: { create: encodeMatch(match) },
            },
          });
        }

        return cleaned;
      })
      .catch((error: unknown) => {
        // Phép lọc ở trên thu hẹp khoảng hở nhưng không đóng được: READ COMMITTED không khoá hàng
        // đã đọc, nên một DELETE commit sau `listIds` vẫn làm câu insert vỡ khoá ngoại. Đổi nó thành
        // câu tiếng Việt người dùng đọc được, thay vì 500 — thao tác đúng là tải lại rồi lưu lại.
        if (isForeignKeyViolation(error)) {
          throw new ConflictException(
            'Có thành viên vừa bị xoá khỏi bang, vui lòng tải lại trang rồi lưu lại.',
          );
        }

        throw error;
      });

    return {
      sessionId: session.id,
      label: session.label,
      opponent: session.opponent,
      dateTime: session.dateTime,
      isGuildWar: session.isGuildWar,
      locked: isSessionLocked(dateTime, now),
      matches: savedMatches,
    } satisfies SessionFormation;
  }
}

/**
 * Lỗi này có phải vi phạm khoá ngoại của Prisma không.
 * @param error - Lỗi bắt được
 * @returns true nếu là P2003
 */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === FOREIGN_KEY_VIOLATION
  );
}
