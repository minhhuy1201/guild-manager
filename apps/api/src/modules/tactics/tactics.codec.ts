import { InternalServerErrorException } from '@nestjs/common';
import {
  TACTIC_SCHEMA_VERSION,
  tacticDetailSchema,
  tacticSceneSchema,
  tacticSummarySchema,
  tacticTokenPresetSchema,
  type TacticDetail,
  type TacticScene,
  type TacticSummary,
  type TacticTokenPreset,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { Prisma } from '../../generated/prisma/client';

/** The tactic columns every mapper here needs, so the mappers stay pure functions. */
export interface TacticRow {
  id: string;
  name: string;
  description: string | null;
  stages: Prisma.JsonValue;
  updatedAt: Date;
}

/** The token preset columns the mapper needs. */
export interface TacticTokenPresetRow {
  id: string;
  label: string;
  icon: string;
  sortOrder: number;
}

/** A brand new tactic: one empty stage, so the editor always has somewhere to draw. */
export function emptyScene(): TacticScene {
  return {
    schemaVersion: TACTIC_SCHEMA_VERSION,
    stages: [{ id: 'stage-1', name: 'Giai đoạn 1', elements: [] }],
  };
}

/**
 * Read a stored scene document. This is the ONLY place `Prisma.JsonValue` is opened.
 * @param raw - The `stages` column as Prisma returns it
 * @param tacticId - Id of the tactic being read, for the error message
 * @param tacticName - Name of the tactic being read, for the error message
 * @returns The parsed scene
 * @throws InternalServerErrorException when the column does not parse, naming the tactic
 */
export function parseScene(
  raw: Prisma.JsonValue,
  tacticId: string,
  tacticName: string,
): TacticScene {
  // Checked before the schema so a document from a newer app gets its own sentence rather than the
  // generic "invalid literal" Zod would produce for `schemaVersion`.
  if (
    typeof raw === 'object' &&
    raw !== null &&
    !Array.isArray(raw) &&
    typeof raw.schemaVersion === 'number' &&
    raw.schemaVersion > TACTIC_SCHEMA_VERSION
  ) {
    throw new InternalServerErrorException(
      `Chiến thuật "${tacticName}" được lưu bằng phiên bản mới hơn của ứng dụng. Hãy tải lại trang.`,
    );
  }

  const parsed = tacticSceneSchema.safeParse(raw);

  if (!parsed.success) {
    throw new InternalServerErrorException(
      `Dữ liệu chiến thuật "${tacticName}" (${tacticId}) bị hỏng, không đọc được.`,
    );
  }

  return parsed.data;
}

/**
 * Map a row to a list entry.
 * @param row - The tactic row
 * @returns The summary, with the stage count read out of the scene
 */
export function toSummary(row: TacticRow): TacticSummary {
  return verifyResponse(tacticSummarySchema, {
    id: row.id,
    name: row.name,
    description: row.description,
    stageCount: parseScene(row.stages, row.id, row.name).stages.length,
    updatedAt: row.updatedAt.toISOString(),
  } satisfies TacticSummary);
}

/**
 * Map a row to the full tactic.
 * @param row - The tactic row
 * @returns The tactic with its whole scene
 */
export function toDetail(row: TacticRow): TacticDetail {
  const scene = parseScene(row.stages, row.id, row.name);

  return verifyResponse(tacticDetailSchema, {
    id: row.id,
    name: row.name,
    description: row.description,
    stageCount: scene.stages.length,
    updatedAt: row.updatedAt.toISOString(),
    scene,
  } satisfies TacticDetail);
}

/**
 * Map a preset row to the wire shape.
 * @param row - The preset row
 * @returns The preset
 * @throws InternalServerErrorException when the stored icon key is not one the app knows
 */
export function toPreset(row: TacticTokenPresetRow): TacticTokenPreset {
  const parsed = tacticTokenPresetSchema.safeParse({
    id: row.id,
    label: row.label,
    icon: row.icon,
    sortOrder: row.sortOrder,
  });

  if (!parsed.success) {
    throw new InternalServerErrorException(
      `Quân cờ "${row.label}" có icon không hợp lệ.`,
    );
  }

  return parsed.data;
}
