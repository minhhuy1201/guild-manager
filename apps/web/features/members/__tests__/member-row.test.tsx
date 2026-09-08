// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass, GUILD_ROLE_LABEL, GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { Table, TableBody } from "@/components/ui/table";
import { MemberRow } from "../components/member-row";

afterEach(cleanup);

const MEMBER: GuildMember = {
  id: "m1",
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
  role: GuildRole.MEMBER,
  discordId: "42",
  discordUsername: "meomap",
  lastLoginAt: null,
};

/**
 * Render one member row inside a real table.
 * @param member - Member the row displays
 * @returns The testing-library render result
 */
function renderRow(member: GuildMember = MEMBER, isLastAdmin = false) {
  return render(
    <Table>
      <TableBody>
        <MemberRow
          member={member}
          isLastAdmin={isLastAdmin}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </TableBody>
    </Table>
  );
}

describe("MemberRow - cột quyền", () => {
  it("hiển thị quyền dạng badge chỉ để đọc", () => {
    renderRow();
    const badge = screen.getByText(GUILD_ROLE_LABEL[GuildRole.MEMBER]);
    expect(badge.dataset.slot).toBe("badge");
  });

  it("không còn ô chọn quyền trong bảng", () => {
    renderRow();
    expect(screen.queryByLabelText(`Quyền của ${MEMBER.name}`)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("hiển thị nhãn quyền quản trị", () => {
    renderRow({ ...MEMBER, role: GuildRole.ADMIN });
    expect(
      screen.getByText(GUILD_ROLE_LABEL[GuildRole.ADMIN])
    ).not.toBeNull();
  });
});

describe("MemberRow - quản trị viên cuối cùng", () => {
  it("khoá nút xoá quản trị viên cuối cùng, và nói vì sao", () => {
    renderRow({ ...MEMBER, role: GuildRole.ADMIN }, true);
    const button = screen.getByRole("button", {
      name: `Không thể xoá ${MEMBER.name}: đây là quản trị viên cuối cùng`,
    });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("nút xoá vẫn dùng được khi còn quản trị viên khác", () => {
    renderRow({ ...MEMBER, role: GuildRole.ADMIN }, false);
    const button = screen.getByRole("button", { name: `Xoá ${MEMBER.name}` });
    expect(button.hasAttribute("disabled")).toBe(false);
  });
});
