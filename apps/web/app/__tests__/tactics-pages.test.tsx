import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

const getActor = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getActor: () => getActor(),
}));

/** Stand-in for `next/navigation`'s `redirect`, which throws to unwind the render. */
class Redirected extends Error {
  constructor(readonly target: string) {
    super(`redirect: ${target}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new Redirected(target);
  },
}));

vi.mock("@/features/tactics", () => ({
  TacticListScreen: (props: { canEdit: boolean }) => props,
  TacticEditorScreen: (props: { tacticId: string; canEdit: boolean }) => props,
}));

const TacticsPage = (await import("../chien-thuat/page")).default;
const TacticPage = (await import("../chien-thuat/[id]/page")).default;

/**
 * Render a page and report where it sent the visitor, or the element it rendered.
 * @param render - The page render to run
 * @returns The redirect target, or the rendered element
 */
async function outcomeOf(
  render: () => Promise<unknown>
): Promise<{ target: string | null; element: unknown }> {
  try {
    return { target: null, element: await render() };
  } catch (error) {
    if (error instanceof Redirected) return { target: error.target, element: null };
    throw error;
  }
}

describe("Trang danh sách chiến thuật", () => {
  it("chưa đăng nhập thì về trang đăng nhập", async () => {
    getActor.mockResolvedValue(null);

    expect((await outcomeOf(() => TacticsPage())).target).toBe(ROUTES.login);
  });

  it("member vào được, nhưng không phải admin", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    const { target, element } = await outcomeOf(() => TacticsPage());

    expect(target).toBeNull();
    expect((element as { props: { canEdit: boolean } }).props.canEdit).toBe(
      false
    );
  });

  it("Manager có Capability sửa chiến thuật được quyền ghi", async () => {
    getActor.mockResolvedValue({
      discordId: "1",
      role: "MANAGER",
      capabilities: ["TACTICS"],
    });

    const { element } = await outcomeOf(() => TacticsPage());

    expect((element as { props: { canEdit: boolean } }).props.canEdit).toBe(true);
  });

  it("Manager thiếu Capability chỉ đọc được, vẫn vào được trang", async () => {
    getActor.mockResolvedValue({
      discordId: "1",
      role: "MANAGER",
      capabilities: ["CAT_RACE"],
    });

    const { target, element } = await outcomeOf(() => TacticsPage());

    expect(target).toBeNull();
    expect((element as { props: { canEdit: boolean } }).props.canEdit).toBe(false);
  });

  it("admin vào được với quyền ghi", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { element } = await outcomeOf(() => TacticsPage());

    expect((element as { props: { canEdit: boolean } }).props.canEdit).toBe(
      true
    );
  });
});

describe("Trang một chiến thuật", () => {
  it("chưa đăng nhập thì về trang đăng nhập", async () => {
    getActor.mockResolvedValue(null);

    const { target } = await outcomeOf(() =>
      TacticPage({ params: Promise.resolve({ id: "t1" }) })
    );

    expect(target).toBe(ROUTES.login);
  });

  it("truyền id trên đường dẫn xuống màn editor", async () => {
    getActor.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { element } = await outcomeOf(() =>
      TacticPage({ params: Promise.resolve({ id: "t1" }) })
    );

    expect(
      (element as { props: { tacticId: string; canEdit: boolean } }).props
    ).toMatchObject({ tacticId: "t1", canEdit: true });
  });
});
