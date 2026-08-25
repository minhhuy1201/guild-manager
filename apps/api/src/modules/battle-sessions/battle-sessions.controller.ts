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
 * The battle schedule — reading needs only a session, writing needs an admin, so the auth guard sits
 * at controller level and `AdminGuard` is attached to each write route.
 */
@ApiTags('battle-sessions')
@ApiBearerAuth()
@Controller('battle-sessions')
@UseGuards(JwtAuthGuard)
export class BattleSessionsController {
  constructor(private readonly battleSessions: BattleSessionsService) {}

  /**
   * The weeks an admin may schedule.
   * @returns The open week and the next one
   */
  @Get('weeks')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tuần đang mở và tuần kế tiếp' })
  getWeeks(): Week[] {
    return this.battleSessions.getEditableWeeks();
  }

  /**
   * Sessions of one week.
   * @param query - `weekStart`: ISO marker of the week; omitted = the open week
   * @returns Sessions ordered by battle time
   */
  @Get()
  @ApiOperation({ summary: 'Các trận đánh của một tuần' })
  list(@Query() query: WeekStartQueryDto): Promise<BattleSession[]> {
    return this.battleSessions.listByWeek(query.weekStart);
  }

  /**
   * Add a scrim.
   * @param body - Battle time, deadline and opponent guild name
   * @returns The created session
   */
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Thêm một trận scrim' })
  create(@Body() body: CreateBattleSessionDto): Promise<BattleSession> {
    return this.battleSessions.create(body);
  }

  /**
   * Edit a session.
   * @param id - Id of the session to edit
   * @param body - Fields to change
   * @returns The updated session
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
   * Delete a scrim along with all its attendance and formations.
   * @param id - Id of the session to delete
   * @returns A promise resolving once it is deleted
   */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Xoá một trận scrim' })
  remove(@Param('id') id: string): Promise<void> {
    return this.battleSessions.remove(id);
  }
}
