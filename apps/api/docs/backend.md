# Backend structure — feature-based NestJS

Why `apps/api` is laid out the way it is, and the rules that keep it that way as it grows.

This is the *reasoning* document. The binding description of what exists today — the layers, the
module list, the endpoint table, the response contract — is
[`docs/architecture.md`](../../../docs/architecture.md) §3. When the two disagree, architecture.md
wins and this file needs fixing.

Running and operating the API: [`README.md`](../README.md).

---

## 1. The idea

There are two common ways to split a backend into folders:

| Split | Example | Problem |
|---|---|---|
| **Layer-based** (by technique) | `controllers/`, `services/`, `dtos/` | Changing one feature means hopping across five folders. Does not scale. |
| **Feature-based** (by domain) | `modules/auth/`, `modules/characters/` | ✅ Everything about one domain sits in one place |

The rule is **"things that change together stay together"** (Screaming Architecture — the folder
tree should tell you what the app *does*, not which framework it uses). Opening
`src/modules/` here shows `attendance`, `auth`, `battle-sessions`, `characters`, `health`,
`team-builder`: that is the product, in one screen.

---

## 2. Overall layout

```
apps/api/
├── src/
│   ├── modules/                    # ⭐ Business domains — one mini-app per folder
│   │   ├── attendance/
│   │   ├── auth/
│   │   ├── battle-sessions/
│   │   ├── characters/
│   │   ├── health/
│   │   └── team-builder/
│   │
│   ├── common/                     # ⭐ Cross-cutting concerns — NO business logic
│   │   ├── auth/                   # read-bearer-token.ts — pure, no Nest
│   │   ├── clock/                  # clock.ts — the Vietnam-time seam
│   │   ├── constants/              # REQUEST_ID_HEADER, auth constants
│   │   ├── decorators/             # current-user.decorator.ts
│   │   ├── filters/                # all-exceptions.filter.ts
│   │   ├── guards/                 # jwt-auth.guard.ts, optional-jwt-auth.guard.ts
│   │   ├── interceptors/           # logging (request id) + transform ({ data })
│   │   └── index.ts                # barrel — the import surface of this layer
│   │
│   ├── infrastructure/             # ⭐ Connections to the outside world
│   │   └── prisma/                 # PrismaService + @Global PrismaModule
│   │
│   ├── config/
│   │   ├── env.validation.ts       # Zod schema, fail-fast at boot
│   │   ├── app.config.ts           # API_PREFIX, SWAGGER_PATH, AppConfigService
│   │   └── index.ts
│   │
│   ├── generated/prisma/           # Prisma Client output — generated, never committed
│   ├── app.module.ts
│   └── main.ts                     # global pipe/filter/interceptors, CORS, Swagger, shutdown hooks
│
├── prisma/
│   ├── schema.prisma               # ⭐ Single source of truth for the data model
│   ├── migrations/
│   └── seed.ts
│
├── docker-compose.yml              # local PostgreSQL
├── .env.example
├── tsconfig.json
├── eslint.config.mjs
├── nest-cli.json
└── package.json
```

Four decisions worth stating:

1. **`common/` holds only harmless things** — guards, filters, decorators, interceptors, constants —
   with no dependency on any domain. The moment something in there needs to know what a
   `BattleSession` is, it belongs in a module instead. Mixing the two is where circular dependencies
   come from.
2. **`infrastructure/` is separate from `modules/`.** Prisma is not a business domain. Today it is
   the only inhabitant; Redis or a queue would land beside it.
3. **There is no `shared/` folder.** The generic version of this structure adds one for reusable
   *services* (mailer, cache). Nothing here needs it yet — cross-app reusable code lives in
   `packages/shared`, and per-domain helpers live in the module (`characters.lib.ts`,
   `session-schedule.ts`). Add `src/shared/` when a second module actually needs the same service,
   not before.
4. **`config/` has a barrel and validates the environment at boot**, so a missing variable kills the
   process immediately instead of at 2am in production.

