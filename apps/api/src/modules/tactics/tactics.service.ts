import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { TacticInsigniaKey } from '@guild/shared/enums';
import {
  NUMBERED_TEAM_COUNT,
  TACTIC_INSIGNIA,
  tacticInsigniaOf,
  numberedTeamLabel,
} from '@guild/shared/lib';
import type {
  CreateTacticInput,
  CreateTokenPresetInput,
  TacticDetail,
  TacticInsigniaEntry,
  TacticScene,
  TacticSummary,
  TacticTokenPreset,
  UpdateTacticInput,
} from '@guild/shared/schemas';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  emptyScene,
  toDetail,
  toInsignia,
  toPreset,
  toSummary,
  type TacticRow,
} from './tactics.codec';

/** Prisma error code for a unique constraint violation (here, two presets sharing a label). */
const UNIQUE_VIOLATION = 'P2002';

/** Prisma error code for "record to update or delete does not exist". */
const RECORD_NOT_FOUND = 'P2025';

/**
 * What every path answers when the tactic is gone.
 * One constant because a write races a delete: the pre-read and the write itself must blame the
 * same thing in the same words.
 */
const TACTIC_NOT_FOUND = 'Không tìm thấy chiến thuật.';
const TOKEN_NAME_TAKEN = 'Đã có quân cờ trùng tên.';

@Injectable()
export class TacticsService {
  private readonly logger = new Logger(TacticsService.name);

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
   * Rename a tactic, or rewrite its description or its notes. The scene has its own endpoint.
   * @param id - Tactic id
   * @param input - The fields to change; an absent field is left alone
   * @returns The updated summary
   * @throws NotFoundException when no tactic carries that id
   */
  async update(id: string, input: UpdateTacticInput): Promise<TacticSummary> {
    try {
      return toSummary(
        await this.prisma.tactic.update({
          where: { id },
          data: {
            name: input.name,
            description: input.description,
            notes: input.notes,
          },
        }),
      );
    } catch (error) {
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException(TACTIC_NOT_FOUND);
      }
      throw error;
    }
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
    try {
      return toDetail(
        await this.prisma.tactic.update({
          where: { id },
          data: { stages: scene },
        }),
      );
    } catch (error) {
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        throw new NotFoundException(TACTIC_NOT_FOUND);
      }
      throw error;
    }
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
        throw new NotFoundException(TACTIC_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * The seven Insignia in display order, each under its current name: the guild's own when it set
   * one, else the default. A stored name whose key is no longer in the shared list is skipped and
   * logged, never returned.
   * @returns Every Insignia, always all of them
   */
  async listInsignia(): Promise<TacticInsigniaEntry[]> {
    const rows = await this.prisma.tacticInsigniaName.findMany();
    const known = new Set<string>(TACTIC_INSIGNIA.map(({ key }) => key));
    const labelByKey = new Map<string, string>();

    for (const row of rows) {
      if (!known.has(row.key)) {
        this.logger.warn(
          `Ignoring a stored Insignia name for unknown key "${row.key}".`,
        );
        continue;
      }
      labelByKey.set(row.key, row.label);
    }

    return TACTIC_INSIGNIA.map((insignia) =>
      toInsignia(insignia, labelByKey.get(insignia.key)),
    );
  }

  /**
   * Give an Insignia the guild's own name. A name equal to the default restores it instead, so no
   * stored row ever repeats a default.
   * @param key - Which Insignia
   * @param label - The new name, already trimmed
   * @returns The Insignia as it now stands
   * @throws ConflictException when another Insignia (current or default name), a numbered team or a preset already has that name
   */
  async renameInsignia(
    key: TacticInsigniaKey,
    label: string,
  ): Promise<TacticInsigniaEntry> {
    const insignia = tacticInsigniaOf(key);

    if (comparableLabel(label) === comparableLabel(insignia.defaultLabel)) {
      await this.prisma.tacticInsigniaName.deleteMany({ where: { key } });

      return toInsignia(insignia, undefined);
    }

    const current = await this.listInsignia();
    const takenByInsignia = current
      .filter((entry) => entry.key !== key)
      .flatMap((entry) => insigniaLabels(entry));
    const presets = await this.prisma.tacticTokenPreset.findMany();
    const taken = [
      ...takenByInsignia,
      ...numberedTeamLabels(),
      ...presets.map((preset) => preset.label),
    ];

    if (isLabelTaken(label, taken)) {
      throw new ConflictException(TOKEN_NAME_TAKEN);
    }

    const stored = await this.prisma.tacticInsigniaName.upsert({
      where: { key },
      create: { key, label },
      update: { label },
    });

    return toInsignia(insignia, stored.label);
  }

  /**
   * Restore an Insignia's default name. Calling it on one already wearing the default succeeds.
   * @param key - Which Insignia
   */
  async resetInsignia(key: TacticInsigniaKey): Promise<void> {
    await this.prisma.tacticInsigniaName.deleteMany({ where: { key } });
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
   * @throws ConflictException when another preset (after trim, NFC and lowercase), an Insignia (current or default name) or a numbered team already has that name
   */
  async createPreset(
    input: CreateTokenPresetInput,
  ): Promise<TacticTokenPreset> {
    const insignia = await this.listInsignia();
    const existing = await this.prisma.tacticTokenPreset.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (
      isLabelTaken(input.label, [
        ...insignia.flatMap((entry) => insigniaLabels(entry)),
        ...numberedTeamLabels(),
        ...existing.map((preset) => preset.label),
      ])
    ) {
      throw new ConflictException(TOKEN_NAME_TAKEN);
    }

    const sortOrder = (existing.at(-1)?.sortOrder ?? 0) + 1;

    try {
      return toPreset(
        await this.prisma.tacticTokenPreset.create({
          data: { label: input.label, icon: input.icon, sortOrder },
        }),
      );
    } catch (error) {
      if (isPrismaError(error, UNIQUE_VIOLATION)) {
        throw new ConflictException(TOKEN_NAME_TAKEN);
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
      throw new NotFoundException(TACTIC_NOT_FOUND);
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

/**
 * The names an Insignia holds: its current one and its default. The default stays reserved while
 * the Insignia is renamed, so restoring it can never collide with another token.
 * @param entry - An Insignia as listed
 * @returns Both names
 */
function insigniaLabels(entry: TacticInsigniaEntry): string[] {
  return [entry.label, entry.defaultLabel];
}

/**
 * A name as it is compared for duplicates: trimmed, NFC and lowercase.
 * @param label - Any token name
 * @returns The comparable form
 */
function comparableLabel(label: string): string {
  return label.trim().normalize('NFC').toLowerCase();
}

/**
 * Whether a name equals any of the taken ones once both sides are normalised.
 * @param label - The name about to be saved
 * @param taken - Names already in use
 * @returns True when it would duplicate one
 */
function isLabelTaken(label: string, taken: readonly string[]): boolean {
  const wanted = comparableLabel(label);

  return taken.some((name) => comparableLabel(name) === wanted);
}

/**
 * The labels of the numbered team tokens, "Đội 1" to "Đội 10".
 * @returns One label per team
 */
function numberedTeamLabels(): string[] {
  return Array.from({ length: NUMBERED_TEAM_COUNT }, (_, index) =>
    numberedTeamLabel(index + 1),
  );
}
