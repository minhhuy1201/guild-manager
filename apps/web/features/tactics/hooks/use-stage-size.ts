"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** What `useStageSize` hands back: the element to measure, and its current size. */
export interface StageSize {
  /** Callback ref to put on the element whose width the stage follows */
  ref: (element: HTMLDivElement | null) => void;
  /** Current width of that element, in CSS pixels; 0 before the first measurement */
  width: number;
  /** Current height of that element, in CSS pixels; 0 before the first measurement. Only a focus
   *  mode reads it, to fit the map into a window of fixed height. */
  height: number;
}

/**
 * Follow the width of the element the stage is drawn into.
 *
 * A **callback ref**, not an effect over a ref object: the canvas box is mounted conditionally —
 * the editor renders it only once it knows the screen is wide enough to draw on — so an effect
 * with an empty dependency list runs while the box does not exist yet, finds nothing to observe,
 * and never runs again. The stage then stays 0 wide and the map never appears. React calls this
 * function the moment the node is attached, whenever that happens.
 *
 * The canvas itself follows only the width, since its height follows the map's aspect ratio; the
 * height is reported for an area that has a height of its own to fit the map into.
 * @returns The ref to attach and the measured size
 */
export function useStageSize(): StageSize {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();

    if (!element) {
      observerRef.current = null;
      setSize({ width: 0, height: 0 });
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    observerRef.current = observer;
    // The observer reports the first size asynchronously; this makes the map appear on the frame
    // the box mounts rather than the one after.
    const { width, height } = element.getBoundingClientRect();
    setSize({ width, height });
  }, []);

  // A component unmounting takes its node's ref callback with it, but not necessarily before the
  // observer has fired again.
  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, width: size.width, height: size.height };
}
