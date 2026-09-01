// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormationToolbar } from "../formation-toolbar";

afterEach(cleanup);

/**
 * Render the toolbar of an editable day that has a copy source.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderToolbar(
  props: Partial<React.ComponentProps<typeof FormationToolbar>> = {}
) {
  render(
    <FormationToolbar
      dirty={false}
      saving={false}
      editable
      copySourceLabel="Thứ 7 · Bang Chiến"
      canCopy
      onCopy={vi.fn()}
      onSave={vi.fn()}
      onReset={vi.fn()}
      {...props}
    />
  );
}

/**
 * Read the copy button off the rendered toolbar.
 * @param name - Accessible name to match
 * @returns The button element
 */
function copyButton(name: RegExp): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("FormationToolbar — nút copy đội hình", () => {
  it("nói rõ ngày nguồn trên nhãn nút", () => {
    renderToolbar();

    expect(copyButton(/Copy từ Thứ 7 · Bang Chiến/).disabled).toBe(false);
  });

  it("không có nguồn thì nút bị khoá và về nhãn chung", () => {
    renderToolbar({ copySourceLabel: null, canCopy: false });

    expect(copyButton(/Copy đội hình/).disabled).toBe(true);
  });

  it("bấm nút thì gọi onCopy", () => {
    const onCopy = vi.fn();
    renderToolbar({ onCopy });

    fireEvent.click(copyButton(/Copy từ/));

    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("đang lưu thì không copy được", () => {
    renderToolbar({ saving: true });

    expect(copyButton(/Copy từ/).disabled).toBe(true);
  });

  it("ngày đã đánh xong thì không có nút nào", () => {
    renderToolbar({ editable: false });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
