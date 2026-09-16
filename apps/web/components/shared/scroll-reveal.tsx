"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The window a block has to reach to play, as the observer's root margin.
 *
 * The bottom is pulled up 12% of the screen: a block that only started once it was fully inside
 * the fold would arrive late enough to be seen arriving, which reads as slow.
 *
 * The top is pushed out further than any page is tall, and that is what makes a flick safe. The
 * observer only reports a *change* of state, computed once a frame, so a block that a single jump
 * carries clean past the screen - a wheel flick, a `Home`/`End` key, an anchor - would go from
 * "below" to "above" between two frames without ever being reported as on screen, and would stay
 * hidden for good. With a root this tall upwards, "above the screen" is still inside it, so the
 * block is reported the moment it is passed.
 */
const REVEAL_ROOT_MARGIN = "100000px 0px -12% 0px";

interface ScrollRevealProps {
  /** The block that waits for the fold */
  children: ReactNode;
}

/**
 * A block that stays hidden until it is scrolled into view, then plays the page's own entrance -
 * the 320ms fade and 6px rise of `page-enter` (`app/globals.css`).
 *
 * The animation itself is CSS: this component only decides *when*, by flipping `data-revealed`
 * once. An `IntersectionObserver` and not a scroll listener, so nothing runs per frame; it is
 * disconnected on the first crossing, because a block never un-arrives.
 *
 * A wrapper `<div>` rather than classes on the block itself: the blocks are Server Components, and
 * only the wrapper needs the client. It also takes the block's place as the direct child of
 * `<main>`, whose staggered `page-enter` this reveal replaces.
 * @param children - The block that waits for the fold
 * @returns The wrapped block
 */
export function ScrollReveal({ children }: ScrollRevealProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    // No observer means no way to tell when the block arrives, and a block nobody can reveal is a
    // block nobody can read - so it is shown at once.
    if (!wrapper || typeof IntersectionObserver === "undefined") {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setIsRevealed(true);
        observer.disconnect();
      },
      { rootMargin: REVEAL_ROOT_MARGIN }
    );

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-slot="scroll-reveal"
      data-revealed={isRevealed ? "" : undefined}
    >
      {children}
    </div>
  );
}
