import { describe, expect, it } from "vitest";

import { fromAction, toActionResult, unwrapAction } from "../action-result";
import { ApiError } from "../api-client";
import { isSessionExpired } from "../session-expired";

/**
 * What a Server Action return value goes through on the wire.
 * @param value - The value the action returns
 * @returns The value as the client receives it
 */
function overTheWire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("toActionResult", () => {
  it("wraps a resolved value", async () => {
    await expect(toActionResult(() => Promise.resolve(42))).resolves.toEqual({
      ok: true,
      data: 42,
    });
  });

  it("turns an ApiError into a failure value that survives serialization", async () => {
    const result = await toActionResult(() =>
      Promise.reject(new ApiError("Chưa đặt kênh thông báo chung.", 409))
    );

    expect(overTheWire(result)).toEqual({
      ok: false,
      message: "Chưa đặt kênh thông báo chung.",
      statusCode: 409,
    });
  });

  it("rethrows anything that is not an ApiError", async () => {
    const failure = new Error("boom");

    await expect(
      toActionResult(() => Promise.reject(failure))
    ).rejects.toBe(failure);
  });
});

describe("unwrapAction", () => {
  it("returns the data of a success", () => {
    expect(unwrapAction({ ok: true, data: "x" })).toBe("x");
  });

  it("rebuilds an ApiError from a failure", () => {
    const thrown = (() => {
      try {
        unwrapAction({ ok: false, message: "Hết quyền.", statusCode: 403 });
      } catch (error) {
        return error;
      }
    })();

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ message: "Hết quyền.", statusCode: 403 });
  });

  it("keeps a 401 recognisable to isSessionExpired after the round trip", async () => {
    const result = overTheWire(
      await toActionResult(() =>
        Promise.reject(new ApiError("Phiên hết hạn.", 401))
      )
    );

    expect(() => unwrapAction(result)).toThrow(ApiError);
    try {
      unwrapAction(result);
    } catch (error) {
      expect(isSessionExpired(error)).toBe(true);
    }
  });
});

describe("fromAction", () => {
  it("forwards the arguments and unwraps the result", async () => {
    const action = (a: number, b: number) =>
      Promise.resolve({ ok: true as const, data: a + b });

    await expect(fromAction(action)(2, 3)).resolves.toBe(5);
  });

  it("rejects with an ApiError when the action reports a failure", async () => {
    const action = () =>
      Promise.resolve({
        ok: false as const,
        message: "Không tìm thấy.",
        statusCode: 404,
      });

    await expect(fromAction(action)()).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 404,
    });
  });
});
