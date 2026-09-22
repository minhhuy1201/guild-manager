# Animation chuyển giai đoạn bảng chiến thuật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi đổi giai đoạn, mỗi quân cờ trượt thẳng từ vị trí cũ sang vị trí mới trong 280ms; đi lùi
là chuyển động đảo lại. Kèm nút Play, onion skin và vệt đuôi.

**Architecture:** Một module thuần (`lib/stage-transition.ts`) nhận hai `TacticStage` cộng `t ∈ [0,1]`
và trả về một `StageFrame` đã nội suy xong. Một hook (`use-stage-transition.ts`) chỉ đẩy `t` theo
`requestAnimationFrame`. `TacticStageView` đổi prop `stage` thành `frame`, nên canvas chỉ còn đúng
một đường vẽ cho cả lúc đứng yên lẫn lúc chạy.

**Tech Stack:** Next.js 16 · React 19 · react-konva · Zustand · Vitest + @testing-library/react ·
`@guild/shared` (Zod schema dùng chung)

**Spec:** [`docs/superpowers/specs/2026-09-23-tactic-stage-animation-design.md`](../specs/2026-09-23-tactic-stage-animation-design.md)

## Global Constraints

- Mọi lệnh chạy qua `pnpm --filter web …`. Thư mục gốc không có script nào.
- **Code, tên file và comment viết bằng tiếng Anh.** Chuỗi hiển thị cho người dùng viết tiếng Việt.
  Tài liệu trong `docs/superpowers` viết tiếng Việt.
- **Mỗi hàm có một doc comment tiếng Anh** (JSDoc): mục đích, từng tham số, giá trị trả về. Trong
  thân hàm chỉ comment cái không hiển nhiên.
- **Không đột biến dữ liệu.** Mọi hàm trong `lib/` trả về đối tượng mới.
- **Switch trên trường phân biệt phải kết bằng `assertNever`** (`@guild/shared/lib`).
- **Không dùng dấu gạch dài** trong mọi văn bản sinh ra.
- Không giá trị ma: ngưỡng, thời lượng, opacity phải là hằng số có tên.
- Commit theo Conventional Commits, tiếng Anh, chữ thường, thể mệnh lệnh, không dấu chấm cuối:
  `<type>(<scope>): <description>`. Scope của toàn bộ plan này là `tactics`.
- Không đụng `packages/shared`, `apps/api`, lược đồ Prisma, biến môi trường, endpoint.
- Không đổi `TACTIC_SCHEMA_VERSION` (đang là 2).
- Hằng số chốt: `TRANSITION_MS = 280`, `PLAYBACK_DWELL_MS = 900`.
- Chạy trên nhánh `feat/tactic-stage-animation`. Không commit vào `main`.

---

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `apps/web/features/tactics/lib/stage-transition.ts` (mới) | Toàn bộ quy tắc chuyển động, dạng hàm thuần. Không import React, không import Konva |
| `apps/web/features/tactics/hooks/use-reduced-motion.ts` (mới) | Đọc `prefers-reduced-motion`, theo đúng khuôn `use-is-desktop.ts` |
| `apps/web/features/tactics/hooks/use-stage-transition.ts` (mới) | Đẩy `t` theo `requestAnimationFrame`, xử lý ngắt giữa chừng |
| `apps/web/features/tactics/hooks/use-stage-playback.ts` (mới) | Trạng thái nút Play và hẹn giờ sang giai đoạn kế |
| `apps/web/features/tactics/components/stage-playback-controls.tsx` (mới) | Nút Play và nút onion skin, dùng chung viewer lẫn editor |
| `apps/web/features/tactics/lib/scene.ts` (sửa) | `duplicateStage` giữ id token |
| `apps/web/features/tactics/components/tactic-stage-view.tsx` (sửa) | Prop `frame` thay `stage`; layer ghost và vệt đuôi; opacity trên từng phần tử |
| `apps/web/features/tactics/components/tactic-viewer.tsx` (sửa) | Dựng frame, gắn nút điều khiển |
| `apps/web/features/tactics/components/tactic-editor-screen.tsx` (sửa) | Dựng frame, tắt animation khi xuất ảnh |
| `apps/web/features/tactics/components/stage-bar.tsx` (sửa) | Gắn nút điều khiển |

---

## Task 1: `duplicateStage` giữ id của token

**Files:**
- Modify: `apps/web/features/tactics/lib/scene.ts`
- Test: `apps/web/features/tactics/__tests__/scene.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces: `duplicateStage(scene: TacticScene, stageId: string): TacticScene` — chữ ký không đổi,
  hành vi đổi: phần tử `kind: "token"` trong bản sao giữ nguyên `id` của bản gốc; `arrow`,
  `freehand`, `text` nhận `newId()`.

- [ ] **Step 1: Viết test hỏng**

Thêm vào cuối `apps/web/features/tactics/__tests__/scene.test.ts`, bên trong `describe` đang có các
test `duplicateStage` (tìm bằng `grep -n "duplicateStage" apps/web/features/tactics/__tests__/scene.test.ts`):

```ts
it("keeps token ids across a duplicated stage, so the two can be paired", () => {
  const next = duplicateStage(sceneWithToken(), "s1");
  const [original, copy] = next.stages;

  expect(copy.elements[0].id).toBe(original.elements[0].id);
});

