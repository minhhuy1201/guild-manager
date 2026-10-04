// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { MemberPicker } from "../components/member-picker";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Cún Con", guildClass: GuildClass.CUU_LINH },
];

afterEach(cleanup);

/** The picker's button; its accessible name is the label it carries, its text the pick or hint. */
const trigger = () => screen.getByRole("button", { name: "Thành viên" });

/** Render the picker around a spy. */
function renderPicker(value = "") {
  const onChange = vi.fn();
  render(
    <MemberPicker
      id="member"
      characters={CHARACTERS}
      value={value}
      onChange={onChange}
    />
  );

  return onChange;
}

describe("MemberPicker", () => {
  it("chưa chọn thì hiện gợi ý, đã chọn thì hiện tên", () => {
    renderPicker();
    expect(trigger().textContent).toContain("Chọn thành viên");
    cleanup();

    renderPicker("char-2");
    expect(trigger().textContent).toContain("Cún Con");
  });

  it("mở ra có ô tìm kiếm và đủ danh sách", () => {
    renderPicker();

    fireEvent.click(trigger());

    expect(screen.getByRole("searchbox", { name: "Tìm thành viên" })).toBeTruthy();
    expect(screen.getByText("Mèo Mập")).toBeTruthy();
    expect(screen.getByText("Cún Con")).toBeTruthy();
  });

  it("gõ không dấu vẫn lọc ra tên có dấu", () => {
    renderPicker();
    fireEvent.click(trigger());

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "cun" } });

    expect(screen.getByText("Cún Con")).toBeTruthy();
    expect(screen.queryByText("Mèo Mập")).toBeNull();
  });

  it("không khớp ai thì báo không tìm thấy", () => {
    renderPicker();
    fireEvent.click(trigger());

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });

    expect(screen.getByText("Không tìm thấy thành viên.")).toBeTruthy();
  });

  it("chọn một người báo id và đóng danh sách", () => {
    const onChange = renderPicker();
    fireEvent.click(trigger());

    fireEvent.click(screen.getByText("Cún Con"));

    expect(onChange).toHaveBeenCalledWith("char-2");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
