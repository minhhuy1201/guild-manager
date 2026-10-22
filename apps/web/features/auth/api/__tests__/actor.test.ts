import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capability, GrantableCommand, GuildRole } from "@guild/shared/enums";

vi.mock("server-only", () => ({}));

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
const me = vi.hoisted(() => ({ fetchMe: vi.fn() }));

vi.mock("../session", () => session);
vi.mock("../me", () => me);

const { getActor } = await import("../actor");

beforeEach(() => {
  session.getSession.mockReset();
  me.fetchMe.mockReset();
});

describe("getActor", () => {
  it("trả null khi chưa đăng nhập", async () => {
    session.getSession.mockResolvedValue(null);

    expect(await getActor()).toBeNull();
    expect(me.fetchMe).not.toHaveBeenCalled();
  });

  it.each([GuildRole.ADMIN, GuildRole.MEMBER])(
    "%s không tốn thêm lần gọi API nào",
    async (role) => {
      session.getSession.mockResolvedValue({ discordId: "1", role });

      expect(await getActor()).toEqual({ discordId: "1", role });
      expect(me.fetchMe).not.toHaveBeenCalled();
    }
  );

  it("Manager mang Grant đọc từ /auth/me", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MANAGER,
    });
    me.fetchMe.mockResolvedValue({
      ok: true,
      data: {
        capabilities: [Capability.TACTICS],
        grantedCommands: [GrantableCommand.THONG_BAO],
      },
    });

    expect(await getActor()).toEqual({
      discordId: "1",
      role: GuildRole.MANAGER,
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it("Manager mà /auth/me lỗi thì không có Grant nào, không mở cửa", async () => {
    session.getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MANAGER,
    });
    me.fetchMe.mockResolvedValue({ ok: false, message: "x", statusCode: 500 });

    expect(await getActor()).toEqual({
      discordId: "1",
      role: GuildRole.MANAGER,
    });
  });
});
