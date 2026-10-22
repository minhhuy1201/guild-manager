---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/app/globals.css"
---

# Web display conventions

Screens must look like one app. A new display convention goes here; its reason goes in `frontend.md`.

## Palette roles

- Take colours from the tokens in `app/globals.css` (`:root` light, `.dark`). Brief: `docs/design-direction.md`.
- Neutrals are surfaces and text. Keep one hue per theme (warm 80-85 light, navy 262 dark). Keep `--background` clearly darker than `--card`.
- `primary` (navy): primary actions, selected tabs, a battle's name (`SessionLabel`).
- `jade`: the accent - current nav page, focus ring, guild seal, divider diamond, session card hover edge, the header login button fill.
- `gold`: important highlights only - formation banner frame, login ornament, login button sheen. Never a state.
- emerald / `destructive` / amber: attendance state only ("Có" / "Không" / not answered). Never decoration.

## Themes → tokens only, switched by next-themes

- Use a token for every colour so it follows the theme. A literal colour is only for something identical in both themes: scrims, white text on a picture, attendance state colours, a guild class colour (`lib/guild-class.ts`).
- Take the cat race stage colours from the `--stage-*` variables in `globals.css` (`lib/stage-palette.ts` for a canvas). That palette is a valid fixed colour: identical in both themes. Scrims, shadows and glows (translucent shades) inside the stage block may stay literal, like any scrim.
- Treat a `dark:` variant as a last resort. Fix it with a token that fits both themes.
- Give the header and the phone tab bar `className="dark"` plus `text-foreground`.
- Read the theme in the toaster through `useTheme()` (`components/ui/sonner.tsx`).
- Tint team columns (`features/team-builder/lib/team-colors.ts`) from the same palette. Text is always `foreground`.

## A field's heading → `FieldLabel` when editable, `FieldCaption` when not

