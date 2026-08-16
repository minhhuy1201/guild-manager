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
├── characters.module.ts
├── characters.controller.ts        # HTTP layer — takes a request, returns a response
├── characters.service.ts           # business logic
├── characters.lib.ts               # pure helpers for this domain (id generation)
│
├── dto/
│   └── character.dto.ts            # createZodDto over @guild/shared/schemas
│
├── entities/                       # the response shape
│   └── character.entity.ts
│
└── __tests__/
    ├── characters.lib.spec.ts
    └── characters.service.spec.ts
```

Optional pieces, added **only when a second caller appears**, never speculatively:

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
2. Modules **may** import each other, but only through the module's public API — the `*.module` file
   and the providers it `exports`. Never reach into another module's internal files.
3. If `A` needs `B` and `B` needs `A`, that logic belongs somewhere else — a third module, or a
   shared service. **`forwardRef()` is not the answer** (also stated in `AGENTS.md`).
4. A controller **never** touches Prisma. The flow is Controller → Service → (Repository) → Prisma.
5. A controller **never** returns a raw Prisma model. Map it to the module's entity, so `password`
   and other internals cannot leak by accident.

### Enforced by ESLint

Both rules are real lint errors, not conventions (`eslint.config.mjs`). Two helpers generate the
config blocks:

```js
// only the *.module file of another module may be imported
restrictModuleInternals(['src/modules/*/*.ts'], '\\.\\./')
//   → regex: ^\.\./(?!\.\.)[^/]+/(?!.*\.module$)

// in src/common/** and src/config/**: no importing upward
restrictUpwardImports(['src/common/*.ts', 'src/config/*.ts'], '\\.\\./')
//   → regex: ^\.\./(modules|infrastructure|shared)/
```

Two things make this less obvious than it looks, both a consequence of dropping the `@/` alias
(§5) — the patterns now have to match **relative** import strings.

**Each block is locked to one directory depth.** A relative specifier only means something once you
know how deep the importing file is: from `src/modules/auth/auth.service.ts`, `../health/…` is a
sibling module, but from `src/modules/auth/dto/x.ts` the same string is its own module. So the
helper is called once per depth that actually exists — `src/*.ts`, `src/modules/*/*.ts`,
`src/modules/*/*/*.ts`, `src/infrastructure/*/*.ts` — each with the prefix that reaches
`src/modules/` from there. **Add a new depth and you must add a block**, or imports at that depth are
silently unchecked.

**They use `regex`, not `group`.** `group` matches through the `ignore` library (gitignore
semantics), where `*` also matches `..` — so `../*/**` would swallow `../../config` and flag a
perfectly legal import. Character classes do not help: `ignore` reads `[!.]` as "the character `!`
or `.`", and `[^.]` matches nothing at all. The `(?!\.\.)` lookahead in a `regex` pattern says
exactly what is meant.

Because ESLint flat config **replaces** same-named rules instead of merging them, each block must
declare everything that applies to its files. `common/` and `config/` get the upward-import ban
only, which is the stronger of the two and subsumes the module-boundary rule.

`prisma/**` and `prisma.config.ts` are exempt — they run outside the app, under the Prisma CLI.

`pnpm lint` is what checks this; there is no CI, so run it before committing.

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

**Do not reintroduce an alias here.** `apps/web` keeps its own `@/*` and `@shared/*` — those are a
Next.js build and unaffected.

Removing the alias also broke the `no-restricted-imports` rules, which matched `@/modules/*`. They
have been rewritten against relative paths — see the ESLint subsection of §4 for how, and for the
one maintenance obligation that came with it.

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
  ADMIN_USERNAMES: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
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
  `PrismaService` gets `DATABASE_URL` this way too.
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
- [ ] CI running lint and tests — also deliberately absent; `pnpm lint` and `pnpm test` are manual

---

## 11. Anti-patterns

| ❌ Wrong | ✅ Right |
|---|---|
| An 800-line `utils/index.ts` holding everything | Split by domain, and keep domain helpers in the module (`characters.lib.ts`) |
| Controller calling Prisma directly | Controller → Service → (Repository) → Prisma |
| `forwardRef()` everywhere | Restructure: extract a third module, or use an event |
| Business logic in a DTO | A DTO validates shape only; logic lives in the service |
| Returning a Prisma model straight from the API | Map to an entity, so `password`/`deletedAt` cannot leak |
| `any`, "I'll fix it later" | `unknown` + a type guard (`no-explicit-any` is an error here) |
| Reading `process.env` inside a service | `ConfigService<Env, true>`, declared in `env.validation.ts` |
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
