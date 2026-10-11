// Lint fixture for __tests__/lint-rules.test.ts: one feature reaching into another feature's
// internal file. Never imported by app code.
import { isLastAdmin } from "@/features/members/lib/last-admin";

export const fixture = isLastAdmin;
