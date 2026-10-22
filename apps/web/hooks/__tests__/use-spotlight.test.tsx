// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSpotlight } from "../use-spotlight";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Answer each media query by name.
 * @param answers - Which queries report a match
 */
function stubMedia(answers: { finePointer: boolean; reducedMotion: boolean }): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("pointer: fine")
      ? answers.finePointer
      : answers.reducedMotion,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/**
 * A card wired to the hook.
 * @returns The card
 */
function Card() {
  const spotlight = useSpotlight();

  return <div data-testid="card" {...spotlight} />;
}

/**
 * Move the pointer over the card at a point of its box.
 * @returns The card element
 */
function movePointer(): HTMLElement {
  const card = screen.getByTestId("card");

  card.getBoundingClientRect = () => new DOMRect(100, 50, 200, 100);
  fireEvent.pointerMove(card, { clientX: 130, clientY: 90 });

  return card;
}

describe("useSpotlight", () => {
  it("writes the pointer position, relative to the card, into CSS variables", () => {
    stubMedia({ finePointer: true, reducedMotion: false });
    render(<Card />);

    const card = movePointer();

    expect(card.style.getPropertyValue("--spot-x")).toBe("30px");
    expect(card.style.getPropertyValue("--spot-y")).toBe("40px");
  });

  it("stays off on a touch screen", () => {
    stubMedia({ finePointer: false, reducedMotion: false });
    render(<Card />);

    expect(movePointer().style.getPropertyValue("--spot-x")).toBe("");
  });

  it("stays off when the system asks for less motion", () => {
    stubMedia({ finePointer: true, reducedMotion: true });
    render(<Card />);

    expect(movePointer().style.getPropertyValue("--spot-x")).toBe("");
  });

  it("hides the light once the pointer leaves", () => {
    stubMedia({ finePointer: true, reducedMotion: false });
    render(<Card />);

    const card = movePointer();

    fireEvent.pointerLeave(card);

    expect(card.style.getPropertyValue("--spot-x")).toBe("");
  });
});
