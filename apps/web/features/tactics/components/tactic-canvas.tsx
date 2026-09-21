"use client";

import dynamic from "next/dynamic";

/**
 * The Konva stage, loaded in the browser only: Konva reaches for `window` at import time, so
 * rendering it on the server takes the page down with it.
 */
export const TacticCanvas = dynamic(
  () => import("./tactic-stage-view").then((mod) => mod.TacticStageView),
  { ssr: false }
);
