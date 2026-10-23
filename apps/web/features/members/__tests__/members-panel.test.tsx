// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({ viewerRole: { current: "MANAGER" as string } }));

vi.mock("../hooks/use-members", () => ({
  useMembers: () => ({
    data: MEMBERS,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/auth", () => ({
  useSession: () => ({
    data: { discordId: "viewer", role: m.viewerRole.current },
  }),
}));
vi.mock("../components/member-form-dialog", () => ({
  MemberFormDialog: () => null,
}));
vi.mock("../components/delete-member-dialog", () => ({
  DeleteMemberDialog: () => null,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

import { MembersPanel } from "../components/members-panel";

/**
 * A member in the given role.
 * @param name - Member name
 * @param role - Role the member holds
 * @returns The member
 */
function memberNamed(name: string, role: GuildRole): GuildMember {
  return {
    id: name,
    name,
    guildClass: GuildClass.THIET_Y,
    role,
    discordId: null,
    discordUsername: null,
    lastLoginAt: null,
    capabilities: [],
    grantedCommands: [],
  };
}

const MEMBERS = [
  memberNamed("Thường", GuildRole.MEMBER),
  memberNamed("Quản", GuildRole.MANAGER),
  memberNamed("Chủ", GuildRole.ADMIN),
];

afterEach(cleanup);
beforeEach(() => {
  m.viewerRole.current = GuildRole.MANAGER;
});

describe("MembersPanel - theo người xem", () => {
  it("Quản lý thêm được thành viên, sửa hàng Member, và không xoá được ai", () => {
    render(<MembersPanel />);

    expect(
      screen.getByRole("button", { name: /Thêm thành viên/ })
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Sửa Thường" })).not.toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Xoá/ })).toHaveLength(0);
  });

  it("hàng Quản lý và ADMIN chỉ xem được với Quản lý", () => {
    render(<MembersPanel />);

    expect(screen.queryByRole("button", { name: "Sửa Quản" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sửa Chủ" })).toBeNull();
    expect(
      screen.getAllByText("Chỉ ADMIN sửa được hàng của Quản lý và ADMIN")
    ).toHaveLength(2);
  });

  it("Admin sửa và xoá được mọi hàng, trừ ADMIN cuối cùng chỉ bị khoá nút xoá", () => {
    m.viewerRole.current = GuildRole.ADMIN;

    render(<MembersPanel />);

    for (const { name } of MEMBERS) {
      expect(
        screen.getByRole("button", { name: `Sửa ${name}` })
      ).not.toBeNull();
    }
    expect(screen.getByRole("button", { name: "Xoá Thường" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Xoá Quản" })).not.toBeNull();
    expect(
      screen
        .getByRole("button", {
          name: "Không thể xoá Chủ: đây là ADMIN cuối cùng",
        })
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
