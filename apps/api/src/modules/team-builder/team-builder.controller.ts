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
import type {
  FormationWeek,
  SessionFormation,
  TeamNames,
} from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../common';
import { SaveFormationDto } from './dto/save-formation.dto';
import { SaveTeamNamesDto } from './dto/save-team-names.dto';
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

  /**
   * The team names shown on the grid's column headers — global, not per battle day.
   * @returns Team number (as a decimal string) → name
   */
  @Get('team-names')
  @ApiOperation({ summary: 'Tên các đội trên lưới đội hình' })
  getTeamNames(): Promise<TeamNames> {
    return this.teamBuilder.getTeamNames();
  }

  /**
   * Overwrite the whole team name map.
   * @param body - names: team number → name; a team left out loses its name
   * @returns The map just written
   */
  @Put('team-names')
  @ApiOperation({ summary: 'Lưu tên các đội' })
  saveTeamNames(@Body() body: SaveTeamNamesDto): Promise<TeamNames> {
    return this.teamBuilder.saveTeamNames(body.names);
  }
}
