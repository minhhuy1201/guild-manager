# Design Direction

## Product Identity

This application is a guild management platform for the guild "Mèo Mập Giang Hồ" in
Nghịch Thuỷ Hàn (逆水寒), a Chinese wuxia MMORPG.

It is a productivity application first: members answer attendance, admins set the schedule,
manage members and build formations. The wuxia identity frames that work; it never gets in the way
of reading it.

The design should feel like:

> "A premium guild management application that lives inside the game's world."

## UI Balance

- 70% modern application
- 20% wuxia atmosphere
- 10% Nghịch Thuỷ Hàn identity

The original brief (85/10/5, no background imagery) was extended by the guild on 2026-09-13: the first minimal pass read as too plain, so each page now opens on a scene from the
game, and data arrives with motion instead of snapping in. Usability and information clarity still
win over immersion.

## Visual Direction

- Clean layouts, strong visual hierarchy, generous spacing
- Warm neutral surfaces (a silk/stone tone) with a faint jade and gold glow and a paper grain on the
  page plane; thin borders, almost no shadow
- A minimal palette with fixed roles:

| Colour | Role |
|---|---|
| Navy (`--primary`) | Primary actions and selected tabs - the app's working colour |
| Jade (`--jade`) | The accent: active navigation, focus ring, the guild seal, section dividers |
| Antique gold (`--gold`) | Important highlights only: the formation headline, the login ornament |
| Emerald / red / amber | Attendance state only ("Có" / "Không" / not answered yet) - never decoration |

Gold is never used for a state; amber is never used for decoration. The two stay apart by
saturation.

- Typography: Be Vietnam Pro for all UI text; Noto Serif (`font-heading`) for headings only -
  page titles, dialog titles and the guild name. Both cover Vietnamese fully.

## Imagery

- **One scene per page, in the page's banner** - the strip behind the page title. A dark scrim
  keeps the white title readable whatever the scene's light. Data (tables, the formation grid)
  never sits on a picture.
- **The login page** is the one full-screen scene, behind a translucent card.
- Pictures fade in over their dominant colour; they never pop in on a white box.
- The site is public, so the artwork is credited to NetEase in the footer of every page, with a line
  saying the site is a non-commercial guild page not affiliated with NetEase. A credit is not a
  licence: if NetEase asks, the pictures come down (they are all listed in `lib/page-banners.ts`).
- Scenes come from the game (`apps/web/public/img/bg/`); the crop keeps the game's logo out of the
  strip on wide screens.

## Motion

Motion says "the data is arriving", nothing more:

- A new page settles in block by block
- Loaded tiles, cards and table rows arrive one beat after another
- Skeletons shimmer while waiting
- Everything is short (≤ 320ms per item), and `prefers-reduced-motion` turns all of it off

## Where the wuxia identity lives

- The page banners and the login scene
- The guild seal in the header and on the login page (a square mark, thin jade edge)
- The game name `逆水寒` as a small muted caption beside the guild name
- Serif page titles, and the thin section divider with one small diamond
- Jade as the selected-navigation colour

## Avoid

- Pictures behind data: tables, grids, forms stay on plain surfaces
- Animated or looping backgrounds, particle effects, clouds and mist effects
- Dragons, heavy Chinese patterns, excessive gold decorations or gold borders
- Calligraphy fonts for UI text
- Game-like HUD interfaces
- Infinite animations other than the skeleton's shimmer
- Sacrificing usability for immersion

This file is the binding design brief; the plans in `docs/custom-plan/2026-09-13-*` record how it
was reached.
