import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import type {
  AttendanceRecordEntity,
  BattleSessionEntity,
  CharacterEntity,
  WeekEntity,
} from './entities/attendance.entity';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * Danh sách nhân vật trong bang.
   * @returns Mảng nhân vật (không kèm mật khẩu)
   */
  @Get('characters')
  @ApiOperation({ summary: 'Danh sách nhân vật trong bang' })
  getCharacters(): Promise<CharacterEntity[]> {
    return this.attendance.getCharacters();
  }

  /**
   * Khoảng thời gian của tuần điểm danh đang mở.
   * @returns fromDate (Thứ 2) và toDate (Thứ 7) dạng ISO string
   */
  @Get('week')
  @ApiOperation({ summary: 'Tuần điểm danh đang mở' })
  getCurrentWeek(): WeekEntity {
    return this.attendance.getCurrentWeek();
  }

  /**
   * Các trận đánh của tuần đang mở kèm hạn điểm danh.
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get('sessions')
  @ApiOperation({ summary: 'Các trận đánh của tuần đang mở' })
  getSessions(): Promise<BattleSessionEntity[]> {
    return this.attendance.getSessions();
  }

  /**
   * Toàn bộ lượt điểm danh của tuần đang mở.
   * @returns Mảng record điểm danh
   */
  @Get('records')
  @ApiOperation({ summary: 'Lượt điểm danh của tuần đang mở' })
  getRecords(): Promise<AttendanceRecordEntity[]> {
    return this.attendance.getRecords();
  }

  /**
   * Điểm danh cho một nhân vật ở một trận (cần mật khẩu riêng của nhân vật).
   * @param body - characterId, sessionId, status, password
   * @returns Record vừa ghi
   */
  @Post()
  @ApiOperation({ summary: 'Điểm danh cho một nhân vật ở một trận' })
  mark(@Body() body: MarkAttendanceDto): Promise<AttendanceRecordEntity> {
    return this.attendance.mark(body);
  }
}
