import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, OptionalJwtAuthGuard, type JwtPayload } from '@/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import type {
  AttendanceRecordEntity,
  CharacterEntity,
} from './entities/attendance.entity';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * Danh sách nhân vật trong bang.
   * @returns Mảng nhân vật
   */
  @Get('characters')
  @ApiOperation({ summary: 'Danh sách nhân vật trong bang' })
  getCharacters(): Promise<CharacterEntity[]> {
    return this.attendance.getCharacters();
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
   * Điểm danh cho một nhân vật ở một trận.
   * Người thường chỉ điểm danh được khi còn hạn; quản trị viên (có access token hợp lệ)
   * được miễn.
   * @param body - characterId, sessionId và status
   * @param user - Payload JWT nếu request có access token hợp lệ, ngược lại undefined
   * @returns Record vừa ghi
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Điểm danh cho một nhân vật ở một trận' })
  mark(
    @Body() body: MarkAttendanceDto,
    @CurrentUser() user?: JwtPayload,
  ): Promise<AttendanceRecordEntity> {
    return this.attendance.mark(body, user ?? null);
  }
}
