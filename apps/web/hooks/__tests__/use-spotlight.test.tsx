// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSpotlight } from "../use-spotlight";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Answer the reduced-motion query.
 * @param answers - Whether the system asks for less motion
 */
function stubMedia(answers: { reducedMotion: boolean }): void {
  vi.stubGlobal("matchMedia", () => ({
    matches: answers.reducedMotion,
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
 * Move a pointer over the card at a point of its box.
 * @param pointerType - What drives the pointer
 * @returns The card element
 */
function movePointer(pointerType = "mouse"): HTMLElement {
  const card = screen.getByTestId("card");

  card.getBoundingClientRect = () => new DOMRect(100, 50, 200, 100);
  fireEvent.pointerMove(card, { clientX: 130, clientY: 90, pointerType });

  return card;
}

describe("useSpotlight", () => {
  it("writes the pointer position, relative to the card, into CSS variables", () => {
    stubMedia({ reducedMotion: false });
    render(<Card />);

    const card = movePointer();

    expect(card.style.getPropertyValue("--spot-x")).toBe("30px");
    expect(card.style.getPropertyValue("--spot-y")).toBe("40px");
  });

  it("follows a pen as it does a mouse", () => {
    stubMedia({ reducedMotion: false });
    render(<Card />);

    expect(movePointer("pen").style.getPropertyValue("--spot-x")).toBe("30px");
  });

  it("stays off for a finger, even where a mouse is also attached", () => {
    stubMedia({ reducedMotion: false });
    render(<Card />);

    expect(movePointer("touch").style.getPropertyValue("--spot-x")).toBe("");
  });

  it("stays off when the system asks for less motion", () => {
    stubMedia({ reducedMotion: true });
    render(<Card />);

    expect(movePointer().style.getPropertyValue("--spot-x")).toBe("");
  });

  it("hides the light once the pointer leaves", () => {
    stubMedia({ reducedMotion: false });
    render(<Card />);

    const card = movePointer();

    fireEvent.pointerLeave(card);

    expect(card.style.getPropertyValue("--spot-x")).toBe("");
  });
});
