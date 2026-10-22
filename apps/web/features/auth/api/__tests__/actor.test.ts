import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capability, GrantableCommand, GuildRole } from "@guild/shared/enums";

vi.mock("server-only", () => ({}));

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
const me = vi.hoisted(() => ({ fetchMe: vi.fn() }));
const memo = vi.hoisted(() => ({ clears: [] as (() => void)[] }));

vi.mock("../session", () => session);
vi.mock("../me", () => me);
// React's `cache` only memoizes while a server component renders. This stand-in memoizes the same
// way, until the test says a new render begins.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T extends () => unknown>(fn: T): T => {
    let hit: { value: unknown } | null = null;
    memo.clears.push(() => {
      hit = null;
    });

    return (() => {
      hit ??= { value: fn() };
      return hit.value;
    }) as T;
  },
}));

const { getActor, getMe } = await import("../actor");

beforeEach(() => {
  memo.clears.forEach((clear) => clear());
  session.getSession.mockReset();
  me.fetchMe.mockReset();
});

/**
 * What `/auth/me` answers.
 * @param role - Role the API reports today
 * @param grants - Grants the API reports today
 * @returns The ActionResult
 */
function meReports(
  role: GuildRole,
  grants: {
    capabilities?: Capability[];
    grantedCommands?: GrantableCommand[];
  } = {}
) {
  return {
    ok: true,
    data: { role, capabilities: [], grantedCommands: [], ...grants },
  };
}

describe("getActor", () => {
  it("trả null khi chưa đăng nhập", async () => {
    session.getSession.mockResolvedValue(null);

    expect(await getActor()).toBeNull();
    expect(me.fetchMe).not.toHaveBeenCalled();
  });

  it("Member không tốn lần gọi API nào, giữ nguyên phiên", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MEMBER,
    });

    expect(await getActor()).toEqual({
      discordId: "1",
      role: GuildRole.MEMBER,
    });
    expect(me.fetchMe).not.toHaveBeenCalled();
  });

  it("Manager mang Grant đọc từ /auth/me", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MANAGER,
    });
    me.fetchMe.mockResolvedValue(
      meReports(GuildRole.MANAGER, {
        capabilities: [Capability.TACTICS],
        grantedCommands: [GrantableCommand.THONG_BAO],
      })
    );

    expect(await getActor()).toEqual({
      discordId: "1",
      role: GuildRole.MANAGER,
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it("token Admin cũ mà API báo giờ là Quản lý thì lấy vai của API", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.ADMIN,
    });
    me.fetchMe.mockResolvedValue(meReports(GuildRole.MANAGER));

    expect((await getActor())?.role).toBe(GuildRole.MANAGER);
  });

  it("token Manager cũ mà API báo giờ là Member thì lấy vai của API, không Grant", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MANAGER,
    });
    me.fetchMe.mockResolvedValue(meReports(GuildRole.MEMBER));

    expect(await getActor()).toMatchObject({
      role: GuildRole.MEMBER,
      capabilities: [],
    });
  });

  it("Admin vẫn là Admin khi API xác nhận", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.ADMIN,
    });
    me.fetchMe.mockResolvedValue(meReports(GuildRole.ADMIN));

    expect((await getActor())?.role).toBe(GuildRole.ADMIN);
  });

  it.each([GuildRole.ADMIN, GuildRole.MANAGER])(
    "token %s mà /auth/me lỗi thì chỉ còn là Member, không mở cửa",
    async (role) => {
      session.getSession.mockResolvedValue({ discordId: "1", role });
      me.fetchMe.mockResolvedValue({
        ok: false,
        message: "x",
        statusCode: 500,
      });

      expect(await getActor()).toEqual({
        discordId: "1",
        role: GuildRole.MEMBER,
      });
    }
  );
});

describe("một lần render chỉ gọi /auth/me một lần", () => {
  it("getActor và getMe dùng chung một lần đọc", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.ADMIN,
    });
    me.fetchMe.mockResolvedValue(meReports(GuildRole.ADMIN));

    await getActor();
    await getMe();
    await getActor();

    expect(me.fetchMe).toHaveBeenCalledTimes(1);
  });

  it("render kế tiếp đọc lại, không giữ kết quả cũ", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.ADMIN,
    });
    me.fetchMe.mockResolvedValue(meReports(GuildRole.ADMIN));
    await getActor();

    memo.clears.forEach((clear) => clear());
    me.fetchMe.mockResolvedValue(meReports(GuildRole.MEMBER));

    expect((await getActor())?.role).toBe(GuildRole.MEMBER);
    expect(me.fetchMe).toHaveBeenCalledTimes(2);
  });
});