`prisma/schema.prisma` is ~120 lines. Prisma supports splitting it (`prismaSchemaFolder`) once it
passes ~300; until then one file is easier to read.

---

## 3. Inside one module

This is the important part. Each module is a self-contained mini-app:

```
modules/characters/
├── characters.module.ts            # @Module metadata — DI registration, nothing else
├── characters.controller.ts        # HTTP layer — takes a request, returns a response
├── characters.service.ts           # business logic
├── characters.lib.ts               # pure helpers for this domain (id generation)
├── characters.codec.ts             # builds the response shape from a Prisma row — the only enum cast
│
├── dto/
│   └── character.dto.ts            # createZodDto over @guild/shared/schemas
│
└── __tests__/
    ├── characters.lib.spec.ts
    ├── characters.codec.spec.ts
    └── characters.service.spec.ts
```

The response shape is **not** declared here: it is a Zod schema in `packages/shared/schemas`. The
object is built in `<domain>.codec.ts` — one pure function per shape, ending in `satisfies <Shape>`,
living in the module that **owns the table**. A module that reads someone else's table calls that
module's service and reuses its codec; it never writes the cast itself.

`satisfies` is a compile-time check, so an `as` cast on a database value slips through it silently.
Every built response therefore goes through `verifyResponse(<shape>Schema, { … } satisfies <Shape>)`
(`config/response-verification.ts`): outside production the schema really runs, in production the
value is passed straight through. A shape without a codec — `Week`, `SessionFormation`,
`FormationWeek` — calls it at its single build site in the service.

Every other file in the folder is internal. What another module may import is one file:

```
modules/battle-sessions/
└── battle-sessions.public.ts       # ⭐ the seam — re-exports what other modules may use
```

`battle-sessions` and `characters` have one today, because they are the modules with outside callers:
`attendance` and `team-builder` read the schedule and the roster through them. They re-export
`BattleSessionsService` and the pure week/deadline helpers, and `CharactersService`; the `*.module`
files next to them went back to being DI metadata only. §4 has the rule that enforces this, §8 the reason
this one file is not the barrel the naming table forbids.

Optional pieces, added **only when a second caller appears**, never speculatively:

- `<domain>.public.ts` — the moment a second module needs something from this one.
- `<domain>.codec.ts` — the moment this module's rows are turned into a response shape.
- `<domain>.repository.ts` — see §6.
- `guards/` — a guard used by this module alone. (Both current guards are shared, so they live in
  `common/guards/`.)
- `events/` — domain events.

A larger module splits by responsibility rather than growing one file. `battle-sessions` already
does this: the week/deadline rules live in `session-schedule.ts` next to the service, with their own
spec file. Split a service once it approaches ~300 lines or once one part of it is worth testing
alone.

---

## 4. Dependency rules

This is what keeps the project from turning into a big ball of mud:

```
modules/  ──►  infrastructure/  ──►  config/
    │                 │
    └─────────────────┴──►  common/
```

**Hard rules:**

1. `common/` and `config/` must **not** import from `modules/` or `infrastructure/`.
2. Modules **may** import each other, but only through two files: `<domain>.public.ts` for code, and
   `<domain>.module.ts` for DI registration (`app.module.ts`, and `imports: [...]` in a sibling
   module). Never reach into another module's internal files.
3. If `A` needs `B` and `B` needs `A`, that logic belongs somewhere else — a third module, or a
   shared service. **`forwardRef()` is not the answer** (also stated in `AGENTS.md`).
4. A controller **never** touches Prisma. The flow is Controller → Service → (Repository) → Prisma.
5. A controller **never** returns a raw Prisma model. Map it to the response shape from
   `@guild/shared/schemas` (with `satisfies`), so `password` and other internals cannot leak by
   accident.

### Enforced by ESLint

Both rules are real lint errors, not conventions (`eslint.config.mjs`).

