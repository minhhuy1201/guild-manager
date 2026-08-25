import { API_BASE_URL } from "@/config/api";

/** HTTP status of a successful response with no body. */
const NO_CONTENT_STATUS = 204;

/** Message used when the server's error body cannot be read. */
const FALLBACK_ERROR_MESSAGE = "Không kết nối được máy chủ.";

/** An API error, keeping the backend's Vietnamese message so it can be shown straight in the UI. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code of the error response */
    readonly statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Call the backend API and unwrap the `{ data }` envelope of a successful response.
 * This is the ONLY place that fetches the backend — features never fetch themselves.
 * @param path - Path relative to the base URL, e.g. "/attendance/characters"
 * @param init - Extra fetch options (method, body…)
 * @returns The response's `data`
 * @throws ApiError on an error status, with the message taken from the backend body
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(readErrorMessage(body), response.status);
  }

  // A 204 has no body (DELETE endpoints), so there is no `{ data }` envelope to unwrap.
  if (response.status === NO_CONTENT_STATUS) return undefined as T;

  return (body as { data: T }).data;
}

/**
 * Read the error message out of the backend body.
 * @param body - The parsed body (null when it was not JSON)
 * @returns The backend's message, or the default one
 */
function readErrorMessage(body: unknown): string {
  const message = (body as { message?: unknown } | null)?.message;

  return typeof message === "string" && message !== ""
    ? message
    : FALLBACK_ERROR_MESSAGE;
}
