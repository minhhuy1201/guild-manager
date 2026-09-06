# F — Nhắc điểm danh: suy ra tuần một lần, dò người vắng bằng tra khoá

Ngày: 2026-09-06 · Phạm vi: `apps/api/src/modules/discord-bot/reminder.service.ts`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Worth exploring**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

Mục này có **hai** vấn đề rời nhau trong cùng một hàm. Vấn đề thứ nhất là việc thật; vấn đề thứ hai
gần như không đáng gì và được ghi ra đúng như vậy.

## Vấn đề 1 — tuần được suy ra hai lần trong một lượt chạy

`apps/api/src/modules/discord-bot/reminder.service.ts:80`

```ts
const sessions = await this.battleSessions.listByWeek();     // suy ra tuần, lần 1
const dueSessions = sessions.filter((session) =>
  isReminderDay(new Date(session.deadline), now),
);

if (dueSessions.length === 0) return { status: 'nothing-due' };

const [members, records] = await Promise.all([
  this.characters.listRows(),
  this.attendance.getRecords(),                              // suy ra tuần, lần 2
]);
```

`AttendanceService.getRecords` (`attendance.service.ts:80`) mở đầu bằng
`await this.battleSessions.listByWeek()`. Nên một lượt nhắc chạy `listByWeek` **hai lần**: hai lệnh
`upsert` Bang Chiến và hai `findMany` có `_count`, cho cùng một tuần, cách nhau vài dòng.

Đây đúng là cái mà `attendance-board.ts:196` đã cảnh báo bằng chữ:

```ts
// Not `getRecords()`, which would derive the week a second time — and materialising it writes.
const allRecords = await deps.attendance.getRecordsForSessions(
  sessions.map((session) => session.id),
);
```

PR #62 dựng `getRecordsForSessions` (`attendance.service.ts:95`) đúng cho tình huống này và sửa
`attendance-board.ts`. `ReminderService` là call site còn lại chưa được chuyển sang.

### Quyết định 1

Đổi `this.attendance.getRecords()` thành
`this.attendance.getRecordsForSessions(sessions.map((s) => s.id))`.

**`sessions`, không phải `dueSessions`.** `getRecords()` hôm nay đọc bản ghi của **cả tuần**, và
`buildReminder` chỉ dùng phần thuộc `dueSessions` — nhưng thu hẹp phạm vi đọc là một thay đổi riêng,
và spec này không làm. Truyền `sessions` giữ tập bản ghi đúng y hệt hôm nay.

Không có interface mới: `getRecordsForSessions` đã public và đã có người dùng thứ nhất.

## Vấn đề 2 — dò người vắng bằng quét lồng

`apps/api/src/modules/discord-bot/reminder.service.ts:92`

```ts
const due: DueSession[] = dueSessions
  .map((session) => ({
    session,
    // A record existing is the whole test: answering "Không" is answering.
    missing: members
      .filter((member) =>
        !records.some(
          (record) =>
            record.sessionId === session.id && record.characterId === member.id,
        ),
      )
      .map((member) => ({ name: member.name, discordId: member.discordId })),
  }))
  .filter((day) => day.missing.length > 0);
```

`records.some(...)` quét lại toàn mảng cho từng thành viên, cho từng ngày tới hạn.

### Quyết định 2

Dựng một `Set` khoá `` `${sessionId}:${characterId}` `` một lần, rồi tra. Câu hỏi nghiệp vụ — "có bản
ghi nào cho cặp này chưa" — được viết ra đúng như nó là, thay vì ẩn trong một vòng quét.

### Thật thà về độ lớn

Với ~50 thành viên, ~4 ngày đánh, ~200 bản ghi: xấu nhất khoảng 40.000 phép so sánh, tức là **dưới
một mili giây** trong V8, một lần mỗi ngày. **Đây không phải việc hiệu năng.** Nó được gộp vào spec
này vì Vấn đề 1 đằng nào cũng mở đúng hàm đó ra, và vì `Set` đọc ra ý định rõ hơn. Nếu tách riêng thì
nó không đáng một PR.

## Ảnh hưởng contract

**Không có.** `ReminderOutcome` giữ nguyên ba nhánh, `buildReminder` nhận đúng kiểu cũ.

## Behaviour giữ nguyên

- **`sessionCount` và `missingCount`** trong nhánh `sent` phải ra đúng con số cũ — `missingCount` đếm
  mỗi người một lần dù họ vắng nhiều ngày, luật đó nằm ở `buildReminder`, không đụng tới.
- **`nothing-due` khi mọi người đã trả lời** vẫn phải giữ: `.filter((day) => day.missing.length > 0)`
  không đổi.
- **Người trả lời "Không" vẫn tính là đã trả lời.** Comment ở dòng 94 nói đúng luật đó; `Set` chỉ
  chứa khoá cặp, không chứa `isPresent`, nên luật không thể vô tình đổi.
- **Thứ tự người trong tin nhắn** đi theo thứ tự `members` (`listRows` sắp theo `name`). `filter` giữ
  thứ tự, `Set` không đụng tới nó.

## Rủi ro

Khoá ghép chuỗi bằng `:` — id của `Character` là slug (`meo-beo-k7ma3x`) và id của `BattleSession` là
`gw-<YYYY-MM-DD>` hoặc `cuid()`, không cái nào chứa `:`, nên không có chuyện hai cặp khác nhau ghép
ra cùng một khoá.

## Đo lại

Bỏ **một `upsert` và một `findMany`** ở mỗi lượt cron và mỗi `/nhac-diem-danh`. Vấn đề 2 không đo
được và không nên hứa gì về nó.
