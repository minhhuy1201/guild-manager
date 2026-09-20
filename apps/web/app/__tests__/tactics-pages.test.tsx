import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

const getSession = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getSession: () => getSession(),
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
  TacticListScreen: (props: { isAdmin: boolean }) => props,
  TacticEditorScreen: (props: { tacticId: string; isAdmin: boolean }) => props,
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
    getSession.mockResolvedValue(null);

    expect((await outcomeOf(() => TacticsPage())).target).toBe(ROUTES.login);
  });

  it("member vào được, nhưng không phải admin", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    const { target, element } = await outcomeOf(() => TacticsPage());

    expect(target).toBeNull();
    expect((element as { props: { isAdmin: boolean } }).props.isAdmin).toBe(
      false
    );
  });

  it("admin vào được với quyền ghi", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { element } = await outcomeOf(() => TacticsPage());

    expect((element as { props: { isAdmin: boolean } }).props.isAdmin).toBe(
      true
    );
  });
});

describe("Trang một chiến thuật", () => {
  it("chưa đăng nhập thì về trang đăng nhập", async () => {
    getSession.mockResolvedValue(null);

    const { target } = await outcomeOf(() =>
      TacticPage({ params: Promise.resolve({ id: "t1" }) })
    );

    expect(target).toBe(ROUTES.login);
  });

  it("truyền id trên đường dẫn xuống màn editor", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "ADMIN" });

    const { element } = await outcomeOf(() =>
      TacticPage({ params: Promise.resolve({ id: "t1" }) })
    );

    expect(
      (element as { props: { tacticId: string; isAdmin: boolean } }).props
    ).toMatchObject({ tacticId: "t1", isAdmin: true });
  });
});
