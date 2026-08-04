import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BattleSessionsService } from './battle-sessions.service';
import type {
  BattleSessionEntity,
  WeekEntity,
} from './entities/battle-session.entity';

@ApiTags('battle-sessions')
@Controller('battle-sessions')
export class BattleSessionsController {
  constructor(private readonly battleSessions: BattleSessionsService) {}

  /**
   * Các tuần quản trị viên được phép thiết lập lịch.
   * @returns Tuần đang mở và tuần kế tiếp
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Tuần đang mở và tuần kế tiếp' })
  getWeeks(): WeekEntity[] {
    return this.battleSessions.getEditableWeeks();
  }

  /**
   * Các trận của một tuần.
   * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get()
  @ApiOperation({ summary: 'Các trận đánh của một tuần' })
  list(@Query('weekStart') weekStart?: string): Promise<BattleSessionEntity[]> {
    return this.battleSessions.listByWeek(weekStart);
  }
}
