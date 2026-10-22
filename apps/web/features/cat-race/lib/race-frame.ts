import { laneCenterY, laneLayout, progressX, type Area, type LaneLayout } from "./race-layout";
import { progressAt, type RaceScript } from "./race-script";

/** One cat as the renderer paints it: the sprite's left edge and its lane's centre line. */
export interface FrameCat {
  readonly key: string;
  readonly x: number;
  readonly y: number;
}

/** Everything a frame needs that does not change while the race runs. */
export interface RacePlan {
  readonly script: RaceScript;
  readonly layout: LaneLayout;
  /** Cat keys from the top lane to the bottom one */
  readonly laneOrder: readonly string[];
  readonly laneOf: ReadonlyMap<string, number>;
}

/**
 * The lane of every cat, top to bottom.
 * @param script - The race
 * @param labels - Display label by cat key; lanes follow it A to Z so a name is easy to find
 * @param preferredOrder - A chosen lane order (the shuffle); keys no longer in the race are
 * dropped and keys it lacks go after it, A to Z
 * @returns Cat keys from the top lane down
 */
export function laneOrderOf(
  script: RaceScript,
  labels: ReadonlyMap<string, string>,
  preferredOrder: readonly string[] | null = null
): string[] {
  const alphabetical = script.cats
    .map((cat) => cat.key)
    .sort(
      (a, b) =>
        labels.get(a)!.localeCompare(labels.get(b)!, "vi", { numeric: true }) ||
        a.localeCompare(b)
    );
  const present = new Set(alphabetical);
  const chosen = (preferredOrder ?? []).filter((key) => present.has(key));
  const chosenSet = new Set(chosen);

  return [...chosen, ...alphabetical.filter((key) => !chosenSet.has(key))];
}

/**
 * Work out everything fixed about a race for one canvas width.
 * @param script - The race
 * @param viewport - Visible size of the track area
 * @param labels - Display label by cat key
 * @param preferredOrder - A chosen lane order, see `laneOrderOf`
 * @returns The plan the frames read
 */
export function planRace(
  script: RaceScript,
  viewport: Area,
  labels: ReadonlyMap<string, string>,
  preferredOrder: readonly string[] | null = null
): RacePlan {
  const laneOrder = laneOrderOf(script, labels, preferredOrder);

  return {
    script,
    layout: laneLayout(script.cats.length, viewport),
    laneOrder,
    laneOf: new Map(laneOrder.map((key, index) => [key, index])),
  };
}

/**
 * Position of every cat at one moment. Past `u = 1` the winner has crossed and nothing moves.
 * @param plan - The race plan
 * @param u - Race time, 0..1
 * @returns Every cat, from the top lane down
 */
export function frameAt(plan: RacePlan, u: number): FrameCat[] {
  const { script, layout } = plan;

  return plan.laneOrder.map((key) => ({
    key,
    x: progressX(progressAt(script.curves.get(key)!, u), layout),
    y: laneCenterY(plan.laneOf.get(key)!, layout),
  }));
}
