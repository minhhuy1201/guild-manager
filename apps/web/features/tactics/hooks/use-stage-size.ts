"use client";

import { useEffect, useRef, useState } from "react";

/** What `useStageSize` hands back: the element to measure, and its current width. */
export interface StageSize {
  /** Ref to put on the element whose width the stage follows */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Current width of that element, in CSS pixels; 0 before the first measurement */
  width: number;
}

/**
 * Follow the width of the element the stage is drawn into.
 * The stage scales off one number, so only the width is measured — the height follows the map's
 * aspect ratio.
 * @returns The ref to attach and the measured width
 */
export function useStageSize(): StageSize {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
