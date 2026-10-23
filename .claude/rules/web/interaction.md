---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/app/globals.css"
  - "apps/web/lib/motion.ts"
---

# Web interaction conventions

A new interaction convention goes here; its reason goes in `frontend.md`.

## Touch has no hover

- Make everything needed to understand or act on a screen visible without hover: warnings, the reason a button is disabled, unsaved state - in words, next to the thing.
- Open a `Popover` on tap for text cut short (an absence reason).
- Use a tooltip only to repeat what is findable another way (the guild class icon).
- Never carry information in `title=""`.

## A clickable element → the pointer cursor, from `globals.css`

- Never write `cursor-pointer` at a call site. One base rule in `globals.css` covers `button`, `summary`, `select` and the roles `button`, `tab`, `option`; disabled controls keep the arrow.
- Make a clickable `div` a `button` instead.

## A row that opens a page → the whole card is the link

- Make the whole row or card the link: one `Link` with an `absolute inset-0` span over a `relative` card. Never a clickable `div`. Worked examples: `tactic-card.tsx` (grid card), `cat-race-list-screen.tsx` (list row).
- Put the feedback on the card: `focus-within:ring-3 focus-within:ring-ring/50`, plus `hover:bg-foreground/5` on a list row.
- Make row actions `relative` (`RowActions`) so they sit above the overlay.
- A leaf card in a grid takes the inner radius (`rounded-inner`), not the container one, and the overlay repeats it.
- A grid card lifts on hover with `hover:-translate-y-0.5` (`transition-[translate]`, `ease-spring`, `--duration-fast`) and wears the spotlight: spread `useSpotlight()` (`hooks/use-spotlight.ts`) on the card and add `spotlight-edge` (`globals.css`). The hook writes `--spot-x` / `--spot-y` on the card for a mouse or pen pointer only (`event.pointerType`, per input) and nothing under reduced motion; the edge glow animates opacity only.

## Buttons respond with weight

- `default`, `outline` and `secondary` buttons rise 1px with a shadow on hover and sink (`translate-y-px`, `scale-[0.98]`) on press, on `--ease-spring` and `--duration-fast`. `ghost` and `link` do not lift, so a row of them stays still. Transform and shadow only; control heights never change.

## The surface behind a hovered or selected control

- Give a bordered control `bg-card`, never a transparent fill.
- Neutral hover: `hover:bg-foreground/5`; `bg-foreground/10` while a popup is open. Do not use `bg-muted` or `bg-secondary` for hover or selected state.
- Selected: a solid `primary` surface with `primary-foreground` text (default `TabsTrigger`, team builder session cards).
- Current page in the header nav: not a primary surface. Keep the ghost button, `text-foreground`, a `jade` icon; the 2px `jade` bar is one shared indicator that slides to the active link by `transform` only (`main-nav.tsx`). Render each entry as a plain `Link` styled with `buttonVariants`, never a `Button` rendering a link. The same entries (`nav-items.ts`) feed `mobile-tab-bar.tsx` below `sm`; `desktopOnly` entries stay off it.
- Reserve the tab bar's height through `--app-bottom-inset`; every sticky bottom bar sits above it.
- Paint a hovered menu item with `data-highlighted:bg-foreground/5`, never `focus:` and never `bg-accent`.
- Skip the selected item on hover: write `not-data-active:hover:*`.

## The selected tab → a `primary` surface

- Keep the `default` `tabs.tsx` variant: a recessed track (`rounded-inner border border-border bg-muted/70 shadow-inner`, `dark:bg-foreground/5`), selected tab `bg-primary text-primary-foreground font-semibold` with a `shadow-md`, other tabs `text-foreground`.
- The team builder's selected large block (battle card, team chip) is not a tab strip: in dark it is a `primary/20` wash with a `primary` edge and `foreground` text, not a solid `primary` surface.
- Override tabs at the call site (as `session-tabs.tsx` does). Never edit the `default` variant.

## Actions

- Create: a labelled button (`CreateButton`).
- Edit / delete on a row: icon buttons (`EditAction`, `DeleteAction`) inside `RowActions`, each with a tooltip and `sr-only` text.
- Confirm every destructive action in a dialog.
- Give a dangerous menu entry `DropdownMenuItem variant="destructive"`, never a hand-rolled `className`. Put "Đăng xuất" last, after a `DropdownMenuSeparator` (`user-menu`).

## Empty state

- Say "loaded fine, holds nothing" only through `EmptyState` (`components/shared/empty-state.tsx`). Inside a table it arrives through `table-body-state`.
- Use `flex flex-col items-center gap-3 py-8 text-center`: the guild seal (the `icon` prop sits inside it), a centred brush-stroke divider, one short sentence. `ErrorState` shares the frame with a destructive seal. Keep `border-dashed` for drop zones only.

