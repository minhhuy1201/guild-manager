import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FormationWeek, SessionFormation } from '@guild/shared/schemas';

import { Clock, JwtAuthGuard } from '../../common';
import { SaveFormationDto } from './dto/save-formation.dto';
import { WeekStartQueryDto } from './dto/week-start-query.dto';
import { TeamBuilderService } from './team-builder.service';

@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard)
export class TeamBuilderController {
  constructor(
    private readonly teamBuilder: TeamBuilderService,
    private readonly clock: Clock,
  ) {}

  /**
   * Các tuần còn dữ liệu đội hình.
   *
   * Dọn đội hình quá hạn TRƯỚC khi liệt kê: repo không có scheduler, và màn hình xếp team luôn
   * gọi endpoint này nên nó là chỗ rẻ nhất để chạy retention. Quyết định đó nằm ở đây, nhìn thấy
   * được, chứ không chôn trong hàm đọc của service.
   * @returns Mảng tuần, mới nhất trước
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Các tuần còn dữ liệu đội hình' })
  async getWeeks(): Promise<FormationWeek[]> {
    await this.teamBuilder.purgeExpiredFormations(this.clock.now());

    return this.teamBuilder.getWeeks();
  }

  /**
   * Các trận của một tuần kèm đội hình đã lưu.
   * @param query - `weekStart`: mốc ISO của tuần; bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get('formations')
  @ApiOperation({ summary: 'Đội hình của các trận trong một tuần' })
  getFormations(
    @Query() query: WeekStartQueryDto,
  ): Promise<SessionFormation[]> {
    return this.teamBuilder.getFormations(query.weekStart);
  }

  /**
   * Ghi đè đội hình cả ngày (1 hoặc 2 trận), kèm ghi chú theo ô.
   * @param sessionId - ID ngày đánh cần lưu
   * @param body - matches: đội hình và ghi chú từng trận, theo thứ tự
   * @returns Ngày đánh kèm đội hình vừa ghi
   */
  @Put('formations/:sessionId')
  @ApiOperation({ summary: 'Lưu đội hình cả ngày (tối đa 2 trận)' })
  saveFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveFormationDto,
  ): Promise<SessionFormation> {
    return this.teamBuilder.saveFormation(sessionId, body.matches);
  }
}
