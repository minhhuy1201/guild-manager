"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";
import type { QueryGroupState } from "@/lib/query-group";

interface QueryBoundaryProps {
  /** Combined state of the queries the content needs. */
  state: QueryGroupState;
  /** Placeholder shown while the group is still loading. */
  skeleton: ReactNode;
  /** Content rendered once every query has resolved. */
  children: ReactNode;
}

/**
 * Renders content once a query group is ready, and the error block or the
 * skeleton until then. The order is fixed — error first, loading second — so a
 * group where one query failed while another is still running shows the failure
 * instead of a skeleton that would never finish.
 *
 * Presentational shell only: it does not wrap the branches in a Card, because
 * each screen puts its own chrome around them.
 * @param state - Combined state of the group, from `combineQueries`
 * @param skeleton - Placeholder for the loading branch
 * @param children - Content for the resolved branch
 * @returns One of the three branches
 */
export function QueryBoundary({ state, skeleton, children }: QueryBoundaryProps) {
  if (state.isError) {
    return <ErrorState message={state.errorMessage} onRetry={state.refetch} />;
  }

  if (state.isPending) return skeleton;

  return children;
}
