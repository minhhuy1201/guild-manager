---
paths:
  - "apps/api/src/modules/discord-bot/**"
  - "apps/api/src/scripts/register-discord-commands.ts"
---

# API Discord bot

- **Make a slash command one file** in `modules/discord-bot/commands/`, holding its `definition` (sent to Discord) and its `execute`, plus one line in `commands/index.ts`.
- **Keep business logic out of a command.** Reach other modules through their `*.public.ts`.
- **Run `pnpm discord:register` by hand** after adding or renaming a command. Never from CI: Discord rate-limits that route and the list only changes with a command.
- **Answer within 3 seconds.** `/diem-danh` and `/diem-danh-ho` answer directly, with no deferred reply (`type: 5`). Read `docs/archive/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9 before adding one.
- **Reach dependencies through the `deps` argument,** never Nest DI. `src/scripts/register-discord-commands.ts` imports `commandDefinitions` without booting the app, so a command stays a plain object. `InteractionRouter` bundles `deps` and is the only provider.
- **Keep `ephemeral` / `ephemeralText` in `discord-bot/reply.ts`** and `requireAdmin` in `discord-bot/require-admin.ts`, not on the router: the router imports the command registry and commands need these helpers.
- **Check an admin-only command's caller with `requireAdmin`.** It owns the two refusals and their order; the command passes only the sentence a non-admin should read.
