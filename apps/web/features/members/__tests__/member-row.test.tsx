// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass, GuildRole } from "@guild/shared/enums";
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
 * @param isSavingRole - Whether this row's role write is in flight
 * @returns The testing-library render result
 */
function renderRow(isSavingRole: boolean) {
  return render(
    <Table>
      <TableBody>
        <MemberRow
          member={MEMBER}
          currentDiscordId="other"
          isSavingRole={isSavingRole}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </TableBody>
    </Table>
  );
}

describe("MemberRow", () => {
  it("đang ghi thì khoá select quyền và báo cho trình đọc màn hình", () => {
    renderRow(true);
    expect(screen.getByText("Đang lưu quyền").classList.contains("sr-only")).toBe(
      true
    );
    expect(
      screen.getByLabelText(`Quyền của ${MEMBER.name}`).hasAttribute("disabled")
    ).toBe(true);
  });

  it("không ghi thì không có spinner", () => {
    renderRow(false);
    expect(screen.queryByText("Đang lưu quyền")).toBeNull();
  });
});
