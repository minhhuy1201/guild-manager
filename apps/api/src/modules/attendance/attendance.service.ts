import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus } from '@guild/shared/enums';
import { canManageGuild, canViewAllAttendance } from '@guild/shared/lib';
import {
  attendanceSummarySchema,
  type AttendanceRecord,
  type AttendanceSummary,
  type Character,
  type MarkAttendanceInput,
} from '@guild/shared/schemas';

import { Clock, type JwtPayload } from '../../common';
import { verifyResponse } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  isSameWeek,
  weekStartOf,
} from '../battle-sessions/battle-sessions.public';
import {
  CharactersService,
  toCharacter,
} from '../characters/characters.public';
import { toAttendanceRecord } from './attendance.codec';

/** Thông báo khi người không phải quản trị viên điểm danh cho nhân vật khác. */
const NOT_YOUR_CHARACTER = 'Bạn chỉ điểm danh được cho nhân vật của mình.';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Danh sách nhân vật cho màn điểm danh, lọc theo vai của người gọi.
   * Lọc ở đây chứ không ở giao diện: chỉ ẩn trên web thì mở DevTools là đọc được cả bảng.
   * @param actor - Payload JWT của người gọi
   * @returns Cả bang với cán bộ/quản trị; đúng nhân vật của mình với bang chúng
   */
  async getCharacters(actor: JwtPayload): Promise<Character[]> {
    if (canViewAllAttendance(actor.role)) return this.characters.list();

    const own = await this.ownCharacterId(actor);
    if (!own) return [];

    const row = await this.characters.findById(own);

    return row ? [toCharacter(row)] : [];
  }

  /**
   * Lượt điểm danh của tuần đang mở, lọc theo vai của người gọi.
   * @param actor - Payload JWT của người gọi
   * @returns Cả bang với cán bộ/quản trị; chỉ hàng của mình với bang chúng
   */
  async getRecords(actor: JwtPayload): Promise<AttendanceRecord[]> {
    const seesEveryone = canViewAllAttendance(actor.role);
    const own = seesEveryone ? null : await this.ownCharacterId(actor);

    if (!seesEveryone && !own) return [];

    const sessions = await this.battleSessions.listByWeek();
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        sessionId: { in: sessions.map((session) => session.id) },
        ...(own === null ? {} : { characterId: own }),
      },
      orderBy: { markedAt: 'desc' },
    });

    return records.map(toAttendanceRecord);
  }

  /**
   * Số lượt Có/Không của từng trận trong tuần đang mở.
   * @returns Mảng số đếm theo trận, không kèm danh tính ai
   */
  async getSummary(): Promise<AttendanceSummary[]> {
    const sessions = await this.battleSessions.listByWeek();
    const grouped = await this.prisma.attendanceRecord.groupBy({
      by: ['sessionId', 'status'],
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      _count: { _all: true },
    });

    return sessions.map((session) => {
      const rows = grouped.filter((row) => row.sessionId === session.id);
      /**
       * Số lượt của một trạng thái trong trận đang xét.
       * @param status - Trạng thái cần đếm
       * @returns Số lượt, 0 khi chưa ai chọn trạng thái đó
       */
      const countOf = (status: AttendanceStatus): number =>
        rows.find((row) => (row.status as AttendanceStatus) === status)?._count
          ._all ?? 0;

      return verifyResponse(attendanceSummarySchema, {
        sessionId: session.id,
        coCount: countOf(AttendanceStatus.PRESENT),
        khongCount: countOf(AttendanceStatus.ABSENT),
      } satisfies AttendanceSummary);
    });
  }

  /**
   * Ghi nhận điểm danh cho một nhân vật ở một trận.
   * Bang chúng và cán bộ chỉ điểm danh được cho nhân vật của chính mình, và chỉ khi còn hạn.
   * Quản trị viên điểm danh hộ được và không bị chặn bởi deadline (dùng để sửa sai sót sau trận).
   * @param input - characterId, sessionId và status
   * @param actor - Payload JWT của người gọi
   * @returns Record vừa ghi
   * @throws NotFoundException khi không có nhân vật hoặc trận đó trong tuần đang mở
   * @throws ForbiddenException khi điểm danh hộ nhân vật khác mà không phải quản trị viên
   * @throws ConflictException khi người thường điểm danh trận đã quá hạn
   */
  async mark(
    input: MarkAttendanceInput,
    actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    const now = this.clock.now();
    const { characterId, sessionId, status } = input;
    const isAdmin = canManageGuild(actor.role);

    if (!(await this.characters.exists(characterId))) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }

    const own = await this.ownCharacterId(actor);
    if (!isAdmin && characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_CHARACTER);
    }

    const session = await this.battleSessions.findById(sessionId);
    // Người thường chỉ điểm danh được cho tuần đang mở; quản trị viên sửa được
    // cả tuần khác để bù sai sót.
    //
    // `findById` trả entity nên `weekStart` là ISO string; bọc lại qua
    // `weekStartOf` để phép so đi qua đúng một đường như mọi chỗ khác.
    const inActiveWeek =
      session !== null &&
      isSameWeek(
        weekStartOf(new Date(session.weekStart)),
        this.battleSessions.getActiveWeek(),
      );
    if (!session || (!isAdmin && !inActiveWeek)) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    // Dùng lại cờ mà `findById` vừa dựng thay vì tính lại: luật quá hạn chỉ được
    // đánh giá ở một chỗ, nên cờ client nhận được và cờ chặn ghi không thể lệch.
    if (!isAdmin && session.isDeadlinePassed) {
      throw new ConflictException('Đã quá hạn điểm danh ngày này.');
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { characterId_sessionId: { characterId, sessionId } },
      create: {
        characterId,
        sessionId,
        status,
        markedAt: now,
        markedByCharacterId: own,
      },
      update: { status, markedAt: now, markedByCharacterId: own },
    });

    return toAttendanceRecord(record);
  }

  /**
   * Nhân vật gắn với người đang gọi.
   * @param actor - Payload JWT của người gọi
   * @returns Id nhân vật, hoặc null khi tài khoản không gắn nhân vật nào (quản trị viên cứu hộ)
   */
  private async ownCharacterId(actor: JwtPayload): Promise<string | null> {
    const member = await this.characters.findByDiscordId(actor.sub);

    return member?.id ?? null;
  }
}