**The module boundary is checked on resolved paths**, by `eslint-plugin-boundaries`. Each folder
under `src/modules/` is one element; the only files that may be imported from outside it are
`*.public.ts` and `*.module.ts`:

```js
settings: {
  'boundaries/elements': [
    { type: 'module', pattern: 'src/modules/*' },
    { type: 'app', pattern: 'src' },
  ],
},
rules: {
  'boundaries/dependencies': ['error', {
    default: 'allow',
    policies: [{
      disallow: { to: { element: {
        type: 'module',
        fileInternalPath: '!(*.public.ts|*.module.ts)',
      } } },
    }],
  }],
}
```

One block, every depth. This replaced four hand-written `no-restricted-imports` blocks, and the
maintenance obligation that came with them. `no-restricted-imports` matches the **import string**,
and a relative string only means something once you know how deep the importing file is: from
`src/modules/auth/auth.service.ts`, `../health/…` is a sibling module, but from
`src/modules/auth/dto/x.ts` the same string is its own module. So there was one block per depth that
existed — and adding a directory level meant imports at that level were silently unchecked.
`boundaries` knows whether two files belong to the same element, so the question of depth never
arises.

Three things the plugin needs to be told:

- **The resolver must know about `.ts`** (`settings['import/resolver']`). Its default only resolves
  `.js`, and an import it cannot resolve is an import it cannot classify — the rule would pass
  everything, quietly.
- **The `app` element is load-bearing, not decoration.** `boundaries` skips any dependency whose
  **two ends** it cannot classify, so with `module` declared alone, `src/app.module.ts`,
  `src/infrastructure/**` and `src/common/**` would be unknown-typed importers and reach into a
  module's internals unchallenged. `{ type: 'app', pattern: 'src' }` catches everything under `src/`
  that is not a module, which is what makes "importable from outside" mean *from anywhere*.
- **Both entry points are allowed on purpose.** `*.public.ts` is the code seam; `*.module.ts` stays
  importable because `app.module.ts` and every `imports: [SomeModule]` need the class. Since the
  `@Module` file re-exports nothing, allowing it gives no way in.

**A fence nobody checks is not a fence.** `src/__tests__/module-boundary.spec.ts` runs ESLint over
two fixtures that violate the boundary on purpose: one module reaching into a sibling from
`__tests__/fixtures/`, one directory deeper than any real file — exactly where the old rules stopped
looking — and one file outside `modules/` reaching into a module, which is the case the `app` element
covers. A third case asserts a legal `.public` import stays clean, so the rule cannot pass by
rejecting everything. Both fixtures are listed by name in `eslint.config.mjs` (`BOUNDARY_FIXTURES`)
and in `tsconfig.build.json`, so they leave `pnpm lint` and the build alone without a glob that a
future fixture could hide behind.

**`common/` and `config/` keep `no-restricted-imports`.** That rule bans whole directories rather
than reaching into one, so the depth ambiguity above does not apply the same way:

```js
restrictUpwardImports(['src/common/*.ts', 'src/config/*.ts'], '\\.\\./')
//   → regex: ^\.\./(modules|infrastructure|shared)/
```

It uses `regex`, not `group`: `group` matches through the `ignore` library (gitignore semantics),
where `*` also matches `..`, and character classes do not help — `ignore` reads `[!.]` as "the
character `!` or `.`", and `[^.]` matches nothing at all.

Because ESLint flat config **replaces** same-named rules instead of merging them, each
`no-restricted-imports` block must declare everything that applies to its files.

`prisma/**` and `prisma.config.ts` are exempt — they run outside the app, under the Prisma CLI.

`pnpm lint` is what checks this. CI runs it on every push and pull request against `main`
(`.github/workflows/ci.yml`), so a broken boundary blocks the deploy — run it locally first and find
out in seconds rather than minutes.

---

## 5. Path aliases — there are none

`tsconfig.json` declares **no** `paths` at all. Internal imports are relative
(`import { Env } from '../../config'`), and code from the workspace package is imported by its real
name: `@guild/shared/enums`, `@guild/shared/schemas`, `@guild/shared/lib`.

