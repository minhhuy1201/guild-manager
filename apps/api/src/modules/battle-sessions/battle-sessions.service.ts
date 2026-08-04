import { Injectable } from '@nestjs/common';
import { defaultDeadline } from '@guild/shared/lib';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type {
  BattleSessionEntity,
  WeekEntity,
} from './entities/battle-session.entity';
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
} from './session-schedule';

/** Hàng BattleSession đọc kèm số liệu phụ cho entity. */
type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  weekStart: Date;
  _count: { attendanceRecords: number };
  formation: { id: string } | null;
};

/** Những gì cần đọc thêm cùng mỗi trận để dựng entity. */
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true } },
  formation: { select: { id: true } },
} as const;

/**
 * Sở hữu vòng đời của lịch đánh: tự sinh Guild War cho tuần đang mở và tuần kế,
 * đồng thời phục vụ CRUD scrim cho quản trị viên.
 * Module khác (điểm danh, xếp team) đọc lịch qua service này, không tự truy vấn bảng.
 */
@Injectable()
export class BattleSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mốc Thứ 2 của tuần điểm danh đang mở.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mốc Thứ 2 00:00 dạng ISO string
   */
  getActiveWeekStart(now: Date = new Date()): string {
    return getActiveWeek(now).weekStart.toISOString();
  }

  /**
   * Các tuần quản trị viên được phép thiết lập: tuần đang mở và tuần kế tiếp.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng 2 tuần, tuần đang mở đứng trước
   */
  getEditableWeeks(now: Date = new Date()): WeekEntity[] {
    return getEditableWeeks(now).map((week, index) => ({
      weekStart: week.weekStart.toISOString(),
      weekEnd: week.weekEnd.toISOString(),
      isActive: index === 0,
    }));
  }

  /**
   * Các trận của một tuần, sắp theo thời gian đánh.
   * Tuần đang mở và tuần kế được đảm bảo đã có trận Guild War; tuần đã qua chỉ
   * đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận đã sắp theo thời gian đánh
   */
  async listByWeek(
    weekStart?: string,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity[]> {
    const target = weekStart
      ? new Date(weekStart)
      : getActiveWeek(now).weekStart;

    if (this.isEditableWeek(target, now)) {
      await this.ensureGuildWar(target);
    }

    const rows = await this.prisma.battleSession.findMany({
      where: { weekStart: target },
      orderBy: { dateTime: 'asc' },
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => this.toEntity(row));
  }

  /**
   * Đọc một trận theo id.
   * @param id - Id trận cần đọc
   * @returns Trận tương ứng, null nếu không có
   */
  async findById(id: string): Promise<BattleSessionEntity | null> {
    const row = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });

    return row ? this.toEntity(row) : null;
  }

  /**
   * Đảm bảo tuần đã có trận Guild War. Idempotent nhờ id tất định.
   * @param weekStart - Mốc Thứ 2 00:00 của tuần
   * @returns Promise hoàn tất khi trận đã tồn tại
   */
  private async ensureGuildWar(weekStart: Date): Promise<void> {
    const dateTime = guildWarDateTime(weekStart);

    await this.prisma.battleSession.upsert({
      where: { id: guildWarSessionId(weekStart) },
      create: {
        id: guildWarSessionId(weekStart),
        weekStart,
        dateTime,
        deadline: defaultDeadline(dateTime),
        isGuildWar: true,
      },
      // Đã có thì không đụng vào — quản trị viên có thể đã dời giờ đánh.
      update: {},
    });
  }

  /**
   * Tuần này có thuộc phạm vi quản trị viên được thiết lập không.
   * @param weekStart - Mốc Thứ 2 00:00 của tuần cần xét
   * @param now - Thời điểm hiện tại
   * @returns true nếu là tuần đang mở hoặc tuần kế tiếp
   */
  private isEditableWeek(weekStart: Date, now: Date): boolean {
    return getEditableWeeks(now).some(
      (week) => week.weekStart.getTime() === weekStart.getTime(),
    );
  }

  /**
   * Đổi một hàng BattleSession thành entity trả về cho client.
   * @param row - Hàng đọc từ Prisma kèm `_count` và `formation`
   * @returns Entity đã dựng nhãn và đổi thời gian sang ISO string
   */
  private toEntity(row: SessionRow): BattleSessionEntity {
    return {
      id: row.id,
      label: formatSessionLabel(row.dateTime, row.isGuildWar),
      dateTime: row.dateTime.toISOString(),
      deadline: row.deadline.toISOString(),
      isGuildWar: row.isGuildWar,
      opponent: row.opponent,
      weekStart: row.weekStart.toISOString(),
      attendanceCount: row._count.attendanceRecords,
      hasFormation: row.formation !== null,
    };
  }
}

