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
  // The failing query itself, not its error: a query can report isError while
  // carrying nothing usable in `error`, and that still has to show as an error.
  const failing = queries.find((query) => query.isError);

  return {
    isPending: queries.some((query) => query.isPending),
    isError: failing !== undefined,
    errorMessage:
      failing === undefined
        ? ""
        : readErrorMessage(failing.error, fallbackMessage),
    // Refetch everything at once — never await the queries one by one.
    refetch: () => {
      void Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/**
 * Reads a display message out of a failing query's error.
 * @param error - Error the first failing query threw
 * @param fallbackMessage - Text to use when the error is not an `ApiError`
 * @returns Backend message for an `ApiError`, the fallback otherwise
 */
function readErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof ApiError ? error.message : fallbackMessage;
}
