// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Spinner } from "../spinner";

afterEach(cleanup);

describe("Spinner", () => {
  it("phát ra nhãn cho trình đọc màn hình", () => {
    render(<Spinner label="Đang lưu" />);
    expect(screen.getByText("Đang lưu").classList.contains("sr-only")).toBe(
      true
    );
  });

  it("không có nhãn thì không thêm chữ nào cho trình đọc màn hình", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".sr-only")).toBeNull();
  });

  it("cỡ mặc định là md, cỡ sm nhỏ hơn", () => {
    const { container: md } = render(<Spinner label="Đang lưu" />);
    expect(md.querySelector("svg")?.classList.contains("size-4")).toBe(true);

    const { container: sm } = render(<Spinner size="sm" label="Đang lưu" />);
    expect(sm.querySelector("svg")?.classList.contains("size-3.5")).toBe(true);
  });
});
