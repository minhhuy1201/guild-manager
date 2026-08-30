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
function renderRow(member: GuildMember = MEMBER) {
  return render(
    <Table>
      <TableBody>
        <MemberRow member={member} onEdit={vi.fn()} onDelete={vi.fn()} />
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
