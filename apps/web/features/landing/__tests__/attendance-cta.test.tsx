// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

// The auth barrel reaches the user menu's server actions and so `server-only` - harmless here, since
// no action ever runs. Same stub the team builder's tests use.
vi.mock("server-only", () => ({}));

import { AttendanceCta } from "../components/attendance-cta";

afterEach(cleanup);

describe("AttendanceCta", () => {
  it("đã đăng nhập thì nút dẫn thẳng tới màn điểm danh", () => {
    render(<AttendanceCta isSignedIn />);

    // Base UI's Button keeps `role="button"` on the anchor it renders, so the accessible role is
    // "button" even though the element is an `a` carrying an href.
    expect(
      screen
        .getByRole("button", { name: "Điểm danh ngay" })
        .getAttribute("href")
    ).toBe(ROUTES.attendance);
  });

  it("chưa đăng nhập thì nút mở đăng nhập Discord rồi quay về màn điểm danh", () => {
    render(<AttendanceCta isSignedIn={false} />);

    const href = screen
      .getByRole("button", { name: "Điểm danh ngay" })
      .getAttribute("href");

    expect(href).toContain("/auth/discord");
    expect(href).toContain(`redirect=${encodeURIComponent(ROUTES.attendance)}`);
  });
});
