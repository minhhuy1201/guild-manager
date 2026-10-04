// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const calendar = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

// The real calendar renders a month of buttons; what is under test is what the field hands it and
// what it reports back for a click.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: { onSelect: (date: Date | undefined) => void }) => {
    calendar.props = props as unknown as Record<string, unknown>;

    return (
      <button type="button" onClick={() => props.onSelect(new Date(2026, 9, 5))}>
        chọn 05/10
      </button>
    );
  },
}));

import { LeaveDayField } from "../components/leave-day-field";

afterEach(cleanup);

/** The field's button; its accessible name is the label it carries, its text the value or hint. */
const trigger = () => screen.getByRole("button", { name: "Từ ngày" });

/** Render a field around spies. */
function renderField(value: string, minDay?: string) {
  const onChange = vi.fn();
  render(
    <LeaveDayField
      id="from"
      label="Từ ngày"
      value={value}
      onChange={onChange}
      minDay={minDay}
    />
  );

  return onChange;
}

describe("LeaveDayField", () => {
  it("chưa chọn thì hiện gợi ý Chọn ngày", () => {
    renderField("");

    expect(trigger().textContent).toContain("Chọn ngày");
  });

  it("đã chọn thì hiện ngày dạng dd/mm/yyyy", () => {
    renderField("2026-10-05");

    expect(trigger().textContent).toContain("05/10/2026");
  });

  it("chọn trên lịch báo YYYY-MM-DD theo lịch người chọn và đóng popover", () => {
    const onChange = renderField("");

    fireEvent.click(trigger());
    fireEvent.click(screen.getByText("chọn 05/10"));

    expect(onChange).toHaveBeenCalledWith("2026-10-05");
    expect(screen.queryByText("chọn 05/10")).toBeNull();
  });

  it("khoá các ngày trước minDay", () => {
    renderField("", "2026-10-04");
    fireEvent.click(trigger());

    expect(calendar.props?.disabled).toEqual({ before: new Date(2026, 9, 4) });
  });

  it("không khoá gì khi không có minDay", () => {
    renderField("");
    fireEvent.click(trigger());

    expect(calendar.props?.disabled).toBeUndefined();
  });
});
