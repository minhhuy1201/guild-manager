import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CatRaceDrawResult,
  CatRaceEventDetail,
  CatRaceEventSummary,
  CatRacePrizeTemplate,
} from '@guild/shared/schemas';

import { AdminGuard, CurrentUser, JwtAuthGuard } from '../../common';
import type { JwtPayload } from '../../common/constants/auth.constant';
import { CatRaceService } from './cat-race.service';
import {
  AddCatRacePrizeDto,
  CreateCatRaceEventDto,
  DrawCatRaceRoundDto,
  SetCatRaceEntrantsDto,
  SetCatRaceParticipantsDto,
  UpdateCatRaceEventDto,
  UpdateCatRacePrizeDto,
  VoidCatRaceRoundDto,
} from './dto/cat-race.dto';

/** The cat race screen's API. Admin only, on every route. */
@ApiTags('cat-races')
@ApiBearerAuth()
@Controller('cat-races')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CatRaceController {
  constructor(private readonly catRace: CatRaceService) {}

  /** Events, newest first. */
  @Get()
  @ApiOperation({ summary: 'Danh sách đợt đua' })
  list(): Promise<CatRaceEventSummary[]> {
    return this.catRace.list();
  }

  /** Prizes of the latest event, to prefill the create form. Declared before `:id`. */
  @Get('prefill')
  @ApiOperation({ summary: 'Hạng mục của đợt gần nhất' })
  prefill(): Promise<CatRacePrizeTemplate[]> {
    return this.catRace.prefill();
  }

  /** Create an event. */
  @Post()
  @ApiOperation({ summary: 'Tạo đợt đua' })
  create(
    @Body() body: CreateCatRaceEventDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.create(body, user.sub);
  }

  /** One event with roster, prizes and rounds. */
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đợt đua' })
  get(@Param('id') id: string): Promise<CatRaceEventDetail> {
    return this.catRace.detail(id);
  }

  /** Rename, or change mode before the first round. */
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa đợt đua' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCatRaceEventDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.update(id, body);
  }

  /** Delete an event with no round. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá đợt đua chưa có vòng' })
  remove(@Param('id') id: string): Promise<void> {
    return this.catRace.remove(id);
  }

  /** Replace the roster and tickets. */
  @Put(':id/participants')
  @ApiOperation({ summary: 'Đặt lại người tham gia' })
  setParticipants(
    @Param('id') id: string,
    @Body() body: SetCatRaceParticipantsDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.setParticipants(id, body);
  }

  /** Add a prize. */
  @Post(':id/prizes')
  @ApiOperation({ summary: 'Thêm hạng mục' })
  addPrize(
    @Param('id') id: string,
    @Body() body: AddCatRacePrizeDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.addPrize(id, body);
  }

  /** Edit a prize. */
  @Patch(':id/prizes/:prizeId')
  @ApiOperation({ summary: 'Sửa hạng mục' })
  updatePrize(
    @Param('id') id: string,
    @Param('prizeId') prizeId: string,
    @Body() body: UpdateCatRacePrizeDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.updatePrize(id, prizeId, body);
  }

  /** Delete a prize with no round. */
  @Delete(':id/prizes/:prizeId')
  @ApiOperation({ summary: 'Xoá hạng mục chưa có vòng' })
  removePrize(
    @Param('id') id: string,
    @Param('prizeId') prizeId: string,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.removePrize(id, prizeId);
  }

  /** Replace who may win a prize. */
  @Put(':id/prizes/:prizeId/entrants')
  @ApiOperation({ summary: 'Đặt lại danh sách đua của hạng mục' })
  setEntrants(
    @Param('id') id: string,
    @Param('prizeId') prizeId: string,
    @Body() body: SetCatRaceEntrantsDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.setEntrants(id, prizeId, body);
  }

  /** Draw one round. */
  @Post(':id/rounds')
  @ApiOperation({ summary: 'Đua một vòng' })
  draw(
    @Param('id') id: string,
    @Body() body: DrawCatRaceRoundDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatRaceDrawResult> {
    return this.catRace.draw(id, body, user.sub);
  }

  /** Void a round. */
  @Post(':id/rounds/:roundId/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Huỷ một vòng' })
  voidRound(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() body: VoidCatRaceRoundDto,
  ): Promise<CatRaceEventDetail> {
    return this.catRace.voidRound(id, roundId, body);
  }

  /** End the event. */
  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kết thúc đợt đua' })
  end(@Param('id') id: string): Promise<CatRaceEventDetail> {
    return this.catRace.end(id);
  }
}
