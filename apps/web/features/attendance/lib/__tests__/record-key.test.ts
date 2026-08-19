import { describe, expect, it } from "vitest";

import { recordKey } from "../record-key";

describe("recordKey", () => {
  it("ghép characterId và sessionId thành một khoá", () => {
    expect(recordKey("char-1", "sess-1")).toBe("char-1__sess-1");
  });

  it("hai cặp khác nhau cho ra hai khoá khác nhau", () => {
    expect(recordKey("char-1", "sess-2")).not.toBe(
      recordKey("char-2", "sess-1")
    );
  });
});
