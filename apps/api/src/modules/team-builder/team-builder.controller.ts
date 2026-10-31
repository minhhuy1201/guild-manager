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
import { Capability } from '@guild/shared/enums';
import type {
  FormationWeek,
  SessionFormation,
  TeamSettingsState,
} from '@guild/shared/schemas';

import {
  CapabilityGuard,
  JwtAuthGuard,
  WeekStartQueryDto,
  RequireCapability,
} from '../../common';
import { SaveFormationDto } from './dto/save-formation.dto';
import { SaveTeamSettingsDto } from './dto/save-team-settings.dto';
import { TeamBuilderService } from './team-builder.service';

@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability(Capability.TEAM_BUILDER)
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
   * @param body - matches: each match's formation and notes, in order; version: the one the draft
   *   was based on
   * @returns The battle day with the formation just written (412 when the version is stale)
   */
  @Put('formations/:sessionId')
  @ApiOperation({ summary: 'Lưu đội hình cả ngày (tối đa 2 trận)' })
  saveFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveFormationDto,
  ): Promise<SessionFormation> {
    return this.teamBuilder.saveFormation(sessionId, body);
  }

  /**
   * The team names, colours and icons shown on the grid's column headers — global, not per battle day.
   * @returns Team number (as a decimal string) → name / colour / icon, plus the version
   */
  @Get('team-settings')
  @ApiOperation({
    summary: 'Tên, màu và biểu tượng các đội trên lưới đội hình',
  })
  getTeamSettings(): Promise<TeamSettingsState> {
    return this.teamBuilder.getTeamSettings();
  }

  /**
   * Overwrite the whole team settings bundle.
   * @param body - names / colors / icons: team number → value, a team left out loses it; version: the one
   *   the draft was based on
   * @returns The bundle just written (412 when the version is stale)
   */
  @Put('team-settings')
  @ApiOperation({ summary: 'Lưu tên, màu và biểu tượng các đội' })
  saveTeamSettings(
    @Body() body: SaveTeamSettingsDto,
  ): Promise<TeamSettingsState> {
    return this.teamBuilder.saveTeamSettings(body);
  }
}
