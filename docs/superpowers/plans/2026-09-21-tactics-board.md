# Kế hoạch triển khai Bảng chiến thuật `/chien-thuat`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm màn `/chien-thuat` cho phép admin vẽ chiến thuật bang chiến lên ảnh map và cả bang mở
ra xem.

**Architecture:** Scene là một tài liệu JSON có `schemaVersion`, lưu nguyên vào cột `Tactic.stages`;
`packages/shared` sở hữu discriminated union của phần tử vẽ và mọi giới hạn; API là module `tactics`
với `JwtAuthGuard` ở controller và `AdminGuard` trên từng handler ghi; web là feature `tactics` vẽ
bằng Konva trên một `Stage` scale theo hệ toạ độ map ảo 1920×1071, scene đang sửa nằm trong Zustand,
dữ liệu đã lưu nằm trong TanStack Query.

**Tech Stack:** NestJS 11 + Prisma 7 + Zod 4 (`nestjs-zod`), Next.js 16 + React 19 + TanStack Query 5
+ Zustand 5 + `konva`/`react-konva` + `jszip`, Jest (api), Vitest (web).

**Spec:** [`docs/superpowers/specs/2026-09-20-tactics-board-design.md`](../specs/2026-09-20-tactics-board-design.md)

## Global Constraints

- Không thêm biến môi trường nào.
- Không đụng luồng đăng nhập, điểm danh, xếp team.
- Mọi shape đi qua mạng nằm trong `packages/shared`; không khai lại shape/enum/luật validate ở từng app.
- Sau khi sửa `packages/shared` phải chạy `pnpm --filter @guild/shared build` trước khi chạy app.
- Hệ toạ độ lưu là map ảo **1920×1071** (`/img/map-guild-war.webp`), không phải pixel màn hình.
- Giới hạn cứng (kiểm ở Zod): giai đoạn ≤ **20**; phần tử mỗi giai đoạn ≤ **400**; điểm mỗi nét tự do
  ≤ **4000**; `text` ≤ **80**; tên giai đoạn ≤ **40**; `Tactic.name` ≤ **80**; `Tactic.description`
  ≤ **500** (khớp `@db.VarChar(500)`).
- `schemaVersion` hiện tại là **1**; giá trị lớn hơn = lỗi rõ ràng, không cố đọc.
- Mọi thông báo lỗi người dùng thấy là **tiếng Việt**; comment và tên file là **tiếng Anh**.
- `/chien-thuat` **không** vào `ADMIN_PATH_PREFIXES` của `apps/web/proxy.ts`.
- Không dùng `forwardRef()` trong NestJS. Không tạo `tactics.public.ts`.
- Konva `Transformer` không dùng; đổi cỡ quân cờ bằng ba nút cỡ.
- Không dùng `localStorage`.
- Commit theo Conventional Commits, tiếng Anh, nhánh hiện tại `feat/tactics-board` (không commit vào
  `main`).

## Cấu trúc file

**`packages/shared`**

| File | Trách nhiệm |
|---|---|
| `enums/tactic.enum.ts` (mới) | `TACTIC_COLORS`, `TACTIC_STROKE_WIDTHS`, `TACTIC_TOKEN_SIZES`, `TACTIC_TOKEN_ICONS` + type |
| `enums/index.ts` (sửa) | export enum mới |
| `schemas/tactic.schema.ts` (mới) | union phần tử, `tacticStageSchema`, `tacticSceneSchema`, DTO body, shape trả về |
| `schemas/index.ts` (sửa) | export schema mới |

**`apps/api`**

| File | Trách nhiệm |
|---|---|
| `prisma/schema.prisma` (sửa) | `Tactic`, `TacticTokenPreset` |
| `prisma/migrations/<ts>_add_tactics/migration.sql` (sinh) | migration |
| `src/modules/tactics/tactics.codec.ts` (mới) | Prisma row → shape shared; **nơi duy nhất** mở `Prisma.JsonValue` |
| `src/modules/tactics/tactics.service.ts` (mới) | CRUD chiến thuật + preset |
| `src/modules/tactics/tactics.controller.ts` (mới) | 9 route, guard theo handler |
| `src/modules/tactics/dto/tactic.dto.ts` (mới) | DTO từ schema shared |
| `src/modules/tactics/tactics.module.ts` (mới) | module |
| `src/app.module.ts` (sửa) | đăng ký module |

**`apps/web`**

| File | Trách nhiệm |
|---|---|
| `config/routes.ts` (sửa) | `tactics`, `tacticEditor(id)` |
| `components/shared/nav-items.ts` (sửa) | mục **Chiến thuật** |
| `lib/page-banners.ts` (sửa) | khoá `tactics` |
| `lib/cache-graph.ts` (sửa) | topic `tactic` |
| `app/chien-thuat/page.tsx`, `app/chien-thuat/[id]/page.tsx` (mới) | hai trang mỏng |
| `features/tactics/api/tactics-api.ts`, `tactics-keys.ts` | fetch phía server + query key |
| `features/tactics/lib/*` | `built-in-tokens`, `token-icon`, `scene`, `hit-test`, `history`, `migrate-scene`, `export-image` |
| `features/tactics/store/editor-store.ts` | công cụ, màu, cỡ, giai đoạn, scene đang sửa, undo/redo |
| `features/tactics/hooks/*` | query/mutation + phím tắt + chặn rời trang |
| `features/tactics/components/*` | list screen, editor screen, toolbar, stage bar, palette, canvas, viewer, dialog |
| `features/tactics/types/tactic.ts` | type cục bộ của editor |

**`docs`**

| File | Trách nhiệm |
|---|---|
| `docs/architecture.md` (sửa) | §3.3 bảng module + bảng endpoint, §4.2 danh sách feature, §5 data model |

---

### Task 1: Enum và lược đồ scene trong `packages/shared`

**Files:**
- Create: `packages/shared/enums/tactic.enum.ts`
- Create: `packages/shared/schemas/tactic.schema.ts`
- Modify: `packages/shared/enums/index.ts`
- Modify: `packages/shared/schemas/index.ts`

**Interfaces:**
- Consumes: không có.
- Produces: `TACTIC_COLORS`, `TacticColor`, `TACTIC_STROKE_WIDTHS`, `TacticStrokeWidth`,
  `TACTIC_TOKEN_SIZES`, `TacticTokenSize`, `TACTIC_TOKEN_ICONS`, `TacticTokenIcon`,
  `tacticElementSchema`/`TacticElement`, `tacticStageSchema`/`TacticStage`,
  `tacticSceneSchema`/`TacticScene`, `TACTIC_SCHEMA_VERSION`, `saveTacticStagesSchema`,
  `createTacticSchema`, `updateTacticSchema`, `createTokenPresetSchema`,
  `tacticSummarySchema`/`TacticSummary`, `tacticDetailSchema`/`TacticDetail`,
  `tacticTokenPresetSchema`/`TacticTokenPreset`.

- [ ] **Step 1: Viết enum**

`packages/shared/enums/tactic.enum.ts`:

```ts
/** Drawing colours offered by the toolbar. Stored as keys, not hex: re-theming must not rewrite data. */
export const TACTIC_COLORS = ["red", "blue", "yellow", "white"] as const;

/** One of the four drawing colours. */
export type TacticColor = (typeof TACTIC_COLORS)[number];

/** Stroke widths offered by the toolbar, in virtual map units (1920x1071 space). */
export const TACTIC_STROKE_WIDTHS = [2, 4, 8, 14] as const;

/** One of the four stroke widths. */
export type TacticStrokeWidth = (typeof TACTIC_STROKE_WIDTHS)[number];

/** Token sizes. A token is resized by picking one of these, never by a free transform handle. */
export const TACTIC_TOKEN_SIZES = ["sm", "md", "lg"] as const;

/** One of the three token sizes. */
export type TacticTokenSize = (typeof TACTIC_TOKEN_SIZES)[number];

/**
 * Icon keys a token may carry. Keys, not free-form icon names: the web maps each one to a
 * `lucide-react` component, so an unknown key can never reach the canvas.
 */
export const TACTIC_TOKEN_ICONS = [
  "swords",
  "shield",
  "flag",
  "crosshair",
  "footprints",
  "eye",
  "target",
  "castle",
  "tent",
  "anchor",
  "bomb",
  "crown",
  "flame",
  "gem",
  "heart",
  "map-pin",
  "skull",
  "star",
  "truck",
  "users",
] as const;

/** One of the allowed token icon keys. */
export type TacticTokenIcon = (typeof TACTIC_TOKEN_ICONS)[number];
```

- [ ] **Step 2: Viết schema scene**

`packages/shared/schemas/tactic.schema.ts`:

```ts
import { z } from "zod";

import {
  TACTIC_COLORS,
  TACTIC_STROKE_WIDTHS,
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
const strokeWidthSchema = z.union(
  TACTIC_STROKE_WIDTHS.map((width) => z.literal(width)),
);
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
```

- [ ] **Step 3: Export**

Thêm `export * from "./tactic.enum";` vào `packages/shared/enums/index.ts` và
`export * from "./tactic.schema";` vào `packages/shared/schemas/index.ts`.

- [ ] **Step 4: Build shared, kiểm tra biên dịch**

Run: `pnpm --filter @guild/shared build`
Expected: không lỗi, sinh `packages/shared/dist/schemas/tactic.schema.js`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(tactics): add scene schema and enums to shared"
```

---

### Task 2: Bảng `Tactic` và `TacticTokenPreset`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_tactics/migration.sql` (Prisma sinh)

