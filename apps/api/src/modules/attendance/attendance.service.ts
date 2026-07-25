import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AttendanceStatus, GuildClass } from '@guild/shared/enums';
import type { MarkAttendanceInput } from '@guild/shared/schemas';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { verifyPassword } from '@/shared/utils/password.util';
import {
  getActiveWeek,
  isDeadlinePassed,
  type ScheduledSession,
} from './attendance-schedule';
import type {
  AttendanceRecordEntity,
  BattleSessionEntity,
  CharacterEntity,
  WeekEntity,
} from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách nhân vật trong bang, sắp xếp theo tên.
   * @returns Mảng nhân vật, không kèm mật khẩu
   */
  async getCharacters(): Promise<CharacterEntity[]> {
    const characters = await this.prisma.character.findMany({
      select: { id: true, name: true, guildClass: true },
      orderBy: { name: 'asc' },
    });

    return characters.map((character) => ({
      ...character,
      // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
      // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
      guildClass: character.guildClass as GuildClass,
    }));
  }

  /**
   * Lấy khoảng thời gian của tuần điểm danh đang mở.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mốc đầu và cuối tuần dạng ISO string
   */
  getCurrentWeek(now: Date = new Date()): WeekEntity {
    const week = getActiveWeek(now);

    return {
      fromDate: week.weekStart.toISOString(),
      toDate: week.weekEnd.toISOString(),
    };
  }

  /**
   * Lấy các trận của tuần đang mở, tự tạo trong database nếu tuần đó chưa có.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận đã sắp theo thời gian đánh
   */
  async getSessions(now: Date = new Date()): Promise<BattleSessionEntity[]> {
    const sessions = await this.ensureWeekSessions(now);

    return sessions.map((session) => ({
      id: session.id,
      label: session.label,
      dateTime: session.dateTime.toISOString(),
      deadline: session.deadline.toISOString(),
      isGuildWar: session.isGuildWar,
    }));
  }

  /**
   * Lấy toàn bộ lượt điểm danh của tuần đang mở.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng record của các trận trong tuần
   */
  async getRecords(now: Date = new Date()): Promise<AttendanceRecordEntity[]> {
    const sessions = await this.ensureWeekSessions(now);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      orderBy: { markedAt: 'desc' },
    });

    return records.map((record) => ({
      characterId: record.characterId,
      sessionId: record.sessionId,
      status: record.status as AttendanceStatus,
      markedAt: record.markedAt.toISOString(),
    }));
  }

  /**
   * Ghi nhận điểm danh cho một nhân vật ở một trận.
   * Còn hạn thì được đổi Có ⇄ Không thoải mái; quá hạn thì khóa.
   * @param input - characterId, sessionId, status và mật khẩu riêng của nhân vật
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Record vừa ghi
   * @throws NotFoundException khi không có nhân vật hoặc trận đó trong tuần đang mở
   * @throws UnauthorizedException khi sai mật khẩu
   * @throws ConflictException khi đã quá hạn điểm danh của trận
   */
  async mark(
    input: MarkAttendanceInput,
    now: Date = new Date(),
  ): Promise<AttendanceRecordEntity> {
    const { characterId, sessionId, status, password } = input;

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }

    const isPasswordValid = await verifyPassword(
      password.trim(),
      character.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Sai mật khẩu thành viên.');
    }

    const sessions = await this.ensureWeekSessions(now);
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (isDeadlinePassed(session.deadline, now)) {
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
    };
  }

  /**
   * Đảm bảo các trận của tuần đang mở đã có trong database rồi trả về.
   * Lịch đánh và deadline luôn tính lại từ `attendance-schedule` nên đổi luật là
   * bản ghi cũ được cập nhật theo, không cần migration dữ liệu.
   * @param now - Thời điểm hiện tại
   * @returns Bản ghi BattleSession của tuần đang mở, sắp theo thời gian đánh
   */
  private async ensureWeekSessions(now: Date) {
    const week = getActiveWeek(now);

    await Promise.all(
      week.sessions.map((session: ScheduledSession) =>
        this.prisma.battleSession.upsert({
          where: {
            weekStart_label: {
              weekStart: week.weekStart,
              label: session.label,
            },
          },
          create: {
            weekStart: week.weekStart,
            label: session.label,
            dateTime: session.dateTime,
            deadline: session.deadline,
            isGuildWar: session.isGuildWar,
          },
          update: {
            dateTime: session.dateTime,
            deadline: session.deadline,
            isGuildWar: session.isGuildWar,
          },
        }),
      ),
    );

    return this.prisma.battleSession.findMany({
      where: { weekStart: week.weekStart },
      orderBy: { dateTime: 'asc' },
    });
  }
}
