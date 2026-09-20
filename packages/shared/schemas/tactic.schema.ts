import { z } from "zod";

import {
  TACTIC_COLORS,
  TACTIC_TOKEN_ICONS,
  TACTIC_TOKEN_SIZES,
} from "../enums/tactic.enum";

/** Width of the virtual map space every coordinate is stored in. */
export const TACTIC_MAP_WIDTH = 1920;

/** Height of the virtual map space every coordinate is stored in. */
export const TACTIC_MAP_HEIGHT = 1071;

/** Hard limits, checked by Zod so both sides obey one rule. */
export const TACTIC_LIMITS = {
  stagesPerTactic: 20,
  elementsPerStage: 400,
  pointsPerStroke: 4000,
  textLength: 80,
  stageNameLength: 40,
  tacticNameLength: 80,
  tacticDescriptionLength: 500,
  tokenLabelLength: 40,
} as const;

/** Version of the scene document format the app writes today. */
export const TACTIC_SCHEMA_VERSION = 1;

const colorSchema = z.enum(TACTIC_COLORS);

/**
 * Stroke width as a literal set rather than `z.number()`: the toolbar offers four values and a
 * document carrying a fifth was not written by this app.
 */
const strokeWidthSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(14),
]);

const elementIdSchema = z.string().min(1).max(64);

/**
 * Coordinates are kept loose on purpose: a stroke may run slightly off the map while the pointer
 * leaves the stage, and clamping it server-side would silently move what the admin drew.
 */
const coordinateSchema = z.number().finite();

/** A unit standing on the map. It captures its label and icon; it does NOT point at a preset. */
export const tacticTokenSchema = z.object({
  kind: z.literal("token"),
  id: elementIdSchema,
  label: z.string().trim().min(1).max(TACTIC_LIMITS.tokenLabelLength),
  icon: z.enum(TACTIC_TOKEN_ICONS),
  x: coordinateSchema,
  y: coordinateSchema,
  size: z.enum(TACTIC_TOKEN_SIZES),
  color: colorSchema,
});

/** A straight movement arrow: [x1, y1, x2, y2]. */
export const tacticArrowSchema = z.object({
  kind: z.literal("arrow"),
  id: elementIdSchema,
  points: z.array(coordinateSchema).length(4),
  color: colorSchema,
  strokeWidth: strokeWidthSchema,
});

/** A freehand stroke: flat [x, y, x, y, …]. */
export const tacticFreehandSchema = z.object({
  kind: z.literal("freehand"),
  id: elementIdSchema,
  points: z
    .array(coordinateSchema)
    .min(4)
    .max(TACTIC_LIMITS.pointsPerStroke * 2, "Nét vẽ quá dài."),
  color: colorSchema,
  strokeWidth: strokeWidthSchema,
});

/** A note written on the map. */
export const tacticTextSchema = z.object({
  kind: z.literal("text"),
  id: elementIdSchema,
  x: coordinateSchema,
  y: coordinateSchema,
  text: z
    .string()
    .trim()
    .min(1)
    .max(TACTIC_LIMITS.textLength, "Ghi chú tối đa 80 ký tự."),
  color: colorSchema,
  fontSize: z.number().int().min(12).max(96),
});

/** Anything that can sit on a stage. Switch on `kind` and end with `assertNever`. */
export const tacticElementSchema = z.discriminatedUnion("kind", [
  tacticTokenSchema,
  tacticArrowSchema,
  tacticFreehandSchema,
  tacticTextSchema,
]);

/** One phase of a tactic. */
export const tacticStageSchema = z.object({
  id: elementIdSchema,
  name: z
    .string()
    .trim()
    .min(1)
    .max(TACTIC_LIMITS.stageNameLength, "Tên giai đoạn tối đa 40 ký tự."),
  elements: z
    .array(tacticElementSchema)
    .max(TACTIC_LIMITS.elementsPerStage, "Một giai đoạn tối đa 400 phần tử."),
});

/**
 * The whole scene document, as stored in `Tactic.stages`. The version is what makes the JSON
 * column upgradable without guessing SQL over JSON later.
 */
export const tacticSceneSchema = z.object({
  schemaVersion: z.literal(TACTIC_SCHEMA_VERSION),
  stages: z
    .array(tacticStageSchema)
    .min(1, "Chiến thuật phải có ít nhất một giai đoạn.")
    .max(TACTIC_LIMITS.stagesPerTactic, "Một chiến thuật tối đa 20 giai đoạn."),
});

const tacticNameSchema = z
  .string()
  .trim()
  .min(1, "Tên chiến thuật không được để trống.")
  .max(TACTIC_LIMITS.tacticNameLength, "Tên chiến thuật tối đa 80 ký tự.");

const tacticDescriptionSchema = z
  .string()
  .trim()
  .max(TACTIC_LIMITS.tacticDescriptionLength, "Mô tả tối đa 500 ký tự.");

/** Body of POST /tactics. */
export const createTacticSchema = z.object({
  name: tacticNameSchema,
  description: tacticDescriptionSchema.optional(),
});

/** Body of PATCH /tactics/:id — name and description only; the scene has its own endpoint. */
export const updateTacticSchema = z.object({
  name: tacticNameSchema.optional(),
  description: tacticDescriptionSchema.nullable().optional(),
});

/** Body of PUT /tactics/:id/stages — the whole scene, every time. */
export const saveTacticStagesSchema = z.object({
  scene: tacticSceneSchema,
});

/** Body of POST /tactics/token-presets. */
export const createTokenPresetSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Tên quân cờ không được để trống.")
    .max(TACTIC_LIMITS.tokenLabelLength, "Tên quân cờ tối đa 40 ký tự."),
  icon: z.enum(TACTIC_TOKEN_ICONS),
});

/** A row of the tactics list — no scene, which is the heavy part of the record. */
export const tacticSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stageCount: z.number(),
  updatedAt: z.string(),
});

/** One tactic with its whole scene. */
export const tacticDetailSchema = tacticSummarySchema.extend({
  scene: tacticSceneSchema,
});

/** A reusable token in the palette. */
export const tacticTokenPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.enum(TACTIC_TOKEN_ICONS),
  sortOrder: z.number(),
});

export type TacticToken = z.infer<typeof tacticTokenSchema>;

export type TacticArrow = z.infer<typeof tacticArrowSchema>;

export type TacticFreehand = z.infer<typeof tacticFreehandSchema>;

export type TacticText = z.infer<typeof tacticTextSchema>;

export type TacticElement = z.infer<typeof tacticElementSchema>;

export type TacticStage = z.infer<typeof tacticStageSchema>;

export type TacticScene = z.infer<typeof tacticSceneSchema>;

export type CreateTacticInput = z.infer<typeof createTacticSchema>;

export type UpdateTacticInput = z.infer<typeof updateTacticSchema>;

export type SaveTacticStagesInput = z.infer<typeof saveTacticStagesSchema>;

export type CreateTokenPresetInput = z.infer<typeof createTokenPresetSchema>;

export type TacticSummary = z.infer<typeof tacticSummarySchema>;

export type TacticDetail = z.infer<typeof tacticDetailSchema>;

export type TacticTokenPreset = z.infer<typeof tacticTokenPresetSchema>;
