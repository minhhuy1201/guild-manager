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
  plate: "#120c18cc",
} as const;
