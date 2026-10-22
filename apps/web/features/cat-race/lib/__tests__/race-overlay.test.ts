import { describe, expect, it } from "vitest";

import type { RaceCue } from "../race-cue";
import { INITIAL_OVERLAY, LEAD_TOAST_MIN_GAP_MS, applyCue, type OverlayState } from "../race-overlay";

/** Apply cues one after another at the given times. */
function run(steps: readonly [RaceCue, number][], from: OverlayState = INITIAL_OVERLAY): OverlayState {
  return steps.reduce((state, [cue, now]) => applyCue(state, cue, now), from);
}

describe("applyCue", () => {
  it("lights the lanterns as the countdown goes, then hides it and shows CHẠY! on go", () => {
    const counting = run([
      [{ kind: "countdown", step: 0 }, 0],
      [{ kind: "countdown", step: 1 }, 800],
    ]);

    expect(counting).toMatchObject({ countdownStep: 1, isCountingDown: true, banner: null });

    const gone = applyCue(counting, { kind: "go" }, 2400);

    expect(gone.isCountingDown).toBe(false);
    expect(gone.banner?.text).toBe("CHẠY!");
  });

  it("shows NƯỚC RÚT on the sprint with a new id, so the banner animates again", () => {
    const go = run([[{ kind: "go" }, 0]]);
    const sprint = applyCue(go, { kind: "sprint" }, 9000);

    expect(sprint.banner?.text).toBe("NƯỚC RÚT");
    expect(sprint.banner?.id).not.toBe(go.banner?.id);
  });

  it("turns slow motion on and off", () => {
    const on = applyCue(INITIAL_OVERLAY, { kind: "slow-motion", isOn: true }, 0);

    expect(on.isSlow).toBe(true);
    expect(applyCue(on, { kind: "slow-motion", isOn: false }, 1).isSlow).toBe(false);
  });

  it("shows the lead-change bar with the cat, and keeps at least 1.3 seconds between bars", () => {
    const first = applyCue(INITIAL_OVERLAY, { kind: "lead-change", catKey: "a#1" }, 5000);
    const tooSoon = applyCue(first, { kind: "lead-change", catKey: "b#1" }, 5000 + LEAD_TOAST_MIN_GAP_MS - 1);
    const onTime = applyCue(first, { kind: "lead-change", catKey: "b#1" }, 5000 + LEAD_TOAST_MIN_GAP_MS);

    expect(first.leadToast?.catKey).toBe("a#1");
    expect(tooSoon).toBe(first);
    expect(onTime.leadToast).toMatchObject({ catKey: "b#1" });
    expect(onTime.leadToast?.id).not.toBe(first.leadToast?.id);
  });

  it("does not let a suppressed change push the next bar back", () => {
    const first = applyCue(INITIAL_OVERLAY, { kind: "lead-change", catKey: "a#1" }, 0);
    const suppressed = applyCue(first, { kind: "lead-change", catKey: "b#1" }, 1000);
    const shown = applyCue(suppressed, { kind: "lead-change", catKey: "c#1" }, 1400);

    expect(shown.leadToast?.catKey).toBe("c#1");
  });

  it("flashes on the finish, drops slow motion, and shows the photo only for a photo finish", () => {
    const slow = applyCue(INITIAL_OVERLAY, { kind: "slow-motion", isOn: true }, 0);
    const plain = applyCue(slow, { kind: "finish", isPhotoFinish: false, lengthsBehind: 1.4 }, 9000);
    const photo = applyCue(slow, { kind: "finish", isPhotoFinish: true, lengthsBehind: 0.1 }, 9000);

    expect(plain.flashId).not.toBeNull();
    expect(plain.isSlow).toBe(false);
    expect(plain.photo).toBeNull();
    expect(photo.photo).toEqual({ lengthsBehind: 0.1 });
  });
});
