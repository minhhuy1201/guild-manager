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
 * Attendance — every route needs a session: what a user sees depends on their role, so there is no
 * anonymous path left.
 */
@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * Characters for the attendance screen, filtered by the caller's role.
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The character list
   */
  @Get('characters')
  @ApiOperation({ summary: 'Danh sách nhân vật trong bang' })
  getCharacters(@CurrentUser() user: JwtPayload): Promise<Character[]> {
    return this.attendance.getCharacters(user);
  }

  /**
   * Attendance entries of the open week, filtered by the caller's role.
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The attendance records
   */
  @Get('records')
  @ApiOperation({ summary: 'Lượt điểm danh của tuần đang mở' })
  getRecords(@CurrentUser() user: JwtPayload): Promise<AttendanceRecord[]> {
    return this.attendance.getRecords(user);
  }

  /**
   * Yes/no tallies per session in the open week.
   * @returns Tallies per session
   */
  @Get('summary')
  @ApiOperation({ summary: 'Số người đã điểm danh mỗi trận' })
  getSummary(): Promise<AttendanceSummary[]> {
    return this.attendance.getSummary();
  }

  /**
   * Record attendance for a character in a session.
   * Members may only mark their own character and only before the deadline; admins are
   * exempt from both.
   * @param body - characterId, sessionId and status
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The written record
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
