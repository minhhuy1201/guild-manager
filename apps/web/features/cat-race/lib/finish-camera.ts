import type { LaneLayout } from "./race-layout";

/** Race time at which the camera starts to move, and when it reaches full stretch. */
export const CAMERA_FROM_U = 0.8;
export const CAMERA_FULL_U = 0.93;
/**
 * How many times the last stretch of track is spread out. 2 shows the second half of the track:
 * the gaps at the front double, the cats keep their size, nobody leaves the picture.
 */
export const CAMERA_STRETCH = 2;

/**
 * Smooth 0..1 ramp.
 * @param x - Input, clamped to 0..1
 * @returns Eased value
 */
function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));

  return t * t * (3 - 2 * t);
}

/**
 * The layout the track and the cats are painted with while the camera follows the finish. The
 * finish point stays put and everything behind it spreads out, so the camera "dollies" toward the
 * line without enlarging any cat and without touching the name column.
 * @param layout - The real layout
 * @param u - Race time, 0..1
 * @param isOn - Whether the camera is switched on
 * @returns A layout whose start moves left and whose travel grows
 */
export function cameraLayout(layout: LaneLayout, u: number, isOn: boolean): LaneLayout {
  if (!isOn) return layout;
  const stretch =
    1 + (CAMERA_STRETCH - 1) * smoothstep((u - CAMERA_FROM_U) / (CAMERA_FULL_U - CAMERA_FROM_U));
  if (stretch === 1) return layout;
  const finishPoint = layout.startX + layout.travel;

  return {
    ...layout,
    startX: finishPoint - layout.travel * stretch,
    travel: layout.travel * stretch,
  };
}
