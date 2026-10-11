---
paths:
  - "packages/shared/**"
---

# `packages/shared`

- **Run `pnpm --filter @guild/shared build` after editing it.** Both apps run off its `dist`; types update immediately, runtime does not. Each app's `test` script rebuilds it first (`pretest`).
- **Keep `pnpm --filter @guild/shared build --watch` running** beside `next dev` and `test:watch`. Nothing else rebuilds mid-session.
- **Mirror an enum change in `apps/api/prisma/schema.prisma`** (see [`prisma.md`](prisma.md)).
- **Export only the three `exports` entries:** `enums`, `schemas`, `lib`. No path into internal files.
