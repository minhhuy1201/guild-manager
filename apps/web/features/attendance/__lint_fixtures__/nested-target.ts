// Lint fixture for __tests__/lint-rules.test.ts: the target sits two directories below its feature
// root, deeper than any single-level extglob reaches. Never imported by app code.
import { renderFormationHook } from "@/features/team-builder/hooks/__tests__/render-formation-hook";

export const fixture = renderFormationHook;
