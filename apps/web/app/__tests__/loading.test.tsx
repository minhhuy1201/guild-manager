// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Loading from "../loading";

afterEach(cleanup);

describe("Khung chờ khi chuyển trang", () => {
  it("báo cho trình đọc màn hình là trang đang tải", () => {
    render(<Loading />);

    expect(screen.getByRole("status").textContent).toBe("Đang tải trang");
  });
});
