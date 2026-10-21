import { ApiError } from "./api-client";

/**
 * What a Server Action returns instead of throwing.
 *
 * In a production build React sends only a digest for an error thrown by a Server Action, so the
 * client would lose both the backend's Vietnamese message and its status code (and with them the 401
 * session recovery and the 409/412 branches). A returned value crosses the boundary intact.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; statusCode: number };

/**
 * Run an API call inside a Server Action and report a backend rejection as a value.
 *
 * Only `ApiError` is caught. Anything else is a bug or a framework signal (`redirect()`), and must
 * keep reaching Next so it is logged on the server.
 * @param run - The API call
 * @returns The data on success, the backend's message and status on an `ApiError`
 * @throws Whatever `run` throws that is not an `ApiError`
 */
export async function toActionResult<T>(
  run: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    return { ok: false, message: error.message, statusCode: error.statusCode };
  }
}

/**
 * Turn a Server Action's result back into the value or the `ApiError` the client code expects.
 * @param result - What the action returned
 * @returns The data of a success
 * @throws ApiError carrying the backend's message and status for a failure
 */
export function unwrapAction<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new ApiError(result.message, result.statusCode);

  return result.data;
}

/**
 * Adapt a Server Action for `mutationFn` / `queryFn`: same arguments, rejects with an `ApiError`.
 * @param action - A Server Action returning an `ActionResult`
 * @returns A function with the same arguments that resolves to the data
 */
export function fromAction<A extends unknown[], T>(
  action: (...args: A) => Promise<ActionResult<T>>
): (...args: A) => Promise<T> {
  return async (...args) => unwrapAction(await action(...args));
}
