// Lint fixture for __tests__/lint-rules.test.ts: a file directly inside core/ other than index.ts is
// internal too. Never imported by app code.
import { readJwt } from "@/features/auth/core/jwt";

export const fixture = readJwt;
