// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MatchTabs } from "../match-tabs";

afterEach(cleanup);

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** Handlers the row needs but this test never exercises. */
const HANDLERS = {
  onSelect: () => {},
  onAdd: () => {},
  onRemove: () => {},
};

describe("MatchTabs", () => {
  it("một đội hình mà ngày cho phép hai thì vẫn mời tạo trận 2", () => {
    render(
      <MatchTabs
        matchCount={1}
        activeMatchIndex={0}
        secondMatchHasMembers={false}
        canAddMatch
        {...HANDLERS}
      />
    );

    expect(screen.getByRole("button", { name: /Tạo trận 2/ })).toBeTruthy();
  });

  it("ngày 1 trận thì hàng này biến mất hẳn", () => {
    const { container } = render(
      <MatchTabs
        matchCount={1}
        activeMatchIndex={0}
        secondMatchHasMembers={false}
        canAddMatch={false}
        {...HANDLERS}
      />
    );

    expect(container.firstElementChild).toBeNull();
  });

  it("hai đội hình thì có hai tab", () => {
    render(
      <MatchTabs
        matchCount={2}
        activeMatchIndex={0}
        secondMatchHasMembers={false}
        canAddMatch={false}
        {...HANDLERS}
      />
    );

    expect(screen.getByRole("tab", { name: "Trận 1" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Trận 2" })).toBeTruthy();
  });
});
