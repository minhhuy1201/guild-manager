import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AttendanceRecord,
  AttendanceSummary,
  Character,
} from '@guild/shared/schemas';

import { CurrentUser, JwtAuthGuard, type JwtPayload } from '../../common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

/**
 * Điểm danh — mọi route đều cần phiên đăng nhập: dữ liệu người dùng thấy phụ thuộc
 * vào vai của họ, nên không còn đường ẩn danh nào.
 */
@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * Danh sách nhân vật cho màn điểm danh, lọc theo vai của người gọi.
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Mảng nhân vật
   */
  @Get('characters')
  @ApiOperation({ summary: 'Danh sách nhân vật trong bang' })
  getCharacters(@CurrentUser() user: JwtPayload): Promise<Character[]> {
    return this.attendance.getCharacters(user);
  }

  /**
   * Lượt điểm danh của tuần đang mở, lọc theo vai của người gọi.
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Mảng record điểm danh
   */
  @Get('records')
  @ApiOperation({ summary: 'Lượt điểm danh của tuần đang mở' })
  getRecords(@CurrentUser() user: JwtPayload): Promise<AttendanceRecord[]> {
    return this.attendance.getRecords(user);
  }

  /**
   * Số lượt Có/Không của từng trận trong tuần đang mở.
   * @returns Mảng số đếm theo trận
   */
  @Get('summary')
  @ApiOperation({ summary: 'Số người đã điểm danh mỗi trận' })
  getSummary(): Promise<AttendanceSummary[]> {
    return this.attendance.getSummary();
  }

  /**
   * Điểm danh cho một nhân vật ở một trận.
   * Bang chúng và cán bộ chỉ điểm danh cho nhân vật của mình và chỉ khi còn hạn;
   * quản trị viên được miễn cả hai.
   * @param body - characterId, sessionId và status
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Record vừa ghi
   */
  @Post()
  @ApiOperation({ summary: 'Điểm danh cho một nhân vật ở một trận' })
  mark(
    @Body() body: MarkAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AttendanceRecord> {
    return this.attendance.mark(body, user);
  }
}