**Interfaces:**
- Consumes: không có.
- Produces: `prisma.tactic`, `prisma.tacticTokenPreset` trong `PrismaService`.

- [ ] **Step 1: Thêm model vào cuối `schema.prisma`**

```prisma
/// A guild war tactic drawing. Standalone: not tied to a week, not tied to a BattleSession.
model Tactic {
  id          String   @id @default(cuid())
  /// Display name, set by an admin.
  name        String
  description String?  @db.VarChar(500)
  /// Scene document: { schemaVersion, stages }, per tacticSceneSchema in @guild/shared.
  /// Untrusted on read - the service always parses it with Zod, never casts.
  stages      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([updatedAt])
}

/// A named token shared by every tactic. Global configuration like TeamName: it belongs to no
/// single tactic, so it carries no relation.
/// A token placed on the map does NOT point here - it captures label and icon (decision 3).
model TacticTokenPreset {
  id        String   @id @default(cuid())
  label     String   @db.VarChar(40)
  /// A key of TACTIC_TOKEN_ICONS (@guild/shared/enums), not a free-form icon name.
  icon      String
  /// Display order in the token palette.
  sortOrder Int
  createdAt DateTime @default(now())

  @@unique([label])
}
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm --filter api prisma:migrate -- --name add_tactics`
Expected: tạo thư mục migration mới, `CREATE TABLE "Tactic"` và `CREATE TABLE "TacticTokenPreset"`,
không có câu lệnh phá huỷ nào (bảng mới hoàn toàn).

- [ ] **Step 3: Kiểm tra trạng thái**

Run: `pnpm --filter api prisma:status`
Expected: `Database schema is up to date!`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(tactics): add tactic and token preset tables"
```

---

### Task 3: Codec — đọc `stages` ra khỏi `Json`

**Files:**
- Create: `apps/api/src/modules/tactics/tactics.codec.ts`
- Test: `apps/api/src/modules/tactics/__tests__/tactics.codec.spec.ts`

**Interfaces:**
- Consumes: `tacticSceneSchema`, `TacticScene`, `TacticSummary`, `TacticDetail`,
  `TacticTokenPreset`, `TACTIC_SCHEMA_VERSION` (Task 1).
- Produces:
  - `parseScene(raw: Prisma.JsonValue, tacticId: string, tacticName: string): TacticScene`
  - `emptyScene(): TacticScene`
  - `toSummary(row: TacticRow): TacticSummary`
  - `toDetail(row: TacticRow): TacticDetail`
  - `toPreset(row: TacticTokenPresetRow): TacticTokenPreset`
  - type `TacticRow = { id, name, description, stages, updatedAt }`

- [ ] **Step 1: Viết test hỏng trước**

`apps/api/src/modules/tactics/__tests__/tactics.codec.spec.ts`:

```ts
import { InternalServerErrorException } from '@nestjs/common';

import { emptyScene, parseScene, toDetail, toSummary } from '../tactics.codec';

