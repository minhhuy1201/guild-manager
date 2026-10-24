import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getSession = vi.fn();
const loadFeaturedRaces = vi.fn();

vi.mock("@/features/auth/server", () => ({ getSession: () => getSession() }));
vi.mock("@/features/landing/server", () => ({
  loadFeaturedRaces: () => loadFeaturedRaces(),
}));
vi.mock("@/features/landing", () => ({ LandingScreen: () => null }));

const LandingPage = (await import("../trang-chu/page")).default;

beforeEach(() => {
  getSession.mockResolvedValue(null);
});

describe("Trang chủ", () => {
  it("chưa đăng nhập vẫn dựng trang và truyền các đợt Bảng vàng", async () => {
    const races = [{ id: "e1" }];
    loadFeaturedRaces.mockResolvedValue(races);

    const element = (await LandingPage()) as {
      props: { isSignedIn: boolean; featuredRaces: unknown };
    };

    expect(element.props.isSignedIn).toBe(false);
    expect(element.props.featuredRaces).toBe(races);
  });

  it("không có đợt nào thì trang vẫn dựng với danh sách rỗng", async () => {
    loadFeaturedRaces.mockResolvedValue([]);

    const element = (await LandingPage()) as { props: { featuredRaces: unknown } };

    expect(element.props.featuredRaces).toEqual([]);
  });
});
