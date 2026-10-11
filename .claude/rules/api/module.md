---
paths:
  - "apps/api/src/modules/**"
  - "apps/api/src/common/**"
  - "apps/api/src/infrastructure/**"
  - "apps/api/src/app.module.ts"
  - "apps/api/vercel.json"
---

# API module rules

## Layering

- **Flow is Controller → Service → (Repository) → Prisma.** A controller never touches Prisma.
- **Never return a Prisma model from a controller.** Map it to the response shape from `@guild/shared/schemas` (with `satisfies`) so a column outside the shape (`discordAvatar` beyond `/auth/me`) cannot leak.
- **Build every response through `verifyResponse(<shape>Schema, { … } satisfies <Shape>)`** (`config/response-verification.ts`). `satisfies` alone cannot see through the `as` cast on a database enum. A shape without a codec calls it at its single build site in the service.
- **Put the codec (`<domain>.codec.ts`) in the module that owns the table.** One pure function per shape. A module reading another's table calls that module's service and reuses its codec; it never writes the cast itself.
- **Keep a DTO to shape validation.** Logic lives in the service. Declare a query shape in `packages/shared`, wrap it with `createZodDto`, and take it as `@Query() query: XDto`, never `@Query('x')`.
- **Use `unknown` and a type guard, never `any`.** `no-explicit-any` is an error.
- **Keep `common/` free of business logic.** The moment something there needs a domain type, it belongs in a module.

## Boundaries

- **Never import from `modules/` or `infrastructure/` in `common/` or `config/`.**
- **Reach another module only through its `<domain>.public.ts` (code) or `*.module.ts` (DI registration).** `eslint-plugin-boundaries` enforces it on resolved paths, on both sides of the import; `module-boundary.spec.ts` keeps it from breaking in silence.
- **Keep exactly one `<domain>.public.ts` per module: re-exports only, never importing another module.** Two that need each other are a domain cycle: extract a third module.
- **Never use `forwardRef()`.** If `A` and `B` need each other, extract a third module or use an event.
- **Put barrels in `common/` and `config/` only.** A barrel inside `modules/` is a reliable way to create a circular DI import. `<domain>.public.ts` is the one exception.
- **Keep `@Module` files DI metadata only.**

## Pieces

- **Add an optional piece only when a second caller appears:** `<domain>.public.ts`, `<domain>.codec.ts`, `<domain>.repository.ts`, `guards/`, `decorators/`, `events/`. Simple CRUD calls `PrismaService` from the service.
- **Extract a repository only for a complex query repeated in several places, testing a service without mocking Prisma, or a real plan to change ORM.**
- **Split a service by responsibility** once it nears ~300 lines or one part is worth testing alone (`session-schedule.ts` is the example).
- **Add no `src/shared/` and no `shared.module.ts`** until a second module needs the same service. Keep domain helpers in the module (`characters.lib.ts`).

## Behaviour

- **Keep week and deadline rules in `modules/battle-sessions/session-schedule.ts` and its `__tests__`, nowhere else.** That includes `isReminderDay` and `formatDeadlineLabel`. Never re-derive a backend rule on the frontend.
- **Register anything that must run on a schedule as a `crons` entry in `vercel.json`** pointing at a `GET` endpoint behind `CronSecretGuard`. Never `@nestjs/schedule`: this app is a Vercel Function. The schedule is UTC and the Hobby plan only guarantees the hour.
- **Write error `message` values in Vietnamese;** the frontend shows them verbatim.

Why: [`backend.md` §3-§4, §6, §8, §11](../../../apps/api/docs/backend.md#3-inside-one-module).
