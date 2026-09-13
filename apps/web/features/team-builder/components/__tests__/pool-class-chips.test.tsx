// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import { PoolClassChips } from "../pool-class-chips";

afterEach(cleanup);

const COUNTS = [
  { guildClass: GuildClass.THIET_Y, count: 3 },
  { guildClass: GuildClass.TO_VAN, count: 4 },
];

/**
 * Read one chip by the class it names.
 * @param name - Accessible name to match
 * @returns The chip button
 */
function chip(name: RegExp): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("PoolClassChips", () => {
  it("mỗi lưu phái một chip, nói rõ tên và số người", () => {
    render(<PoolClassChips counts={COUNTS} selected={[]} onToggle={vi.fn()} />);

    expect(chip(/Thiết Y: 3 người/).textContent).toContain("3");
    expect(chip(/Tố Vấn: 4 người/).textContent).toContain("4");
  });

  it("bấm chip thì bật/tắt lọc lưu phái đó", () => {
    const onToggle = vi.fn();
    render(<PoolClassChips counts={COUNTS} selected={[]} onToggle={onToggle} />);

    fireEvent.click(chip(/Tố Vấn/));

    expect(onToggle).toHaveBeenCalledWith(GuildClass.TO_VAN);
  });

  it("chip của lưu phái đang lọc được đánh dấu là đang bật", () => {
    render(
      <PoolClassChips
        counts={COUNTS}
        selected={[GuildClass.TO_VAN]}
        onToggle={vi.fn()}
      />
    );

    expect(chip(/Tố Vấn/).getAttribute("aria-pressed")).toBe("true");
    expect(chip(/Thiết Y/).getAttribute("aria-pressed")).toBe("false");
  });

  it("kho rỗng thì không render gì", () => {
    const { container } = render(
      <PoolClassChips counts={[]} selected={[]} onToggle={vi.fn()} />
    );

    expect(container.childElementCount).toBe(0);
  });
});
