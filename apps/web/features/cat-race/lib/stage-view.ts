import type { LaneLayout, LaneRange } from "./race-layout";

/** The viewport a frame is painted into, scrolled `top` px. */
export interface StageView {
  readonly layout: LaneLayout;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  /** The lanes in view; the rest are not painted */
  readonly lanes: LaneRange;
}
