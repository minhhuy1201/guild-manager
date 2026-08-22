import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AttendanceStatus, GuildClass } from '@guild/shared/enums';
import type {
  AttendanceRecord,
  Character,
  MarkAttendanceInput,
} from '@guild/shared/schemas';

import { ADMIN_ROLE, Clock, type JwtPayload } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly clock: Clock,
  ) {}

  /**
   * Lấy danh sách nhân vật trong bang, sắp xếp theo tên.
   * @returns Mảng nhân vật
   */
  async getCharacters(): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      select: { id: true, name: true, guildClass: true },
      orderBy: { name: 'asc' },
    });

    return characters.map(
      (character) =>
        ({
          ...character,
          // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
          // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
          guildClass: character.guildClass as GuildClass,
        }) satisfies Character,
    );
  }

  /**
   * Lấy toàn bộ lượt điểm danh của tuần đang mở.
   * @returns Mảng record của các trận trong tuần
   */
  async getRecords(): Promise<AttendanceRecord[]> {
    const sessions = await this.battleSessions.listByWeek();
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      orderBy: { markedAt: 'desc' },
    });

    return records.map(
      (record) =>
        ({
          characterId: record.characterId,
          sessionId: record.sessionId,
          status: record.status as AttendanceStatus,
          markedAt: record.markedAt.toISOString(),
        }) satisfies AttendanceRecord,
    );
  }

  /**
   * Ghi nhận điểm danh cho một nhân vật ở một trận.
   * Người thường: điểm danh được cho mọi nhân vật khi trận còn hạn — còn hạn thì đổi
   * Có ⇄ Không thoải mái, quá hạn thì khóa.
   * Quản trị viên: không bị chặn bởi deadline (dùng để sửa sai sót sau trận).
   * @param input - characterId, sessionId và status
   * @param actor - Payload JWT của người gọi, null khi request không đăng nhập
   * @returns Record vừa ghi
   * @throws NotFoundException khi không có nhân vật hoặc trận đó trong tuần đang mở
   * @throws ConflictException khi người thường điểm danh trận đã quá hạn
   */
  async mark(
    input: MarkAttendanceInput,
    actor: JwtPayload | null = null,
  ): Promise<AttendanceRecord> {
    const now = this.clock.now();
    const { characterId, sessionId, status } = input;
    const isAdmin = actor?.role === ADMIN_ROLE;

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true },
    });
    if (!character) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }

    const session = await this.battleSessions.findById(sessionId);
    // Người thường chỉ điểm danh được cho tuần đang mở; quản trị viên sửa được
    // cả tuần khác để bù sai sót.
    const inActiveWeek =
      session?.weekStart === this.battleSessions.getActiveWeekStart();
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
      create: { characterId, sessionId, status, markedAt: now },
      update: { status, markedAt: now },
    });

    return {
      characterId: record.characterId,
      sessionId: record.sessionId,
      status: record.status as AttendanceStatus,
      markedAt: record.markedAt.toISOString(),
    } satisfies AttendanceRecord;
  }
}