This app used to have `"paths": { "@/*": ["./src/*"] }`. It was removed on 2026-08-16, along with
the matching `jest.moduleNameMapper` entry in `package.json`, when the API
moved to Vercel: Vercel compiles the TypeScript with its own `tsc` and does **not** rewrite path
mappings, so `@/config` survived into the emitted JavaScript and the function died at runtime with
`Cannot find module '@/config'`. See [`production.md`](../../../docs/production.md) §4.

**Do not reintroduce an alias here.** `apps/web` keeps its own `@/*` — that one is a Next.js build
and unaffected. It reaches the workspace package by real name too.

Removing the alias also broke the `no-restricted-imports` rules, which matched `@/modules/*`. The
module boundary no longer looks at import strings at all — it runs on resolved paths, so no alias
decision can break it again. See the ESLint subsection of §4.

---

## 6. Repository pattern — yes or no?

**Not mandatory.** Prisma Client already *is* a repository, and an extra layer that only forwards
calls is noise.

| Situation | Recommendation |
|---|---|
| Simple CRUD | Service calls `PrismaService` directly |
| A complex query repeated in several places | Extract `<domain>.repository.ts` |
| Unit-testing a service without mocking Prisma | Extract a repository |
| A realistic plan to change ORM | Extract a repository |

Today no module has one — every service injects `PrismaService`. When one is warranted it looks like
this:

```ts
@Injectable()
export class CharacterRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByWeek(weekStart: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: { session: { weekStart } },
      orderBy: { markedAt: 'desc' },
    });
  }
}
```

---

## 7. Config and environment

Every variable the API reads is declared once, in `src/config/env.validation.ts`, and parsed at boot:

```ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(32),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  APP_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
});

export type Env = z.infer<typeof envSchema>;
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,
  envFilePath: ['.env.local', '.env'],
});
```

Consequences worth knowing:

- A missing or malformed variable **crashes the process at startup**, with a Vietnamese message
  naming the field — far better than a failure halfway through a request.
- Nothing reads `process.env` directly. Inject `ConfigService<Env, true>` (aliased as
  `AppConfigService`) and use `config.get('X', { infer: true })` so the value keeps its parsed type.
  `PrismaService` gets `DATABASE_URL` this way too. The one exception is
  `config/response-verification.ts`, and it is documented in the file: its consumers are the
  `<domain>.codec.ts` functions, which are module-level and outside the DI graph.
- `DIRECT_DATABASE_URL` is intentionally **not** in the schema: it is for the Prisma CLI only, never
  the runtime.
- A new variable means: `env.validation.ts` + `.env.example` + the tables in
  [`development.md`](../../../docs/development.md) §3 and
  [`production.md`](../../../docs/production.md) §3.

---

## 8. Naming conventions

| Kind | Convention | Example |
|---|---|---|
| Folder | `kebab-case`, plural for a collection domain | `characters/`, `battle-sessions/` |
| File | `kebab-case.type.ts` | `mark-attendance.dto.ts`, `current-user.decorator.ts` |
| Class | `PascalCase` | `CreateCharacterDto`, `AllExceptionsFilter` |
| Interface / type | `PascalCase`, **no** `I` prefix | `MemberEntity`, `ErrorResponseBody` |
| Constant | `SCREAMING_SNAKE_CASE` | `API_PREFIX`, `REQUEST_ID_HEADER` |
| Barrel `index.ts` | only in `common/` and `config/` | |

> ⚠️ Do not add barrels inside `modules/` — with NestJS DI they are a reliable way to create a
> circular import.

The one exception is `<domain>.public.ts`, and it is narrow enough to keep the warning true: exactly
one per module, re-exports only, and it never imports from another module. Two `.public.ts` files
needing each other is not a barrel problem, it is a real domain cycle — extract a third module
(rule 3 in §4). What stays banned is an `index.ts` that gathers up a whole module.

