// @vitest-environment jsdom
import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";

import {
  EXPORT_PIXEL_RATIO,
  mapExportRegion,
  buildStagesZip,
  downloadBlob,
  downloadDataUrl,
  exportFileName,
} from "../lib/export-image";

describe("exportFileName", () => {
  it("joins the tactic, the number and the stage", () => {
    expect(exportFileName("Thủ cổng tây", 1, "Giai đoạn 1")).toBe(
      "Thủ cổng tây-1-Giai đoạn 1.png"
    );
  });

  it("replaces the characters a file system refuses", () => {
    expect(exportFileName("A/B", 2, "C:D")).toBe("A-B-2-C-D.png");
  });

  it("cuts the dashes the unsafe characters left at either end", () => {
    expect(exportFileName('<<A>>', 1, '"B|')).toBe("A-1-B.png");
  });

  it("never returns an empty name", () => {
    expect(exportFileName("///", 1, "///")).toBe("chien-thuat-1-giai-doan.png");
  });
});

describe("writing the files out", () => {
  it("packs each rendered stage into the zip under its own name", async () => {
    const blob = await buildStagesZip([
      { name: "a-1-Giai đoạn 1.png", dataUrl: "data:image/png;base64,QQ==" },
      { name: "a-2-Giai đoạn 2.png", dataUrl: "data:image/png;base64,Qg==" },
    ]);

    const names = Object.keys(
      (await JSZip.loadAsync(await blob.arrayBuffer())).files
    );

    expect(names).toEqual(["a-1-Giai đoạn 1.png", "a-2-Giai đoạn 2.png"]);
  });

  it("hands a blob to the browser as a download, then releases the URL", () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadBlob(new Blob(["zip"]), "chien-thuat.zip");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect((anchor as unknown as { download: string }).download).toBe(
      "chien-thuat.zip"
    );

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hands a data URL to the browser as a download", () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadDataUrl("data:image/png;base64,QQ==", "mot-giai-doan.png");

    expect(click).toHaveBeenCalled();
    expect((anchor as unknown as { href: string }).href).toBe(
      "data:image/png;base64,QQ=="
    );

    vi.restoreAllMocks();
  });
});

describe("mapExportRegion", () => {
  it("frames the whole map at a fixed size, however the view is zoomed or panned", () => {
    // Zoomed to 1.5x and panned so the map's corner sits off to the top left of the canvas.
    const region = mapExportRegion({ scale: 1.5, x: -200, y: -100 });

    expect(region).toEqual({
      x: -200,
      y: -100,
      width: TACTIC_MAP_WIDTH * 1.5,
      height: TACTIC_MAP_HEIGHT * 1.5,
      pixelRatio: EXPORT_PIXEL_RATIO / 1.5,
    });
    // What reaches the file: the map at EXPORT_PIXEL_RATIO device pixels per map unit.
    expect(region.width * region.pixelRatio).toBeCloseTo(
      TACTIC_MAP_WIDTH * EXPORT_PIXEL_RATIO
    );
  });

  it("gives the same file size on a narrow screen as on a wide one", () => {
    const narrow = mapExportRegion({ scale: 0.5, x: 0, y: 0 });
    const wide = mapExportRegion({ scale: 1, x: 0, y: 0 });

    expect(narrow.width * narrow.pixelRatio).toBeCloseTo(
      wide.width * wide.pixelRatio
    );
  });
});
