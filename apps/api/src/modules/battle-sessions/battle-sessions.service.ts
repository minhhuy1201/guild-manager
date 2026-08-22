import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { guildWarDeadline, isWithinDeadlineCap } from '@guild/shared/lib';
import { DEADLINE_CAP_MESSAGE } from '@guild/shared/schemas';
import type {
  BattleSession,
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
  Week,
} from '@guild/shared/schemas';

import { Clock } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toBattleSession } from './battle-sessions.codec';
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
  parseWeekStart,
  weekStartOf,
  type WeekAnchor,
} from './session-schedule';

/** Những gì cần đọc thêm cùng mỗi trận để dựng entity. */
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true, formationMatches: true } },
} as const;

/**
 * Mệnh đề lọc + sắp xếp dùng chung cho mọi truy vấn "các trận của một tuần",
 * để thứ tự trả về không lệch nhau giữa các cách đọc.
 * @param weekStart - Mốc Thứ 2 của tuần cần đọc
 * @returns Phần `where` và `orderBy` cho `battleSession.findMany`
 */
const weekSessionQuery = (weekStart: Date) =>
  ({
    where: { weekStart },
    orderBy: { dateTime: 'asc' },
  }) as const;

/** Một trận trong tuần, nhãn đã dựng, không kèm số liệu điểm danh/đội hình. */
export interface ScheduledSession {
  id: string;
  label: string;
  dateTime: Date;
  isGuildWar: boolean;
  opponent: string | null;
}

/**
 * Sở hữu vòng đời của lịch đánh: tự sinh Guild War cho tuần đang mở và tuần kế,
 * đồng thời phục vụ CRUD scrim cho quản trị viên.
 * Module khác (điểm danh, xếp team) đọc lịch qua service này, không tự truy vấn bảng.
 */
