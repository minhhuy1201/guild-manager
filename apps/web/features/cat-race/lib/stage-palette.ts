/**
 * The cat race stage's fixed palette, identical in both themes. The DOM overlays read the same
 * values from the `--stage-*` variables in `globals.css`; a canvas cannot, so it takes them here.
 */
export const STAGE_PALETTE = {
  night: "#1b1424",
  paper: "#f3e9d2",
  paperDim: "#b9ab90",
  lacquer: "#c8372d",
  gold: "#e8b84a",
  jade: "#4fae8c",
  wood: "#2b1f1a",
  earth: "#6a4a35",
  earthAlt: "#5e4130",
  /** `--stage-plate` at 80%: the photo labels sit on the track, so they let it show through. */
  plateScrim: "#120c18cc",
  /** Solid drop shadow of a speech bubble, a purple-tinged dark like the banner's `box-shadow`. */
  bubbleShadow: "#0e0916",
  /** Scene colours below are canvas-only: no overlay needs them. */
  skyTop: "#2a1c3e",
  skyMid: "#6b3a52",
  skyHorizon: "#c9774f",
  moon: "#f6e7c4",
  ridgeFar: "#4a2f4e",
  ridgeNear: "#33223a",
  lanternString: "#1b1218",
  lanternBody: "#d8402f",
  lanternGlow: "#ff9a5a88",
  lanternGlowFade: "#ff9a5a00",
  railTop: "#6b4c36",
  rail: "#4a3426",
  railPost: "#2e2019",
  gatePillarShade: "#9e2a22",
  gateRoof: "#1e1a22",
  nameColumn: "#241a16",
  nameColumnEdge: "#e8b84a55",
  earthSpeck: "#4b3325",
  earthSpeckLight: "#83614a",
  laneDivider: "#f3e9d21f",
  quarterLine: "#f3e9d214",
  leaderLaneFrom: "#e8b84a10",
  leaderLaneTo: "#e8b84a40",
} as const;

/** Skin tones of the spectators. */
export const CROWD_SKIN_COLORS = ["#e3c9a8", "#c79b78", "#a8775a", "#7a5644"] as const;
/** Shirt colours of the spectators. */
export const CROWD_SHIRT_COLORS = [
  "#c8372d",
  "#2f5f8a",
  "#4f7d3e",
  "#8a5aa8",
  "#d9a441",
  "#3b3b4f",
] as const;
