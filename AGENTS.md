# AGENTS.md

## Workflow

### Planning

- Prefer direct implementation for simple tasks.
- Keep plans concise.
- Skip specification review unless explicitly requested.
- Skip brainstorming for straightforward changes.

### Execution

- Prefer Executing-Plans over Subagent-Driven-Development.
- Do not spawn subagents unless the task is large or explicitly requested.
- Avoid multiple review agents.

### Reviews

- Do not perform redundant self-reviews.
- Perform one final review before finishing.
- Assume the user will review all generated code.

### General

- Minimize token usage.
- Avoid unnecessary analysis and long explanations.
- Focus on completing the requested task efficiently.

## General

- Keep code simple. Don't over-engineer.
- Reuse existing types/schemas from `packages/shared`.
- Ask before making large architectural changes.

---

## Frontend (`apps/web`)

### Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- TypeScript (strict)

### Rules

- All user-facing text **must be Vietnamese**.
- `app/` only handles routing/layout. Business logic belongs in `features/`.
- Prefer Server Components. Use `"use client"` only when required.
- Server state → TanStack Query.
- Client/UI state → Zustand.
- Never store API responses in Zustand.
- Wrap API calls in feature hooks. Don't call `useQuery` or `fetch` directly inside components.
- Use `apiFetch` from `lib/api-client`.
- Use shared types/schemas from `packages/shared`.
- Keep shadcn components unchanged. Wrap them instead of editing.
- Use Tailwind utility classes and theme tokens.
- Import via `@/`.
- Don't import another feature's internal files directly—use its public `index.ts`.

---

## Backend (`apps/api`)

### Stack

- NestJS 11
- Prisma + PostgreSQL
- Zod
- Swagger
- TypeScript (strict)

### Rules

- Flow: Controller → Service → Repository → Prisma.
- Controllers never access Prisma directly.
- Business logic belongs in services.
- DTOs only validate input.
- Return DTO/response objects, never Prisma models.
- Use shared enums/schemas from `packages/shared`.
- Never store plaintext passwords.
- Avoid `forwardRef()`. Refactor instead.
- Respect module boundaries. Don't import another module's internals.

---

## Do

- Keep files and abstractions minimal.
- Follow existing project structure.
- Write clean, maintainable code.

## Don't

- Duplicate shared types.
- Over-engineer.
- Add unnecessary folders, stores, or abstractions.
