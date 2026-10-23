# 01: Lock fought scrims

**What to build:** In Settings > Lịch đánh, a scrim whose battle time has passed (a fought battle) can no longer be edited or deleted. Its Edit and Delete buttons are disabled and a tooltip gives the reason. The lock appears the moment the battle time passes, without a reload. The API refuses the same update and delete with a 400.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A scrim with `dateTime <= now` has disabled Edit and Delete buttons; the tooltip still shows on a disabled button and says why.
- [x] The buttons lock when the battle time passes while the page is open.
- [x] `PATCH` and `DELETE` on such a session return 400 with a Vietnamese message; the opponent name cannot change either.
- [x] Upcoming scrims and the Guild War rules are unchanged; the API lock covers any fought battle, a Guild War included.
- [x] Web and API tests cover both sides.
