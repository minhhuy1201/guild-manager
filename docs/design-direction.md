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

Direction: **"Thuỷ mặc hiện đại"** (modern ink wash).

- 55% modern application
- 30% wuxia atmosphere
- 15% Nghịch Thuỷ Hàn identity

History: the original brief (85/10/5, no background imagery) was extended on 2026-09-13 (70/20/10, a
scene per page), and again on 2026-10-22 (55/30/15) after the guild found the app pale: every page
shared one mould and read as an admin spreadsheet. Data stays the easiest thing to read; the
atmosphere gets richer around it, never behind it. Usability and information clarity still win over
immersion.

## Visual Direction

- Clean layouts, strong visual hierarchy, generous spacing
- **Two themes, picked by the member**, with light as the default:
  - **Light** - a warm stone plane (clearly darker than the cards) with near-white cards lifted off
    it by a visible border and a warm shadow, a faint jade and gold glow, a paper grain and a static
    ink wash on the plane.
  - **Dark ("night battle")** - an ink-navy plane, cards one step lighter, warm ivory text, and the
    accents lifted so they carry on the dark.
  - Surfaces come in three levels: *raised* (the few blocks that matter most: a lit inner edge and
    a soft jade glow), *default*, and *inset* (a recessed support block such as a filter strip). Blocks
    that hold other blocks take the container radius (12px); what sits inside takes the smaller
    inner one (6px). The first pass used 20px / 10px and read as too round for a working app; the
    scale follows Vercel Geist Materials ("material-medium: Radius 12px", "material-base: Radius 6px").
  - In both, the plane and the card sit far enough apart that a card reads as lifted without looking
    for its border. The first light pass (2026-09-13) kept them ~3% apart and the whole app read as
    one white sheet; the guild asked for more contrast on 2026-09-23.
- **The header and the phone's tab bar are always an ink-navy band**, in both themes: the navigation
  frames the page, and on the light theme it is the strongest contrast on the screen.
- The theme is picked from the account menu ("Giao diện": Sáng / Tối), or from a small palette
  button in the header when signed out. Never a sun/moon toggle, and never the operating system's
  preference: light stays the default until a member picks otherwise.
- A minimal palette with fixed roles, the same in both themes:

| Colour | Role |
|---|---|
| Navy (`--primary`) | Primary actions and selected tabs - the app's working colour; lit to a light navy on the dark theme |
| Jade (`--jade`) | The accent: active navigation, focus ring, the guild seal, section dividers |
| Antique gold (`--gold`) | Important highlights only: the formation headline and the login ornament; a raised card takes the jade glow, not gold |
| Emerald / red / amber | Attendance state only ("Có" / "Không" / not answered yet) - never decoration |

Gold is never used for a state; amber is never used for decoration. The two stay apart by
saturation.

- Typography: Be Vietnam Pro for all UI text; Playfair Display (`font-heading`) for headings only -
  page titles, section titles inside a card, dialog titles and the guild name. Both cover Vietnamese
  fully (subsets `latin` and `vietnamese`).

## Imagery

- **One scene per page, in the page's banner** - the strip behind the page title. A dark scrim
  keeps the white title readable whatever the scene's light. Data (tables, the formation grid)
  never sits on a picture.
- The banner is a compact strip (about 96px on a phone, 128px on desktop), and its scene drifts
  slowly once when the page opens (a single transform, never a loop). A taller, cinematic banner was
  tried first and pulled the eye away from the page's feature, so it was cut back. On the attendance
  page and its history a phone drops the scene and shows the title and description as plain text, so
  answers start near the top. Still one scene per page.
- **The login page** is the one full-screen scene, behind a translucent card.
- **The landing page** (`/trang-chu`) opens on its own scene, `landing.jpg`, in a tall hero rather
  than a banner strip. It starts as a copy of `login.jpg` so the guild can swap one without
  touching the other.
- Pictures fade in over their dominant colour; they never pop in on a white box.
- The site is public, so the artwork is credited to NetEase in the footer of every page, with a line
  saying the site is a non-commercial guild page not affiliated with NetEase. A credit is not a
  licence: if NetEase asks, the pictures come down (they are all listed in `lib/page-banners.ts`).
- Scenes come from the game (`apps/web/public/img/bg/`); the crop keeps the game's logo out of the
  strip on wide screens.

## Motion

Motion says "the data is arriving" and "this responds to you", nothing more:

- A new page settles in block by block, and moves between pages cross-fade
- Loaded tiles, cards and table rows arrive one beat after another
- Hover and press feel physical: a controlled lift or sink with a slight spring, never a bounce loop
- A banner scene drifts once as the page opens; totals may count up once when data arrives
- Skeletons shimmer while waiting - the only thing that loops
- Interface motion is short (≤ 320ms per item); the banner drift is the one long move.
  `prefers-reduced-motion` turns all of it off

## Where the wuxia identity lives

- The page banners and the login scene
- The guild seal in the header and on the login page (a square mark, thin jade edge)
- The game name `逆水寒` as a small muted caption beside the guild name
- Serif page and section titles, and the thin brush-stroke section divider with one small diamond
- The static ink wash and paper grain of the plane
- A thin gold edge and a gold or jade glow on a few highlights
- Jade as the selected-navigation colour

## Allowed since 2026-10-22

- A thin gold edge on a few highlights only (formation headline, login)
- Jade glow behind a raised card, gold glow behind the formation headline and login
- Static paper grain and ink wash on the plane
- A translucent, blurred header band and dialog backdrop
- One-shot motion: banner drift, page cross-fade, count-up of totals

## Avoid

- Pictures behind data: tables, grids, forms stay on plain surfaces
- Animated or looping backgrounds, particle effects, floating particles, moving clouds and mist
- Dragons, heavy Chinese patterns, gold used as a state or spread over many surfaces
- Calligraphy fonts for UI text
- Game-like HUD interfaces
- Infinite animations other than the skeleton's shimmer
- Sacrificing usability for immersion

This file is the binding design brief; the plans in `docs/archive/plans/2026-09-13-*` and the spec
`docs/specs/2026-10-22-ui-redesign.md` record how it was reached.
