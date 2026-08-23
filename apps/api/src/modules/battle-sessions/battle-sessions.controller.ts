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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { BattleSession, Week } from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../common';
import { BattleSessionsService } from './battle-sessions.service';
import {
  CreateBattleSessionDto,
  UpdateBattleSessionDto,
} from './dto/battle-session.dto';
import { WeekStartQueryDto } from './dto/week-start-query.dto';

/**
 * Lịch đánh — đọc thì chỉ cần một phiên đăng nhập, sửa thì phải là quản trị viên,
 * nên guard đăng nhập đặt ở cấp controller còn `AdminGuard` gắn lẻ từng route ghi.
 */
@ApiTags('battle-sessions')
@ApiBearerAuth()
@Controller('battle-sessions')
@UseGuards(JwtAuthGuard)
export class BattleSessionsController {
  constructor(private readonly battleSessions: BattleSessionsService) {}

  /**
   * Các tuần quản trị viên được phép thiết lập lịch.
   * @returns Tuần đang mở và tuần kế tiếp
   */
  @Get('weeks')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tuần đang mở và tuần kế tiếp' })
  getWeeks(): Week[] {
    return this.battleSessions.getEditableWeeks();
  }

  /**
   * Các trận của một tuần.
   * @param query - `weekStart`: mốc ISO của tuần; bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get()
  @ApiOperation({ summary: 'Các trận đánh của một tuần' })
  list(@Query() query: WeekStartQueryDto): Promise<BattleSession[]> {
    return this.battleSessions.listByWeek(query.weekStart);
  }

  /**
   * Thêm một trận scrim.
   * @param body - Giờ đánh, hạn chót và tên bang đối thủ
   * @returns Trận vừa tạo
   */
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Thêm một trận scrim' })
  create(@Body() body: CreateBattleSessionDto): Promise<BattleSession> {
    return this.battleSessions.create(body);
  }

  /**
   * Sửa một trận.
   * @param id - Id trận cần sửa
   * @param body - Các field cần đổi
   * @returns Trận sau khi sửa
   */
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Sửa một trận' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateBattleSessionDto,
  ): Promise<BattleSession> {
    return this.battleSessions.update(id, body);
  }

  /**
   * Xoá một trận scrim cùng toàn bộ điểm danh và đội hình của nó.
   * @param id - Id trận cần xoá
   * @returns Promise hoàn tất khi đã xoá
   */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Xoá một trận scrim' })
  remove(@Param('id') id: string): Promise<void> {
    return this.battleSessions.remove(id);
  }
}
