// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

let params = new URLSearchParams();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace }),
  usePathname: () => ROUTES.settings,
}));
// The scene is next/image; the two panels fetch. What is under test is the tab choice.
vi.mock("@/components/shared/banner-image", () => ({ BannerImage: () => null }));
vi.mock("@/features/members", () => ({
  MembersPanel: () => <div data-testid="members-panel" />,
}));
vi.mock("../settings-screen", () => ({
  SettingsScreen: () => <div data-testid="settings-screen" />,
}));

import { SettingsTabs } from "../settings-tabs";

afterEach(cleanup);

beforeEach(() => {
  params = new URLSearchParams();
});

/**
 * One of the two tabs, by its visible name.
 * @param name - The tab's name
 * @returns The tab element
 */
function tab(name: RegExp): HTMLElement {
  return screen.getByRole("tab", { name });
}

describe("SettingsTabs - tab nằm trên URL", () => {
  it("không có ?tab thì mở tab lịch đánh", () => {
    render(<SettingsTabs />);

    expect(tab(/Thiết lập lịch đánh/).getAttribute("aria-selected")).toBe("true");
  });

  // Tải lại trang hay mở lại link phải về đúng tab đang làm.
  it("?tab=members mở tab thành viên", () => {
    params = new URLSearchParams("tab=members");

    render(<SettingsTabs />);

    expect(tab(/Quản lý thành viên/).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("members-panel")).toBeTruthy();
  });

  it("giá trị lạ thì mở tab lịch đánh", () => {
    params = new URLSearchParams("tab=khong-co");

    render(<SettingsTabs />);

    expect(tab(/Thiết lập lịch đánh/).getAttribute("aria-selected")).toBe("true");
  });

  it("bấm tab thành viên thì ghi ?tab=members vào URL, không thêm một bước Back", () => {
    render(<SettingsTabs />);

    fireEvent.click(tab(/Quản lý thành viên/));

    expect(replace).toHaveBeenCalledWith(`${ROUTES.settings}?tab=members`, {
      scroll: false,
    });
  });

  it("quay về tab lịch đánh thì URL bỏ ?tab", () => {
    params = new URLSearchParams("tab=members");
    render(<SettingsTabs />);

    fireEvent.click(tab(/Thiết lập lịch đánh/));

    expect(replace).toHaveBeenCalledWith(ROUTES.settings, { scroll: false });
  });
});

// Hai nhãn đầy đủ rộng hơn màn điện thoại: dải tab tràn làm cả trang rộng ra và thanh tab đáy lọt
// khỏi màn hình. Dưới sm chữ ngắn lại, còn screen reader vẫn đọc tên đầy đủ.
describe("SettingsTabs - vừa màn điện thoại", () => {
  it.each([
    ["Thiết lập lịch đánh", "Lịch đánh"],
    ["Quản lý thành viên", "Thành viên"],
  ])(
    "tab %s: tên truy cập là nhãn đầy đủ, dưới sm hiện chữ ngắn %s",
    (fullLabel, shortLabel) => {
      render(<SettingsTabs />);

      const trigger = screen.getByRole("tab", { name: fullLabel });

      expect(within(trigger).getByText(shortLabel).className).toContain(
        "sm:hidden"
      );
      expect(within(trigger).getByText(fullLabel).className).toContain(
        "max-sm:hidden"
      );
    }
  );
});

describe("SettingsTabs - không lặp tên tab", () => {
  it("tab thành viên không còn tiêu đề trùng tên tab, vẫn giữ dòng mô tả", () => {
    params = new URLSearchParams("tab=members");

    render(<SettingsTabs />);

    expect(
      screen.queryByRole("heading", { name: "Quản lý thành viên" })
    ).toBeNull();
    expect(
      screen.getByText("Thêm thành viên, sửa lưu phái, gán Discord ID và phân quyền.")
    ).toBeTruthy();
  });
});
