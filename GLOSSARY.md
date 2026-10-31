# Guild Manager

The guild's own vocabulary: what the admins and members of the guild call things, so code, specs and
conversations name each concept the same way.

## Access

**Admin** (UI: "ADMIN"):
A member with every power in the app, including deciding who is a Manager and what each Manager may do.
_Avoid_: officer, quản trị, superuser

**Manager** (UI: "Quản lý"):
A member who holds the Grants an Admin gave them personally, and nothing beyond a Member otherwise.
_Avoid_: moderator, officer, sub-admin

**Member** (UI: "Bang chúng"):
A guild character with no management power: they act only on their own attendance and leaves.
_Avoid_: user, player

**Capability**:
One named area of guild management, such as building teams or editing tactics, granted to a
Manager as a whole.
_Avoid_: route, tab, permission group

**Grant**:
One Capability or one admin Discord command given to one specific Manager.
_Avoid_: role assignment, permission set

## Line-up on Discord

**Formation announcement** (UI: "Thông báo đội hình"):
The one message posted into the guild's battle channel that shows a battle day's line-up to the
whole guild.
_Avoid_: notify, broadcast, post

**Team notice** (UI: "Nhắn riêng"):
A direct message to one placed member, for one match, telling them which team they are in.
_Avoid_: DM, member notification, announcement

**Announcement note** (UI: "Lưu ý thêm"):
Optional text an admin writes for one send, shown first in the Formation announcement and in every
Team notice of that send.
_Avoid_: message, extra announcement, thông báo thêm

## Cat race

**Draw** (UI: "đua"):
The server's pick of one winning ticket for a prize; it alone decides who wins.
_Avoid_: spin, roll, quay

**Staging**:
The race the screen plays to show a draw that has already happened; it never changes the winner.
_Avoid_: scenario, simulation

**Reveal point**:
The moment in a race before which the winner moves exactly like any other cat.
_Avoid_: blend point, tell

**Contender**:
A cat picked at random to sprint for the line alongside the winner after the reveal point.
_Avoid_: decoy, dark horse, runner-up role

**Photo finish** (UI: "Ảnh đích"):
The close-up of the first two cats at the line, shown after every race.
_Avoid_: finish shot, close finish

**Featured race** (UI: "Bảng vàng"):
An ended event whose winners the guild chose to show to every visitor of its public page.
_Avoid_: showcase, pinned race, quay thưởng

## Attendance

**Fought battle** (UI: "Đã đánh"):
A battle day whose battle time has passed. A locked battle day is not yet a fought battle: its
attendance can no longer be answered, but the battle is still to come.
_Avoid_: past battle, closed battle, locked battle

**Auto-attend** (UI: "Tự động điểm danh"):
A member's standing "Có" for every battle day still open while it is on, until they turn it off. A
button the member pressed, or a leave, wins over it on that day.
_Avoid_: auto-yes, always present, luôn có mặt

## Teams

**Team color** (UI: "Màu đội"):
The one colour from a fixed set that marks a team wherever it appears: its column in the team
grid, the Formation announcement image, and its token on every tactic map. A team that has not
chosen one keeps the colour of its default group.
_Avoid_: card colour, theme, team group

**Team icon** (UI: "Biểu tượng đội"):
An optional symbol from a fixed set, shown before a team's name, that says the team's role, such as
Công, Thủ, Trụ or a lane.
_Avoid_: badge, avatar, insignia

## Screens

**Focus mode** (UI: "Toàn màn hình"):
A screen's own view that covers the whole window and keeps only that screen's main work, such as
the team grid, the race, or the tactic map.
_Avoid_: fullscreen mode, cinema mode, presentation mode
