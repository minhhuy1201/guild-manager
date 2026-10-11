---
paths:
  - "apps/api/src/config/**"
  - "apps/api/.env.example"
---

# API config and environment

- **Never read `process.env`.** Declare the variable in `config/env.validation.ts` and inject `AppConfigService` (`config.get('X', { infer: true })`) so the value keeps its parsed type.
- **Allow two exceptions only:** `config/response-verification.ts` (codecs are module-level, outside DI) and the hand-run `src/scripts/` (no DI).
- **Keep `DIRECT_DATABASE_URL` out of the schema.** Prisma CLI only, never the runtime.
- **Add a new API variable in all of these:** `src/config/env.validation.ts`, `.env.example`, the tables in `docs/development.md` §3 and `docs/production.md` §3. `src/config/__tests__/env-example.spec.ts` fails when they drift.
- **Fail loud on a missing or malformed variable at startup.** The message is Vietnamese and names the field.

Why: [`backend.md` §7](../../../apps/api/docs/backend.md#7-config-and-environment).
