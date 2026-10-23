// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const calendar = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

// The real calendar renders a month of buttons; what is under test is what the field hands it and
// what it does with each click.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: { onDayClick: (date: Date) => void }) => {
    calendar.props = props as unknown as Record<string, unknown>;

    return (
      <>
        <button type="button" onClick={() => props.onDayClick(new Date(2026, 9, 5))}>
          bấm 05/10
        </button>
        <button type="button" onClick={() => props.onDayClick(new Date(2026, 9, 12))}>
          bấm 12/10
        </button>
        <button type="button" onClick={() => props.onDayClick(new Date(2026, 9, 3))}>
          bấm 03/10
        </button>
      </>
    );
  },
}));

import { LeaveRangeField } from "../components/leave-range-field";

afterEach(cleanup);

/** The field's button; its accessible name is the label it carries, its text the value or hint. */
const trigger = () => screen.getByRole("button", { name: "Ngày nghỉ" });

/** Render a field around a spy. */
function renderField(start: string, end: string, minDay = "2026-10-04") {
  const onChange = vi.fn();
  render(
    <LeaveRangeField
      id="range"
      label="Ngày nghỉ"
      start={start}
      end={end}
      onChange={onChange}
      minDay={minDay}
    />
  );

  return onChange;
}

describe("LeaveRangeField", () => {
  it("chưa chọn thì hiện gợi ý", () => {
    renderField("", "");

    expect(trigger().textContent).toContain("Chọn ngày nghỉ");
  });

  it("nghỉ một ngày thì chỉ hiện ngày đó", () => {
    renderField("2026-10-05", "2026-10-05");

    expect(trigger().textContent).toContain("05/10/2026");
    expect(trigger().textContent).not.toContain("đến");
  });

  it("nghỉ nhiều ngày thì hiện cả khoảng, có chữ đến cho trình đọc màn hình", () => {
    renderField("2026-10-05", "2026-10-12");

    expect(trigger().textContent).toContain("05/10/2026");
    expect(trigger().textContent).toContain("đến");
    expect(trigger().textContent).toContain("12/10/2026");
  });

  it("bấm ngày đầu là đã đủ nghỉ một ngày, lịch vẫn mở để kéo dài", () => {
    const onChange = renderField("", "");
    fireEvent.click(trigger());

    fireEvent.click(screen.getByText("bấm 05/10"));

    expect(onChange).toHaveBeenCalledWith("2026-10-05", "2026-10-05");
    expect(screen.queryByText("bấm 12/10")).not.toBeNull();
  });

  it("bấm ngày thứ hai sau ngày đầu thì chốt khoảng và đóng lịch", () => {
    const onChange = renderField("2026-10-05", "2026-10-05");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByText("bấm 05/10"));

    fireEvent.click(screen.getByText("bấm 12/10"));

    expect(onChange).toHaveBeenLastCalledWith("2026-10-05", "2026-10-12");
    expect(screen.queryByText("bấm 12/10")).toBeNull();
  });

  it("bấm ngày thứ hai trước ngày đầu thì dời ngày đầu chứ không đảo khoảng", () => {
    const onChange = renderField("2026-10-05", "2026-10-05");
    fireEvent.click(trigger());
    fireEvent.click(screen.getByText("bấm 05/10"));

    fireEvent.click(screen.getByText("bấm 03/10"));

    expect(onChange).toHaveBeenLastCalledWith("2026-10-03", "2026-10-03");
    expect(screen.queryByText("bấm 12/10")).not.toBeNull();
  });

  it("mở lại lịch khi đã có khoảng thì bấm đầu tiên bắt đầu khoảng mới", () => {
    const onChange = renderField("2026-10-05", "2026-10-12");
    fireEvent.click(trigger());

    fireEvent.click(screen.getByText("bấm 05/10"));

    expect(onChange).toHaveBeenCalledWith("2026-10-05", "2026-10-05");
  });

  it("khoá các ngày trước minDay", () => {
    renderField("", "", "2026-10-04");
    fireEvent.click(trigger());

    expect(calendar.props?.disabled).toEqual({ before: new Date(2026, 9, 4) });
  });
});