## A missing page or a crash → `app/not-found.tsx`, `app/error.tsx`

- Keep both inside the root layout, in a `raised` `Card`: guild seal at `lg` (destructive tone on the error page), a centred brush divider, a one-line `font-heading` heading, one short sentence, a way back to attendance.
- Add "Thử lại" (`reset()`) on the error page. Never print the thrown message; show the `digest` when there is one.

## Unsaved work → a save bar pinned to the bottom

- Put Save and discard in `UnsavedChangesBar` (`components/shared/unsaved-changes-bar.tsx`), rendered only while there is something to save. The save error replaces the count.
- Make it `sticky`, `--app-bottom-inset` plus a small gap from the bottom. Never `fixed`.
- Pass `undo` (`{ onUndo, canUndo }`) when the screen has undo; the bar then shows "Hoàn tác" between reset and save.
- Take every team builder undo step through `editActiveDraft` in `formation-store`. Keep the shown team in `team-view-store`, apart from `formation-store`.
- Bind Ctrl/Cmd+S and Ctrl/Cmd+Z through `useSaveShortcut` and `useUndoShortcut`. Leave Ctrl+Z to the browser inside a text field; inside a dialog neither shortcut touches the formation.
- Keep non-save actions (copy a line-up, announce on Discord) in the top toolbar. Disable an action that must not run on dirty work and say why in a tooltip.
- On a phone (below `md`) show one team at a time via `TeamSwitcher`. Hide the rest with `max-md:hidden`, not by leaving them out of the tree. Drag after 8px (mouse) or a 250ms press (touch). Never `touch-none` a card.
- Keep `FormationLayout` `screen` to a one-line banner; `capture` keeps five columns, ten teams, the tall banner and no chips.
- Build a screen's focus mode from `useFocusMode` (`hooks/use-focus-mode.ts`) and `FocusModeShell` (`components/shared/focus-mode-shell.tsx`). Open it from a toolbar button (`Kbd` cap `F`) from `lg` up; `F` or `Esc` and the exit button (cap `Esc`, added by the shell) toggle it. Skip both keys in a field, with a modifier, or once `defaultPrevented`; pass `escapeClaimed` when something else on the screen owns `Esc` (a drag).
- Mark a dialog that is the screen itself with `SCREEN_DIALOG_ATTRIBUTE` (`lib/keyboard-target.ts`), so the screen's shortcuts still run inside it. The shell does it while active.
- Draw focus mode as one `fixed inset-0 z-40` `role="dialog"` over the page, with no new z value. Ask for browser fullscreen on `document.documentElement`, never a child, and swallow a refusal. Fade opacity only.
- Mount the content once. When a remount would lose state (droppable ids, a canvas, a live feed), keep the shell around the content with `active` flipping in place: the shell keeps its root and child positions, so nothing remounts. A screen with nothing to lose may mount the shell only while on, with `active` always true (team builder overlay).
- In the team builder's overlay, never reveal the grid, and reuse `UnsavedChangesBar` in the grid column; add no save logic. The editable battle only gets the entry button.

## Feedback after a write → a toast

- Raise a toast through `components/shared/toast.ts` (`toastSuccess` / `toastError`), never `sonner` directly. One `<Toaster position="top-center" />` lives in `components/providers.tsx`.
- Use emerald for success and `destructive` for failure, as a 10% tint. The accent is `--color-emerald-600`, not `--color-green-600` (not emitted).
- Use a toast for a write with no visible result of its own (`member-attendance-card`). Use the inline error line that keeps its slot for a write inside a table or dialog (`members-panel`).

## Motion

