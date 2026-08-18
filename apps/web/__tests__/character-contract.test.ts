import { describe, expect, it } from "vitest";
import { characterSchema } from "@shared/schemas";

/**
 * Khoá số field của `Character` trong contract. Thêm field vào response phải là
 * một thay đổi có chủ đích — test này đỏ thì nhớ sửa cả hai app đọc shape này.
 */
describe("characterSchema", () => {
  it("có đúng ba field: id, name, guildClass", () => {
    expect(Object.keys(characterSchema.shape).sort()).toEqual([
      "guildClass",
      "id",
      "name",
    ]);
  });
});
