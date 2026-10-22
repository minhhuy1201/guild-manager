// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Card } from "../card";

afterEach(cleanup);

describe("Card", () => {
  it("mặc định là bề mặt default khi chỗ gọi không truyền gì", () => {
    render(<Card data-testid="card">nội dung</Card>);
    expect(screen.getByTestId("card").getAttribute("data-variant")).toBe(
      "default"
    );
  });

  it.each(["default", "raised", "inset"] as const)(
    "ghi biến thể %s vào data-variant",
    (variant) => {
      render(
        <Card data-testid="card" variant={variant}>
          nội dung
        </Card>
      );
      expect(screen.getByTestId("card").getAttribute("data-variant")).toBe(
        variant
      );
    }
  );

  it("vẫn là data-slot card và giữ className của chỗ gọi", () => {
    render(
      <Card data-testid="card" variant="raised" className="mx-auto">
        nội dung
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.getAttribute("data-slot")).toBe("card");
    expect(card.classList.contains("mx-auto")).toBe(true);
  });
});
