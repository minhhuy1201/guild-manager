import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TeamColors } from '@guild/shared/schemas';

import { JwtAuthGuard } from '../../common';
import { TeamBuilderService } from './team-builder.service';

/**
 * The team colours, readable by every signed-in user. Its own controller because
 * `TeamBuilderController` demands the TEAM_BUILDER Capability at class level, while the tactics map
 * (open to the whole guild) has to ring each "Đội N" token in its team's colour.
 */
@ApiTags('team-builder')
@ApiBearerAuth()
@Controller('team-builder')
@UseGuards(JwtAuthGuard)
export class TeamColorsController {
  constructor(private readonly teamBuilder: TeamBuilderService) {}

  /**
   * The colour each team was given on the team builder.
   * @returns Team number (as a decimal string) → colour; a team on its default colour is absent
   */
  @Get('team-colors')
  @ApiOperation({ summary: 'Màu các đội, cho bản đồ chiến thuật' })
  getTeamColors(): Promise<TeamColors> {
    return this.teamBuilder.getTeamColors();
  }
}
