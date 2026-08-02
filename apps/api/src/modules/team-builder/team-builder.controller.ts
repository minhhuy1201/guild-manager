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

import { JwtAuthGuard } from '@/common';
import { SaveFormationDto } from './dto/save-formation.dto';
import type {
  FormationWeekEntity,
  SessionFormationEntity,
} from './entities/formation.entity';
import { TeamBuilderService } from './team-builder.service';

@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard)
export class TeamBuilderController {
  constructor(private readonly teamBuilder: TeamBuilderService) {}

  /**
   * Các tuần còn dữ liệu đội hình.
   * @returns Mảng tuần, mới nhất trước
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Các tuần còn dữ liệu đội hình' })
  getWeeks(): Promise<FormationWeekEntity[]> {
    return this.teamBuilder.getWeeks();
  }

  /**
   * Các trận của một tuần kèm đội hình đã lưu.
   * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get('formations')
  @ApiOperation({ summary: 'Đội hình của các trận trong một tuần' })
  getFormations(
    @Query('weekStart') weekStart?: string,
  ): Promise<SessionFormationEntity[]> {
    return this.teamBuilder.getFormations(weekStart);
  }

  /**
   * Ghi đè đội hình của một trận.
   * @param sessionId - ID trận cần lưu
   * @param body - assignment dạng slotId → characterId
   * @returns Trận kèm đội hình vừa ghi
   */
  @Put('formations/:sessionId')
  @ApiOperation({ summary: 'Lưu đội hình của một trận' })
  saveFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveFormationDto,
  ): Promise<SessionFormationEntity> {
    return this.teamBuilder.saveFormation(sessionId, body.assignment);
  }
}
