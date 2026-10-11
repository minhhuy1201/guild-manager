# apps/api — NestJS backend

Guild Manager's backend: NestJS 11 on Express, Prisma 7 + PostgreSQL through `@prisma/adapter-pg`,
Zod for env and DTO validation, Jest. Error `message` values are Vietnamese — the frontend shows them
verbatim.

Convention lives in [`.claude/rules/api/`](../../.claude/rules/api/), [`shared.md`](../../.claude/rules/shared.md)
and [`prisma.md`](../../.claude/rules/prisma.md), and loads when you touch a matching file.
[`docs/backend.md`](docs/backend.md) keeps the reasons and worked examples.
[`../../docs/architecture.md`](../../docs/architecture.md) §3 says what exists today (§5 the data
model, §6 the time rules, §7 where new behavior goes); the rule files win on convention.

| When you touch… | Rule file |
|---|---|
| `src/modules/`, `common/`, `infrastructure/`, `vercel.json`: layering, boundaries, crons | `module.md` |
| `src/modules/discord-bot/`, the register script | `discord.md` |
| `src/config/`, `.env.example`: environment variables | `config.md` |
| `prisma/`: schema, migrations | `prisma.md` |

- **There are no path aliases here.** Internal imports are relative (`../../config`), shared code goes
  by real package name (`@guild/shared/*`). Do not reintroduce `@/…`.
- **Nothing reads `process.env`.** Declare the variable in `config/env.validation.ts`; details in
  `config.md`.

## Naming

| Kind | Convention | Example |
|---|---|---|
| Folder | `kebab-case`, plural for a collection domain | `characters/`, `battle-sessions/` |
| File | `kebab-case.type.ts` | `mark-attendance.dto.ts`, `current-user.decorator.ts` |
| Class | `PascalCase` | `CreateCharacterDto`, `AllExceptionsFilter` |
| Interface / type | `PascalCase`, **no** `I` prefix | `MemberEntity`, `ErrorResponseBody` |
| Constant | `SCREAMING_SNAKE_CASE` | `API_PREFIX`, `REQUEST_ID_HEADER` |
| Boolean | `is` / `has` / `should` / `can` prefix | `isReminderDay` |
| Barrel `index.ts` | only in `common/` and `config/` | |
