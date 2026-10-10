// Lint fixture for __tests__/lint-rules.test.ts: code outside features/ reaching into a feature's
// internal file. Never imported by app code.
import { isLastAdmin } from "@/features/members/lib/last-admin";

export const fixture = isLastAdmin;
