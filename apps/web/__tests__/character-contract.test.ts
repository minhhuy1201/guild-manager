import { characterSchema } from "@guild/shared/schemas";
import { describe, expect, it } from "vitest";

/**
 * Pin the field count of `Character` in the contract. Adding a field to the response must be
 * deliberate — when this test goes red, remember to update both apps that read the shape.
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
