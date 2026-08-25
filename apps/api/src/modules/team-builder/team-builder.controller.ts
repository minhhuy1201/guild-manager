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

import { AdminGuard, JwtAuthGuard } from '../../common';
import { SaveFormationDto } from './dto/save-formation.dto';
import { WeekStartQueryDto } from './dto/week-start-query.dto';
import { TeamBuilderService } from './team-builder.service';

@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TeamBuilderController {
  constructor(private readonly teamBuilder: TeamBuilderService) {}

  /**
   * Weeks that still hold formation data.
   * @returns Weeks, newest first
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Các tuần còn dữ liệu đội hình' })
  getWeeks(): Promise<FormationWeek[]> {
    return this.teamBuilder.getWeeks();
  }

  /**
   * Sessions of one week with their saved formations.
   * @param query - `weekStart`: ISO marker of the week; omitted = the open week
   * @returns Sessions ordered by battle time
   */
  @Get('formations')
  @ApiOperation({ summary: 'Đội hình của các trận trong một tuần' })
  getFormations(
    @Query() query: WeekStartQueryDto,
  ): Promise<SessionFormation[]> {
    return this.teamBuilder.getFormations(query.weekStart);
  }

  /**
   * Overwrite the whole day's formation (1 or 2 matches), notes included.
   * @param sessionId - Id of the battle day to save
   * @param body - matches: each match's formation and notes, in order
   * @returns The battle day with the formation just written
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
