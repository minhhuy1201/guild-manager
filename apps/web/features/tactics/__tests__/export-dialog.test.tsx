// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportDialog } from "../components/export-dialog";

afterEach(cleanup);

describe("ExportDialog", () => {
  it("offers the open stage and the whole zip, counting the stages", () => {
    render(
      <ExportDialog
        open
        exporting={false}
        stageCount={3}
        onOpenChange={vi.fn()}
        onExportActive={vi.fn()}
        onExportAll={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /Giai đoạn đang mở/ })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tất cả 3 giai đoạn (ZIP)" })
    ).toBeTruthy();
  });

  it("reports which export the user asked for", () => {
    const onExportActive = vi.fn();
    const onExportAll = vi.fn();
    render(
      <ExportDialog
        open
        exporting={false}
        stageCount={1}
        onOpenChange={vi.fn()}
        onExportActive={onExportActive}
        onExportAll={onExportAll}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Giai đoạn đang mở/ }));
    expect(onExportActive).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Tất cả/ }));
    expect(onExportAll).toHaveBeenCalled();
  });

  it("locks both buttons while an export is running", () => {
    render(
      <ExportDialog
        open
        exporting
        stageCount={2}
        onOpenChange={vi.fn()}
        onExportActive={vi.fn()}
        onExportAll={vi.fn()}
      />
    );

    expect(screen.getByText("Đang xuất...")).toBeTruthy();
    for (const button of screen.getAllByRole("button")) {
      if (button.textContent?.includes("Giai đoạn đang mở")) {
        expect(button.hasAttribute("disabled")).toBe(true);
      }
    }
  });
});
