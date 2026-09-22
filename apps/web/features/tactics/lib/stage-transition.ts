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
  /** The arrows, strokes and notes */
  elements: TacticElement[];
  /** How solid to draw them, from 0 to 1 */
  opacity: number;
}

/**
 * One frame of the scene: enough to draw, and nothing more.
 *
 * The canvas takes this rather than a `TacticStage`, so standing still and moving are the same
 * render path - a still frame is just one whose opacities are all 1.
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
  // the one the first token already took.
  const byKey = new Map<string, TacticToken[]>();

  for (const unit of target) {
    if (takenIds.has(unit.id)) continue;

    const key = fallbackKey(unit);
    const queue = byKey.get(key);

    if (queue) {
      queue.push(unit);
    } else {
      byKey.set(key, [unit]);
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
 * This is what makes an interrupted move continue from where it is: the next move starts from the
 * tokens exactly where they stand on screen, rather than snapping them back to the stage they were
 * already walking away from.
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