@Injectable()
export class BattleSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /**
   * Mốc Thứ 2 của tuần điểm danh đang mở.
   * Trả về mốc có kiểu chứ không phải ISO string: so tuần là việc của
   * `isSameWeek`, không phải của phép so chuỗi ở call site.
   * @returns Mốc Thứ 2 00:00 giờ VN
   */
  getActiveWeek(): WeekAnchor {
    return getActiveWeek(this.clock.now()).weekStart;
  }

  /**
   * Các tuần quản trị viên được phép thiết lập: tuần đang mở và tuần kế tiếp.
   * @returns Mảng 2 tuần, tuần đang mở đứng trước
   */
  getEditableWeeks(): Week[] {
    return getEditableWeeks(this.clock.now()).map(
      (week, index) =>
        ({
          weekStart: week.weekStart.toISOString(),
          weekEnd: week.weekEnd.toISOString(),
          isActive: index === 0,
        }) satisfies Week,
    );
  }

  /**
   * Các trận của một tuần, sắp theo thời gian đánh.
   * Tuần đang mở và tuần kế được đảm bảo đã có trận Guild War; tuần đã qua chỉ
   * đọc những gì còn lưu.
   * @param weekStart - Mốc ISO của tuần cần xem. Bỏ trống = tuần đang mở; mốc giữa tuần được quy về Thứ 2 của tuần đó
   * @returns Mảng trận đã sắp theo thời gian đánh
   * @throws BadRequestException khi `weekStart` không phải một mốc thời gian hợp lệ
   */
  async listByWeek(weekStart?: string): Promise<BattleSession[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.materializeWeek(target, now);

    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(target),
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => toBattleSession(row, now));
  }

  /**
   * Đảm bảo tuần đã có đủ các trận hệ thống sinh (hiện là Guild War).
   * Tuần ngoài phạm vi thiết lập là no-op, nên caller gọi được vô điều kiện.
   * @param week - Mốc Thứ 2 của tuần cần dựng
   * @returns Promise hoàn tất khi tuần đã sẵn sàng để đọc
   */
  async ensureWeekMaterialized(week: WeekAnchor): Promise<void> {
    await this.materializeWeek(week, this.clock.now());
  }

  /**
   * Thân của `ensureWeekMaterialized`, tách ra để `listByWeek` dùng lại đúng mốc
   * thời gian nó đã đọc thay vì đọc đồng hồ lần thứ hai.
   * @param week - Mốc Thứ 2 00:00 của tuần cần dựng
   * @param now - Thời điểm hiện tại
   * @returns Promise hoàn tất khi tuần đã sẵn sàng để đọc
   */
  private async materializeWeek(week: Date, now: Date): Promise<void> {
    if (!this.isEditableWeek(week, now)) return;

    await this.ensureGuildWar(week);
  }

  /**
   * Các trận của một tuần, sắp theo thời gian đánh, nhãn đã dựng.
   * Không tự sinh trận — gọi `ensureWeekMaterialized` trước nếu cần.
   * @param week - Mốc Thứ 2 của tuần cần đọc
   * @returns Mảng trận đã sắp theo giờ đánh
   */
  async readWeekSessions(week: WeekAnchor): Promise<ScheduledSession[]> {
    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(week),
      select: {
        id: true,
        dateTime: true,
        isGuildWar: true,
        opponent: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      label: formatSessionLabel(row.dateTime, row.isGuildWar),
      dateTime: row.dateTime,
      isGuildWar: row.isGuildWar,
      opponent: row.opponent,
    }));
  }

  /**
   * Các tuần còn dữ liệu lịch, mới nhất trước.
   * Hàng trong database luôn là mốc Thứ 2 (mọi đường ghi đều đi qua `weekStartOf`),
   * nhưng vẫn dựng lại qua `weekStartOf` — đó là hàm dựng hợp lệ duy nhất, và nó
   * là phép đồng nhất trên một mốc đã đúng.
   * @returns Mảng mốc Thứ 2, mới nhất trước
   */
  async listWeekAnchors(): Promise<WeekAnchor[]> {
    const rows = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return rows.map((row) => weekStartOf(row.weekStart));
  }

  /**
   * Đọc một trận theo id.
   * @param id - Id trận cần đọc
   * @returns Trận tương ứng, null nếu không có
   */
  async findById(id: string): Promise<BattleSession | null> {
    const now = this.clock.now();
    const row = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });

    return row ? toBattleSession(row, now) : null;
  }

  /**
   * Tạo một trận scrim mới. Không tạo được Guild War — trận đó do hệ thống sinh.
   * @param input - Giờ đánh, hạn chót và tên bang đối thủ
   * @returns Trận vừa tạo
   * @throws BadRequestException khi trận không thuộc tuần được thiết lập hoặc hạn chót vượt trần 10:00 ngày đánh
   */
  async create(input: CreateBattleSessionInput): Promise<BattleSession> {
    const now = this.clock.now();
    const dateTime = new Date(input.dateTime);
    const deadline = new Date(input.deadline);

    this.assertEditableWeek(weekStartOf(dateTime), now);
    this.assertDeadlineWithinCap(deadline, dateTime);

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

    return toBattleSession(created, now);
  }

  /**
   * Sửa một trận. Dời giờ đánh sang tuần khác thì `weekStart` của trận và của
   * đội hình đi kèm được cập nhật trong cùng một transaction.
   *
   * Hạn chót của Guild War do hệ thống sở hữu: gửi lên là lỗi, và giá trị ghi
   * xuống luôn được tính lại từ tuần chứa trận.
   * @param id - Id trận cần sửa
   * @param input - Các field cần đổi
   * @returns Trận sau khi sửa
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi tuần không được thiết lập, hạn chót vượt trần, hoặc đặt đối thủ/hạn chót cho Guild War
   */
  async update(
    id: string,
    input: UpdateBattleSessionInput,
  ): Promise<BattleSession> {
    const now = this.clock.now();
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
    if (current.isGuildWar && input.deadline !== undefined) {
      throw new BadRequestException(
        'Hạn chót của trận Guild War cố định 17:00 Thứ 5, không sửa được.',
      );
    }

    const dateTime = input.dateTime
      ? new Date(input.dateTime)
      : current.dateTime;
    const weekStart = weekStartOf(dateTime);

    this.assertEditableWeek(weekStart, now);

    // Guild War: hệ thống tính lại theo tuần đang chứa trận, kể cả khi trận vừa
    // bị dời sang tuần khác. Scrim: trộn giá trị gửi lên với hàng hiện có.
    let deadline = guildWarDeadline(weekStart);

    if (!current.isGuildWar) {
      deadline = input.deadline ? new Date(input.deadline) : current.deadline;
      this.assertDeadlineWithinCap(deadline, dateTime);
    }

    const updated = await this.prisma.battleSession.update({
      where: { id },
      data: { dateTime, deadline, opponent, weekStart },
      include: SESSION_INCLUDE,
    });

    return toBattleSession(updated, now);
  }

  /**
   * Xoá một trận scrim. Điểm danh và đội hình của trận bị xoá theo (cascade).
   * @param id - Id trận cần xoá
   * @returns Promise hoàn tất khi đã xoá
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi là Guild War hoặc thuộc tuần đã qua
   */
  async remove(id: string): Promise<void> {
    const now = this.clock.now();
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
        deadline: guildWarDeadline(weekStart),
        isGuildWar: true,
      },
      // Giờ đánh không đụng vào — quản trị viên có thể đã dời. Hạn chót thì
      // ngược lại: hệ thống sở hữu, nên hàng cũ lệch luật tự chỉnh về đúng.
      update: { deadline: guildWarDeadline(weekStart) },
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
   * Chặn hạn chót vượt trần: 10:00 sáng ngày đánh, và không muộn hơn giờ đánh.
   * @param deadline - Hạn chót điểm danh
   * @param dateTime - Giờ đánh
   * @returns Không trả về gì khi hợp lệ
   * @throws BadRequestException khi hạn chót muộn hơn trần
   */
  private assertDeadlineWithinCap(deadline: Date, dateTime: Date): void {
    if (!isWithinDeadlineCap(deadline, dateTime)) {
      throw new BadRequestException(DEADLINE_CAP_MESSAGE);
    }
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
