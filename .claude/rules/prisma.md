---
paths:
  - "apps/api/prisma/**"
  - "apps/api/prisma.config.ts"
---

# Prisma

- **Never commit `src/generated/prisma`.** `postinstall` generates it.
- **Change the schema in this order:** edit `prisma/schema.prisma`, run `pnpm prisma:migrate`, commit the migration folder. CI applies migrations; never run `migrate deploy` against production by hand.
- **Keep the Prisma enums in step with `@guild/shared/enums`.** `src/__tests__/prisma-enum-sync.spec.ts` fails on drift; it reads the generated client, so regenerate before trusting a local run.
- **Write a data-conversion step by hand for a destructive migration** (drop a column, change a type). Prisma generates `DROP COLUMN` + `ADD COLUMN`, which loses the data.
- **Skip the app's import rules here.** `prisma/**` and `prisma.config.ts` run outside the app, under the Prisma CLI, and are exempt from the ESLint boundaries.
