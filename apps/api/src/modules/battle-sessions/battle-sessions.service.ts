import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { defaultDeadline } from '@guild/shared/lib';
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from '@guild/shared/schemas';

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
  weekStartOf,
} from './session-schedule';

/** Hàng BattleSession đọc kèm số liệu phụ cho entity. */
type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  weekStart: Date;
  _count: { attendanceRecords: number; formationMatches: number };
};

/** Những gì cần đọc thêm cùng mỗi trận để dựng entity. */
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true, formationMatches: true } },
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
   * Tạo một trận scrim mới. Không tạo được Guild War — trận đó do hệ thống sinh.
   * @param input - Giờ đánh, hạn chót và tên bang đối thủ
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận vừa tạo
   * @throws BadRequestException khi trận không thuộc tuần được thiết lập hoặc hạn chót muộn hơn giờ đánh
   */
  async create(
    input: CreateBattleSessionInput,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity> {
    const dateTime = new Date(input.dateTime);
    const deadline = new Date(input.deadline);

    this.assertEditableWeek(weekStartOf(dateTime), now);
    this.assertDeadlineBeforeBattle(deadline, dateTime);

    const created = await this.prisma.battleSession.create({
      data: {
        dateTime,
        deadline,
        opponent: normalizeOpponent(input.opponent),
        isGuildWar: false,
        weekStart: weekStartOf(dateTime),
      },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(created);
  }

  /**
   * Sửa một trận. Dời giờ đánh sang tuần khác thì `weekStart` của trận và của
   * đội hình đi kèm được cập nhật trong cùng một transaction.
   * @param id - Id trận cần sửa
   * @param input - Các field cần đổi
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận sau khi sửa
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi tuần không được thiết lập, hạn chót muộn hơn giờ đánh, hoặc đặt đối thủ cho Guild War
   */
  async update(
    id: string,
    input: UpdateBattleSessionInput,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity> {
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    this.assertEditableWeek(current.weekStart, now);

    const opponent =
      input.opponent === undefined
        ? current.opponent
        : normalizeOpponent(input.opponent);
    if (current.isGuildWar && opponent !== null) {
      throw new BadRequestException('Trận Guild War không có đối thủ.');
    }

    const dateTime = input.dateTime
      ? new Date(input.dateTime)
      : current.dateTime;
    const deadline = input.deadline
      ? new Date(input.deadline)
      : current.deadline;
    const weekStart = weekStartOf(dateTime);

    this.assertEditableWeek(weekStart, now);
    this.assertDeadlineBeforeBattle(deadline, dateTime);

    const updated = await this.prisma.battleSession.update({
      where: { id },
      data: { dateTime, deadline, opponent, weekStart },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(updated);
  }

  /**
   * Xoá một trận scrim. Điểm danh và đội hình của trận bị xoá theo (cascade).
   * @param id - Id trận cần xoá
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Promise hoàn tất khi đã xoá
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi là Guild War hoặc thuộc tuần đã qua
   */
  async remove(id: string, now: Date = new Date()): Promise<void> {
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }
    if (current.isGuildWar) {
      throw new BadRequestException('Không thể xoá trận Guild War.');
    }

    this.assertEditableWeek(current.weekStart, now);

    await this.prisma.battleSession.delete({ where: { id } });
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
   * Chặn thao tác lên tuần ngoài phạm vi thiết lập.
   * @param weekStart - Mốc Thứ 2 của tuần cần xét
   * @param now - Thời điểm hiện tại
   * @returns Không trả về gì khi hợp lệ
   * @throws BadRequestException khi tuần đã qua hoặc quá xa ở tương lai
   */
  private assertEditableWeek(weekStart: Date, now: Date): void {
    if (!this.isEditableWeek(weekStart, now)) {
      throw new BadRequestException(
        'Chỉ thiết lập được lịch của tuần này và tuần sau.',
      );
    }
  }

  /**
   * Chặn hạn chót muộn hơn giờ đánh.
   * @param deadline - Hạn chót điểm danh
   * @param dateTime - Giờ đánh
   * @returns Không trả về gì khi hợp lệ
   * @throws BadRequestException khi hạn chót muộn hơn giờ đánh
   */
  private assertDeadlineBeforeBattle(deadline: Date, dateTime: Date): void {
    if (deadline.getTime() > dateTime.getTime()) {
      throw new BadRequestException('Hạn chót phải trước hoặc bằng giờ đánh.');
    }
  }

  /**
   * Đổi một hàng BattleSession thành entity trả về cho client.
   * @param row - Hàng đọc từ Prisma kèm `_count`
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
      hasFormation: row._count.formationMatches > 0,
    };
  }
}

/**
 * Chuẩn hoá tên bang đối thủ: bỏ trắng hai đầu, chuỗi rỗng coi như chưa có.
 * @param value - Giá trị người dùng gửi lên (undefined = không đổi)
 * @returns Tên bang đã chuẩn hoá hoặc null
 */
function normalizeOpponent(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
