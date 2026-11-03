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
import { Capability } from '@guild/shared/enums';
import type {
  TacticDetail,
  TacticInsigniaEntry,
  TacticSummary,
  TacticTokenPreset,
} from '@guild/shared/schemas';

import { CapabilityGuard, JwtAuthGuard, RequireCapability } from '../../common';
import {
  CreateTacticDto,
  CreateTokenPresetDto,
  InsigniaKeyParamDto,
  RenameInsigniaDto,
  SaveTacticStagesDto,
  UpdateTacticDto,
} from './dto/tactic.dto';
import { TacticsService } from './tactics.service';

/**
 * The tactics board. The whole guild reads it, only an admin writes it, so the session guard sits at
 * controller level and `CapabilityGuard` is attached to each write route.
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
   * The seven Insignia, each under its current name.
   * Declared before `:id` so the literal path is not swallowed by the parameter route.
   * @returns Insignia in display order
   */
  @Get('insignia')
  @ApiOperation({ summary: 'Danh sách Quân hiệu kèm tên hiện tại' })
  listInsignia(): Promise<TacticInsigniaEntry[]> {
    return this.tactics.listInsignia();
  }

  /**
   * Give an Insignia the guild's own name; a name equal to the default restores it.
   * @param params - key: which Insignia
   * @param body - label: the new name
   * @returns The Insignia as it now stands
   */
  @Put('insignia/:key')
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @ApiOperation({ summary: 'Đổi tên Quân hiệu' })
  renameInsignia(
    @Param() params: InsigniaKeyParamDto,
    @Body() body: RenameInsigniaDto,
  ): Promise<TacticInsigniaEntry> {
    return this.tactics.renameInsignia(params.key, body.label);
  }

  /**
   * Restore an Insignia's default name. Succeeds when it already wears it.
   * @param params - key: which Insignia
   */
  @Delete('insignia/:key')
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Khôi phục tên mặc định của Quân hiệu' })
  resetInsignia(@Param() params: InsigniaKeyParamDto): Promise<void> {
    return this.tactics.resetInsignia(params.key);
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
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @ApiOperation({ summary: 'Thêm quân cờ' })
  createPreset(@Body() body: CreateTokenPresetDto): Promise<TacticTokenPreset> {
    return this.tactics.createPreset(body);
  }

  /**
   * Delete a preset. Tactics already drawn keep the tokens they captured.
   * @param id - Preset id
   */
  @Delete('token-presets/:id')
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
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
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @ApiOperation({ summary: 'Tạo chiến thuật' })
  create(@Body() body: CreateTacticDto): Promise<TacticDetail> {
    return this.tactics.create(body);
  }

  /**
   * Rename a tactic, or rewrite its description or its notes.
   * @param id - Tactic id
   * @param body - The fields to change
   * @returns The updated summary
   */
  @Patch(':id')
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @ApiOperation({ summary: 'Đổi tên, mô tả hoặc ghi chú chiến thuật' })
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
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
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
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.TACTICS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá chiến thuật' })
  remove(@Param('id') id: string): Promise<void> {
    return this.tactics.remove(id);
  }
}
