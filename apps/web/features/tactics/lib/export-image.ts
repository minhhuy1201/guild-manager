import JSZip from "jszip";

/** How many device pixels one map unit is exported at. Two keeps the labels crisp when printed. */
export const EXPORT_PIXEL_RATIO = 2;

/** Characters a file system refuses, replaced by a dash. */
const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

/** What a name falls back to once every character in it was unsafe. */
const FALLBACK_TACTIC_NAME = "chien-thuat";

/** What a stage name falls back to once every character in it was unsafe. */
const FALLBACK_STAGE_NAME = "giai-doan";

/**
 * Strip the characters a file system refuses, and the dashes they leave at either end.
 * @param value - The name as the admin typed it
 * @param fallback - What to return when nothing usable is left
 * @returns A name safe to write to disk
 */
function safeName(value: string, fallback: string): string {
  const cleaned = value
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

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
