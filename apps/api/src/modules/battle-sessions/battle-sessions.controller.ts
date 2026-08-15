import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common';
import { BattleSessionsService } from './battle-sessions.service';
import {
  CreateBattleSessionDto,
  UpdateBattleSessionDto,
} from './dto/battle-session.dto';
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

  /**
   * Thêm một trận scrim.
   * @param body - Giờ đánh, hạn chót và tên bang đối thủ
   * @returns Trận vừa tạo
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Thêm một trận scrim' })
  create(@Body() body: CreateBattleSessionDto): Promise<BattleSessionEntity> {
    return this.battleSessions.create(body);
  }

  /**
   * Sửa một trận.
   * @param id - Id trận cần sửa
   * @param body - Các field cần đổi
   * @returns Trận sau khi sửa
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sửa một trận' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateBattleSessionDto,
  ): Promise<BattleSessionEntity> {
    return this.battleSessions.update(id, body);
  }

  /**
   * Xoá một trận scrim cùng toàn bộ điểm danh và đội hình của nó.
   * @param id - Id trận cần xoá
   * @returns Promise hoàn tất khi đã xoá
   */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xoá một trận scrim' })
  remove(@Param('id') id: string): Promise<void> {
    return this.battleSessions.remove(id);
  }
}