it("still gives a duplicated drawing a fresh id", () => {
  const scene: TacticScene = {
    schemaVersion: TACTIC_SCHEMA_VERSION,
    stages: [
      {
        id: "s1",
        name: "Giai đoạn 1",
        elements: [
          {
            kind: "arrow",
            id: "ar1",
            points: [0, 0, 10, 10],
            color: "red",
            strokeWidth: 4,
          },
        ],
      },
    ],
  };

  const next = duplicateStage(scene, "s1");

  expect(next.stages[1].elements[0].id).not.toBe("ar1");
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- scene.test.ts`
Expected: FAIL ở test đầu — `expected 'tk1' to be <uuid>` (hàm hiện tại cấp id mới cho mọi phần tử).
Test thứ hai PASS sẵn.

- [ ] **Step 3: Sửa `duplicateStage`**

Trong `apps/web/features/tactics/lib/scene.ts`, thay dòng dựng `elements` của `copy`:

```ts
    elements: source.elements.map((element) =>
      element.kind === "token" ? element : { ...element, id: newId() }
    ),
```

Và thay đoạn doc comment nói về id bằng:

```ts
/**
 * Copy a stage, elements and all, straight after the original.
 *
 * A token keeps its id: that id is what pairs the same unit across two stages, which is how the
 * viewer animates a move instead of blinking the token from one place to the next. An id only has
 * to be unique inside one stage, and every edit (`moveToken`, `removeElement`, undo) already works
 * on one stage at a time.
 *
 * A drawing gets a fresh id instead. Nobody follows one arrow from stage to stage, so a shared id
 * would buy nothing and would let the eraser and undo act on both copies at once.
 * @param scene - The scene holding the stage
 * @param stageId - Id of the stage to copy
 * @returns A new scene with the copy; the same scene when it already holds twenty stages
 */
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- scene.test.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/tactics/lib/scene.ts apps/web/features/tactics/__tests__/scene.test.ts
git commit -m "feat(tactics): keep a token's id when a stage is duplicated"
```

---

## Task 2: Module thuần `lib/stage-transition.ts`

**Files:**
- Create: `apps/web/features/tactics/lib/stage-transition.ts`
- Test: `apps/web/features/tactics/__tests__/stage-transition.test.ts`

**Interfaces:**
- Consumes: `TacticElement`, `TacticStage`, `TacticToken` từ `@guild/shared/schemas`.
- Produces:
  - `TRANSITION_MS: 280`, `GHOST_OPACITY: 0.22`, `TRAIL_OPACITY: 0.35`
  - `interface FrameToken { token: TacticToken; opacity: number; trail: number[] | null }`
  - `interface FrameDrawings { elements: TacticElement[]; opacity: number }`
  - `interface StageFrame { outgoing: FrameDrawings; incoming: FrameDrawings; tokens: FrameToken[]; ghosts: FrameToken[] }`
  - `interface TokenPairing { moved: { from: TacticToken; to: TacticToken }[]; entering: TacticToken[]; leaving: TacticToken[] }`
  - `easeOutCubic(t: number): number`
  - `pairTokens(from: TacticStage, to: TacticStage): TokenPairing`
  - `transitionFrame(from: TacticStage, to: TacticStage, t: number): StageFrame`
  - `staticFrame(stage: TacticStage, ghostStage?: TacticStage | null): StageFrame`
  - `frameToStage(frame: StageFrame, template: TacticStage): TacticStage`

- [ ] **Step 1: Viết test hỏng**

Create `apps/web/features/tactics/__tests__/stage-transition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TacticStage, TacticToken } from "@guild/shared/schemas";

import {
  GHOST_OPACITY,
  easeOutCubic,
  frameToStage,
  pairTokens,
  staticFrame,
  transitionFrame,
} from "../lib/stage-transition";

/**
 * A token with the fields a test does not care about already filled in.
 * @param overrides - What this token differs by
 * @returns The token
 */
function token(overrides: Partial<TacticToken> & { id: string }): TacticToken {
  return {
    kind: "token",
    label: "Đội công",
    icon: "swords",
    x: 0,
    y: 0,
    size: "md",
    color: "red",
    ...overrides,
  };
}

/**
 * A stage holding the given elements.
 * @param id - Id of the stage
 * @param elements - What stands on it
 * @returns The stage
 */
function stage(id: string, elements: TacticStage["elements"]): TacticStage {
  return { id, name: `Giai đoạn ${id}`, elements };
}

describe("easeOutCubic", () => {
  it("pins both ends and leaves the middle past halfway", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("pairTokens", () => {
  it("pairs by id before anything else", () => {
    const from = stage("s1", [token({ id: "a", x: 0 })]);
    const to = stage("s2", [token({ id: "a", x: 100 })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(moved[0].to.x).toBe(100);
    expect(entering).toEqual([]);
    expect(leaving).toEqual([]);
  });

  it("falls back to label and icon when the ids do not line up", () => {
    const from = stage("s1", [token({ id: "old", label: "Đội 3", x: 0 })]);
    const to = stage("s2", [token({ id: "new", label: "Đội 3", x: 50 })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(moved[0].from.id).toBe("old");
    expect(moved[0].to.id).toBe("new");
    expect(entering).toEqual([]);
    expect(leaving).toEqual([]);
  });

  it("compares labels without their case or surrounding spaces", () => {
    const from = stage("s1", [token({ id: "old", label: " Đội 3 " })]);
    const to = stage("s2", [token({ id: "new", label: "đội 3" })]);

    expect(pairTokens(from, to).moved).toHaveLength(1);
  });

  it("does not let one token on the left eat two on the right", () => {
    const from = stage("s1", [token({ id: "old", label: "Đội 3" })]);
    const to = stage("s2", [
      token({ id: "n1", label: "Đội 3" }),
      token({ id: "n2", label: "Đội 3" }),
    ]);

    const { moved, entering } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(entering.map((unit) => unit.id)).toEqual(["n2"]);
  });

  it("reports a token that only stands on one side", () => {
    const from = stage("s1", [token({ id: "gone", label: "Đội 1" })]);
    const to = stage("s2", [token({ id: "fresh", label: "Đội 2" })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toEqual([]);
    expect(entering.map((unit) => unit.id)).toEqual(["fresh"]);
    expect(leaving.map((unit) => unit.id)).toEqual(["gone"]);
  });

  it("ignores everything that is not a token", () => {
    const from = stage("s1", [
      { kind: "arrow", id: "ar1", points: [0, 0, 1, 1], color: "red", strokeWidth: 4 },
    ]);

    expect(pairTokens(from, stage("s2", []))).toEqual({
      moved: [],
      entering: [],
      leaving: [],
    });
  });
});

describe("transitionFrame", () => {
  const from = stage("s1", [
    token({ id: "a", x: 0, y: 0 }),
    token({ id: "gone", x: 10, y: 10 }),
    { kind: "text", id: "t1", x: 0, y: 0, text: "cũ", color: "red", fontSize: 24 },
  ]);
  const to = stage("s2", [
    token({ id: "a", x: 100, y: 200 }),
    token({ id: "fresh", x: 5, y: 5 }),
    { kind: "text", id: "t2", x: 0, y: 0, text: "mới", color: "red", fontSize: 24 },
  ]);

  it("puts a paired token at its start when t is 0", () => {
    const moved = transitionFrame(from, to, 0).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(0);
    expect(moved?.token.y).toBe(0);
  });

  it("interpolates a paired token linearly", () => {
    const moved = transitionFrame(from, to, 0.5).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(50);
    expect(moved?.token.y).toBe(100);
    expect(moved?.trail).toEqual([0, 0, 50, 100]);
  });

  it("lands a paired token on its target, carrying the target's own look", () => {
    const recoloured = stage("s2", [token({ id: "a", x: 100, color: "blue" })]);
    const moved = transitionFrame(from, recoloured, 1).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(100);
    expect(moved?.token.color).toBe("blue");
  });

  it("fades a leaving token out and an entering token in", () => {
    const { tokens } = transitionFrame(from, to, 0.25);

    expect(tokens.find((unit) => unit.token.id === "gone")?.opacity).toBe(0.75);
    expect(tokens.find((unit) => unit.token.id === "fresh")?.opacity).toBe(0.25);
  });

  it("crossfades the drawings and leaves the tokens out of them", () => {
    const frame = transitionFrame(from, to, 0.25);

    expect(frame.outgoing.elements.map((element) => element.id)).toEqual(["t1"]);
    expect(frame.outgoing.opacity).toBe(0.75);
    expect(frame.incoming.elements.map((element) => element.id)).toEqual(["t2"]);
    expect(frame.incoming.opacity).toBe(0.25);
  });

  it("runs the same move backwards when the two stages are swapped", () => {
    const forward = transitionFrame(from, to, 0.25).tokens.find(
      (unit) => unit.token.id === "a"
    );
    const backward = transitionFrame(to, from, 0.75).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(backward?.token.x).toBe(forward?.token.x);
    expect(backward?.token.y).toBe(forward?.token.y);
  });

  it("draws no trail before the move has started", () => {
    expect(
      transitionFrame(from, to, 0).tokens.find((unit) => unit.token.id === "a")
        ?.trail
    ).toBeNull();
  });

  it("draws no trail for a token that stands still", () => {
    const still = stage("s2", [token({ id: "a", x: 0, y: 0 })]);

    expect(
      transitionFrame(from, still, 0.5).tokens.find(
        (unit) => unit.token.id === "a"
      )?.trail
    ).toBeNull();
  });

  it("shows no onion skin while the move runs", () => {
    expect(transitionFrame(from, to, 0.5).ghosts).toEqual([]);
  });
});

describe("staticFrame", () => {
  const only = stage("s1", [
    token({ id: "a", x: 1 }),
    { kind: "text", id: "t1", x: 0, y: 0, text: "ghi chú", color: "red", fontSize: 24 },
  ]);

  it("holds nothing outgoing and shows everything solid", () => {
    const frame = staticFrame(only);

    expect(frame.outgoing.elements).toEqual([]);
    expect(frame.incoming.opacity).toBe(1);
    expect(frame.tokens.every((unit) => unit.opacity === 1)).toBe(true);
    expect(frame.tokens.every((unit) => unit.trail === null)).toBe(true);
  });

  it("has no ghosts without a stage to ghost", () => {
    expect(staticFrame(only).ghosts).toEqual([]);
    expect(staticFrame(only, null).ghosts).toEqual([]);
  });

  it("ghosts the tokens of the stage before it", () => {
    const previous = stage("s0", [token({ id: "a", x: 900 })]);
    const { ghosts } = staticFrame(only, previous);

    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].token.x).toBe(900);
    expect(ghosts[0].opacity).toBe(GHOST_OPACITY);
  });
});

describe("frameToStage", () => {
  it("freezes a running frame into a stage the next move can start from", () => {
    const from = stage("s1", [token({ id: "a", x: 0 })]);
    const to = stage("s2", [
      token({ id: "a", x: 100 }),
      { kind: "text", id: "t2", x: 0, y: 0, text: "mới", color: "red", fontSize: 24 },
    ]);
    const frozen = frameToStage(transitionFrame(from, to, 0.5), to);

    expect(frozen.id).toBe("s2");
    expect(frozen.elements.map((element) => element.id)).toEqual(["t2", "a"]);
    expect(
      frozen.elements.find((element) => element.id === "a")
    ).toMatchObject({ x: 50 });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- stage-transition.test.ts`
Expected: FAIL — `Failed to resolve import "../lib/stage-transition"`.

- [ ] **Step 3: Viết module**

Create `apps/web/features/tactics/lib/stage-transition.ts`:

```ts
import type {
  TacticElement,
  TacticStage,
  TacticToken,
} from "@guild/shared/schemas";

/** How long one stage change takes, in milliseconds. */
export const TRANSITION_MS = 280;

/** How solid an onion-skin token is drawn. Enough to place it, faint enough to stay background. */
export const GHOST_OPACITY = 0.22;

/** How solid the line a moving token drags behind it is. */
export const TRAIL_OPACITY = 0.35;

/** One token inside a frame, its coordinates already interpolated. */
export interface FrameToken {
  /** The token as it should be drawn right now */
  token: TacticToken;
  /** How solid to draw it, from 0 to 1 */
  opacity: number;
  /** `[x0, y0, x, y]` while the token moves; null when it stands still */
  trail: number[] | null;
}

/** Everything on a stage that is not a token, and how solid it is drawn. */
export interface FrameDrawings {
  elements: TacticElement[];
  opacity: number;
}

/**
 * One frame of the scene: enough to draw, and nothing more.
 *
 * The canvas takes this rather than a `TacticStage`, so standing still and moving are the same
 * render path — a still frame is just one whose opacities are all 1.
 */
export interface StageFrame {
  /** Drawings of the stage being left, fading out */
  outgoing: FrameDrawings;
  /** Drawings of the stage being entered, fading in */
  incoming: FrameDrawings;
  /** Every token on screen, paired ones already interpolated */
  tokens: FrameToken[];
  /** Onion skin: where the tokens stood a stage ago. Empty when it is off */
  ghosts: FrameToken[];
}

/** Which tokens moved between two stages, and which stand on only one of them. */
export interface TokenPairing {
  /** The same unit on both stages */
  moved: { from: TacticToken; to: TacticToken }[];
  /** On the target stage only */
  entering: TacticToken[];
  /** On the source stage only */
  leaving: TacticToken[];
}

/**
 * Ease a linear progress into one that starts fast and settles.
 *
 * A move reads as movement rather than as a slide only when it decelerates: the eye picks the
 * direction up in the first frames and the landing never overshoots.
 * @param t - Linear progress, from 0 to 1
 * @returns The eased progress, pinned to 0 at the start and 1 at the end
 */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * The tokens standing on a stage, in the order they were drawn.
 * @param stage - The stage to read
 * @returns Its tokens
 */
function tokensOf(stage: TacticStage): TacticToken[] {
  return stage.elements.filter(
    (element): element is TacticToken => element.kind === "token"
  );
}

/**
 * Everything on a stage that is not a token: arrows, strokes and notes.
 * @param stage - The stage to read
 * @returns Its drawings
 */
function drawingsOf(stage: TacticStage): TacticElement[] {
  return stage.elements.filter((element) => element.kind !== "token");
}

/**
 * The key two tokens have to share to be paired once their ids no longer line up.
 *
 * Normalised on both sides, because a label is typed by hand: "Đội 3" and " đội 3 " are the same
 * unit to everyone reading the map.
 * @param unit - The token to key
 * @returns The pairing key
 */
function fallbackKey(unit: TacticToken): string {
  return `${unit.label.trim().toLowerCase()}\u0000${unit.icon}`;
}

/**
 * Work out which token on one stage is which token on the next.
 *
 * Two passes, on purpose. The id pass is exact and survives two units sharing a name, and it is
 * what `duplicateStage` keeps ids for. The label pass exists for scenes drawn before that, where
 * every stage carries its own ids; it can mispair two identical units, which costs a strange line
 * on screen and nothing in the document.
 * @param from - The stage being left
 * @param to - The stage being entered
 * @returns The pairs, plus whatever stands on only one side
 */
export function pairTokens(from: TacticStage, to: TacticStage): TokenPairing {
  const target = tokensOf(to);
  const takenIds = new Set<string>();
  const moved: TokenPairing["moved"] = [];
  const unpaired: TacticToken[] = [];

  const byId = new Map(target.map((unit) => [unit.id, unit]));

  for (const unit of tokensOf(from)) {
    const match = byId.get(unit.id);

    if (match) {
      moved.push({ from: unit, to: match });
      takenIds.add(match.id);
    } else {
      unpaired.push(unit);
    }
  }

  // One queue per key, so a second token with the same name takes the second free slot rather than
  // the same one the first took.
  const byKey = new Map<string, TacticToken[]>();

  for (const unit of target) {
    if (takenIds.has(unit.id)) continue;

    const queue = byKey.get(fallbackKey(unit));

    if (queue) {
      queue.push(unit);
    } else {
      byKey.set(fallbackKey(unit), [unit]);
    }
  }

  const leaving: TacticToken[] = [];

  for (const unit of unpaired) {
    const match = byKey.get(fallbackKey(unit))?.shift();

    if (match) {
      moved.push({ from: unit, to: match });
      takenIds.add(match.id);
    } else {
      leaving.push(unit);
    }
  }

  return {
    moved,
    entering: target.filter((unit) => !takenIds.has(unit.id)),
    leaving,
  };
}

/**
 * A value part of the way from one to another.
 * @param from - Where it starts
 * @param to - Where it ends
 * @param t - How far along, from 0 to 1
 * @returns The value at that point
 */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * The frame partway through a stage change.
 *
 * Going backwards is this same call with the two stages swapped, which is why nothing here knows
 * about direction.
 * @param from - The stage being left
 * @param to - The stage being entered
 * @param t - How far along, from 0 to 1, already eased
 * @returns The frame to draw
 */
export function transitionFrame(
  from: TacticStage,
  to: TacticStage,
  t: number
): StageFrame {
  const { moved, entering, leaving } = pairTokens(from, to);

  const movedTokens: FrameToken[] = moved.map((pair) => {
    const x = lerp(pair.from.x, pair.to.x, t);
    const y = lerp(pair.from.y, pair.to.y, t);
    const stands = pair.from.x === pair.to.x && pair.from.y === pair.to.y;

    return {
      token: { ...pair.to, x, y },
      opacity: 1,
      trail: stands || t === 0 ? null : [pair.from.x, pair.from.y, x, y],
    };
  });

  return {
    outgoing: { elements: drawingsOf(from), opacity: 1 - t },
    incoming: { elements: drawingsOf(to), opacity: t },
    tokens: [
      ...movedTokens,
      ...leaving.map((unit) => ({ token: unit, opacity: 1 - t, trail: null })),
      ...entering.map((unit) => ({ token: unit, opacity: t, trail: null })),
    ],
    // Nothing to ghost mid-move: the trail already says where each token came from.
    ghosts: [],
  };
}

/**
 * The frame of a stage standing still.
 * @param stage - The stage on screen
 * @param ghostStage - The stage before it, drawn faintly as onion skin; null turns that off
 * @returns The frame to draw
 */
export function staticFrame(
  stage: TacticStage,
  ghostStage: TacticStage | null = null
): StageFrame {
  return {
    outgoing: { elements: [], opacity: 0 },
    incoming: { elements: drawingsOf(stage), opacity: 1 },
    tokens: tokensOf(stage).map((unit) => ({
      token: unit,
      opacity: 1,
      trail: null,
    })),
    ghosts: ghostStage
      ? tokensOf(ghostStage).map((unit) => ({
          token: unit,
          opacity: GHOST_OPACITY,
          trail: null,
        }))
      : [],
  };
}

/**
 * Freeze a frame back into a stage.
 *
 * This is what makes an interrupted move continue from where it is: the new move starts from the
 * tokens exactly where they stand on screen, rather than snapping them back to the stage they
 * were walking away from.
 * @param frame - The frame currently on screen
 * @param template - The stage whose id and name the frozen stage carries
 * @returns A stage holding the frame's drawings and its interpolated tokens
 */
export function frameToStage(
  frame: StageFrame,
  template: TacticStage
): TacticStage {
  return {
    ...template,
    elements: [
      ...frame.incoming.elements,
      ...frame.tokens.map((unit) => unit.token),
    ],
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- stage-transition.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/tactics/lib/stage-transition.ts apps/web/features/tactics/__tests__/stage-transition.test.ts
git commit -m "feat(tactics): derive one frame from two neighbouring stages"
```

---

## Task 3: Hook `use-reduced-motion`

**Files:**
- Create: `apps/web/features/tactics/hooks/use-reduced-motion.ts`
- Test: `apps/web/features/tactics/__tests__/use-reduced-motion.test.tsx`

**Interfaces:**
- Consumes: không có.
- Produces: `useReducedMotion(): boolean` — true khi hệ điều hành đang yêu cầu giảm chuyển động,
  false trên máy chủ và khi không yêu cầu.

- [ ] **Step 1: Viết test hỏng**

Create `apps/web/features/tactics/__tests__/use-reduced-motion.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "../hooks/use-reduced-motion";

afterEach(cleanup);

/**
 * Point `matchMedia` at a fixed answer.
 * @param matches - What every query should report
 */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    () => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  );
}

/**
 * A component printing what the hook answered.
 * @returns The readout
 */
function Readout() {
  return <span data-testid="answer">{String(useReducedMotion())}</span>;
}

describe("useReducedMotion", () => {
  it("reports true while the system asks for less motion", () => {
    stubMatchMedia(true);
    render(<Readout />);

    expect(screen.getByTestId("answer")).toHaveTextContent("true");
  });

  it("reports false otherwise", () => {
    stubMatchMedia(false);
    render(<Readout />);

    expect(screen.getByTestId("answer")).toHaveTextContent("false");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- use-reduced-motion.test.tsx`
Expected: FAIL — `Failed to resolve import "../hooks/use-reduced-motion"`.

- [ ] **Step 3: Viết hook**

Create `apps/web/features/tactics/hooks/use-reduced-motion.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";

/** The query an operating system answers when its owner asked for less movement. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Subscribe to changes of the reduced-motion query.
 * @param onChange - Called whenever the query starts or stops matching
 * @returns The unsubscribe function
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the viewer asked their system for less movement.
 *
 * The server has nothing to read, and false is the safe answer there: the first client render then
 * settles to the real one without an animation having run in between.
 * @returns True when the system asks for reduced motion
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- use-reduced-motion.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/tactics/hooks/use-reduced-motion.ts apps/web/features/tactics/__tests__/use-reduced-motion.test.tsx
git commit -m "feat(tactics): read the reduced-motion preference"
```

---

## Task 4: Hook `use-stage-transition`

**Files:**
- Create: `apps/web/features/tactics/hooks/use-stage-transition.ts`
- Test: `apps/web/features/tactics/__tests__/use-stage-transition.test.tsx`

**Interfaces:**
- Consumes: `staticFrame`, `transitionFrame`, `frameToStage`, `easeOutCubic`, `TRANSITION_MS` từ
  `../lib/stage-transition`; `useReducedMotion` từ `../hooks/use-reduced-motion`.
- Produces:
  ```ts
  interface StageTransitionOptions {
    /** False freezes the canvas on the active stage, with no animation at all */
    enabled?: boolean;
    /** Whether to ghost the stage before the active one while standing still */
    onionSkin?: boolean;
  }
  interface StageTransitionResult {
    /** The frame to draw; null when there is no stage yet */
    frame: StageFrame | null;
    /** Whether a move is running right now */
    animating: boolean;
  }
  useStageTransition(
    stages: TacticStage[],
    activeStageId: string | null,
    options?: StageTransitionOptions
  ): StageTransitionResult
  ```

- [ ] **Step 1: Viết test hỏng**

Create `apps/web/features/tactics/__tests__/use-stage-transition.test.tsx`:

```tsx
// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { TRANSITION_MS } from "../lib/stage-transition";
import { useStageTransition } from "../hooks/use-stage-transition";

/** Frame callbacks waiting to run, in the order they were asked for. */
let pending: ((time: number) => void)[] = [];

/** What `performance.now()` answers; a test moves it by hand. */
let now = 0;

beforeEach(() => {
  pending = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
    pending.push(callback);

    return pending.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Move time on and run every frame callback that was waiting.
 * @param ms - How far to move the clock
 */
function advance(ms: number): void {
  now += ms;
  const due = pending;
  pending = [];
  act(() => {
    for (const callback of due) callback(now);
  });
}

const stages: TacticStage[] = [
  {
    id: "s1",
    name: "Giai đoạn 1",
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x: 0,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  },
  {
    id: "s2",
    name: "Giai đoạn 2",
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x: 100,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  },
  {
    id: "s3",
    name: "Giai đoạn 3",
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x: 300,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  },
];

interface HarnessProps {
  enabled?: boolean;
  onionSkin?: boolean;
}

/**
 * A screen with one button per stage, printing where the token stands and whether it moves.
 * @param props - What to pass the hook
 * @returns The harness
 */
function Harness({ enabled = true, onionSkin = false }: HarnessProps) {
  const [activeStageId, setActiveStageId] = useState("s1");
  const { frame, animating } = useStageTransition(stages, activeStageId, {
    enabled,
    onionSkin,
  });

  return (
    <div>
      {stages.map((stage) => (
        <button key={stage.id} onClick={() => setActiveStageId(stage.id)}>
          {stage.name}
        </button>
      ))}
      <span data-testid="x">{frame?.tokens[0]?.token.x ?? "none"}</span>
      <span data-testid="ghosts">{frame?.ghosts.length ?? 0}</span>
      <span data-testid="animating">{String(animating)}</span>
    </div>
  );
}

/**
 * Where the harness says the token stands.
 * @returns The x coordinate as a number
 */
function tokenX(): number {
  return Number(screen.getByTestId("x").textContent);
}

describe("useStageTransition", () => {
  it("stands still on the first stage", () => {
    render(<Harness />);

    expect(tokenX()).toBe(0);
    expect(screen.getByTestId("animating")).toHaveTextContent("false");
  });

  it("walks the token to the next stage and stops there", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn 2"));

    advance(0);
    expect(screen.getByTestId("animating")).toHaveTextContent("true");

    advance(TRANSITION_MS / 2);
    expect(tokenX()).toBeGreaterThan(0);
    expect(tokenX()).toBeLessThan(100);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(100);
    expect(screen.getByTestId("animating")).toHaveTextContent("false");
  });

  it("runs the move backwards when the stage before is picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn 2"));
    advance(TRANSITION_MS * 2);

    fireEvent.click(screen.getByText("Giai đoạn 1"));
    advance(0);
    advance(TRANSITION_MS / 2);

    expect(tokenX()).toBeLessThan(100);
    expect(tokenX()).toBeGreaterThan(0);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(0);
  });

  it("carries on from where the token stands when the target changes mid-move", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn 2"));
    advance(0);
    advance(TRANSITION_MS / 2);

    const interrupted = tokenX();

    fireEvent.click(screen.getByText("Giai đoạn 3"));
    advance(0);

    expect(tokenX()).toBeCloseTo(interrupted, 5);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(300);
  });

  it("cuts straight to the target while disabled, without asking for a frame", () => {
    render(<Harness enabled={false} />);
    fireEvent.click(screen.getByText("Giai đoạn 2"));

    expect(tokenX()).toBe(100);
    expect(pending).toHaveLength(0);
  });

  it("ghosts the stage before the active one only while standing still", () => {
    render(<Harness onionSkin />);

    expect(screen.getByTestId("ghosts")).toHaveTextContent("0");

    fireEvent.click(screen.getByText("Giai đoạn 2"));
    advance(0);
    expect(screen.getByTestId("ghosts")).toHaveTextContent("0");

    advance(TRANSITION_MS * 2);
    expect(screen.getByTestId("ghosts")).toHaveTextContent("1");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- use-stage-transition.test.tsx`
Expected: FAIL — `Failed to resolve import "../hooks/use-stage-transition"`.

- [ ] **Step 3: Viết hook**

Create `apps/web/features/tactics/hooks/use-stage-transition.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import {
  TRANSITION_MS,
  easeOutCubic,
  frameToStage,
  staticFrame,
  transitionFrame,
  type StageFrame,
} from "../lib/stage-transition";
import { useReducedMotion } from "./use-reduced-motion";

/** How the caller wants the canvas driven. */
export interface StageTransitionOptions {
  /** False freezes the canvas on the active stage, with no animation at all */
  enabled?: boolean;
  /** Whether to ghost the stage before the active one while standing still */
  onionSkin?: boolean;
}

/** What the canvas needs to draw, and whether it is moving. */
export interface StageTransitionResult {
  /** The frame to draw; null when there is no stage yet */
  frame: StageFrame | null;
  /** Whether a move is running right now */
  animating: boolean;
}

/** A move in flight: where it came from, where it goes, and how far along it is. */
interface RunningMove {
  from: TacticStage;
  to: TacticStage;
  /** Linear progress, before easing */
  t: number;
}

/**
 * Drive the canvas across a stage change.
 *
 * Every rule about what a frame looks like lives in `lib/stage-transition.ts`; this hook only pushes
 * `t` from 0 to 1 and decides what the next move starts from. Going backwards is not a branch here:
 * it is the same call with the two stages swapped.
 * @param stages - Every stage of the tactic, in order
 * @param activeStageId - Stage whose tab is open
 * @param options - Whether to animate at all, and whether to show onion skin
 * @returns The frame to draw and whether it is moving
 */
export function useStageTransition(
  stages: TacticStage[],
  activeStageId: string | null,
  { enabled = true, onionSkin = false }: StageTransitionOptions = {}
): StageTransitionResult {
  const reducedMotion = useReducedMotion();
  const animates = enabled && !reducedMotion;

  const [move, setMove] = useState<RunningMove | null>(null);
  const activeIndex = stages.findIndex((stage) => stage.id === activeStageId);
  const activeStage = activeIndex === -1 ? (stages[0] ?? null) : stages[activeIndex];
  const previousStage = activeIndex > 0 ? stages[activeIndex - 1] : null;

  const frame: StageFrame | null = !activeStage
    ? null
    : move
      ? transitionFrame(move.from, move.to, easeOutCubic(move.t))
      : staticFrame(activeStage, onionSkin ? previousStage : null);

  // Read by the effect below to start the next move from what is on screen, not from a state that
  // has already been replaced by the time the effect runs.
  const frameRef = useRef<StageFrame | null>(frame);
  frameRef.current = frame;
  const shownStageRef = useRef<TacticStage | null>(null);

  useEffect(() => {
    const target = activeStage;
    const previous = shownStageRef.current;
    shownStageRef.current = target;

    // Nothing to walk from: the first stage the canvas ever shows, or the same stage again.
    if (!target || !previous || previous.id === target.id || !animates) {
      setMove(null);

      return;
    }

    const source = frameRef.current
      ? frameToStage(frameRef.current, previous)
      : previous;

    setMove({ from: source, to: target, t: 0 });

    const start = performance.now();
    let handle = 0;

    /**
     * Push the move one frame on, and end it once the clock runs out.
     * @param time - The timestamp the browser handed this frame
     */
    function step(time: number): void {
      const t = Math.min((time - start) / TRANSITION_MS, 1);

      if (t >= 1) {
        setMove(null);

        return;
      }

      setMove((running) => (running ? { ...running, t } : running));
      handle = requestAnimationFrame(step);
    }

    handle = requestAnimationFrame(step);

    return () => cancelAnimationFrame(handle);
    // `activeStage` is looked up fresh every render; its id is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage?.id, animates]);

  return { frame, animating: move !== null };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- use-stage-transition.test.tsx`
Expected: PASS toàn bộ. Nếu test "carries on from where the token stands" hỏng, kiểm tra
`frameToStage` đang được gọi với `previous` (giai đoạn vừa rời) chứ không phải với `target`.

- [ ] **Step 5: Kiểm tra lint chấp nhận dòng `eslint-disable`**

Run: `pnpm --filter web lint`
Expected: không có lỗi. Nếu quy tắc `react-hooks/exhaustive-deps` không bật trong cấu hình, **xoá**
dòng `eslint-disable-next-line` và comment kèm theo.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/tactics/hooks/use-stage-transition.ts apps/web/features/tactics/__tests__/use-stage-transition.test.tsx
git commit -m "feat(tactics): walk the canvas from one stage to the next"
```

---

## Task 5: Canvas nhận một khung hình

**Files:**
- Modify: `apps/web/features/tactics/components/tactic-stage-view.tsx`
- Modify: `apps/web/features/tactics/__tests__/tactic-stage-view.test.tsx`

**Interfaces:**
- Consumes: `StageFrame`, `TRAIL_OPACITY` từ `../lib/stage-transition`.
- Produces: `TacticStageViewProps` đổi: bỏ `stage: TacticStage`, thêm `frame: StageFrame` và
  `animating?: boolean`. Mọi prop còn lại giữ nguyên.

- [ ] **Step 1: Sửa test hiện có sang prop mới, thêm test cho layer mới**

Trong `apps/web/features/tactics/__tests__/tactic-stage-view.test.tsx`:

Thêm import ngay dưới import `TacticStageView`:

```tsx
import { staticFrame, transitionFrame } from "../lib/stage-transition";
```

Đổi **mọi** chỗ render `<TacticStageView stage={stage} …/>` thành
`<TacticStageView frame={staticFrame(stage)} …/>` (tìm bằng
`grep -n "TacticStageView" apps/web/features/tactics/__tests__/tactic-stage-view.test.tsx`).

Thêm ba test mới vào cuối file:

```tsx
describe("a frame in motion", () => {
  const from: TacticStage = {
    id: "s1",
    name: "Giai đoạn 1",
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x: 0,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  };
  const to: TacticStage = {
    ...from,
    id: "s2",
    elements: [{ ...from.elements[0], x: 100 } as TacticStage["elements"][number]],
  };

  it("draws a trail behind a moving token", () => {
    render(
      <TacticStageView frame={transitionFrame(from, to, 0.5)} width={800} animating />
    );

    const trail = rendered
      .get("line")
      ?.find((props) => props.opacity !== undefined);

    expect(trail?.points).toEqual([0, 0, 50, 0]);
  });

  it("draws no trail while standing still", () => {
    render(<TacticStageView frame={staticFrame(from)} width={800} />);

    expect(rendered.get("line") ?? []).toHaveLength(0);
  });

  it("draws the onion skin faintly", () => {
    render(<TacticStageView frame={staticFrame(to, from)} width={800} />);

    const faint = rendered
      .get("group")
      ?.filter((props) => (props.opacity as number) < 1);

    expect(faint).toHaveLength(1);
  });

  it("does not let a token be dragged while it moves", () => {
    render(
      <TacticStageView
        frame={transitionFrame(from, to, 0.5)}
        width={800}
        animating
      />
    );

    expect(
      rendered.get("group")?.every((props) => props.draggable !== true)
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- tactic-stage-view.test.tsx`
Expected: FAIL — TypeScript/runtime lỗi vì `TacticStageView` chưa nhận `frame`.

- [ ] **Step 3: Sửa `tactic-stage-view.tsx`**

3a. Đổi import của schema: bỏ `type TacticStage`, giữ `TacticElement`, thêm import frame:

```ts
import {
  TACTIC_MAP_HEIGHT,
  TACTIC_MAP_WIDTH,
  type TacticElement,
} from "@guild/shared/schemas";

import { TRAIL_OPACITY, type StageFrame } from "../lib/stage-transition";
```

3b. Thêm hằng số cạnh các hằng số đang có:

```ts
/** How wide the line a moving token drags behind it is, in map units. */
const TRAIL_STROKE_WIDTH = 3;
```

3c. Trong `TacticStageViewProps`, thay

```ts
  /** The stage being drawn */
  stage: TacticStage;
```

bằng

```ts
  /** The frame being drawn: a still stage, or a moment part way between two */
  frame: StageFrame;
  /** Whether a stage change is running, which is when a token must not be dragged */
  animating?: boolean;
```

3d. Trong chữ ký hàm, thay `stage,` bằng `frame,` và thêm `animating = false,`.

3e. Thay toàn bộ `<Layer>` cuối (layer vẽ `stage.elements`) bằng:

```tsx
      {/* Onion skin and trails read the map, they are not part of it: no pointer, no export. */}
      <Layer listening={false}>
        {frame.ghosts.map((ghost) => (
          <ElementShape
            key={`ghost-${ghost.token.id}`}
            element={ghost.token}
            opacity={ghost.opacity}
            draggable={false}
            selected={false}
            onDragEnd={() => {}}
            onClick={() => {}}
          />
        ))}
        {frame.tokens.map((unit) =>
          unit.trail ? (
            <Line
              key={`trail-${unit.token.id}`}
              points={unit.trail}
              stroke={COLOR_HEX[unit.token.color]}
              strokeWidth={TRAIL_STROKE_WIDTH}
              opacity={TRAIL_OPACITY}
              lineCap="round"
            />
          ) : null
        )}
      </Layer>

      <Layer>
        {frame.outgoing.elements.map((element) => (
          <ElementShape
            key={`out-${element.id}`}
            element={element}
            opacity={frame.outgoing.opacity}
            draggable={false}
            selected={false}
            onDragEnd={() => {}}
            onClick={() => {}}
          />
        ))}
        {frame.incoming.elements.map((element) => (
          <ElementShape
            key={element.id}
            element={element}
            opacity={frame.incoming.opacity}
            draggable={false}
            selected={element.id === selectedElementId}
            onDragEnd={() => {}}
            onClick={() => onElementClick?.(element.id)}
          />
        ))}
        {frame.tokens.map((unit) => (
          <ElementShape
            key={unit.token.id}
            element={unit.token}
            opacity={unit.opacity}
            draggable={!readOnly && !animating}
            selected={unit.token.id === selectedElementId}
            onDragEnd={(x, y) => onTokenMoved?.(unit.token.id, x, y)}
            onClick={() => onElementClick?.(unit.token.id)}
          />
        ))}
      </Layer>
```

3f. Trong `ElementShapeProps`, thêm:

```ts
  /** How solid to draw it, from 0 to 1 */
  opacity: number;
```

3g. Trong `ElementShape`, nhận `opacity` và đặt nó lên node ngoài cùng của **mỗi** nhánh:
`<Group opacity={opacity} …>` cho `token`, `<Arrow opacity={opacity} …>`, `<Line opacity={opacity} …>`,
`<Text opacity={opacity} …>`. Cập nhật doc comment của `ElementShape` nói thêm rằng opacity đến từ
khung hình, không từ phần tử.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- tactic-stage-view.test.tsx`
Expected: PASS. `pnpm --filter web typecheck` sẽ còn báo lỗi ở `tactic-viewer.tsx` và
`tactic-editor-screen.tsx` — đúng như mong đợi, hai file đó là Task 6 và 7.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/tactics/components/tactic-stage-view.tsx apps/web/features/tactics/__tests__/tactic-stage-view.test.tsx
git commit -m "feat(tactics): draw the canvas from a frame instead of a stage"
```

---

## Task 6: Hook `use-stage-playback` và nút điều khiển

**Files:**
- Create: `apps/web/features/tactics/hooks/use-stage-playback.ts`
- Create: `apps/web/features/tactics/components/stage-playback-controls.tsx`
- Test: `apps/web/features/tactics/__tests__/use-stage-playback.test.tsx`
- Test: `apps/web/features/tactics/__tests__/stage-playback-controls.test.tsx`

**Interfaces:**
- Consumes: không có gì từ các task trước ngoài kiểu `TacticStage`.
- Produces:
  ```ts
  const PLAYBACK_DWELL_MS = 900;
  interface StagePlayback {
    /** Whether the stages are walking themselves */
    playing: boolean;
    /** Start from the first stage when sitting on the last one, otherwise carry on */
    toggle: () => void;
    /** Give the stages back to the person */
    stop: () => void;
  }
  useStagePlayback(
    stages: TacticStage[],
    activeStageId: string | null,
    animating: boolean,
    onSelect: (stageId: string) => void
  ): StagePlayback
  ```
  ```ts
  interface StagePlaybackControlsProps {
    playing: boolean;
    onionSkin: boolean;
    /** True when there is only one stage, so neither button has anything to do */
    disabled: boolean;
    onTogglePlay: () => void;
    onToggleOnionSkin: () => void;
  }
  function StagePlaybackControls(props: StagePlaybackControlsProps): React.JSX.Element
  ```

- [ ] **Step 1: Viết test hỏng cho hook**

Create `apps/web/features/tactics/__tests__/use-stage-playback.test.tsx`:

```tsx
// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { PLAYBACK_DWELL_MS, useStagePlayback } from "../hooks/use-stage-playback";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
  { id: "s3", name: "Giai đoạn 3", elements: [] },
];

/**
 * A screen with a play button, printing which stage is open.
 * @returns The harness
 */
function Harness() {
  const [activeStageId, setActiveStageId] = useState("s1");
  const playback = useStagePlayback(stages, activeStageId, false, setActiveStageId);

  return (
    <div>
      <button onClick={playback.toggle}>play</button>
      <button onClick={playback.stop}>stop</button>
      <span data-testid="stage">{activeStageId}</span>
      <span data-testid="playing">{String(playback.playing)}</span>
    </div>
  );
}

/** Let the dwell timer fire once. */
function dwell(): void {
  act(() => {
    vi.advanceTimersByTime(PLAYBACK_DWELL_MS);
  });
}

describe("useStagePlayback", () => {
  it("walks the stages one at a time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));

    dwell();
    expect(screen.getByTestId("stage")).toHaveTextContent("s2");

    dwell();
    expect(screen.getByTestId("stage")).toHaveTextContent("s3");
  });

  it("stops on the last stage rather than looping", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    dwell();
    dwell();
    dwell();

    expect(screen.getByTestId("stage")).toHaveTextContent("s3");
    expect(screen.getByTestId("playing")).toHaveTextContent("false");
  });

  it("starts over from the first stage when the last one is already open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    dwell();
    dwell();
    dwell();

    fireEvent.click(screen.getByText("play"));
    expect(screen.getByTestId("stage")).toHaveTextContent("s1");

    dwell();
    expect(screen.getByTestId("stage")).toHaveTextContent("s2");
  });

  it("hands the stages back when something stops it", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    fireEvent.click(screen.getByText("stop"));

    dwell();
    expect(screen.getByTestId("stage")).toHaveTextContent("s1");
    expect(screen.getByTestId("playing")).toHaveTextContent("false");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- use-stage-playback.test.tsx`
Expected: FAIL — `Failed to resolve import "../hooks/use-stage-playback"`.

- [ ] **Step 3: Viết hook**

Create `apps/web/features/tactics/hooks/use-stage-playback.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

/** How long a stage stays on screen before playback moves on, in milliseconds. */
export const PLAYBACK_DWELL_MS = 900;

/** The play button's state and the two things it can do. */
export interface StagePlayback {
  /** Whether the stages are walking themselves */
  playing: boolean;
  /** Start playback, from the first stage when the last one is already open */
  toggle: () => void;
  /** Give the stages back to the person */
  stop: () => void;
}

/**
 * Walk the stages on their own, one after the next.
 *
 * Playback stops at the last stage rather than looping: a tactic is read front to back, and a loop
 * would leave a viewer unsure whether they are watching the second pass or the first.
 * @param stages - Every stage of the tactic, in order
 * @param activeStageId - Stage whose tab is open
 * @param animating - Whether a stage change is still running; the dwell starts after it ends
 * @param onSelect - Called with the stage playback lands on
 * @returns The playback state and its controls
 */
export function useStagePlayback(
  stages: TacticStage[],
  activeStageId: string | null,
  animating: boolean,
  onSelect: (stageId: string) => void
): StagePlayback {
  const [playing, setPlaying] = useState(false);
  const index = stages.findIndex((stage) => stage.id === activeStageId);
  const next = index === -1 ? null : (stages[index + 1] ?? null);

  useEffect(() => {
    if (!playing || animating) {
      return;
    }

    if (!next) {
      setPlaying(false);

      return;
    }

    const timer = setTimeout(() => onSelect(next.id), PLAYBACK_DWELL_MS);

    return () => clearTimeout(timer);
  }, [playing, animating, next, onSelect]);

  const stop = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false);

      return;
    }

    // Pressing play on the last stage means "watch it again", not "do nothing".
    if (!next && stages[0]) {
      onSelect(stages[0].id);
    }

    setPlaying(true);
  }, [playing, next, stages, onSelect]);

  return { playing, toggle, stop };
}
```

- [ ] **Step 4: Chạy test hook, xác nhận xanh**

Run: `pnpm --filter web test -- use-stage-playback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Viết test hỏng cho component**

Create `apps/web/features/tactics/__tests__/stage-playback-controls.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StagePlaybackControls } from "../components/stage-playback-controls";

afterEach(cleanup);

describe("StagePlaybackControls", () => {
  it("offers to play while stopped, and to pause while playing", () => {
    const { rerender } = render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Chạy các giai đoạn" })).toBeTruthy();

    rerender(
      <StagePlaybackControls
        playing
        onionSkin={false}
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Dừng" })).toBeTruthy();
  });

  it("says whether the onion skin is on", () => {
    render(
      <StagePlaybackControls
        playing={false}
        onionSkin
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(
      screen.getByRole("button", { name: "Bóng mờ giai đoạn trước" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("reports both presses", () => {
    const onTogglePlay = vi.fn();
    const onToggleOnionSkin = vi.fn();

    render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled={false}
        onTogglePlay={onTogglePlay}
        onToggleOnionSkin={onToggleOnionSkin}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Chạy các giai đoạn" }));
    fireEvent.click(screen.getByRole("button", { name: "Bóng mờ giai đoạn trước" }));

    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onToggleOnionSkin).toHaveBeenCalledOnce();
  });

  it("switches both buttons off when there is only one stage", () => {
    render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(
      screen.getByRole("button", { name: "Chạy các giai đoạn" })
    ).toBeDisabled();
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- stage-playback-controls.test.tsx`
Expected: FAIL — `Failed to resolve import "../components/stage-playback-controls"`.

- [ ] **Step 7: Viết component**

Create `apps/web/features/tactics/components/stage-playback-controls.tsx`:

```tsx
"use client";

import { Layers, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StagePlaybackControlsProps {
  /** Whether the stages are walking themselves */
  playing: boolean;
  /** Whether the stage before the active one is ghosted underneath */
  onionSkin: boolean;
  /** True when there is only one stage, so neither button has anything to do */
  disabled: boolean;
  onTogglePlay: () => void;
  onToggleOnionSkin: () => void;
}

/**
 * The two buttons that read a tactic rather than change it: play the stages, and ghost the one
 * before.
 *
 * One component for the viewer and the editor, so the two screens cannot drift apart on what
 * reading a tactic looks like.
 * @param props - The two states and the two callbacks
 * @returns The button pair
 */
export function StagePlaybackControls({
  playing,
  onionSkin,
  disabled,
  onTogglePlay,
  onToggleOnionSkin,
}: StagePlaybackControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="xs"
        variant="ghost"
        disabled={disabled}
        aria-label={playing ? "Dừng" : "Chạy các giai đoạn"}
        title={playing ? "Dừng" : "Chạy các giai đoạn"}
        onClick={onTogglePlay}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        type="button"
        size="xs"
        variant={onionSkin ? "secondary" : "ghost"}
        disabled={disabled}
        aria-pressed={onionSkin}
        aria-label="Bóng mờ giai đoạn trước"
        title="Bóng mờ giai đoạn trước"
        onClick={onToggleOnionSkin}
      >
        <Layers />
      </Button>
    </div>
  );
}
```

Nếu `size="xs"` không tồn tại trên `Button`, dùng `size="sm"` (kiểm tra bằng
`grep -n "xs" apps/web/components/ui/button.tsx`).

- [ ] **Step 8: Chạy cả hai test, xác nhận xanh**

Run: `pnpm --filter web test -- use-stage-playback.test.tsx stage-playback-controls.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/tactics/hooks/use-stage-playback.ts apps/web/features/tactics/components/stage-playback-controls.tsx apps/web/features/tactics/__tests__/use-stage-playback.test.tsx apps/web/features/tactics/__tests__/stage-playback-controls.test.tsx
git commit -m "feat(tactics): play the stages and ghost the one before"
```

---

## Task 7: Đấu nối `TacticViewer`

**Files:**
- Modify: `apps/web/features/tactics/components/tactic-viewer.tsx`
- Modify: `apps/web/features/tactics/__tests__/tactic-viewer.test.tsx`

**Interfaces:**
- Consumes: `useStageTransition` (Task 4), `useStagePlayback` + `StagePlaybackControls` (Task 6),
  `frame`/`animating` props của `TacticCanvas` (Task 5).
- Produces: không có API mới.

- [ ] **Step 1: Viết test hỏng**

Thêm vào `apps/web/features/tactics/__tests__/tactic-viewer.test.tsx` (giữ nguyên phần mock
`TacticCanvas` đang có; nếu file chưa mock, đọc cách `tactic-stage-view.test.tsx` mock `react-konva`
và làm theo):

```tsx
it("hands the canvas a frame rather than a stage", () => {
  render(<TacticViewer stages={stages} />);

  expect(canvasProps()).toHaveProperty("frame");
  expect(canvasProps()).not.toHaveProperty("stage");
});

it("offers the play and onion-skin buttons once there are two stages", () => {
  render(<TacticViewer stages={stages} />);

  expect(screen.getByRole("button", { name: "Chạy các giai đoạn" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Bóng mờ giai đoạn trước" })
  ).toBeTruthy();
});

it("keeps both buttons off a one-stage tactic", () => {
  render(<TacticViewer stages={[stages[0]]} />);

  expect(
    screen.queryByRole("button", { name: "Chạy các giai đoạn" })
  ).toBeNull();
});
```

`canvasProps()` là hàm đọc props lần render cuối của `TacticCanvas` từ mock; nếu file chưa có, viết
theo khuôn `konvaNode` trong `tactic-stage-view.test.tsx`.

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- tactic-viewer.test.tsx`
Expected: FAIL — canvas vẫn nhận `stage`, và không có nút nào.

- [ ] **Step 3: Sửa `tactic-viewer.tsx`**

3a. Thêm import:

```ts
import { useStagePlayback } from "../hooks/use-stage-playback";
import { useStageTransition } from "../hooks/use-stage-transition";
import { StagePlaybackControls } from "./stage-playback-controls";
```

3b. Ngay dưới `const stage = …`, thêm:

```ts
  const [onionSkin, setOnionSkin] = useState(false);
  const { frame, animating } = useStageTransition(stages, stage?.id ?? null, {
    onionSkin,
  });
  const playback = useStagePlayback(
    stages,
    stage?.id ?? null,
    animating,
    setActiveStageId
  );

  /**
   * Open a stage because the person asked for it, which ends any playback that was running.
   * @param stageId - Id of the stage to open
   */
  function selectStage(stageId: string): void {
    playback.stop();
    setActiveStageId(stageId);
  }
```

3c. Đổi `useStageArrows(stages, stage?.id ?? null, setActiveStageId)` thành
`useStageArrows(stages, stage?.id ?? null, selectStage)`.

3d. Đổi `onClick={() => setActiveStageId(candidate.id)}` trên mỗi tab thành
`onClick={() => selectStage(candidate.id)}`.

3e. Thêm `<StagePlaybackControls …/>` ngay sau `<StageArrowHint …/>` trong thanh tab:

```tsx
          <StagePlaybackControls
            playing={playback.playing}
            onionSkin={onionSkin}
            disabled={false}
            onTogglePlay={playback.toggle}
            onToggleOnionSkin={() => setOnionSkin((on) => !on)}
          />
```

Cả cụm này đã nằm trong nhánh `stages.length > 1`, nên một chiến thuật một giai đoạn không thấy nút.

3f. Đổi canvas:

```tsx
        {frame ? (
          <TacticCanvas
            frame={frame}
            animating={animating}
            width={width}
            zoom={stageZoom.zoom}
            readOnly
            onWheel={stageZoom.onWheel}
            onStageMouseDown={stageZoom.onPanStart}
          />
        ) : null}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- tactic-viewer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/tactics/components/tactic-viewer.tsx apps/web/features/tactics/__tests__/tactic-viewer.test.tsx
git commit -m "feat(tactics): animate stage changes in the viewer"
```

---

## Task 8: Đấu nối editor, và giữ ảnh xuất ra sạch

**Files:**
- Modify: `apps/web/features/tactics/components/tactic-editor-screen.tsx`
- Modify: `apps/web/features/tactics/components/stage-bar.tsx`
- Modify: `apps/web/features/tactics/__tests__/stage-bar.test.tsx`
- Modify: `apps/web/features/tactics/__tests__/tactic-editor-screen.test.tsx`

**Interfaces:**
- Consumes: mọi thứ từ Task 4 tới Task 7.
- Produces: `StageBarProps` thêm `playbackControls?: React.ReactNode` — nút điều khiển do màn hình
  dựng và truyền vào, để `StageBar` không phải tự biết về playback.

- [ ] **Step 1: Viết test hỏng**

Thêm vào `apps/web/features/tactics/__tests__/stage-bar.test.tsx`:

```tsx
it("shows whatever playback controls it was handed", () => {
  render(
    <StageBar
      stages={stages}
      activeStageId="s1"
      isAdmin
      playbackControls={<button>chạy</button>}
      onSelect={() => {}}
      onAdd={() => {}}
      onDuplicate={() => {}}
      onRename={() => {}}
      onRemove={() => {}}
    />
  );

  expect(screen.getByText("chạy")).toBeTruthy();
});
```

Thêm vào `apps/web/features/tactics/__tests__/tactic-editor-screen.test.tsx` một test xác nhận canvas
nhận `frame` (theo đúng khuôn mock `TacticCanvas` file đó đang dùng; nếu file chưa mock canvas, bỏ
qua test này và ghi lý do trong commit body).

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Run: `pnpm --filter web test -- stage-bar.test.tsx tactic-editor-screen.test.tsx`
Expected: FAIL — `StageBar` chưa nhận `playbackControls`.

- [ ] **Step 3: Sửa `stage-bar.tsx`**

Thêm vào `StageBarProps`:

```ts
  /** The play and onion-skin buttons, built by the screen so this strip stays about stages */
  playbackControls?: React.ReactNode;
```

Nhận `playbackControls` trong chữ ký, và render ngay sau `<StageArrowHint …/>`:

```tsx
      {playbackControls}
```

- [ ] **Step 4: Sửa `tactic-editor-screen.tsx`**

4a. Thêm import:

```ts
import { useStagePlayback } from "../hooks/use-stage-playback";
import { useStageTransition } from "../hooks/use-stage-transition";
import { StagePlaybackControls } from "./stage-playback-controls";
```

4b. Thêm state, ngay cạnh `const [exportOpen, setExportOpen] = useState(false);`:

```ts
  const [onionSkin, setOnionSkin] = useState(false);
```

4c. **Sau** dòng `const exporter = useTacticExport(…)` (thứ tự quan trọng: hai hook dưới đọc
`exporter.exporting`), thêm:

```ts
  // An export switches stage and screenshots two frames later. With a move running, every picture
  // in the zip would catch the tokens mid-flight, so the canvas stands still until it is done.
  const { frame, animating } = useStageTransition(stages, activeStageId, {
    enabled: !exporter.exporting,
    onionSkin: onionSkin && !exporter.exporting,
  });
  const playback = useStagePlayback(
    stages,
    activeStageId,
    animating,
    setActiveStage
  );

  /**
   * Open a stage because the admin asked for it, which ends any playback that was running.
   * @param stageId - Id of the stage to open
   */
  function selectStage(stageId: string): void {
    playback.stop();
    setActiveStage(stageId);
  }
```

4d. Trong `<StageBar …/>`: đổi `onSelect={setActiveStage}` thành `onSelect={selectStage}` và thêm:

```tsx
                playbackControls={
                  <StagePlaybackControls
                    playing={playback.playing}
                    onionSkin={onionSkin}
                    disabled={stages.length < 2}
                    onTogglePlay={playback.toggle}
                    onToggleOnionSkin={() => setOnionSkin((on) => !on)}
                  />
                }
```

4e. Đổi canvas: thay `{editor.activeStage ? (` thành `{frame ? (`, và trên `<TacticCanvas …/>` thay
`stage={editor.activeStage}` bằng:

```tsx
                      frame={frame}
                      animating={animating}
```

- [ ] **Step 5: Chạy toàn bộ suite**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ. Test nào còn dựng `TacticCanvas`/`TacticStageView` với prop `stage` thì sửa
sang `frame={staticFrame(stage)}`.

- [ ] **Step 6: Typecheck và lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: cả hai sạch.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/tactics
git commit -m "feat(tactics): animate stage changes in the editor, not in an export"
```

---

## Task 9: Tài liệu

**Files:**
- Modify: `docs/architecture.md`

**Interfaces:**
- Consumes: không có.
- Produces: không có.

- [ ] **Step 1: Tìm chỗ nói về `Tactic`**

Run: `grep -n "TacticTokenPreset\` | A named token" docs/architecture.md`
Dòng cần sửa nằm trong bảng mô hình dữ liệu, quanh dòng 545.

- [ ] **Step 2: Thêm một câu vào ô mô tả `Tactic`**

Nối vào cuối ô `Tactic` trong bảng đó:

> Một quân cờ **giữ nguyên `id` khi giai đoạn được nhân bản**, nên cùng một đơn vị nhận ra được ở hai
> giai đoạn liền nhau và màn xem vẽ được đường nó đi. `id` chỉ cần duy nhất trong một giai đoạn; mọi
> thao tác sửa đều chạy trên đúng một giai đoạn. Bản vẽ lưu từ trước thay đổi này có id lệch nhau,
> và được ghép dự phòng theo `label + icon`. Xem
> [`superpowers/specs/2026-09-23-tactic-stage-animation-design.md`](superpowers/specs/2026-09-23-tactic-stage-animation-design.md).

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(tactics): record that a token keeps its id across stages"
```

---

## Verify (chạy hết sau Task 9)

- [ ] `pnpm --filter @guild/shared build`
- [ ] `pnpm --filter web test` — toàn bộ suite xanh
- [ ] `pnpm --filter web typecheck`
- [ ] `pnpm --filter web lint`
- [ ] `pnpm --filter web build`

Kiểm tay, chạy `pnpm --filter web dev` và mở một chiến thuật có ít nhất ba giai đoạn:

- [ ] Bấm tab tới rồi lui: quân trượt thẳng, chiều lui là chuyển động đảo.
- [ ] Bấm ba tab thật nhanh liên tiếp: quân đổi hướng từ chỗ nó đang đứng, không nhảy về điểm đầu.
- [ ] Phím mũi tên trái/phải: cùng hành vi, và đang phát thì dừng phát.
- [ ] Nút Play: chạy hết các giai đoạn rồi dừng ở giai đoạn cuối. Bấm lại thì quay về giai đoạn 1.
- [ ] Nút bóng mờ: thấy vị trí quân của giai đoạn liền trước; giai đoạn 1 không có bóng nào.
- [ ] Bật "giảm chuyển động" trong hệ điều hành: đổi giai đoạn cắt thẳng, không animation.
- [ ] Kéo một quân trong lúc animation đang chạy: không kéo được.
- [ ] Xuất một ảnh và xuất ZIP: mở từng ảnh, không có bóng mờ, không vệt đuôi, không khung dở dang.
- [ ] Nhân bản một giai đoạn rồi kéo một quân sang chỗ khác: animation giữa hai giai đoạn chạy đúng.
- [ ] Mở một chiến thuật **đã lưu từ trước** thay đổi này: animation vẫn chạy nhờ ghép `label + icon`.
