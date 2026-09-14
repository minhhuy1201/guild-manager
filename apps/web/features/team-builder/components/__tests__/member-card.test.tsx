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

// Trên điện thoại không có hover để mở tooltip, nên điều cần biết phải nằm ngay trên thẻ.
describe("MemberCard - không phụ thuộc hover", () => {
  it("có cảnh báo thì cảnh báo hiện bằng chữ trên thẻ", () => {
    render(<MemberCard character={CHARACTER} warning={WARNING} />);

    expect(screen.getByText(WARNING)).toBeTruthy();
  });

  it("không có cảnh báo thì không có dòng cảnh báo", () => {
    render(<MemberCard character={CHARACTER} />);

    expect(screen.queryByText(WARNING)).toBeNull();
  });

  // Một dòng cắt tên dài chỉ còn vài chữ, và tooltip giữ tên đầy đủ thì ngón tay không mở được.
  it("tên xuống tối đa hai dòng thay vì bị cắt một dòng", () => {
    render(<MemberCard character={CHARACTER} />);

    const name = screen.getByText(CHARACTER.name);

    expect(name.className).toContain("line-clamp-2");
    expect(name.className).not.toContain("truncate");
  });
});