- Use only the tokens in `globals.css`: `--duration-fast` 120ms (colour, hover, press), `--duration-base` 200ms (show/hide in an existing frame), `--duration-slow` 320ms (skeleton ⇄ data), `--ease-out-soft` (every easing), `--ease-spring` (hover lift and press of a control, transform only), `--duration-drift` 9s (a banner scene's one-shot drift, nothing else). Write a duration as `duration-[var(--duration-base)]`.
- Play the drift once (`animation-iteration-count: 1`, `backwards`, ending on `transform: none`), never loop it.
- Never animate layout geometry: no `height`, `width`, `scale` on table content, no `translate` on anything in place. The one named exception is the button hover lift and press (`translate-y-px`, `scale-[0.98]` on a button, and the press scale on a tab trigger; see Buttons). An arriving element may rise a few pixels. The next step of a multi-step dialog may slide 24px in from the side it came from (`StepSlide`). A portal popup may slide in (`SelectContent` needs `alignItemWithTrigger={false}`).
- Keep `ease-linear` only for the login button sheen.
- Let the cat race stage overlays (countdown, banners, lead-change bar, finish flash, photo, result card), the race board's row slide and the TRỰC TIẾP blink own their keyframes and durations, declared once as `--stage-*` variables under the `[data-slot="cat-race-stage"], [data-slot="cat-race-hud"], [data-slot="cat-race-focus"]` block in `globals.css`. They are exempt from the four tokens and the no-`scale` rule; every other screen is not.
- Answer `prefers-reduced-motion` once, at the end of `globals.css`, never at a call site.
- Spinner or skeleton: skeleton for an unknown row count on first load; `Spinner` in the button or cell for a user-triggered wait; nothing for a background refetch.
- Use the only spinner, `components/shared/spinner.tsx` (`sm` | `md`). Pass `label` only where nothing else names it.
- Wrap an error line above or below a table in a fixed `min-h-*` so it never pushes the table (`members-panel`).

## Entrance and data reveal

- Reveal data with `REVEAL_CLASS` + `revealStyle(index)` from `lib/motion.ts` (40ms steps, capped at the ninth). A new list of loaded data takes the helper, never a delay of its own. Wrap a component without `className` in a one-cell `grid`.
- Wrap `<main>` in React `<ViewTransition default="none" update={{ "page-nav": "page-fade", default: "none" }}>` (`app/layout.tsx`): only a typed navigation cross-fades the content. A nav entry point (`MainNav`, `MobileTabBar`, the guild brand link, the 404 and error "back" links) passes `transitionTypes={PAGE_NAV_TRANSITION}` (`lib/page-transition.ts`); `router.refresh()`, the settings tab `router.replace`, Suspense reveals and logout carry no type and stay still. A new navigation link of that kind adds the type. Style it only with the `::view-transition-*(.page-fade)` rules in `globals.css`; never give `main` or a page a permanent `view-transition-name` (it would become the containing block of the drag overlay and sticky bars). Reduced motion zeroes those pseudo-elements too. The one exception to "no permanent name" is the site header (`site-header`) and the phone tab bar (`mobile-tab-bar`): each has a `viewTransitionName` and a `::view-transition-group(...) { animation: none; z-index: 1 }` rule so the main snapshot never paints over them (neither is an ancestor of the drag overlay or the sticky bars).
- Let `<main>` children run `page-enter` (60ms stagger). Table rows run `fade-in-soft` (opacity only). `Skeleton` uses `animate-shimmer`.
- Wrap a block far below the fold in `ScrollReveal`; only the wrapper is a Client Component.
- Fill every entrance `backwards`, never `both`. End every keyframe on `transform: none`.
- Never reveal the formation grid.
- Keep the reduced-motion rule zeroing `animation-delay`.

## Tables

- Put loading / failure / empty / data in `table-body-state` inside `<TableBody>`. The call site only supplies `renderRow`.
- Make `columns` equal the header `<th>` count. Pin a data-driven count in one variable shared by header and body (`attendance-grid`).
- Remove a viewer-only column from header, row and `columns` together, on one flag.
- Make a summary row a second header row of `td` cells.
- Keep the table's look in `TABLE_SKIN` inside `DataTableFrame` (`components/shared/data-table-frame.tsx`), never in `components/ui/table.tsx`. `DataTable` renders it with pagination; a table without paging (`LeavePanel`) uses `DataTableFrame` directly.
- Page with `use-table-pagination` + `table-pagination-bar` / `page-size-select`. Always render the bar, even at one page. Hide page numbers below `lg`, keep the four arrows.

## A shortcut → a key cap (`Kbd`), on the button itself

- Show shortcut keys as `Kbd` caps (`components/ui/kbd.tsx`) beside the label. Worked example: the tactic editor toolbar.
- Keep one source for keys: `features/tactics/lib/shortcuts.ts` feeds both the handler and the caps. `shortcutLabel` writes the `title`.
- Mark the caps `aria-hidden`.
- Step a tablist with left/right arrows, stopping at the ends (`useStageArrows`, `StageArrowHint`). Turn the keys off while focus is in a field (`isTypingTarget`).
- Follow the ARIA tablist pattern: roving `tabIndex` (`0` selected, `-1` rest), and put the ref from `useStageArrows` on the `role="tablist"` element.
- Take the modifier from `useModifierKey` ("⌘" on Mac, "Ctrl" elsewhere). Never read `navigator` during render.

Why: [`frontend.md` §6](../../../apps/web/docs/frontend.md#6-display-conventions).
