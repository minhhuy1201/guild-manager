// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { INITIAL_OVERLAY, type OverlayState } from "../../lib/race-overlay";
import { buildRaceScript } from "../../lib/race-script";
import { RaceOverlays } from "../race-overlays";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fillText = vi.fn();
const sprites: unknown[] = [];
const fakeContext = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === "fillText") return fillText;
      if (property === "drawImage") return (image: unknown) => sprites.push(image);

      return () => undefined;
    },
    set: () => true,
  }
);

const PARTICIPANTS: CatRaceParticipant[] = ["Alice", "Bob", "Cara"].map((name, index) => ({
  characterId: `c${index}`,
  name,
  guildClass: GuildClass.TO_VAN,
  discordId: null,
  discordAvatar: null,
  tickets: 1,
}));
const SCRIPT = buildRaceScript({
  entrants: PARTICIPANTS.map((p) => ({ characterId: p.characterId, tickets: 1 })),
  winner: { characterId: "c1", ticketNo: 1 },
  durationSeconds: 10,
  scenario: "photo",
  random: () => 0.5,
});

/** Render the overlays for a state patched over the idle one. */
function renderOverlays(patch: Partial<OverlayState> = {}) {
  return render(<RaceOverlays state={{ ...INITIAL_OVERLAY, ...patch }} script={SCRIPT} participants={PARTICIPANTS} />);
}

beforeEach(() => {
  fillText.mockClear();
  sprites.length = 0;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext) as never;
});
afterEach(cleanup);

describe("RaceOverlays", () => {
  it("lights the lanterns up to the step and shows the number counting down", () => {
    const { container } = renderOverlays({ countdownStep: 1, isCountingDown: true });

    const lit = [...container.querySelectorAll(".race-lantern")].map((el) => el.getAttribute("data-lit"));
    expect(lit).toEqual(["true", "true", "false"]);
    expect(screen.getByText("2")).toBeTruthy();
    expect(container.querySelector(".race-countdown")?.getAttribute("data-on")).toBe("true");
  });

  it("makes the third lantern the gold one and hides the countdown after go", () => {
    const { container } = renderOverlays({ countdownStep: 2, isCountingDown: false });

    const gold = [...container.querySelectorAll(".race-lantern")].map((el) => el.getAttribute("data-gold"));
    expect(gold).toEqual(["false", "false", "true"]);
    expect(container.querySelector(".race-countdown")?.getAttribute("data-on")).toBe("false");
  });

  it("shows the banner text it was given, and none before", () => {
    const { rerender } = renderOverlays();
    expect(screen.queryByText("CHẠY!")).toBeNull();

    rerender(
      <RaceOverlays
        state={{ ...INITIAL_OVERLAY, banner: { id: 1, text: "NƯỚC RÚT" } }}
        script={SCRIPT}
        participants={PARTICIPANTS}
      />
    );

    expect(screen.getByText("NƯỚC RÚT")).toBeTruthy();
  });

  it("names the new leader in the lead-change bar", () => {
    const key = SCRIPT.cats.find((cat) => cat.characterId === "c2")!.key;
    renderOverlays({ leadToast: { id: 1, catKey: key } });

    expect(screen.getByText("ĐỔI NGÔI")).toBeTruthy();
    expect(screen.getByText("Cara")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("vượt lên dẫn đầu");
  });

  it("turns the vignette and CHẬM ×3 on only in slow motion", () => {
    const { container, rerender } = renderOverlays({ isSlow: true });
    expect(container.querySelector(".race-vignette")?.getAttribute("data-on")).toBe("true");
    expect(container.querySelector(".race-slowmo")?.getAttribute("data-on")).toBe("true");
    expect(screen.getByText("CHẬM ×3")).toBeTruthy();

    rerender(<RaceOverlays state={INITIAL_OVERLAY} script={SCRIPT} participants={PARTICIPANTS} />);

    expect(container.querySelector(".race-vignette")?.getAttribute("data-on")).toBe("false");
    expect(container.querySelector(".race-slowmo")?.getAttribute("data-on")).toBe("false");
  });

  it("flashes only once the finish has come", () => {
    const { container } = renderOverlays();
    expect(container.querySelector(".race-flash")).toBeNull();

    cleanup();
    const finished = renderOverlays({ flashId: 3 });

    expect(finished.container.querySelector(".race-flash")).not.toBeNull();
  });

  it("shows the finish photo of the top two with the gap, drawn from the script", () => {
    renderOverlays({ photo: { lengthsBehind: 0.1 } });

    expect(screen.getByText("ẢNH ĐÍCH")).toBeTruthy();
    expect(screen.getByText("cách 0,1 thân")).toBeTruthy();
    const texts = fillText.mock.calls.map((call) => String(call[0]));
    expect(texts).toEqual([expect.stringMatching(/^1\. /), expect.stringMatching(/^2\. /)]);
    expect(texts[0]).toContain("Bob");
    expect(sprites).toHaveLength(2);
  });

  it("shows no photo panel without a photo finish", () => {
    renderOverlays();

    expect(screen.queryByText("ẢNH ĐÍCH")).toBeNull();
  });
});
