// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { MemberCard } from "../member-card";

afterEach(cleanup);

const CHARACTER: Character = {
  id: "char-1",
  name: "Tiểu Long Nữ Cổ Mộ Phái",
  guildClass: GuildClass.CUU_LINH,
};

const WARNING = "Đã báo nghỉ trận này";

// A phone has no hover to open a tooltip, so what needs knowing has to be on the card itself.
describe("MemberCard - không phụ thuộc hover", () => {
  it("có cảnh báo thì cảnh báo hiện bằng chữ trên thẻ", () => {
    render(<MemberCard character={CHARACTER} warning={WARNING} />);

    expect(screen.getByText(WARNING)).toBeTruthy();
  });

  it("không có cảnh báo thì không có dòng cảnh báo", () => {
    render(<MemberCard character={CHARACTER} />);

    expect(screen.queryByText(WARNING)).toBeNull();
  });

  // A single line cuts a long name down to a few characters, and a finger cannot open the tooltip
  // holding the full one.
  it("tên xuống tối đa hai dòng thay vì bị cắt một dòng", () => {
    render(<MemberCard character={CHARACTER} />);

    const name = screen.getByText(CHARACTER.name);

    expect(name.className).toContain("line-clamp-2");
    expect(name.className).not.toContain("truncate");
  });
});
