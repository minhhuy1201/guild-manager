// Lint fixture for __tests__/lint-rules.test.ts: a feature component calling TanStack Query
// directly. The type-only import must stay allowed. Never imported by app code.
import type { QueryKey } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

const FIXTURE_KEY: QueryKey = ["lint-fixture"];

export function useFixture() {
  return useQuery({ queryKey: FIXTURE_KEY, queryFn: () => 1 });
}
