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
  TacticDetail,
  TacticSummary,
  TacticTokenPreset,
} from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../common';
import {
  CreateTacticDto,
  CreateTokenPresetDto,
  SaveTacticStagesDto,
  UpdateTacticDto,
} from './dto/tactic.dto';
import { TacticsService } from './tactics.service';

/**
 * The tactics board. The whole guild reads it, only an admin writes it, so the session guard sits at
 * controller level and `AdminGuard` is attached to each write route.
 */
@ApiTags('tactics')
@ApiBearerAuth()
@Controller('tactics')
@UseGuards(JwtAuthGuard)
export class TacticsController {
  constructor(private readonly tactics: TacticsService) {}

  /**
   * Every tactic, newest edit first, without the scene.
   * @returns Tactic summaries
   */
  @Get()
  @ApiOperation({ summary: 'Danh sách chiến thuật' })
  list(): Promise<TacticSummary[]> {
    return this.tactics.list();
  }

  /**
   * The token palette's saved presets.
   * Declared before `:id` so the literal path is not swallowed by the parameter route.
   * @returns Presets in display order
   */
  @Get('token-presets')
  @ApiOperation({ summary: 'Danh sách quân cờ tự đặt' })
  listPresets(): Promise<TacticTokenPreset[]> {
    return this.tactics.listPresets();
  }

  /**
   * Add a preset to the palette.
   * @param body - label and icon key
   * @returns The preset just created
   */
  @Post('token-presets')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Thêm quân cờ' })
  createPreset(@Body() body: CreateTokenPresetDto): Promise<TacticTokenPreset> {
    return this.tactics.createPreset(body);
  }

  /**
   * Delete a preset. Tactics already drawn keep the tokens they captured.
   * @param id - Preset id
   */
  @Delete('token-presets/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá quân cờ' })
  removePreset(@Param('id') id: string): Promise<void> {
    return this.tactics.removePreset(id);
  }

  /**
   * One tactic with its whole scene.
   * @param id - Tactic id
   * @returns The tactic
   */
  @Get(':id')
  @ApiOperation({ summary: 'Một chiến thuật kèm toàn bộ bản vẽ' })
  get(@Param('id') id: string): Promise<TacticDetail> {
    return this.tactics.get(id);
  }

  /**
   * Create a tactic holding one empty stage.
   * @param body - name, and an optional description
   * @returns The tactic just created
   */
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tạo chiến thuật' })
  create(@Body() body: CreateTacticDto): Promise<TacticDetail> {
    return this.tactics.create(body);
  }

  /**
   * Rename a tactic or rewrite its description.
   * @param id - Tactic id
   * @param body - The fields to change
   * @returns The updated summary
   */
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Đổi tên hoặc mô tả chiến thuật' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateTacticDto,
  ): Promise<TacticSummary> {
    return this.tactics.update(id, body);
  }

  /**
   * Overwrite the whole scene.
   * @param id - Tactic id
   * @param body - scene: the whole document
   * @returns The tactic with the scene just written
   */
  @Put(':id/stages')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lưu toàn bộ bản vẽ' })
  saveStages(
    @Param('id') id: string,
    @Body() body: SaveTacticStagesDto,
  ): Promise<TacticDetail> {
    return this.tactics.saveStages(id, body.scene);
  }

  /**
   * Delete a tactic.
   * @param id - Tactic id
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá chiến thuật' })
  remove(@Param('id') id: string): Promise<void> {
    return this.tactics.remove(id);
  }
}
