import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTacticInput,
  CreateTokenPresetInput,
  TacticDetail,
  TacticScene,
  TacticSummary,
  TacticTokenPreset,
  UpdateTacticInput,
} from '@guild/shared/schemas';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  emptyScene,
  toDetail,
  toPreset,
  toSummary,
  type TacticRow,
} from './tactics.codec';

/** Prisma error code for a unique constraint violation (here, two presets sharing a label). */
const UNIQUE_VIOLATION = 'P2002';

/** Prisma error code for "record to update or delete does not exist". */
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class TacticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every tactic, newest edit first. The scene is read only to count stages, never returned.
   * @returns Tactic summaries
   */
  async list(): Promise<TacticSummary[]> {
    const rows = await this.prisma.tactic.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => toSummary(row));
  }

  /**
   * One tactic with its whole scene.
   * @param id - Tactic id
   * @returns The tactic
   * @throws NotFoundException when no tactic carries that id
   */
  async get(id: string): Promise<TacticDetail> {
    return toDetail(await this.requireTactic(id));
  }

  /**
   * Create a tactic holding a single empty stage.
   * @param input - name, and an optional description
   * @returns The tactic just created
   */
  async create(input: CreateTacticInput): Promise<TacticDetail> {
    const row = await this.prisma.tactic.create({
      data: {
        name: input.name,
        description: input.description,
        stages: emptyScene(),
      },
    });

    return toDetail(row);
  }

  /**
   * Rename a tactic or rewrite its description. The scene has its own endpoint.
   * @param id - Tactic id
   * @param input - The fields to change; an absent field is left alone
   * @returns The updated summary
   * @throws NotFoundException when no tactic carries that id
   */
  async update(id: string, input: UpdateTacticInput): Promise<TacticSummary> {
    await this.requireTactic(id);

    const row = await this.prisma.tactic.update({
      where: { id },
      data: { name: input.name, description: input.description },
    });

    return toSummary(row);
  }

  /**
   * Overwrite the whole scene. No optimistic locking: last writer wins, exactly like
   * `PUT /team-builder/formations/:sessionId` (architecture.md section 8).
   * @param id - Tactic id
   * @param scene - The whole scene document, already validated by the DTO
   * @returns The tactic with the scene just written
   * @throws NotFoundException when no tactic carries that id
   */
  async saveStages(id: string, scene: TacticScene): Promise<TacticDetail> {
    await this.requireTactic(id);

    const row = await this.prisma.tactic.update({
      where: { id },
      data: { stages: scene },
    });

    return toDetail(row);
  }

  /**
   * Delete a tactic.
   * @param id - Tactic id
   * @throws NotFoundException when no tactic carries that id
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.tactic.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException('Không tìm thấy chiến thuật.');
      }
      throw error;
    }
  }

  /**
   * The token palette's saved presets, in display order.
   * @returns Presets ordered by sortOrder
   */
  async listPresets(): Promise<TacticTokenPreset[]> {
    const rows = await this.prisma.tacticTokenPreset.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return rows.map((row) => toPreset(row));
  }

  /**
   * Add a preset at the end of the palette.
   * @param input - label and icon key
   * @returns The preset just created
   * @throws ConflictException when another preset already carries that label
   */
  async createPreset(
    input: CreateTokenPresetInput,
  ): Promise<TacticTokenPreset> {
    const existing = await this.prisma.tacticTokenPreset.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const sortOrder = (existing.at(-1)?.sortOrder ?? 0) + 1;

    try {
      return toPreset(
        await this.prisma.tacticTokenPreset.create({
          data: { label: input.label, icon: input.icon, sortOrder },
        }),
      );
    } catch (error) {
      if (isPrismaError(error, UNIQUE_VIOLATION)) {
        throw new ConflictException('Đã có quân cờ trùng tên.');
      }
      throw error;
    }
  }

  /**
   * Delete a preset. Tactics already drawn keep the tokens they captured.
   * @param id - Preset id
   * @throws NotFoundException when no preset carries that id
   */
  async removePreset(id: string): Promise<void> {
    try {
      await this.prisma.tacticTokenPreset.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException('Không tìm thấy quân cờ.');
      }
      throw error;
    }
  }

  /**
   * Read a tactic row or fail with the Vietnamese not-found message.
   * @param id - Tactic id
   * @returns The row
   * @throws NotFoundException when no tactic carries that id
   */
  private async requireTactic(id: string): Promise<TacticRow> {
    const row = await this.prisma.tactic.findUnique({ where: { id } });

    if (!row) {
      throw new NotFoundException('Không tìm thấy chiến thuật.');
    }

    return row;
  }
}

/**
 * Whether an unknown error is a Prisma error carrying a given code.
 * @param error - The caught value
 * @param code - The Prisma error code to match
 * @returns True when it is that Prisma error
 */
function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
