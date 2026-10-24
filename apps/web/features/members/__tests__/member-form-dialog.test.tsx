// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Capability,
  GrantableCommand,
  GuildClass,
  GuildRole,
} from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
  viewerRole: { current: "ADMIN" as string },
  toastSuccess: vi.fn(),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: m.toastSuccess,
  toastError: vi.fn(),
}));

vi.mock("../hooks/use-member-mutations", () => ({
  useUpdateMember: () => ({ mutateAsync: m.update }),
  useCreateMember: () => ({ mutateAsync: m.create }),
}));
vi.mock("../hooks/use-members", () => ({ useMembers: () => ({ data: [] }) }));
vi.mock("@/features/auth", () => ({
  useSession: () => ({
    data: { discordId: "viewer", role: m.viewerRole.current },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
// The class icons are next/image, which needs a mounted app router.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} />,
}));

import { MemberFormDialog } from "../components/member-form-dialog";

afterEach(cleanup);
beforeEach(() => {
  m.viewerRole.current = GuildRole.ADMIN;
  m.update.mockResolvedValue({});
});

const MEMBER: GuildMember = {
  id: "m1",
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
  role: GuildRole.MEMBER,
  discordId: "42",
  discordUsername: null,
  lastLoginAt: null,
  capabilities: [],
  grantedCommands: [],
};

/**
 * Open the dialog on a member.
 * @param member - Member being edited, null to create
 */
function renderDialog(member: GuildMember | null = MEMBER) {
  render(<MemberFormDialog open member={member} onOpenChange={vi.fn()} />);
}

/**
 * Pick a role in the role select.
 * @param label - Visible label of the role
 */
async function pickRole(label: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Quyền" }));
  const option = await screen.findByRole("option", { name: label });
  // Base UI commits an option on a click that follows a pointer press on it.
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

describe("MemberFormDialog - Grant", () => {
  it("không hiện checklist khi vai không phải Quản lý", () => {
    renderDialog();

    expect(screen.queryByText("Chức năng")).toBeNull();
    expect(screen.queryByText("Command Discord")).toBeNull();
  });

  it("chọn vai Quản lý thì hiện hai nhóm checklist, mặc định không tick gì", async () => {
    renderDialog();

    await pickRole("Quản lý");

    expect(screen.getByText("Chức năng")).not.toBeNull();
    expect(screen.getByText("Command Discord")).not.toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box.getAttribute("aria-checked")).toBe("false");
    }
  });

  it("đổi vai khỏi Quản lý thì checklist biến mất", async () => {
    renderDialog({ ...MEMBER, role: GuildRole.MANAGER });
    expect(screen.getByText("Chức năng")).not.toBeNull();

    await pickRole("Bang chúng");

    expect(screen.queryByText("Chức năng")).toBeNull();
  });

  it("lưu vai Quản lý cùng đúng những ô đã tick", async () => {
    renderDialog();
    await pickRole("Quản lý");

    fireEvent.click(screen.getByRole("checkbox", { name: "Xếp team" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "/thong-bao" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(m.update).toHaveBeenCalled());
    expect(m.update.mock.calls[0][0].input).toMatchObject({
      role: GuildRole.MANAGER,
      capabilities: [Capability.TEAM_BUILDER],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it("sửa Quản lý đang có: tick sẵn đúng Grant hiện tại", () => {
    renderDialog({
      ...MEMBER,
      role: GuildRole.MANAGER,
      capabilities: [Capability.CAT_RACE],
    });

    expect(
      screen
        .getByRole("checkbox", { name: "Đua mèo" })
        .getAttribute("aria-checked")
    ).toBe("true");
    expect(
      screen
        .getByRole("checkbox", { name: "Xếp team" })
        .getAttribute("aria-checked")
    ).toBe("false");
  });

  it("không gửi Grant khi lưu một Member không đổi vai", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(m.update).toHaveBeenCalled());
    const { input } = m.update.mock.calls[0][0];
    expect(input).not.toHaveProperty("capabilities");
    expect(input).not.toHaveProperty("grantedCommands");
  });
});

describe("MemberFormDialog - người xem không phải Admin", () => {
  it("không thấy ô chọn vai lẫn checklist", () => {
    m.viewerRole.current = GuildRole.MANAGER;

    renderDialog({ ...MEMBER, role: GuildRole.MANAGER });

    expect(screen.queryByRole("combobox", { name: "Quyền" })).toBeNull();
    expect(screen.queryByText("Chức năng")).toBeNull();
  });

  it("lưu chỉ gửi tên, lưu phái và Discord ID", async () => {
    m.viewerRole.current = GuildRole.MANAGER;
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(m.update).toHaveBeenCalled());
    expect(Object.keys(m.update.mock.calls[0][0].input).sort()).toEqual([
      "discordId",
      "guildClass",
      "name",
    ]);
  });
});

describe("MemberFormDialog - toast", () => {
  it("sửa xong thì báo đã lưu thay đổi của thành viên", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(m.toastSuccess).toHaveBeenCalledWith(
        "Đã lưu thay đổi cho Mèo Mập."
      )
    );
  });

  it("lưu lỗi thì không toast thành công", async () => {
    m.update.mockRejectedValue(new Error("Máy chủ đang bận."));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await screen.findByText("Máy chủ đang bận.");
    expect(m.toastSuccess).not.toHaveBeenCalled();
  });
});
