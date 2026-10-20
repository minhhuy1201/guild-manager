---
paths:
  - "apps/web/components/**"
  - "apps/web/features/*/components/**"
  - "apps/web/app/**/*.tsx"
  - "apps/web/lib/query-group.ts"
  - "apps/web/lib/roster-filter.ts"
---

# Web components

- **Treat `components/ui/` as shadcn CLI output, Base UI flavour** (`components.json` → `base-nova`, lucide). Add with `pnpm dlx shadcn@latest add <component>`. No Radix, no hand-written primitives.
- **Edit `components/ui/` only for an app-wide change** (contrast, size, surface). Wrap a one-feature variant in `components/shared/` (`status-badge.tsx` wraps `Badge`).
- **Keep `features/*/components/` feature-owned.** Nothing outside the feature imports from it.
- **Server Component by default.** `"use client"` only where interactivity requires it.

## The query group of a screen

- Combine a screen's queries with `combineQueries` (`lib/query-group.ts`): pending is `some`, the error shown is the first failing query, retry refetches all. Put the query the screen exists to show first. A group of one is fine.
- Keep the fallback sentence per screen (`"Không tải được lịch đánh."`). An `ApiError` message always wins.
- Branch in the order error → loading → content.
- Use `QueryBoundary` (`components/shared/query-boundary.tsx`) when content needs no narrowing out of the pending branch (read data as `?? []`). Otherwise keep early returns with `combineQueries` alone.

## Filtering a roster list

- Match through `matchesRosterFilter` (`lib/roster-filter.ts`): name only, both sides lowercased, diacritics kept, empty `guildClasses` means every class. Never search the in-game id.
- Keep that filter in `lib/`, out of `packages/shared`.
- Render the widget with `RosterFilterBar`. It is controlled (`value` / `onChange` / `idPrefix`) and knows nothing of where state lives. Do not merge the screens' filter stores. `layout` varies arrangement only (`stacked` | `inline`).
- Put a table's filters in the header of the table's own card. A page-wide filter stands above, in its own card.
- End a multi-filter bar with one "Xoá bộ lọc" button that clears all in a single store write. Always render it, `disabled` while nothing is set. Use `isRosterFilterActive` (trims the keyword). A filter value that no longer resolves does not count as set.
- Use `FilterClearButton` (`components/shared/filter-clear-button.tsx`) as the per-control X, shown only while the control holds a value. Nothing on screen may move when it appears. The caller moves focus back to the control after clearing.
- On an `Input` keep a constant `pr-10`. On a `SelectTrigger` take the room off the value (`*:data-[slot=select-value]:mr-9`), never off the trigger's `pr-2.5`.
- Use `ClearableSelectTrigger` for every filter select. The X is a sibling over the trigger, never a child.
- Never centre an overlaid `Button` with `-translate-y-1/2` (`Button` owns `--tw-translate-y`). Use a flex wrapper: `absolute inset-y-0 right-* flex items-center`.

## Writing through a dialog

- Never re-spell the write protocol. `MutationForm` (`components/shared/mutation-form.tsx`) owns: reset error before sending, close only on success, failure keeps the dialog up, show the thrown `Error`'s `message` (per-dialog `fallbackError` for none), lock and swap to `pendingLabel` while writing. It holds its own pending flag.
- `MutationDialogShell` (`components/shared/mutation-dialog.tsx`) owns: ignore a close while in flight, mount the body only while open. The form reports pending through `MutationPendingContext`.
- Use `MutationDialog` for a body with no state of its own, `ConfirmDeleteDialog` for a deletion. For a body with state that must reset each visit, use `MutationDialogShell` outside and `MutationForm` in a child that remounts.
- Pass `run` as an `async` function with no callbacks. Await follow-up work inside `run`.

Why: [`frontend.md` §5](../../../apps/web/docs/frontend.md#5-components).
