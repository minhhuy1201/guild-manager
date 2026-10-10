// Lint fixture for __tests__/lint-rules.test.ts: core/index.ts is an entry point, but a file nested
// below core/ is not. Never imported by app code.
import { toBase64Url } from "@/features/auth/core/__tests__/sign-token";

export const fixture = toBase64Url;