Two things the repo-wide conventions add: identifiers, comments and doc blocks are in Vietnamese
where they already are, but **user-facing strings are always Vietnamese** (they are returned
verbatim by the frontend), and file names stay English.

---

## 9. When to split further

The layout above is comfortable up to ~40–50 modules. After that:

**Nested features**, when a domain grows a clear sub-domain:

```
modules/guild/
├── guild.module.ts
├── guild.controller.ts
├── guild.service.ts
├── members/
│   ├── guild-member.controller.ts
│   ├── guild-member.service.ts
│   └── dto/
└── settings/
```

**A monorepo**, when several apps share code — which is where this project already is:

```
apps/
├── api/
└── web/
packages/
└── shared/          # ⭐ enums + Zod schemas shared by NestJS and Next.js
```

`packages/shared` is the payoff: a request/response shape is defined once as a Zod schema, the
backend wraps it with `createZodDto`, the frontend types its fetch functions from it. No shape is
ever declared twice. Types come from the `.ts` sources, the runtime from `packages/shared/dist` —
see [`architecture.md`](../../../docs/architecture.md) §2 for the split and §3.5 for the API build.

---

## 10. Project checklist

What a NestJS project should have on day one, and where this one stands:

- [x] `strict: true` in `tsconfig.json` from the start
- [x] Global validation pipe — `ZodValidationPipe` from `nestjs-zod`, schemas from `packages/shared`
- [x] Global exception filter + one uniform response shape
      (`{ data }` on success, `{ statusCode, message, errors?, path, requestId, timestamp }` on error)
- [x] Logging interceptor + request id (`x-request-id` on every response, same id in the log line)
- [x] Fail-fast env validation
- [x] Swagger generated from the DTOs, disabled when `NODE_ENV=production`
- [x] Health check endpoint (`GET /api/health`, including a database ping)
- [x] Graceful shutdown (`app.enableShutdownHooks()` + `PrismaService.onModuleDestroy`)
- [x] ESLint rules blocking cross-layer imports (§4)
- [ ] Application-level rate limiting — deliberately absent, see
      [`production.md`](../../../docs/production.md) §6
- [x] CI running lint, Prettier, typecheck, tests and both builds on every push and PR against
      `main`, gating the production deploy (`.github/workflows/ci.yml`)

---

## 11. Anti-patterns

| ❌ Wrong | ✅ Right |
|---|---|
| An 800-line `utils/index.ts` holding everything | Split by domain, and keep domain helpers in the module (`characters.lib.ts`) |
| Controller calling Prisma directly | Controller → Service → (Repository) → Prisma |
| `forwardRef()` everywhere | Restructure: extract a third module, or use an event |
| Business logic in a DTO | A DTO validates shape only; logic lives in the service |
| `@Query('x')` as a bare string | A query shape is a request shape: declare it in `packages/shared`, wrap it with `createZodDto`, take it as `@Query() query: XDto` |
| Returning a Prisma model straight from the API | Map to the shared response shape, so `password`/`deletedAt` cannot leak |
| `any`, "I'll fix it later" | `unknown` + a type guard (`no-explicit-any` is an error here) |
| Reading `process.env` inside a service | `ConfigService<Env, true>`, declared in `env.validation.ts` (the single exception lives in `config/response-verification.ts`) |
| Re-deriving a backend rule on the frontend | The rule stays in one place (`session-schedule.ts`) |
| One `shared.module.ts` with 30 providers | Split by purpose — or don't create it until it's needed |

---

## 12. Summary

A good structure is not the prettiest one, it is the **predictable** one. When someone new asks
"where does this file go?", the answer should be obvious.

Three questions to test it with:

1. Adding a feature → how many files, in how many folders? (Ideal: one folder.)
2. Deleting a feature → can you delete one folder cleanly? (If not, coupling is too high.)
3. Looking at `src/modules/` → can you tell what the app does?
