import JSZip from "jszip";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

/** How many device pixels one map unit is exported at. Two keeps the labels crisp when printed. */
export const EXPORT_PIXEL_RATIO = 2;

/** How the Konva stage is drawn now: the fit-and-zoom scale and where the map's corner sits. */
export interface StageTransform {
  /** Screen pixels per map unit */
  scale: number;
  /** Where the map's left edge sits on the canvas, in screen pixels */
  x: number;
  /** Where the map's top edge sits on the canvas, in screen pixels */
  y: number;
}

/** What Konva's `toDataURL` needs to render exactly the map, whatever the view. */
export interface ExportRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelRatio: number;
}

/**
 * The part of the canvas that is the map, and the pixel ratio that renders it at a fixed size.
 *
 * Konva redraws the region rather than copying the canvas, so a map zoomed past the edges or panned
 * half out of view still comes out whole, and dividing by the scale makes every export the same
 * size on any screen.
 * @param transform - How the stage is drawn right now
 * @returns The region to hand `toDataURL`
 */
export function mapExportRegion({ scale, x, y }: StageTransform): ExportRegion {
  return {
    x,
    y,
    width: TACTIC_MAP_WIDTH * scale,
    height: TACTIC_MAP_HEIGHT * scale,
    pixelRatio: EXPORT_PIXEL_RATIO / scale,
  };
}

/** Characters a file system refuses, replaced by a dash. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

/** What an unsafe character becomes, and what gets cut off either end of a name. */
const DASH = "-";

/** What a name falls back to once every character in it was unsafe. */
const FALLBACK_TACTIC_NAME = "chien-thuat";

/** What a stage name falls back to once every character in it was unsafe. */
const FALLBACK_STAGE_NAME = "giai-doan";

/**
 * Cut the dashes off both ends of a name.
 *
 * A scan rather than `/^-+|-+$/`: an anchored `-+` backtracks over a long run of dashes, which is
 * quadratic on a name made mostly of them — and every character a file system refuses has just
 * become one.
 * @param value - The name, with the unsafe characters already replaced
 * @returns The name without its leading and trailing dashes
 */
function trimDashes(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === DASH) {
    start += 1;
  }

  while (end > start && value[end - 1] === DASH) {
    end -= 1;
  }

  return value.slice(start, end);
}

/**
 * Strip the characters a file system refuses, and the dashes they leave at either end.
 * @param value - The name as the admin typed it
 * @param fallback - What to return when nothing usable is left
 * @returns A name safe to write to disk
 */
function safeName(value: string, fallback: string): string {
  const cleaned = trimDashes(
    value.replace(UNSAFE_FILENAME_CHARS, DASH)
  ).trim();

  return cleaned === "" ? fallback : cleaned;
}

/**
 * The file name one exported stage is saved under.
 * @param tacticName - Name of the tactic
 * @param index - The stage's position, starting at 1
 * @param stageName - Name of the stage
 * @returns The file name, with its extension
 */
export function exportFileName(
  tacticName: string,
  index: number,
  stageName: string
): string {
  return `${safeName(tacticName, FALLBACK_TACTIC_NAME)}-${index}-${safeName(
    stageName,
    FALLBACK_STAGE_NAME
  )}.png`;
}

/** One rendered stage waiting to be written out. */
export interface ExportedStage {
  /** File name, from `exportFileName` */
  name: string;
  /** The stage as a `data:image/png;base64,…` URL */
  dataUrl: string;
}

/**
 * Pack several rendered stages into one zip.
 * @param files - The rendered stages, in stage order
 * @returns The zip, ready to hand to `downloadBlob`
 */
export async function buildStagesZip(files: ExportedStage[]): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.dataUrl.split(",")[1] ?? "", { base64: true });
  }

  return zip.generateAsync({ type: "blob" });
}

/**
 * Hand a blob to the browser as a download.
 * @param blob - What to save
 * @param fileName - What to call it
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Hand a data URL to the browser as a download.
 * @param dataUrl - The image, as a data URL
 * @param fileName - What to call it
 */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");

  link.href = dataUrl;
  link.download = fileName;
  link.click();
}
