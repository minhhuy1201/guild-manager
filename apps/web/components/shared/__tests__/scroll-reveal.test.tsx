// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScrollReveal } from "../scroll-reveal";

/** The observers built during a test, so a test can decide when a block crosses the fold. */
const observers: {
  callback: IntersectionObserverCallback;
  rootMargin: string | undefined;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

/**
 * jsdom lays nothing out, so it ships no `IntersectionObserver`. This one records its callback and
 * hands the test the trigger the browser would pull on scroll.
 * @returns The stub class, already installed on `window`
 */
function installObserver() {
  class ObserverStub {
    disconnect = vi.fn();

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ) {
      observers.push({
        callback,
        rootMargin: options?.rootMargin,
        disconnect: this.disconnect,
      });
    }

    observe() {}
    unobserve() {}
  }

  vi.stubGlobal("IntersectionObserver", ObserverStub);
}

/**
 * Plays the crossing the browser would report once the block reaches the fold.
 * @param isIntersecting - Whether the block has reached the observer's window
 */
function reportCrossing(isIntersecting: boolean) {
  const observer = observers[0];

  act(() => {
    observer.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
}

afterEach(() => {
  cleanup();
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe("ScrollReveal", () => {
  it("giữ khối ẩn cho tới khi cuộn tới", () => {
    installObserver();

    render(
      <ScrollReveal>
        <p>Ban chỉ huy</p>
      </ScrollReveal>
    );

    const wrapper = screen.getByText("Ban chỉ huy").parentElement;
    expect(wrapper?.hasAttribute("data-revealed")).toBe(false);

    reportCrossing(false);
    expect(wrapper?.hasAttribute("data-revealed")).toBe(false);

    reportCrossing(true);
    expect(wrapper?.hasAttribute("data-revealed")).toBe(true);
  });

  it("mở cửa sổ quan sát cao hơn mọi trang, để cuộn vụt qua vẫn hiện", () => {
    installObserver();

    render(
      <ScrollReveal>
        <p>Ban chỉ huy</p>
      </ScrollReveal>
    );

    // A block carried past the screen in one jump is only ever reported if it is still inside the
    // observer's window once it is above the fold.
    expect(observers[0].rootMargin).toBe("100000px 0px -12% 0px");
  });

  it("hiện một lần rồi thôi quan sát", () => {
    installObserver();

    render(
      <ScrollReveal>
        <p>Ban chỉ huy</p>
      </ScrollReveal>
    );

    reportCrossing(true);

    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it("trình duyệt không có IntersectionObserver thì hiện ngay", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(
      <ScrollReveal>
        <p>Ban chỉ huy</p>
      </ScrollReveal>
    );

    expect(
      screen.getByText("Ban chỉ huy").parentElement?.hasAttribute(
        "data-revealed"
      )
    ).toBe(true);
  });
});