- Use `FieldLabel` (`components/shared/field-label.tsx`) for an editable field. Its `htmlFor` must name an id that exists on the control (a `Select`: the trigger's `id`).
- Use `FieldCaption` (a `<span>`) for a value the user cannot change.
- Never put a `<label>` on a field with no control.

## Page header → `PageHeader` on its banner

- Open every page with `PageHeader` (`components/shared/page-header.tsx`), except the tactic page (`TacticHeader`). A new tool page asks first.
- Pass `banner` (a `PAGE_BANNERS` entry in `lib/page-banners.ts`). A new page adds its scene there; pictures live in `public/img/bg/`. Only the attendance page and its history set `isPlainOnPhone` (below `sm` it shows text only); a new page asks first.
- Keep the two scrims between a picture and its text. Never put text on a picture without them.
- Keep one `<h1>` per page, in `font-heading`. A section title inside a card is an `<h2>` in the sans face.
- Use `font-heading` for headings only: `PageHeader`, the guild name, the formation banner, `DialogTitle`.
- Keep pictures in the header. Tables, the formation grid and forms stay on plain surfaces.
- Credit a picture from outside the game once, in `SiteFooter` (`components/shared/site-footer.tsx`).
- Use `GuildSeal` (`components/shared/guild-seal.tsx`) for the guild's mark, in a named size.

## Binary state → an icon, never words

- Show a Có/Không, Đạt/Không, Bật/Tắt state as a coloured round icon: success is a green tick (`Check`), danger a red cross (`X`).
- Use `StatusIcon` (`components/shared/status-icon.tsx`). `label` is required: it is the only thing a screen reader gets.
- Pass `icon` when a domain has its own mark and keep the tone. Attendance uses `AttendanceStatusIcon` (`Swords` for "Có"). Reading a row and pressing a button share one vocabulary.
- Keep `status-badge.tsx` for descriptive labels with words ("Đã khoá", "Còn hạn"), never for binary state.
- In the admin grid the cell is a round button holding the status icon. A press moves unanswered → "Có" → "Không" → "Có". Collect the moves in one draft (`clickCell`, `features/attendance/lib/grid-draft.ts`) and write them from `UnsavedChangesBar`.
- A member answers in `member-attendance-card` with full `Button`s, then sees the guild-wide grid read-only (`AttendanceGrid isAdmin={false}`).
- A member tile carries its answer in its surface: emerald "Có", `destructive` "Không", amber unanswered. Border at full strength, background at `/5`. An answering tile never calls `sessionTintClass`.
- Save an absence reason (`absence-reason-input`) by Enter or its own "Lưu", never by blur. Show "Lưu" and "chưa lưu" while it differs from the stored value.

## Guild class → an icon with a tooltip

- Render a class as `GuildClassIcon` (`components/shared/guild-class-icon.tsx`): avatar plus class name in a tooltip and in `alt`. Inside a chart SVG, draw the same `GUILD_CLASS_IMAGE` entry as an SVG `<image>`.
- Take a class colour from `GUILD_CLASS_COLOR` in `lib/guild-class.ts`. Use `guildClassSurface(guildClass)` for the card surface.
- Apply it as inline styles, not Tailwind classes: the colour comes from data.
- `color-mix` the surface against `--card`. Never add a second hard-coded pastel. A warning keeps `border-destructive` and takes only the tint.
- Keep the class → image mapping in `lib/guild-class.ts`; images live in `public/img/`.

## A battle → the swords icon and the primary colour

- Name a battle through `SessionLabel` (`components/shared/session-label.tsx`): `Swords` when `isGuildWar`, `text-primary`, the backend-built `label`. `size` is `"sm"` or `"md"`; a third size means a new value there.
- Never assemble a battle's name on the frontend. The one exception is a fixed-shape headline (the formation banner), composed in `features/team-builder/lib/banner-title.ts` from `sessionKindLabel`.
- Show the deadline line through `SessionDeadline`. Under a day left it turns semibold `primary`. A client clock past the deadline reads "sắp khoá", never "đã khoá".
- Merge `sessionTintClass(isGuildWar)` into the screen's own frame.
- Keep frame, spacing and subtitle out of the module. The subtitle comes from `getSessionSubtitle`.
- Pass marks that belong to one screen through `children`.
- Invert `SessionLabel` on a `primary` surface (`data-active:*:text-primary-foreground`, as in `session-tabs`).

## A count broken down by answer → a stacked horizontal bar

- Draw counts with `components/ui/chart.tsx`, never a hand-rolled `div` with a percentage width. Worked example: `attendance-summary-card.tsx`.
- Use the member card tones at full strength: emerald "Có", `destructive` "Không", amber "Chưa điểm danh".
- Declare colours once in the chart's `ChartConfig`; a `<Bar>` takes `fill="var(--color-<key>)"`.
- Share one X domain across all cards on a screen (`maxClassSize`).
- Count in a pure `lib/` function (`summarizeByClass`), never inline. Return every class in `GUILD_CLASS_OPTIONS` order, zeroes included.
- Name a class on the Y axis by its icon, drawn as an SVG `<image>` clipped to a circle on an opaque `card` disc, with a `<title>`.
- Follow only the page-wide week and session pickers, and count the whole guild. People filters belong to the table's card header.

## Control sizes

- Take control sizes from `components/ui/` only. Button `default` `h-10`, `lg` `h-11`, `sm` `h-9`, `xs` `h-7`; icon sizes `size-10 / 11 / 9 / 7`.
- Input, Textarea, SelectTrigger: `h-11` (`SelectTrigger size="sm"` `h-9`), `text-base`. Label, Select and DropdownMenu items, `TabsTrigger`: `text-base`. `TabsList` `h-11`.
- An icon inside a control is `size-4.5`; `xs`/`sm` drop to `size-3.5 / 4`.
- Below `sm` nothing is under 44px: `sm` and `xs` take `max-sm:h-10`, `icon-sm` and `icon-xs` take `max-sm:size-10`, `TabsList` takes `h-12`. The settings tab strip uses `h-auto` instead.
- Use the existing `sm`/`xs` variant for something smaller. Never write an `h-*` by hand. Change the scale in `components/ui/`, not in a wrapper.

## Phone layout

- Design phone first. Reference 420x930, floor 360 wide. Every page works well in portrait 360-430; nothing overflows in landscape (640-932) and tablet (768); the layout does not break at 320.
- Keep the root font at 115% below `sm`, 120% from `sm` (`globals.css`). Do not change it without re-checking `h-10` stays 44px and a `text-sm` field stays 16px (iOS zooms below it).
- Keep 44px as the touch target floor below `sm`. A hand-made control takes `size-10`.
- Never let the page scroll sideways. A wide table scrolls inside its own container; a row of controls stacks or shortens labels below `sm` (keep the full name as `aria-label`).
- Do not pin the header on a short screen (`max-height: 500px`). Save bars stay pinned.
- Let a dialog scroll inside itself (`max-h-[calc(100dvh-2rem)]`, `dvh`).

Why: [`frontend.md` §6](../../../apps/web/docs/frontend.md#6-display-conventions).
