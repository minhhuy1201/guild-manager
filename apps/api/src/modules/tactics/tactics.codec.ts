import { InternalServerErrorException } from '@nestjs/common';
import {
  TACTIC_SCHEMA_VERSION,
  readTacticScene,
  tacticDetailSchema,
  tacticSummarySchema,
  tacticTokenPresetSchema,
  type TacticDetail,
  type TacticScene,
  type TacticSummary,
  type TacticTokenPreset,
} from '@guild/shared/schemas';
import { z } from 'zod';

import { assertNever } from '../../common';
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
 * The part of a stored scene the list reads: that there is an array of stages, and how long it is.
 * Validating only this much keeps one unreadable element from taking the whole list down with it.
 */
const stageCountSchema = z.object({ stages: z.array(z.unknown()) });

/**
 * Read a stored scene document through the shared read pipeline. `parseScene` and `countStages`
 * are the ONLY places `Prisma.JsonValue` is opened.
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
  const read = readTacticScene(raw);

  switch (read.status) {
    case 'ok':
      return read.scene;
    case 'newer':
      throw new InternalServerErrorException(
        `Chiến thuật "${tacticName}" được lưu bằng phiên bản mới hơn của ứng dụng. Hãy tải lại trang.`,
      );
    case 'corrupt':
      throw corruptScene(tacticId, tacticName);
    default:
      return assertNever(read, 'Kết quả đọc chiến thuật ngoài dự kiến');
  }
}

/**
 * Count the stages of a stored scene without parsing its elements.
 * @param raw - The `stages` column as Prisma returns it
 * @param tacticId - Id of the tactic being read, for the error message
 * @param tacticName - Name of the tactic being read, for the error message
 * @returns How many stages the scene holds
 * @throws InternalServerErrorException when the column holds no stage array at all
 */
function countStages(
  raw: Prisma.JsonValue,
  tacticId: string,
  tacticName: string,
): number {
  const parsed = stageCountSchema.safeParse(raw);

  if (!parsed.success) {
    throw corruptScene(tacticId, tacticName);
  }

  return parsed.data.stages.length;
}

/**
 * The error for a stored scene that cannot be read, naming the tactic so it can be found and fixed.
 * @param tacticId - Id of the broken tactic
 * @param tacticName - Name of the broken tactic
 * @returns The exception to throw
 */
function corruptScene(
  tacticId: string,
  tacticName: string,
): InternalServerErrorException {
  return new InternalServerErrorException(
    `Dữ liệu chiến thuật "${tacticName}" (${tacticId}) bị hỏng, không đọc được.`,
  );
}

/**
 * Map a row to a list entry.
 * @param row - The tactic row
 * @returns The summary, with the stage count read out of the scene without parsing its elements
 */
export function toSummary(row: TacticRow): TacticSummary {
  return verifyResponse(tacticSummarySchema, {
    id: row.id,
    name: row.name,
    description: row.description,
    stageCount: countStages(row.stages, row.id, row.name),
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
 *
 * `safeParse` rather than `verifyResponse` on purpose: `icon` is a plain `String` column, not a
 * Postgres enum, so a key renamed in `TACTIC_TOKEN_ICONS` leaves rows the web cannot draw — and
 * `verifyResponse` is a no-op in production, exactly where that row would reach a browser. Do not
 * "fix" this into the shared helper.
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
