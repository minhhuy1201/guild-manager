import { ApiError } from "./api-client";

/**
 * The four fields `combineQueries` reads off a TanStack query.
 * Declared here instead of `Pick<UseQueryResult, …>` so the function stays pure
 * and generic-free: any object with these fields can be combined, and a test
 * needs no QueryClient to build one.
 */
export interface CombinableQuery {
  /** True while the query has not resolved yet. */
  isPending: boolean;
  /** True once the query has failed. */
  isError: boolean;
  /** Whatever the query threw — an `ApiError` for a backend response. */
  error: unknown;
  /** Runs the query again. */
  refetch: () => Promise<unknown>;
}

/** Combined loading/error state of a group of queries. */
export interface QueryGroupState {
  /** True while any query in the group has not resolved yet. */
  isPending: boolean;
  /** True as soon as one query fails. */
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error. */
  errorMessage: string;
  /** Refetches every query in the group at once. */
  refetch: () => void;
}

/**
 * Collapses a group of queries into one loading/error state.
 * The backend's Vietnamese `ApiError.message` wins; `fallbackMessage` only
 * covers failures that carry no message meant for a user (network, parsing).
 * @param queries - Queries to combine, in the order they should be blamed for an error
 * @param fallbackMessage - Vietnamese text shown when the failure is not an `ApiError`
 * @returns Combined pending/error state plus a refetch-all callback
 */
export function combineQueries(
  queries: readonly CombinableQuery[],
  fallbackMessage: string
): QueryGroupState {
  const firstError = queries.find((query) => query.isError)?.error ?? null;

  return {
    isPending: queries.some((query) => query.isPending),
    isError: firstError !== null,
    errorMessage: readErrorMessage(firstError, fallbackMessage),
    // Refetch tất cả cùng lúc — không await tuần tự từng query.
    refetch: () => {
      void Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/**
 * Reads a display message out of a failing query's error.
 * @param error - Error of the first failing query, or null when nothing failed
 * @param fallbackMessage - Text to use when the error is not an `ApiError`
 * @returns Backend message for an `ApiError`, the fallback otherwise, "" when no error
 */
function readErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error === null) return "";

  return error instanceof ApiError ? error.message : fallbackMessage;
}
