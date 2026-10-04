import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Leave } from '@guild/shared/schemas';

import { CurrentUser, JwtAuthGuard, type JwtPayload } from '../../common';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveService } from './leave.service';

/** Leaves - readable by any signed-in member, like attendance itself. */
@ApiTags('leaves')
@ApiBearerAuth()
@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaves: LeaveService) {}

  /**
   * Leaves that have not been cancelled or ended.
   * @returns Leaves soonest first
   */
  @Get()
  @ApiOperation({ summary: 'Các lần nghỉ phép chưa hủy và chưa kết thúc' })
  list(): Promise<Leave[]> {
    return this.leaves.listActive();
  }

  /**
   * File a leave for a character.
   * @param body - characterId, date range and optional reason
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The created leave
   */
  @Post()
  @ApiOperation({ summary: 'Khai nghỉ phép' })
  create(
    @Body() body: CreateLeaveDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Leave> {
    return this.leaves.create(body, user);
  }

  /**
   * Cancel a leave.
   * @param id - Leave id
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The leave, unchanged when it was already cancelled
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy một lần nghỉ phép' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Leave> {
    return this.leaves.cancel(id, user);
  }
}
