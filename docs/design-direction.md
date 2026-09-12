# Design Direction

## Product Identity

This application is a guild management platform for the guild "Mèo Mập Giang Hồ" in
Nghịch Thuỷ Hàn (逆水寒), a Chinese wuxia MMORPG.

It is a productivity application first: members answer attendance, admins set the schedule,
manage members and build formations. The wuxia identity is a quiet accent on top of that, never
the point of a screen.

The design should feel like:

> "A premium, minimal guild management application with a subtle wuxia soul."

## UI Balance

- 85% minimal modern application
- 10% subtle Chinese wuxia atmosphere
- 5% Nghịch Thuỷ Hàn identity

Usability and information clarity always win over immersion.

## Visual Direction

- Clean layouts, strong visual hierarchy, generous spacing
- Warm neutral surfaces (a silk/stone tone), thin borders, almost no shadow
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

## Where the wuxia identity lives

Only in small, deliberate places:

- The guild seal in the header and on the login page (a square mark, thin jade border)
- The game name `逆水寒` as a small muted caption beside the guild name
- Serif page titles
- A thin section divider with one small jade diamond under each page title
- Jade as the selected-navigation colour

## Avoid

- Heavy Chinese patterns, dragons, fantasy artwork
- Large background illustrations, ink painting backgrounds, clouds and mist effects
- Excessive gold decorations or gold borders
- Calligraphy fonts for UI text
- Particle effects, animated backgrounds, excessive animations
- Game-like HUD interfaces
- Sacrificing usability for immersion

The source brief is `prompt.md` at the repository root; this file is its binding summary.