describe('tactics.codec', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    stages: emptyScene() as unknown,
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  };

  it('starts a tactic with exactly one empty stage named "Giai đoạn 1"', () => {
    const scene = emptyScene();

    expect(scene.schemaVersion).toBe(1);
    expect(scene.stages).toHaveLength(1);
    expect(scene.stages[0].name).toBe('Giai đoạn 1');
    expect(scene.stages[0].elements).toEqual([]);
  });

  it('parses a stored scene back into the shared shape', () => {
    expect(parseScene(row.stages as never, row.id, row.name)).toEqual(
      emptyScene(),
    );
  });

  it('fails loudly, naming the tactic, when the stored scene is broken', () => {
    expect(() => parseScene({ nonsense: true } as never, 't1', 'Thủ cổng tây'))
      .toThrow(InternalServerErrorException);
    expect(() => parseScene({ nonsense: true } as never, 't1', 'Thủ cổng tây'))
      .toThrow(/Thủ cổng tây/);
  });

  it('refuses a scene written by a newer app version', () => {
    const future = { schemaVersion: 2, stages: [] };

    expect(() => parseScene(future as never, 't1', 'Thủ cổng tây')).toThrow(
      /phiên bản mới hơn/,
    );
  });

  it('summarises without the scene and counts the stages', () => {
    const summary = toSummary(row as never);

    expect(summary.stageCount).toBe(1);
    expect(summary).not.toHaveProperty('scene');
    expect(toDetail(row as never).scene).toEqual(emptyScene());
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter api test -- tactics.codec`
Expected: FAIL — `Cannot find module '../tactics.codec'`.

- [ ] **Step 3: Viết codec**

`apps/api/src/modules/tactics/tactics.codec.ts`:

```ts
import { InternalServerErrorException } from '@nestjs/common';
import {
  TACTIC_SCHEMA_VERSION,
  tacticSceneSchema,
  type TacticDetail,
  type TacticScene,
  type TacticSummary,
  type TacticTokenPreset,
} from '@guild/shared/schemas';

import type { Prisma } from '../../generated/prisma/client';

/** The columns every mapper here needs. Declared locally so the mappers stay pure functions. */
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
  // Checked before the schema so a future document gets its own sentence rather than the generic
  // "invalid literal" Zod would produce for `schemaVersion`.
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
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    stageCount: parseScene(row.stages, row.id, row.name).stages.length,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Map a row to the full tactic.
 * @param row - The tactic row
 * @returns The tactic with its whole scene
 */
export function toDetail(row: TacticRow): TacticDetail {
  const scene = parseScene(row.stages, row.id, row.name);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    stageCount: scene.stages.length,
    updatedAt: row.updatedAt.toISOString(),
    scene,
  };
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
```

Nhớ thêm `tacticTokenPresetSchema` vào import ở đầu file.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- tactics.codec`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tactics
git commit -m "feat(tactics): decode stored scene documents with zod"
```

---

### Task 4: Service `tactics`

**Files:**
- Create: `apps/api/src/modules/tactics/tactics.service.ts`
- Test: `apps/api/src/modules/tactics/__tests__/tactics.service.spec.ts`

**Interfaces:**
- Consumes: codec (Task 3), `PrismaService`.
- Produces: `TacticsService` với
  `list(): Promise<TacticSummary[]>`, `get(id): Promise<TacticDetail>`,
  `create(input: CreateTacticInput): Promise<TacticDetail>`,
  `update(id, input: UpdateTacticInput): Promise<TacticSummary>`,
  `saveStages(id, scene: TacticScene): Promise<TacticDetail>`,
  `remove(id): Promise<void>`,
  `listPresets(): Promise<TacticTokenPreset[]>`,
  `createPreset(input: CreateTokenPresetInput): Promise<TacticTokenPreset>`,
  `removePreset(id): Promise<void>`.

- [ ] **Step 1: Viết test hỏng trước**

`apps/api/src/modules/tactics/__tests__/tactics.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';

import { emptyScene } from '../tactics.codec';
import { TacticsService } from '../tactics.service';

/** Minimal Prisma double: only the delegates this service touches. */
function createPrisma() {
  return {
    tactic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tacticTokenPreset: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('TacticsService', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    stages: emptyScene() as unknown,
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  };

  it('creates a tactic holding one empty stage', async () => {
    const prisma = createPrisma();
    prisma.tactic.create.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    const created = await service.create({ name: 'Thủ cổng tây' });

    expect(prisma.tactic.create).toHaveBeenCalledWith({
      data: {
        name: 'Thủ cổng tây',
        description: undefined,
        stages: emptyScene(),
      },
    });
    expect(created.scene.stages).toHaveLength(1);
  });

  it('reports a missing tactic in Vietnamese', async () => {
    const prisma = createPrisma();
    prisma.tactic.findUnique.mockResolvedValue(null);
    const service = new TacticsService(prisma as never);

    await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    await expect(service.get('nope')).rejects.toThrow(
      'Không tìm thấy chiến thuật.',
    );
  });

  it('overwrites the whole scene, last writer wins', async () => {
    const prisma = createPrisma();
    prisma.tactic.findUnique.mockResolvedValue(row);
    prisma.tactic.update.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    await service.saveStages('t1', emptyScene());

    expect(prisma.tactic.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { stages: emptyScene() },
    });
  });

  it('rejects a duplicate preset label in Vietnamese', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([]);
    prisma.tacticTokenPreset.create.mockRejectedValue({ code: 'P2002' });
    const service = new TacticsService(prisma as never);

    await expect(
      service.createPreset({ label: 'Đội công', icon: 'swords' }),
    ).rejects.toThrow(ConflictException);
  });

  it('appends a new preset after the last sortOrder', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([
      { id: 'p1', label: 'Đội công', icon: 'swords', sortOrder: 3 },
    ]);
    prisma.tacticTokenPreset.create.mockResolvedValue({
      id: 'p2',
      label: 'Đội thủ',
      icon: 'shield',
      sortOrder: 4,
    });
    const service = new TacticsService(prisma as never);

    const created = await service.createPreset({
      label: 'Đội thủ',
      icon: 'shield',
    });

    expect(prisma.tacticTokenPreset.create).toHaveBeenCalledWith({
      data: { label: 'Đội thủ', icon: 'shield', sortOrder: 4 },
    });
    expect(created.sortOrder).toBe(4);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter api test -- tactics.service`
Expected: FAIL — `Cannot find module '../tactics.service'`.

- [ ] **Step 3: Viết service**

`apps/api/src/modules/tactics/tactics.service.ts`:

```ts
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

/** Prisma error code for "record to update/delete does not exist". */
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
   * Overwrite the whole scene. No optimistic locking: last writer wins (decision 7).
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
   * Delete a preset. Tactics already drawn keep their tokens (decision 3).
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
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- tactics.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tactics
git commit -m "feat(tactics): add tactics service with crud and presets"
```

---

### Task 5: Controller, DTO, module

**Files:**
- Create: `apps/api/src/modules/tactics/dto/tactic.dto.ts`
- Create: `apps/api/src/modules/tactics/tactics.controller.ts`
- Create: `apps/api/src/modules/tactics/tactics.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/tactics/__tests__/tactics.controller.spec.ts`

**Interfaces:**
- Consumes: `TacticsService` (Task 4), schema shared (Task 1), `AdminGuard`, `JwtAuthGuard`.
- Produces: 9 route trong bảng endpoint của spec; `TacticsModule` đăng ký trong `AppModule`.

- [ ] **Step 1: Viết test hỏng trước — guard đúng chỗ và tham số đi đúng service**

`apps/api/src/modules/tactics/__tests__/tactics.controller.spec.ts`:

```ts
import { AdminGuard, JwtAuthGuard } from '../../../common';
import { TacticsController } from '../tactics.controller';
import { emptyScene } from '../tactics.codec';

/** Guards Nest would apply to one handler of this controller. */
function guardsOf(handler: keyof TacticsController): unknown[] {
  return (
    Reflect.getMetadata('__guards__', TacticsController.prototype[handler]) ?? []
  );
}

describe('TacticsController', () => {
  const service = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    saveStages: jest.fn(),
    remove: jest.fn(),
    listPresets: jest.fn(),
    createPreset: jest.fn(),
    removePreset: jest.fn(),
  };
  const controller = new TacticsController(service as never);

  it('requires a session for the whole controller', () => {
    expect(Reflect.getMetadata('__guards__', TacticsController)).toContain(
      JwtAuthGuard,
    );
  });

  it.each([
    'create',
    'update',
    'saveStages',
    'remove',
    'createPreset',
    'removePreset',
  ] as const)('guards the write handler %s with AdminGuard', (handler) => {
    expect(guardsOf(handler)).toContain(AdminGuard);
  });

  it.each(['list', 'get', 'listPresets'] as const)(
    'leaves the read handler %s open to any member',
    (handler) => {
      expect(guardsOf(handler)).not.toContain(AdminGuard);
    },
  );

  it('passes the id and the scene through to the service', async () => {
    await controller.saveStages('t1', { scene: emptyScene() } as never);

    expect(service.saveStages).toHaveBeenCalledWith('t1', emptyScene());
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter api test -- tactics.controller`
Expected: FAIL — `Cannot find module '../tactics.controller'`.

- [ ] **Step 3: Viết DTO**

`apps/api/src/modules/tactics/dto/tactic.dto.ts`:

```ts
import {
  createTacticSchema,
  createTokenPresetSchema,
  saveTacticStagesSchema,
  updateTacticSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /tactics. */
export class CreateTacticDto extends createZodDto(createTacticSchema) {}

/** Body of PATCH /tactics/:id. */
export class UpdateTacticDto extends createZodDto(updateTacticSchema) {}

/** Body of PUT /tactics/:id/stages — the whole scene document. */
export class SaveTacticStagesDto extends createZodDto(saveTacticStagesSchema) {}

/** Body of POST /tactics/token-presets. */
export class CreateTokenPresetDto extends createZodDto(
  createTokenPresetSchema,
) {}
```

- [ ] **Step 4: Viết controller**

`apps/api/src/modules/tactics/tactics.controller.ts`:

```ts
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
  createPreset(
    @Body() body: CreateTokenPresetDto,
  ): Promise<TacticTokenPreset> {
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
```

- [ ] **Step 5: Viết module và đăng ký**

`apps/api/src/modules/tactics/tactics.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { TacticsController } from './tactics.controller';
import { TacticsService } from './tactics.service';

/**
 * The tactics board. Depends on nothing but Prisma, and nothing depends on it — which is why it
 * exports no service and carries no `tactics.public.ts`.
 */
@Module({
  controllers: [TacticsController],
  providers: [TacticsService],
})
export class TacticsModule {}
```

Trong `apps/api/src/app.module.ts`: import `TacticsModule` và thêm vào mảng `imports`, ngay sau
`TeamBuilderModule`.

- [ ] **Step 6: Chạy test và lint**

Run: `pnpm --filter api test -- tactics && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: PASS, không lỗi lint, không lỗi type.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src
git commit -m "feat(tactics): expose tactics endpoints with per-handler admin guard"
```

---

### Task 6: Giới hạn Zod đi qua API — test biên

**Files:**
- Test: `apps/api/src/modules/tactics/__tests__/tactic.schema.spec.ts`

**Interfaces:**
- Consumes: schema shared (Task 1).
- Produces: không có mã sản phẩm — task này chốt hợp đồng giới hạn.

- [ ] **Step 1: Viết test**

```ts
import {
  TACTIC_LIMITS,
  saveTacticStagesSchema,
  tacticSceneSchema,
} from '@guild/shared/schemas';

/**
 * Build a scene with a given number of stages, each holding a given number of text elements.
 * @param stageCount - How many stages
 * @param elementsPerStage - How many elements in each stage
 * @returns The scene document
 */
function sceneWith(stageCount: number, elementsPerStage: number) {
  return {
    schemaVersion: 1,
    stages: Array.from({ length: stageCount }, (_, stage) => ({
      id: `stage-${stage}`,
      name: `Giai đoạn ${stage + 1}`,
      elements: Array.from({ length: elementsPerStage }, (_, index) => ({
        kind: 'text' as const,
        id: `el-${stage}-${index}`,
        x: 10,
        y: 10,
        text: 'Tập kết',
        color: 'red' as const,
        fontSize: 24,
      })),
    })),
  };
}

describe('tactic scene limits', () => {
  it('accepts a scene at every ceiling', () => {
    const scene = sceneWith(
      TACTIC_LIMITS.stagesPerTactic,
      TACTIC_LIMITS.elementsPerStage,
    );

    expect(tacticSceneSchema.safeParse(scene).success).toBe(true);
  });

  it('rejects the 21st stage with a Vietnamese message', () => {
    const result = tacticSceneSchema.safeParse(
      sceneWith(TACTIC_LIMITS.stagesPerTactic + 1, 0),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Một chiến thuật tối đa 20 giai đoạn.',
    );
  });

  it('rejects the 401st element in one stage', () => {
    const result = tacticSceneSchema.safeParse(
      sceneWith(1, TACTIC_LIMITS.elementsPerStage + 1),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Một giai đoạn tối đa 400 phần tử.',
    );
  });

  it('rejects a freehand stroke past 4000 points', () => {
    const scene = {
      schemaVersion: 1,
      stages: [
        {
          id: 's1',
          name: 'Giai đoạn 1',
          elements: [
            {
              kind: 'freehand',
              id: 'f1',
              points: Array.from(
                { length: (TACTIC_LIMITS.pointsPerStroke + 1) * 2 },
                () => 1,
              ),
              color: 'red',
              strokeWidth: 4,
            },
          ],
        },
      ],
    };

    const result = tacticSceneSchema.safeParse(scene);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Nét vẽ quá dài.');
  });

  it('rejects a note past 80 characters', () => {
    const scene = sceneWith(1, 1);
    scene.stages[0].elements[0].text = 'a'.repeat(
      TACTIC_LIMITS.textLength + 1,
    );

    expect(tacticSceneSchema.safeParse(scene).success).toBe(false);
  });

  it('rejects a scene written by a newer schema version', () => {
    const scene = { ...sceneWith(1, 0), schemaVersion: 2 };

    expect(saveTacticStagesSchema.safeParse({ scene }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `pnpm --filter api test -- tactic.schema`
Expected: PASS. Nếu thông báo lệch, sửa **schema** cho khớp văn bản trong test (văn bản là thứ người
dùng đọc, nên nó là hợp đồng).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/tactics/__tests__
git commit -m "test(tactics): pin scene limits and their vietnamese messages"
```

---

### Task 7: Điều hướng, route, banner, cache topic

**Files:**
- Modify: `apps/web/config/routes.ts`
- Modify: `apps/web/components/shared/nav-items.ts`
- Modify: `apps/web/lib/page-banners.ts`
- Modify: `apps/web/lib/cache-graph.ts`
- Create: `apps/web/features/tactics/api/tactics-keys.ts`
- Create: `apps/web/features/tactics/api/tactics-api.ts`

**Interfaces:**
- Consumes: shape shared (Task 1), endpoint (Task 5).
- Produces: `ROUTES.tactics`, `tacticEditorPath(id)`, `PAGE_BANNERS.tactics`, cache topic
  `"tactic"`, `tacticKeys`, và các hàm `fetchTactics`, `fetchTactic`, `createTactic`,
  `updateTactic`, `saveTacticStages`, `deleteTactic`, `fetchTokenPresets`, `createTokenPreset`,
  `deleteTokenPreset`.

- [ ] **Step 1: Route**

Trong `apps/web/config/routes.ts` thêm `tactics: "/chien-thuat",` sau `teamBuilder`, rồi thêm ở cuối
file:

```ts
/**
 * Path of one tactic's editor.
 * @param id - Tactic id
 * @returns The editor route
 */
export function tacticEditorPath(id: string): string {
  return `${ROUTES.tactics}/${encodeURIComponent(id)}`;
}
```

- [ ] **Step 2: Nav và banner**

`nav-items.ts`: import `Swords` từ `lucide-react`, chèn giữa Xếp team và Thiết lập:

```ts
  {
    href: ROUTES.tactics,
    label: "Chiến thuật",
    shortLabel: "Chiến thuật",
    icon: Swords,
    adminOnly: false,
  },
```

`page-banners.ts`: thêm `"tactics"` vào `PageBannerKey` và:

```ts
  tactics: {
    src: "/img/bg/tactics.jpg",
    objectPosition: "center 45%",
    tint: "#83653E",
  },
```

- [ ] **Step 3: Cache topic**

`lib/cache-graph.ts`: thêm `"tactic"` vào `CACHE_TOPICS`, import `tacticKeys`, và thêm vào
`CACHE_DEPENDENTS`:

```ts
  /** Saving a tactic only touches the tactics board's own data. */
  tactic: () => [tacticKeys.all],
```

- [ ] **Step 4: Query key factory**

`apps/web/features/tactics/api/tactics-keys.ts`:

```ts
/**
 * Query key factory for the tactics domain.
 * Split out of `tactics-api.ts` because a `"use server"` file may only export async functions.
 */
export const tacticKeys = {
  all: ["tactics"] as const,
  list: () => [...tacticKeys.all, "list"] as const,
  detail: (id: string) => [...tacticKeys.all, "detail", id] as const,
  tokenPresets: () => [...tacticKeys.all, "token-presets"] as const,
};
```

- [ ] **Step 5: Lớp gọi API**

`apps/web/features/tactics/api/tactics-api.ts` (mở đầu bằng `"use server";`), mỗi hàm có doc comment
đủ `@param`/`@returns`/`@throws`:

```ts
"use server";

import type {
  CreateTacticInput,
  CreateTokenPresetInput,
  TacticDetail,
  TacticScene,
  TacticSummary,
  TacticTokenPreset,
  UpdateTacticInput,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { apiFetch } from "@/lib/api-client";

/** Arguments of `updateTactic`. `id` travels on the URL; only the fields are sent. */
export interface UpdateTacticArgs extends UpdateTacticInput {
  /** Id of the tactic being renamed */
  id: string;
}

/** Arguments of `saveTacticStages`. `id` travels on the URL; only the scene is sent. */
export interface SaveTacticStagesArgs {
  /** Id of the tactic being saved */
  id: string;
  /** The whole scene document */
  scene: TacticScene;
}

/**
 * Get every tactic, newest edit first.
 * @returns Tactic summaries, without their scenes
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchTactics(): Promise<TacticSummary[]> {
  return apiFetch<TacticSummary[]>("/tactics", { headers: await authHeader() });
}

/**
 * Get one tactic with its whole scene.
 * @param id - Tactic id
 * @returns The tactic
 * @throws ApiError when signed out, the tactic is gone (404), or its scene is corrupt (500)
 */
export async function fetchTactic(id: string): Promise<TacticDetail> {
  return apiFetch<TacticDetail>(`/tactics/${encodeURIComponent(id)}`, {
    headers: await authHeader(),
  });
}

/**
 * Create a tactic holding one empty stage.
 * @param input - name, and an optional description
 * @returns The tactic just created
 * @throws ApiError when signed out, not an admin (403), or the name is rejected (400)
 */
export async function createTactic(
  input: CreateTacticInput
): Promise<TacticDetail> {
  return apiFetch<TacticDetail>("/tactics", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Rename a tactic or rewrite its description.
 * @param input - id plus the fields to change
 * @returns The updated summary
 * @throws ApiError when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function updateTactic(
  input: UpdateTacticArgs
): Promise<TacticSummary> {
  const { id, ...fields } = input;

  return apiFetch<TacticSummary>(`/tactics/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
    headers: await authHeader(),
  });
}

/**
 * Overwrite a tactic's whole scene.
 * @param input - id and the scene to write
 * @returns The tactic with the scene just written
 * @throws ApiError when signed out, not an admin (403), or a limit is exceeded (400)
 */
export async function saveTacticStages(
  input: SaveTacticStagesArgs
): Promise<TacticDetail> {
  return apiFetch<TacticDetail>(
    `/tactics/${encodeURIComponent(input.id)}/stages`,
    {
      method: "PUT",
      body: JSON.stringify({ scene: input.scene }),
      headers: await authHeader(),
    }
  );
}

/**
 * Delete a tactic.
 * @param id - Tactic id
 * @throws ApiError when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function deleteTactic(id: string): Promise<void> {
  await apiFetch<void>(`/tactics/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

/**
 * Get the palette's saved presets.
 * @returns Presets in display order
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchTokenPresets(): Promise<TacticTokenPreset[]> {
  return apiFetch<TacticTokenPreset[]>("/tactics/token-presets", {
    headers: await authHeader(),
  });
}

/**
 * Add a preset to the palette.
 * @param input - label and icon key
 * @returns The preset just created
 * @throws ApiError when signed out, not an admin (403), or the label is taken (409)
 */
export async function createTokenPreset(
  input: CreateTokenPresetInput
): Promise<TacticTokenPreset> {
  return apiFetch<TacticTokenPreset>("/tactics/token-presets", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Delete a preset. Tactics already drawn keep the tokens they captured.
 * @param id - Preset id
 * @throws ApiError when signed out, not an admin (403), or the preset is gone (404)
 */
export async function deleteTokenPreset(id: string): Promise<void> {
  await apiFetch<void>(`/tactics/token-presets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add apps/web/config apps/web/components/shared/nav-items.ts apps/web/lib apps/web/features/tactics
git commit -m "feat(tactics): wire tactics route, nav entry and api layer"
```

---

### Task 8: Thư viện scene thuần — `built-in-tokens`, `scene`, `hit-test`, `history`, `migrate-scene`

**Files:**
- Create: `apps/web/features/tactics/lib/built-in-tokens.ts`
- Create: `apps/web/features/tactics/lib/token-icon.ts`
- Create: `apps/web/features/tactics/lib/scene.ts`
- Create: `apps/web/features/tactics/lib/hit-test.ts`
- Create: `apps/web/features/tactics/lib/history.ts`
- Create: `apps/web/features/tactics/lib/migrate-scene.ts`
- Create: `apps/web/features/tactics/types/tactic.ts`
- Test: `apps/web/features/tactics/__tests__/built-in-tokens.test.ts`, `scene.test.ts`,
  `hit-test.test.ts`, `history.test.ts`, `migrate-scene.test.ts`

**Interfaces:**
- Consumes: schema shared (Task 1).
- Produces:
  - `BUILT_IN_TOKENS: readonly BuiltInToken[]` với `BuiltInToken = { label: string; icon: TacticTokenIcon }`
  - `TOKEN_ICON_COMPONENTS: Record<TacticTokenIcon, LucideIcon>`, `tokenIcon(key)`
  - `TOKEN_RADIUS: Record<TacticTokenSize, number>`, `COLOR_HEX: Record<TacticColor, string>`
  - `addElement(stage, element)`, `removeElement(stage, elementId)`,
    `moveToken(stage, tokenId, x, y)`, `resizeToken(stage, tokenId, size)`,
    `renameStage(scene, stageId, name)`, `addStage(scene, name)`, `duplicateStage(scene, stageId)`,
    `removeStage(scene, stageId)` — tất cả trả về **đối tượng mới**
  - `hitTest(stage, point): string | null`
  - `createHistory()`, `pushHistory(history, stageId, elements)`, `undoHistory(history, stageId)`,
    `redoHistory(history, stageId)`, `HISTORY_LIMIT = 50`
  - `migrateScene(raw: unknown): TacticScene`

- [ ] **Step 1: Viết test hỏng cho `built-in-tokens`**

`apps/web/features/tactics/__tests__/built-in-tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TACTIC_TOKEN_ICONS } from "@guild/shared/enums";

import { BUILT_IN_TOKENS } from "../lib/built-in-tokens";
import { tokenIcon } from "../lib/token-icon";

describe("built-in tokens", () => {
  it("offers the seven roles and the ten numbered teams", () => {
    expect(BUILT_IN_TOKENS).toHaveLength(17);
    expect(BUILT_IN_TOKENS.slice(0, 7).map((token) => token.label)).toEqual([
      "Đội công",
      "Đội thủ",
      "Cơ động",
      "Trinh sát",
      "Tập kết",
      "Đội trụ",
      "Bảo tiêu",
    ]);
    expect(BUILT_IN_TOKENS.at(-1)?.label).toBe("Đội 10");
  });

  it("gives every token an icon the enum allows and the web can render", () => {
    for (const token of BUILT_IN_TOKENS) {
      expect(TACTIC_TOKEN_ICONS).toContain(token.icon);
      expect(tokenIcon(token.icon)).toBeTypeOf("function");
    }
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `pnpm --filter web test -- built-in-tokens`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết `built-in-tokens.ts` và `token-icon.ts`**

```ts
import type { TacticTokenIcon } from "@guild/shared/enums";

/** A token the palette always offers, independent of what an admin saved. */
export interface BuiltInToken {
  /** Label the token carries onto the map */
  label: string;
  /** Icon key, resolved to a component by `tokenIcon` */
  icon: TacticTokenIcon;
}

/**
 * The palette's fixed entries: seven roles, then the ten numbered teams.
 * The numbers are labels, NOT `TeamName` rows — a tactic is a snapshot of an old decision and must
 * not change when a team is renamed.
 */
export const BUILT_IN_TOKENS: readonly BuiltInToken[] = [
  { label: "Đội công", icon: "swords" },
  { label: "Đội thủ", icon: "shield" },
  { label: "Cơ động", icon: "footprints" },
  { label: "Trinh sát", icon: "eye" },
  { label: "Tập kết", icon: "flag" },
  { label: "Đội trụ", icon: "castle" },
  { label: "Bảo tiêu", icon: "truck" },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `Đội ${index + 1}`,
    icon: "users" as const,
  })),
];
```

`token-icon.ts` ánh xạ đủ 20 khoá của `TACTIC_TOKEN_ICONS` sang component `lucide-react`
(`Swords`, `Shield`, `Flag`, `Crosshair`, `Footprints`, `Eye`, `Target`, `Castle`, `Tent`, `Anchor`,
`Bomb`, `Crown`, `Flame`, `Gem`, `Heart`, `MapPin`, `Skull`, `Star`, `Truck`, `Users`) và export:

```ts
/**
 * Resolve an icon key to its component.
 * @param key - One of TACTIC_TOKEN_ICONS
 * @returns The lucide component to draw inside the token
 */
export function tokenIcon(key: TacticTokenIcon): LucideIcon {
  return TOKEN_ICON_COMPONENTS[key];
}
```

Cùng file thêm hằng hiển thị (giá trị theo map ảo):

```ts
/** Token circle radius per size, in virtual map units. */
export const TOKEN_RADIUS: Record<TacticTokenSize, number> = {
  sm: 22,
  md: 32,
  lg: 46,
};

/** Hex each drawing colour renders as. The stored value stays the key. */
export const COLOR_HEX: Record<TacticColor, string> = {
  red: "#e5484d",
  blue: "#3b82f6",
  yellow: "#f5c518",
  white: "#f5f5f5",
};
```

- [ ] **Step 4: Chạy lại, xác nhận xanh**

Run: `pnpm --filter web test -- built-in-tokens`
Expected: PASS.

- [ ] **Step 5: Viết test hỏng cho `scene`**

`apps/web/features/tactics/__tests__/scene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import {
  addElement,
  addStage,
  duplicateStage,
  moveToken,
  removeElement,
  removeStage,
  resizeToken,
} from "../lib/scene";

const token = {
  kind: "token" as const,
  id: "tk1",
  label: "Đội công",
  icon: "swords" as const,
  x: 100,
  y: 200,
  size: "md" as const,
  color: "red" as const,
};

const stage: TacticStage = {
  id: "s1",
  name: "Giai đoạn 1",
  elements: [token],
};

describe("scene edits", () => {
  it("adds an element without touching the original stage", () => {
    const next = addElement(stage, { ...token, id: "tk2" });

    expect(next.elements).toHaveLength(2);
    expect(stage.elements).toHaveLength(1);
    expect(next).not.toBe(stage);
  });

  it("removes an element by id", () => {
    expect(removeElement(stage, "tk1").elements).toEqual([]);
    expect(stage.elements).toHaveLength(1);
  });

  it("moves a token to new coordinates, leaving the old object intact", () => {
    const next = moveToken(stage, "tk1", 300, 400);

    expect(next.elements[0]).toMatchObject({ x: 300, y: 400 });
    expect(token.x).toBe(100);
  });

  it("resizes a token", () => {
    expect(resizeToken(stage, "tk1", "lg").elements[0]).toMatchObject({
      size: "lg",
    });
  });

  it("appends a stage with a generated name", () => {
    const scene = { schemaVersion: 1 as const, stages: [stage] };

    expect(addStage(scene).stages.at(-1)?.name).toBe("Giai đoạn 2");
  });

  it("duplicates a stage with fresh element ids", () => {
    const scene = { schemaVersion: 1 as const, stages: [stage] };
    const copy = duplicateStage(scene, "s1").stages[1];

    expect(copy.name).toBe("Giai đoạn 1 (bản sao)");
    expect(copy.elements[0].id).not.toBe("tk1");
    expect(copy.elements[0]).toMatchObject({ x: 100, y: 200 });
  });

  it("refuses to remove the last stage", () => {
    const scene = { schemaVersion: 1 as const, stages: [stage] };

    expect(removeStage(scene, "s1").stages).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Chạy, xác nhận hỏng, rồi viết `scene.ts`**

Run: `pnpm --filter web test -- scene` → FAIL.

Viết `scene.ts`: mọi hàm nhận scene/stage, trả bản sao mới (`map`, spread), id mới sinh bằng
`crypto.randomUUID()`. `removeStage` trả nguyên scene khi chỉ còn một giai đoạn. Mỗi hàm có doc
comment đầy đủ.

Run: `pnpm --filter web test -- scene`
Expected: PASS.

- [ ] **Step 7: Viết test hỏng cho `hit-test`**

```ts
import { describe, expect, it } from "vitest";

import { hitTest } from "../lib/hit-test";

const stage = {
  id: "s1",
  name: "Giai đoạn 1",
  elements: [
    {
      kind: "token" as const,
      id: "tk1",
      label: "Đội công",
      icon: "swords" as const,
      x: 100,
      y: 100,
      size: "md" as const,
      color: "red" as const,
    },
    {
      kind: "freehand" as const,
      id: "fh1",
      points: [400, 400, 500, 400],
      color: "blue" as const,
      strokeWidth: 8,
    },
  ],
};

describe("hitTest", () => {
  it("finds the token under the pointer", () => {
    expect(hitTest(stage, { x: 110, y: 105 })).toBe("tk1");
  });

  it("finds a freehand stroke the pointer is on", () => {
    expect(hitTest(stage, { x: 450, y: 402 })).toBe("fh1");
  });

  it("returns null when the pointer is on empty map", () => {
    expect(hitTest(stage, { x: 900, y: 900 })).toBeNull();
  });

  it("prefers the element drawn last when two overlap", () => {
    const overlapping = {
      ...stage,
      elements: [
        stage.elements[0],
        { ...stage.elements[0], id: "tk2" },
      ],
    };

    expect(hitTest(overlapping, { x: 100, y: 100 })).toBe("tk2");
  });
});
```

Viết `hit-test.ts`: duyệt `elements` **từ cuối về đầu** (phần tử vẽ sau nằm trên), `token` so bán
kính `TOKEN_RADIUS[size]`, `text` so hộp chữ, `arrow`/`freehand` so khoảng cách điểm-đoạn thẳng với
ngưỡng `max(strokeWidth, 12) / 2`.

Run: `pnpm --filter web test -- hit-test`
Expected: PASS.

- [ ] **Step 8: Viết test hỏng cho `history`**

```ts
import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "../lib/history";

describe("per-stage history", () => {
  it("undoes and redoes the latest change", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    history = pushHistory(history, "s1", [{ id: "a" } as never]);

    const undone = undoHistory(history, "s1");
    expect(undone.elements).toEqual([]);

    const redone = redoHistory(undone.history, "s1");
    expect(redone.elements).toEqual([{ id: "a" }]);
  });

  it("returns null elements when there is nothing to undo", () => {
    expect(undoHistory(createHistory(), "s1").elements).toBeNull();
  });

  it("keeps at most 50 steps, dropping the oldest", () => {
    let history = createHistory();
    for (let step = 0; step <= HISTORY_LIMIT + 5; step += 1) {
      history = pushHistory(history, "s1", [{ id: `e${step}` } as never]);
    }

    expect(history.past.s1).toHaveLength(HISTORY_LIMIT);
  });

  it("keeps two stages' stacks apart", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    history = pushHistory(history, "s2", [{ id: "b" } as never]);

    expect(undoHistory(history, "s1").elements).toEqual([]);
    expect(history.past.s2).toHaveLength(1);
  });

  it("drops the redo stack once a new edit is pushed", () => {
    let history = createHistory();
    history = pushHistory(history, "s1", []);
    const undone = undoHistory(history, "s1");
    const afterEdit = pushHistory(undone.history, "s1", [
      { id: "c" } as never,
    ]);

    expect(afterEdit.future.s1 ?? []).toHaveLength(0);
  });
});
```

Viết `history.ts` với shape `{ past: Record<string, TacticElement[][]>, future: Record<string, TacticElement[][]> }`,
mọi hàm thuần, `HISTORY_LIMIT = 50`.

Run: `pnpm --filter web test -- history`
Expected: PASS.

- [ ] **Step 9: Viết test hỏng cho `migrate-scene`**

```ts
import { describe, expect, it } from "vitest";
import { TACTIC_SCHEMA_VERSION } from "@guild/shared/schemas";

import { migrateScene } from "../lib/migrate-scene";

const scene = {
  schemaVersion: TACTIC_SCHEMA_VERSION,
  stages: [{ id: "s1", name: "Giai đoạn 1", elements: [] }],
};

describe("migrateScene", () => {
  it("passes a current scene through untouched", () => {
    expect(migrateScene(scene)).toEqual(scene);
  });

  it("throws a Vietnamese error for a newer document", () => {
    expect(() => migrateScene({ ...scene, schemaVersion: 2 })).toThrow(
      /phiên bản mới hơn/
    );
  });

  it("throws when the document does not parse at all", () => {
    expect(() => migrateScene({ nonsense: true })).toThrow(
      /không đọc được/
    );
  });
});
```

Viết `migrate-scene.ts`: đọc `schemaVersion`, lớn hơn bản app biết thì ném
`"Bản vẽ được lưu bằng phiên bản mới hơn của ứng dụng. Hãy tải lại trang."`; còn lại parse bằng
`tacticSceneSchema`, không parse được thì ném `"Bản vẽ không đọc được."`. Hôm nay chỉ có bản 1, nên
thân hàm là một nhánh — chỗ để thêm bước nâng cấp về sau.

Run: `pnpm --filter web test -- migrate-scene`
Expected: PASS.

- [ ] **Step 10: Chạy toàn bộ test web và commit**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ.

```bash
git add apps/web/features/tactics
git commit -m "feat(tactics): add pure scene, hit-test and history libraries"
```

---

### Task 9: Store Zustand của editor

**Files:**
- Create: `apps/web/features/tactics/store/editor-store.ts`
- Test: `apps/web/features/tactics/__tests__/editor-store.test.ts`

**Interfaces:**
- Consumes: `scene.ts`, `history.ts` (Task 8).
- Produces: `useTacticEditorStore` với state
  `{ tool, color, strokeWidth, scene, activeStageId, selectedElementId, paletteCollapsed, dirty, history }`
  và action `loadScene(scene)`, `setTool`, `setColor`, `setStrokeWidth`, `setActiveStage`,
  `selectElement`, `commit(stageId, elements)`, `undo()`, `redo()`, `addStage`, `duplicateStage`,
  `renameStage`, `removeStage`, `markSaved()`, `togglePalette()`, `reset()`.
  Type `TacticTool = "token" | "arrow" | "freehand" | "text" | "eraser"`.

- [ ] **Step 1: Viết test hỏng trước**

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { useTacticEditorStore } from "../store/editor-store";

const scene = {
  schemaVersion: 1 as const,
  stages: [
    { id: "s1", name: "Giai đoạn 1", elements: [] },
    { id: "s2", name: "Giai đoạn 2", elements: [] },
  ],
};

describe("tactic editor store", () => {
  beforeEach(() => {
    useTacticEditorStore.getState().reset();
  });

  it("loads a scene clean, landing on the first stage", () => {
    useTacticEditorStore.getState().loadScene(scene);

    const state = useTacticEditorStore.getState();
    expect(state.activeStageId).toBe("s1");
    expect(state.dirty).toBe(false);
  });

  it("marks the scene dirty on a commit and clean again after a save", () => {
    const store = useTacticEditorStore.getState();
    store.loadScene(scene);
    store.commit("s1", [
      {
        kind: "text",
        id: "t1",
        x: 1,
        y: 1,
        text: "Tập kết",
        color: "red",
        fontSize: 24,
      },
    ]);

    expect(useTacticEditorStore.getState().dirty).toBe(true);

    useTacticEditorStore.getState().markSaved();
    expect(useTacticEditorStore.getState().dirty).toBe(false);
  });

  it("undoes a commit back to the previous elements", () => {
    const store = useTacticEditorStore.getState();
    store.loadScene(scene);
    store.commit("s1", [
      {
        kind: "text",
        id: "t1",
        x: 1,
        y: 1,
        text: "Tập kết",
        color: "red",
        fontSize: 24,
      },
    ]);
    useTacticEditorStore.getState().undo();

    expect(useTacticEditorStore.getState().scene?.stages[0].elements).toEqual(
      []
    );
  });

  it("keeps stage operations out of the undo stack", () => {
    const store = useTacticEditorStore.getState();
    store.loadScene(scene);
    store.removeStage("s2");
    useTacticEditorStore.getState().undo();

    expect(useTacticEditorStore.getState().scene?.stages).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `pnpm --filter web test -- editor-store` → FAIL.

- [ ] **Step 3: Viết store**

Điểm bắt buộc:
- `commit(stageId, elements)` đẩy **elements trước khi sửa** vào `history` rồi ghi elements mới, và
  đặt `dirty: true`.
- `undo`/`redo` chỉ chạm elements của giai đoạn đang mở, không đụng danh sách giai đoạn.
- Thao tác giai đoạn (`addStage`, `duplicateStage`, `renameStage`, `removeStage`) đặt `dirty: true`
  nhưng **không** đẩy vào history.
- `reset()` trả store về state ban đầu, `scene: null`.
- Mọi cập nhật tạo đối tượng mới, gọi hàm thuần ở `lib/scene.ts`.

Run: `pnpm --filter web test -- editor-store`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/tactics
git commit -m "feat(tactics): add editor store with per-stage undo"
```

---

### Task 10: Trang danh sách `/chien-thuat`

**Files:**
- Create: `apps/web/app/chien-thuat/page.tsx`
- Create: `apps/web/features/tactics/components/tactic-list-screen.tsx`
- Create: `apps/web/features/tactics/components/tactic-form-dialog.tsx`
- Create: `apps/web/features/tactics/hooks/use-tactics.ts`,
  `use-create-tactic.ts`, `use-update-tactic.ts`, `use-delete-tactic.ts`
- Create: `apps/web/features/tactics/index.ts`
- Test: `apps/web/features/tactics/__tests__/tactic-list-screen.test.tsx`

**Interfaces:**
- Consumes: `tacticKeys`, hàm API (Task 7); `ROUTES.tactics`, `tacticEditorPath` (Task 7).
- Produces: `TacticListScreen`, `TacticFormDialog`, hook `useTactics`, `useCreateTactic`,
  `useUpdateTactic`, `useDeleteTactic`; `features/tactics/index.ts` export
  `TacticListScreen` và `TacticEditorScreen` (Task 12).

- [ ] **Step 1: Viết test hỏng trước**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TacticListScreen } from "../components/tactic-list-screen";

vi.mock("../hooks/use-tactics", () => ({
  useTactics: () => ({
    data: [
      {
        id: "t1",
        name: "Thủ cổng tây",
        description: "Giữ cổng 3 phút đầu",
        stageCount: 3,
        updatedAt: "2026-09-20T10:00:00.000Z",
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

describe("TacticListScreen", () => {
  it("lists a tactic with its stage count", () => {
    render(<TacticListScreen isAdmin={false} />);

    expect(screen.getByText("Thủ cổng tây")).toBeTruthy();
    expect(screen.getByText(/3 giai đoạn/)).toBeTruthy();
  });

  it("hides the create button from a member", () => {
    render(<TacticListScreen isAdmin={false} />);

    expect(screen.queryByRole("button", { name: /Tạo chiến thuật/ })).toBeNull();
  });

  it("shows the create button to an admin", () => {
    render(<TacticListScreen isAdmin />);

    expect(
      screen.getByRole("button", { name: /Tạo chiến thuật/ })
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `pnpm --filter web test -- tactic-list-screen` → FAIL.

- [ ] **Step 3: Viết hook**

Theo đúng khuôn `use-formations.ts` / `use-save-formation.ts`: `useQuery` với `tacticKeys.list()`,
mutation dùng `useInvalidate("tactic")`.

- [ ] **Step 4: Viết `TacticListScreen`**

- `PageHeader` với `PAGE_BANNERS.tactics`, tiêu đề "Chiến thuật".
- Trạng thái: `Skeleton` khi `isPending`, `ErrorState` khi `isError`, `EmptyState`
  ("Chưa có chiến thuật nào.") khi rỗng.
- Mỗi chiến thuật là một `Card`: tên, mô tả, `<n> giai đoạn`, thời điểm sửa cuối, `Link` tới
  `tacticEditorPath(id)`.
- Nút **Tạo chiến thuật**, **Sửa tên**, **Xoá** chỉ hiện khi `isAdmin`; xoá phải qua hộp thoại xác
  nhận.
- `TacticFormDialog` dùng cho cả tạo lẫn đổi tên (`name`, `description`), hiển thị nguyên văn thông
  báo lỗi từ `ApiError`.

- [ ] **Step 5: Viết trang**

`apps/web/app/chien-thuat/page.tsx`:

```tsx
import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { WEB_AUTH_ERROR } from "@/features/auth";
import { getSession } from "@/features/auth/server";
import { TacticListScreen } from "@/features/tactics";

export const metadata: Metadata = {
  title: "Chiến thuật — Mèo Mập Giang Hồ",
  description: "Bảng chiến thuật bang chiến",
};

/**
 * Route "/chien-thuat" — the tactics list. Every signed-in member may read it; only an admin sees
 * the buttons that write, and the API is what actually enforces that.
 * @returns The tactics list page
 */
export default async function TacticsPage() {
  const session = await getSession();

  if (!session) {
    redirect(`${ROUTES.login}?error=${WEB_AUTH_ERROR.sessionExpired}`);
  }

  return <TacticListScreen isAdmin={canManageGuild(session.role)} />;
}
```

Kiểm tra tên hằng lỗi thật trong `features/auth` trước khi dùng; nếu khác, dùng đúng hằng của repo.

- [ ] **Step 6: Chạy test và typecheck**

Run: `pnpm --filter web test -- tactic-list-screen && pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(tactics): add tactics list screen"
```

---

### Task 11: Canvas Konva — vẽ, kéo thả, tẩy

**Files:**
- Modify: `apps/web/package.json` (thêm `konva`, `react-konva`)
- Create: `apps/web/features/tactics/components/tactic-canvas.tsx`
- Create: `apps/web/features/tactics/components/tactic-stage-view.tsx`
- Create: `apps/web/features/tactics/hooks/use-stage-size.ts`
- Test: `apps/web/features/tactics/__tests__/stage-scale.test.ts`

**Interfaces:**
- Consumes: store (Task 9), `scene.ts`, `hit-test.ts`, `token-icon.ts` (Task 8).
- Produces:
  - `stageScale(stageWidth: number): number` và `toMapPoint(pointer, scale)` trong
    `lib/stage-scale.ts`
  - `TacticStageView` — thành phần Konva thuần, nhận `{ stage, scale, readOnly, onPointerDown, … }`
  - `TacticCanvas` — vỏ `next/dynamic({ ssr: false })` quanh `TacticStageView`

- [ ] **Step 1: Cài phụ thuộc**

Run: `pnpm --filter web add konva react-konva`
Expected: hai gói vào `apps/web/package.json`, `pnpm-lock.yaml` đổi. **Không** thêm vào root.

- [ ] **Step 2: Viết test hỏng cho tỉ lệ**

`apps/web/features/tactics/__tests__/stage-scale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import { stageScale, toMapPoint } from "../lib/stage-scale";

describe("stage scale", () => {
  it("is 1 when the stage is exactly the map's width", () => {
    expect(stageScale(TACTIC_MAP_WIDTH)).toBe(1);
  });

  it("halves when the stage is half the map's width", () => {
    expect(stageScale(TACTIC_MAP_WIDTH / 2)).toBe(0.5);
  });

  it("maps a screen pointer back into map space", () => {
    expect(toMapPoint({ x: 100, y: 50 }, 0.5)).toEqual({ x: 200, y: 100 });
  });

  it("keeps the map's aspect ratio", () => {
    const scale = stageScale(960);

    expect(TACTIC_MAP_HEIGHT * scale).toBeCloseTo(TACTIC_MAP_HEIGHT / 2);
  });
});
```

- [ ] **Step 3: Chạy, xác nhận hỏng, rồi viết `lib/stage-scale.ts`**

```ts
import { TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

/**
 * Scale factor between the virtual map space and the stage on screen.
 * One factor for both axes is what makes a tactic drawn on a 27" screen line up on a 13" one.
 * @param stageWidth - Width the stage is rendered at, in CSS pixels
 * @returns The factor to give Konva's `scaleX`/`scaleY`
 */
export function stageScale(stageWidth: number): number {
  return stageWidth / TACTIC_MAP_WIDTH;
}

/**
 * Convert a pointer position on the stage back into map coordinates.
 * @param pointer - Pointer position as Konva reports it
 * @param scale - The factor `stageScale` returned
 * @returns The point in virtual map space
 */
export function toMapPoint(
  pointer: { x: number; y: number },
  scale: number
): { x: number; y: number } {
  return { x: pointer.x / scale, y: pointer.y / scale };
}
```

Run: `pnpm --filter web test -- stage-scale`
Expected: PASS.

- [ ] **Step 4: Viết `TacticStageView`**

- Một `Stage` với `scaleX={scale} scaleY={scale}`, `width = TACTIC_MAP_WIDTH * scale`,
  `height = TACTIC_MAP_HEIGHT * scale`.
- `Layer` dưới: `KonvaImage` nạp `/img/map-guild-war.webp` bằng `new Image()` trong `useEffect`.
- `Layer` trên: `switch (element.kind)` với bốn nhánh (`token`, `arrow`, `freehand`, `text`) và
  `default: return assertNever(element)`.
- `token`: `Group` (`draggable` khi không `readOnly`) chứa `Circle` (bán kính `TOKEN_RADIUS[size]`,
  viền `COLOR_HEX[color]`), `Path`/`Text` icon và nhãn phía dưới.
- Kéo xong gọi `onTokenMoved(id, x, y)` **theo toạ độ map** (chia cho `scale`).
- `onPointerDown`/`onPointerMove`/`onPointerUp` trả điểm đã `toMapPoint` lên trên.

- [ ] **Step 5: Viết `TacticCanvas`**

```tsx
"use client";

import dynamic from "next/dynamic";

/**
 * The Konva stage, loaded in the browser only — Konva needs `window`, so server rendering it
 * crashes the page.
 */
export const TacticCanvas = dynamic(
  () => import("./tactic-stage-view").then((mod) => mod.TacticStageView),
  { ssr: false }
);
```

`use-stage-size.ts` đo bề rộng vùng chứa bằng `ResizeObserver` và trả `{ ref, width }`.

- [ ] **Step 6: Typecheck và lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(tactics): draw the tactic scene on a konva stage"
```

---

### Task 12: Màn editor `/chien-thuat/[id]`

**Files:**
- Create: `apps/web/app/chien-thuat/[id]/page.tsx`
- Create: `apps/web/features/tactics/components/tactic-editor-screen.tsx`,
  `editor-toolbar.tsx`, `stage-bar.tsx`, `token-palette.tsx`, `mobile-editor-notice.tsx`
- Create: `apps/web/features/tactics/hooks/use-tactic.ts`, `use-save-tactic.ts`,
  `use-tactic-editor.ts`, `use-editor-shortcuts.ts`, `use-unsaved-guard.ts`
- Modify: `apps/web/features/tactics/index.ts`
- Test: `apps/web/features/tactics/__tests__/editor-toolbar.test.tsx`,
  `mobile-editor-notice.test.tsx`

**Interfaces:**
- Consumes: store (Task 9), canvas (Task 11), API (Task 7), `migrateScene` (Task 8).
- Produces: `TacticEditorScreen`, `EditorToolbar`, `StageBar`, `TokenPalette`,
  `MobileEditorNotice`, hook `useTactic(id)`, `useSaveTactic()`, `useTacticEditor(id)`.

- [ ] **Step 1: Viết test hỏng cho toolbar**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EditorToolbar } from "../components/editor-toolbar";

const baseProps = {
  tool: "token" as const,
  color: "red" as const,
  strokeWidth: 4 as const,
  canUndo: true,
  canRedo: false,
  saving: false,
  isAdmin: true,
  onToolChange: vi.fn(),
  onColorChange: vi.fn(),
  onStrokeWidthChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onSave: vi.fn(),
  onExport: vi.fn(),
};

describe("EditorToolbar", () => {
  it("marks the active tool as pressed", () => {
    render(<EditorToolbar {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "Đội hình" }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("reports the tool the user picked", async () => {
    render(<EditorToolbar {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Tẩy" }));

    expect(baseProps.onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("disables redo when there is nothing to redo", () => {
    render(<EditorToolbar {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "Làm lại" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("hides the export button from a member", () => {
    render(<EditorToolbar {...baseProps} isAdmin={false} />);

    expect(screen.queryByRole("button", { name: /Xuất/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng, rồi viết `EditorToolbar`**

Năm công cụ (`Đội hình`, `Mũi tên`, `Vẽ tự do`, `Chữ`, `Tẩy`), bốn màu, bốn cỡ nét, `Hoàn tác`,
`Làm lại`, `Lưu`, `Xuất`. Nút cỡ quân cờ (`S`, `M`, `L`) chỉ hiện khi đang chọn một quân.

Run: `pnpm --filter web test -- editor-toolbar` → PASS.

- [ ] **Step 3: `StageBar` và `TokenPalette`**

- `StageBar`: tab từng giai đoạn (dấu `*` khi chưa lưu), nút `+ Thêm giai đoạn`, `⧉ Nhân bản`, đổi
  tên tại chỗ, xoá có hộp thoại xác nhận. Khi đủ 20 giai đoạn, nút thêm bị vô hiệu kèm tiêu đề
  "Một chiến thuật tối đa 20 giai đoạn."
- `TokenPalette`: `BUILT_IN_TOKENS` rồi tới preset từ `useTokenPresets()`; collapse được, trạng thái
  nằm trong store; nút `+ Thêm đội` mở `TokenPresetDialog` (Task 14) chỉ khi `isAdmin`.

- [ ] **Step 4: `useTacticEditor` — nối query, store, lưu**

- `useTactic(id)` đọc dữ liệu đã lưu; khi `data` về, gọi `loadScene(migrateScene(data.scene))`
  **một lần** (theo dõi id đã nạp), sau đó store làm chủ.
- `useSaveTactic()` = `useMutation({ mutationFn: saveTacticStages, onSuccess: invalidate })` với
  topic `"tactic"`; thành công thì gọi `markSaved()`, thất bại thì **giữ nguyên** scene đang sửa và
  hiển thị nguyên văn thông báo lỗi.
- `useEditorShortcuts`: `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+S`; chỉ gắn khi editor mở và
  `document.activeElement` không phải `input`/`textarea`/`[contenteditable]`.
- `useUnsavedGuard(dirty)`: `beforeunload` khi `dirty`.

- [ ] **Step 5: `MobileEditorNotice` + test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MobileEditorNotice } from "../components/mobile-editor-notice";

describe("MobileEditorNotice", () => {
  it("tells a phone user where to draw", () => {
    render(<MobileEditorNotice />);

    expect(
      screen.getByText("Mở trên máy tính để vẽ chiến thuật.")
    ).toBeTruthy();
  });
});
```

`TacticEditorScreen` dựng: dưới `lg` hiện `TacticViewer` (Task 13) kèm `MobileEditorNotice`; từ `lg`
trở lên hiện đủ toolbar, stage bar, palette, canvas. Chọn bằng lớp Tailwind (`hidden lg:flex` /
`lg:hidden`), không `matchMedia`, để không có nhấp nháy khi hydrate.

`UnsavedChangesBar` dùng lại nguyên: `message` = `"<n> thay đổi chưa lưu"`, `resetLabel` =
`"Bỏ thay đổi"`, `undo` nối vào `undo()` của store.

- [ ] **Step 6: Trang editor**

`apps/web/app/chien-thuat/[id]/page.tsx` — giống trang danh sách nhưng đọc `params.id`, chỉ yêu cầu
phiên đăng nhập, truyền `isAdmin`.

- [ ] **Step 7: Chạy test, typecheck, lint**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(tactics): add the tactic editor screen"
```

---

### Task 13: Trang xem chỉ đọc

**Files:**
- Create: `apps/web/features/tactics/components/tactic-viewer.tsx`
- Test: `apps/web/features/tactics/__tests__/tactic-viewer.test.tsx`

**Interfaces:**
- Consumes: `TacticCanvas` (Task 11), `TacticDetail` (Task 1).
- Produces: `TacticViewer` nhận `{ tactic: TacticDetail }`, tự giữ giai đoạn đang xem.

- [ ] **Step 1: Viết test hỏng trước**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TacticViewer } from "../components/tactic-viewer";

vi.mock("../components/tactic-canvas", () => ({
  TacticCanvas: ({ stage }: { stage: { name: string } }) => (
    <div data-testid="canvas">{stage.name}</div>
  ),
}));

const tactic = {
  id: "t1",
  name: "Thủ cổng tây",
  description: null,
  stageCount: 2,
  updatedAt: "2026-09-20T10:00:00.000Z",
  scene: {
    schemaVersion: 1 as const,
    stages: [
      { id: "s1", name: "Giai đoạn 1", elements: [] },
      { id: "s2", name: "Giai đoạn 2", elements: [] },
    ],
  },
};

describe("TacticViewer", () => {
  it("opens on the first stage", () => {
    render(<TacticViewer tactic={tactic} />);

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 1");
  });

  it("switches stage from the tabs", async () => {
    render(<TacticViewer tactic={tactic} />);
    await userEvent.click(screen.getByRole("tab", { name: "Giai đoạn 2" }));

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 2");
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng, rồi viết `TacticViewer`**

Canvas `readOnly`, tab giai đoạn, pinch zoom và pan trên mobile (`Stage` với `draggable` và
`onWheel`/`onTouchMove` đổi `scale` trong khoảng 1× đến 3× so với tỉ lệ vừa khung).

Run: `pnpm --filter web test -- tactic-viewer`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/features/tactics
git commit -m "feat(tactics): add the read-only tactic viewer"
```

---

### Task 14: Quân cờ tự đặt tên (preset)

**Files:**
- Create: `apps/web/features/tactics/components/token-preset-dialog.tsx`
- Create: `apps/web/features/tactics/hooks/use-token-presets.ts`,
  `use-create-token-preset.ts`, `use-delete-token-preset.ts`
- Test: `apps/web/features/tactics/__tests__/token-preset-dialog.test.tsx`

**Interfaces:**
- Consumes: `fetchTokenPresets`, `createTokenPreset`, `deleteTokenPreset` (Task 7);
  `TOKEN_ICON_COMPONENTS` (Task 8).
- Produces: `TokenPresetDialog` nhận `{ open, onOpenChange }`; hook query/mutation tương ứng.

- [ ] **Step 1: Viết test hỏng trước**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TokenPresetDialog } from "../components/token-preset-dialog";

const createPreset = vi.fn().mockResolvedValue(undefined);

vi.mock("../hooks/use-token-presets", () => ({
  useTokenPresets: () => ({ data: [], isPending: false }),
}));
vi.mock("../hooks/use-create-token-preset", () => ({
  useCreateTokenPreset: () => ({ mutateAsync: createPreset, isPending: false }),
}));
vi.mock("../hooks/use-delete-token-preset", () => ({
  useDeleteTokenPreset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("TokenPresetDialog", () => {
  it("sends the label and the picked icon", async () => {
    render(<TokenPresetDialog open onOpenChange={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Tên quân cờ"),
      "Đội cảm tử"
    );
    await userEvent.click(screen.getByRole("radio", { name: "skull" }));
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

    expect(createPreset).toHaveBeenCalledWith({
      label: "Đội cảm tử",
      icon: "skull",
    });
  });

  it("refuses an empty label without calling the API", async () => {
    render(<TokenPresetDialog open onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Thêm" }));

    expect(createPreset).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận hỏng, rồi viết dialog + hook**

Lưới 20 icon dạng radio, ô nhập tên giới hạn 40 ký tự, danh sách preset đã lưu kèm nút xoá có xác
nhận ("Xoá quân cờ này? Chiến thuật đã vẽ không đổi."), lỗi backend (`409` trùng tên) hiển thị
nguyên văn.

Run: `pnpm --filter web test -- token-preset-dialog`
Expected: PASS.

- [ ] **Step 3: Nối vào `TokenPalette`** — nút `+ Thêm đội` mở dialog, chỉ khi `isAdmin`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/tactics
git commit -m "feat(tactics): manage reusable token presets"
```

---

### Task 15: Xuất ảnh và ZIP

**Files:**
- Modify: `apps/web/package.json` (thêm `jszip`)
- Create: `apps/web/features/tactics/lib/export-image.ts`
- Create: `apps/web/features/tactics/components/export-dialog.tsx`
- Test: `apps/web/features/tactics/__tests__/export-image.test.ts`

**Interfaces:**
- Consumes: `TacticDetail` (Task 1).
- Produces:
  - `exportFileName(tacticName: string, index: number, stageName: string): string`
  - `exportStagePng(stage: Konva.Stage): string` (bọc `toDataURL({ pixelRatio: 2 })`)
  - `buildStagesZip(files: { name: string; dataUrl: string }[]): Promise<Blob>`
  - `ExportDialog` nhận `{ open, onOpenChange, tactic, captureStage }`

- [ ] **Step 1: Cài `jszip`**

Run: `pnpm --filter web add jszip`

- [ ] **Step 2: Viết test hỏng cho tên file**

```ts
import { describe, expect, it } from "vitest";

import { exportFileName } from "../lib/export-image";

describe("exportFileName", () => {
  it("joins the tactic, the number and the stage", () => {
    expect(exportFileName("Thủ cổng tây", 1, "Giai đoạn 1")).toBe(
      "Thủ cổng tây-1-Giai đoạn 1.png"
    );
  });

  it("replaces the characters a file system refuses", () => {
    expect(exportFileName("A/B", 2, "C:D")).toBe("A-B-2-C-D.png");
  });
});
```

- [ ] **Step 3: Chạy, xác nhận hỏng, rồi viết `export-image.ts`**

Run: `pnpm --filter web test -- export-image`
Expected: PASS sau khi viết.

- [ ] **Step 4: Viết `ExportDialog`**

Hai lựa chọn: **Giai đoạn đang mở** (tải một `.png`) và **Tất cả giai đoạn** (render lần lượt từng
giai đoạn vào một `Stage` ẩn rồi gói `jszip`, tải một `.zip`). Dialog chỉ mở được khi `isAdmin`; nút
mở nó đã bị ẩn với `MEMBER` ở Task 12.

- [ ] **Step 5: Chạy toàn bộ test web, lint, typecheck**

Run: `pnpm --filter web test && pnpm --filter web lint && pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(tactics): export stages as png and zip"
```

---

### Task 16: Cập nhật tài liệu và kiểm tra cuối

**Files:**
- Modify: `docs/architecture.md`

**Interfaces:**
- Consumes: mọi task trước.
- Produces: tài liệu khớp mã nguồn.

- [ ] **Step 1: `docs/architecture.md` §3.3**

Thêm vào bảng module:

```markdown
| `tactics` | Bản vẽ chiến thuật bang chiến và bảng quân cờ dùng chung | Bearer để đọc; Admin để ghi (guard trên từng handler) |
```

Thêm vào bảng endpoint, sau khối `team-builder`:

```markdown
| `GET` | `/tactics` | Danh sách chiến thuật, không kèm bản vẽ | Bearer |
| `GET` | `/tactics/:id` | Một chiến thuật kèm toàn bộ bản vẽ | Bearer |
| `POST` | `/tactics` | Tạo chiến thuật | Admin |
| `PATCH` | `/tactics/:id` | Đổi tên, mô tả | Admin |
| `PUT` | `/tactics/:id/stages` | Ghi đè toàn bộ bản vẽ | Admin |
| `DELETE` | `/tactics/:id` | Xoá chiến thuật | Admin |
| `GET` | `/tactics/token-presets` | Danh sách quân cờ tự đặt | Bearer |
| `POST` | `/tactics/token-presets` | Thêm quân cờ | Admin |
| `DELETE` | `/tactics/token-presets/:id` | Xoá quân cờ | Admin |
```

- [ ] **Step 2: §4.2, §5, §8**

- §4.2: thêm `tactics` vào danh sách feature.
- §5: mô tả `Tactic` (cột `stages` là tài liệu JSON có `schemaVersion`, parse bằng Zod khi đọc) và
  `TacticTokenPreset` (cấu hình toàn cục, không quan hệ), ghi rõ chúng đứng riêng như `TeamName` và
  `BotChannel`.
- §8: bổ sung `PUT /tactics/:id/stages` vào đoạn "không khoá lạc quan".

- [ ] **Step 3: Chạy toàn bộ kiểm tra**

Run:

```bash
pnpm --filter @guild/shared build
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
```

Expected: tất cả PASS. Bất kỳ test hỏng hay cảnh báo lint nào — kể cả của phần khác — đều phải sửa
trước khi đóng task.

- [ ] **Step 4: Kiểm tra thật trên trình duyệt**

Run: `pnpm --filter api dev` và `pnpm --filter web dev`, rồi đi hết luồng: tạo chiến thuật → kéo quân
ra map → vẽ mũi tên → thêm giai đoạn → `Ctrl+Z` → `Ctrl+S` → tải lại trang thấy đúng bản vẽ → mở
`/chien-thuat/<id>` bằng tài khoản `MEMBER` thấy bản xem chỉ đọc, không có nút ghi và không có nút
xuất ảnh → thu nhỏ cửa sổ dưới `lg` thấy `mobile-editor-notice`.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs(tactics): document the tactics module and its endpoints"
```
