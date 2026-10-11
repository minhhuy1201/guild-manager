# apps/web — Next.js frontend

Guild Manager's frontend: Next.js 16 App Router, Tailwind 4 + shadcn/ui on Base UI, TanStack Query,
Zustand, Vitest. All user-facing copy is Vietnamese; identifiers and file names are English.

Convention lives in [`.claude/rules/web/`](../../.claude/rules/web/) and loads when you touch a
matching file. [`docs/frontend.md`](docs/frontend.md) keeps the reasons and worked examples. A new
convention goes in the matching rule file; its reason goes in `docs/frontend.md`.
[`../../docs/architecture.md`](../../docs/architecture.md) §4 says what exists today; the rule files
win on convention, and §7 says where new behavior goes.

| When you touch… | Rule file |
|---|---|
| `features/`, `hooks/`, `lib/`: queries, stores, `apiFetch`, server actions, sessions | `data-flow.md` |
| `app/`, `proxy.ts`, `config/`, `features/auth/`: routes, admin guard | `routing.md` |
| `components/`, `features/*/components/`: shadcn, query groups, filters, dialogs | `components.md` |
| any `.tsx` or `globals.css`: palette, headers, icons, sizes, phone layout | `display.md` |
| any `.tsx` or `globals.css`: hover, motion, tables, toasts, save bars, shortcuts | `interaction.md` |
| `__tests__/`, `vitest.config.ts` | `tests.md` |

- **`@/*` is the app's only alias**; shared code comes in by real package name
  (`@guild/shared/enums|schemas|lib`), same as `apps/api`. The alias is declared **twice** —
  `tsconfig.json` and `vitest.config.ts` — and `__tests__/alias-sync.test.ts` fails when the two drift.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Folder | `kebab-case` | `features/team-builder/`, `components/shared/` |
| File | `kebab-case.tsx` / `.ts` | `attendance-row.tsx`, `session-subtitle.ts` |
| Component | `PascalCase`, matching the file name | `AttendanceRow`, `StatusIcon` |
| Hook | `camelCase` with a `use` prefix | `useAttendanceBoard` |
| Type / interface | `PascalCase`, **no** `I` prefix | `SessionUser`, `StatusIconProps` |
| Constant | `SCREAMING_SNAKE_CASE` | `ROUTES`, `FETCH_API_URL`, `ACCESS_TOKEN_COOKIE` |
| Boolean | `is` / `has` / `should` / `can` prefix | `isAttendanceClosed` |
| Query key factory | `<feature>Keys` in `<feature>-keys.ts` | `memberKeys`, `attendanceKeys` |
| Barrel `index.ts` | one per feature, nothing else | |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
