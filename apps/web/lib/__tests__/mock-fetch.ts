import { vi } from "vitest";

/**
 * Build a fake fetch answering with one response.
 * @param options - status and JSON body the server "returns"
 * @returns The mock replacing global fetch
 */
export function mockFetch(options: { status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    json: () => Promise.resolve(options.body),
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

/**
 * The URL and options of the first request the mock saw.
 * @param fetchMock - The fetch mock the call went through
 * @returns The URL and the options
 */
export function requestOf(fetchMock: ReturnType<typeof mockFetch>): {
  url: string;
  init: RequestInit;
} {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

  return { url, init };
}
