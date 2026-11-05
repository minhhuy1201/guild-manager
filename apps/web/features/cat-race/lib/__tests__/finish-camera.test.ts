import { describe, expect, it } from "vitest";

import { CAMERA_FROM_U, CAMERA_FULL_U, CAMERA_STRETCH, cameraLayout } from "../finish-camera";
import { laneLayout } from "../race-layout";

const LAYOUT = laneLayout(8, { width: 900, height: 600 });
const MID_U = (CAMERA_FROM_U + CAMERA_FULL_U) / 2;

describe("cameraLayout", () => {
  it("returns the real layout before the camera starts", () => {
    expect(cameraLayout(LAYOUT, 0, true)).toBe(LAYOUT);
    expect(cameraLayout(LAYOUT, CAMERA_FROM_U, true)).toEqual(LAYOUT);
  });

  it("doubles the travel once the camera is at full stretch", () => {
    expect(cameraLayout(LAYOUT, CAMERA_FULL_U, true).travel).toBeCloseTo(LAYOUT.travel * CAMERA_STRETCH);
    expect(cameraLayout(LAYOUT, 1, true).travel).toBeCloseTo(LAYOUT.travel * CAMERA_STRETCH);
  });

  it("keeps the finish point fixed at every race time", () => {
    const finish = LAYOUT.startX + LAYOUT.travel;

    for (const u of [0, 0.5, CAMERA_FROM_U, 0.85, MID_U, 0.91, CAMERA_FULL_U, 1]) {
      const camera = cameraLayout(LAYOUT, u, true);

      expect(camera.startX + camera.travel).toBeCloseTo(finish);
    }
  });

  it("leaves the name column, finish line and cat size on the real layout", () => {
    const camera = cameraLayout(LAYOUT, 1, true);

    expect(camera).toMatchObject({
      nameColumn: LAYOUT.nameColumn,
      finishX: LAYOUT.finishX,
      catWidth: LAYOUT.catWidth,
      catHeight: LAYOUT.catHeight,
    });
  });

  it("returns the real layout when the camera is off", () => {
    expect(cameraLayout(LAYOUT, 1, false)).toBe(LAYOUT);
  });

  it("stretches between 1 and 2 in between, growing with race time", () => {
    const stretches = [0.82, 0.85, MID_U, 0.9, 0.92].map(
      (u) => cameraLayout(LAYOUT, u, true).travel / LAYOUT.travel
    );

    for (const stretch of stretches) {
      expect(stretch).toBeGreaterThan(1);
      expect(stretch).toBeLessThan(CAMERA_STRETCH);
    }
    expect([...stretches].sort((a, b) => a - b)).toEqual(stretches);
    expect(new Set(stretches).size).toBe(stretches.length);
  });
});
