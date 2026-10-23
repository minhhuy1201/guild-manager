# 02: Leave range picked from today

**What to build:** The leave dialog picks the whole leave with one range calendar. Days before today (Vietnam time) cannot be picked by anyone, admins included. One click then filing is a one-day leave. The server refuses a leave starting before today for everyone, and `docs/architecture.md` states the new rule.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] One button opens a `range` calendar showing `dd/mm → dd/mm`; earlier days are disabled.
- [x] Filing with no day picked shows the existing "pick a start day" error.
- [x] `POST /leaves` returns 400 when `startDate` is before today, for members and admins.
- [x] `docs/architecture.md` no longer grants admins past days.
- [x] Web and API tests cover the new behaviour.
