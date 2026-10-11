# B — Đọc tuần không phát lệnh ghi khi không có gì lệch

Ngày: 2026-09-06 · Phạm vi: `apps/api/src/modules/battle-sessions`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Strong**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

## Bối cảnh

### 1. Đường đọc tuần bắt đầu bằng một lệnh ghi

`apps/api/src/modules/battle-sessions/battle-sessions.service.ts:110`

```ts
async listByWeek(weekStart?: string): Promise<BattleSession[]> {
  const now = this.clock.now();
  const target = parseWeekStart(weekStart, now);

  await this.materializeWeek(target, now);        // (1) upsert — luôn luôn

  const rows = await this.prisma.battleSession.findMany({   // (2) mới tới đọc
    ...weekSessionQuery(target),
    include: SESSION_INCLUDE,
  });

  return rows.map((row) => toBattleSession(row, now));
}
```

`materializeWeek` (dòng 141) gọi `ensureGuildWar` (dòng 354) với một `upsert` **vô điều kiện**:

```ts
await this.prisma.battleSession.upsert({
  where: { id: guildWarSessionId(weekStart) },
  create: { ... },
  update: { deadline: guildWarDeadline(weekStart), matchCount },
});
```

Nhánh `update` ghi lại `deadline` và `matchCount` mỗi lần, kể cả khi hàng trong database đã đúng —
tức là gần như mọi lần.

### 2. Sáu call site, tất cả đều là đường đọc

| Call site | Chạy khi nào |
|---|---|
| `battle-sessions.controller.ts:64` | mỗi `GET /battle-sessions` |
| `attendance.service.ts:81` `getRecords` | mỗi `GET /attendance/records` |
| `attendance.service.ts:111` `getSummary` | mỗi `GET /attendance/summary` |
| `discord-bot/attendance-board.ts:190` | mỗi lần dựng bảng — mỗi `/diem-danh`, mỗi lượt bấm nút |
| `discord-bot/reminder.service.ts:80` | mỗi lượt cron và mỗi `/nhac-diem-danh` |
| `discord-bot/commands/thong-bao.command.ts:38` | mỗi `/thong-bao` |

Màn điểm danh của mọi thành viên đi qua hai trong số đó (`/battle-sessions` và `/attendance/records`)
ở mỗi lần mở trang.

### 3. Cái giá có hai phần, phần thứ hai đắt hơn

1. **Một lệnh ghi trên đường đọc.** Trên Postgres, một `UPDATE` không đổi giá trị vẫn sinh một tuple
   mới, một bản ghi WAL và việc dọn cho autovacuum. Qua session pooler của Supabase thì đó là một
   round trip mạng đầy đủ.
2. **Một round trip tuần tự.** `materializeWeek` phải xong mới tới `findMany` — hai lượt nối đuôi
   nhau, không gộp được, vì lượt sau phải nhìn thấy kết quả lượt trước. Đường đọc tuần vì thế luôn
   tốn 2 RTT thay vì 1, và một trong sáu call site nằm trong ngân sách 3 giây của Discord
   (`docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9).

### 4. Đây không phải chỗ PR #62 đã sửa

#62 bỏ đi lần suy ra tuần **thứ hai** trong một request: `buildAttendanceBoard` từng gọi
`attendance.getRecords()`, mà hàm này lại `listByWeek()` lần nữa. Comment ở `attendance-board.ts:196`
ghi đúng lý do đó.

Phần còn lại ở đây là lần **thứ nhất**, và nó có ở mọi request đọc tuần. Không lần rà soát nào trước
đây chạm vào nó.

## Quyết định

**`listByWeek` đọc trước, và chỉ ghi khi hàng thật sự thiếu hoặc lệch.**

```
đọc findMany
  ├─ tuần ngoài phạm vi xếp lịch  → trả luôn (như cũ, materializeWeek vốn no-op)
  ├─ có hàng Bang Chiến, deadline và matchCount đều khớp  → trả luôn, KHÔNG ghi
  └─ thiếu hàng, hoặc lệch một trong hai trường            → upsert, rồi đọc lại
```

1. **Phép so sánh "đã đúng chưa" là một hàm riêng**, `isGuildWarCurrent(row, week)`, và người gọi
   quyết định có phát lệnh ghi hay không. `ensureGuildWar` **không đổi**: vẫn `upsert` vô điều kiện,
   chỉ khác là nay chỉ được gọi khi đã biết là cần. Luật "hàng nào là Bang Chiến của tuần này" vẫn là
   `guildWarSessionId(weekStart)`, không đổi.
2. **Trạng thái ổn định: 1 truy vấn, không ghi.** Trạng thái cần sửa: 3 truy vấn (đọc, ghi, đọc lại)
   — đắt hơn hôm nay đúng một lượt, nhưng nó chỉ xảy ra ở tuần mới hoặc hàng cũ.
3. **Đọc lại sau khi ghi chứ không vá trong bộ nhớ.** `SESSION_INCLUDE` mang theo `_count` của
   `attendanceRecords` và `formationMatches`; dựng lại con số đó bằng tay là chép luật của Prisma
   sang chỗ khác. Nhánh này hiếm, nên trả một round trip để giữ đúng một nguồn sự thật là đáng.
4. **`ensureWeekMaterialized` (dòng 130) giữ nguyên chữ ký và ngữ nghĩa.** Nó là seam mà
   `team-builder` dùng để materialise mà không đọc; A1 của đợt 2 đã đặt nó ở đó có chủ đích. Bên
   trong nó cũng đọc trước rồi mới ghi — một `findUnique` chỉ lấy `deadline` và `matchCount`, rồi hỏi
   đúng `isGuildWarCurrent` như `listByWeek`. Giữ đối xứng: cùng một câu hỏi thì cùng một hàm trả
   lời, và seam này cũng thôi phát lệnh ghi khi không có gì lệch. Hàm private `materializeWeek` cũ
   không còn ai gọi nên đã xoá.

### Vì sao không bỏ hẳn việc tự sửa

`docs/architecture.md` §6 nói rõ: `ensureGuildWar` ghi đè `deadline` và `matchCount` **ở mỗi lần
đọc**, để một hàng viết dưới luật cũ tự sửa. Đó là behaviour business.

Spec này **giữ nguyên luật đó**. Cái đổi là *khi nào phát lệnh ghi*: hàng vẫn tự sửa đúng lúc nó
lệch, chỉ là lệnh ghi không còn được phát ra khi không có gì để sửa. `docs/architecture.md` không
phải sửa — câu chữ ở đó nói về *kết quả*, không nói về số lệnh SQL.

## Ảnh hưởng contract

**Không có.** `listByWeek` trả đúng kiểu cũ, đúng thứ tự cũ (`orderBy: { dateTime: 'asc' }`), đúng
nội dung cũ.

## Behaviour giữ nguyên

Bốn nhánh phải cho ra kết quả y hệt, và là chỗ test phải chỉ vào:

- **Tuần chưa có Bang Chiến** → vẫn sinh ra, vẫn nằm đúng thứ tự theo `dateTime`.
- **Hàng có `deadline` sai luật** (dữ liệu cũ) → vẫn được ghi lại đúng, và bản trả về là bản đã sửa,
  không phải bản đọc lần đầu.
- **Hàng có `matchCount` sai luật** → như trên.
- **Tuần ngoài phạm vi xếp lịch** (`isEditableWeek` sai) → không sinh, không ghi. Giống hôm nay, vì
  `materializeWeek` đã return sớm ở dòng 142.

**Admin đã đổi giờ đánh Bang Chiến** thì `dateTime` **không** bị ghi đè — nhánh `update` hôm nay
cũng không đụng tới nó, và so sánh mới cũng không được đưa nó vào. Nếu đưa vào, giờ admin vừa chỉnh
sẽ bị hệ thống ghi đè: đó mới là đổi behaviour.

## Rủi ro

**So sánh `deadline` phải so theo mốc thời gian, không theo tham chiếu.** `guildWarDeadline(weekStart)`
trả một `Date` mới mỗi lần gọi; `row.deadline` là `Date` do Prisma dựng. So bằng `===` luôn sai, nên
điều kiện "lệch" sẽ luôn đúng và lệnh ghi không bao giờ biến mất — lỗi này im lặng, chỉ đo mới thấy.
So bằng `.getTime()`.

**Hai request cùng thấy hàng lệch sẽ cùng phát `upsert`.** Vô hại: cả hai ghi cùng một giá trị tất
định, và `upsert` theo id là idempotent. Không cần khoá.

## Đo lại

Ở trạng thái ổn định, mỗi lần đọc tuần: **2 round trip → 1**, và **1 lệnh ghi → 0**. Nhân với sáu
call site, trong đó hai cái nằm trên mỗi lần mở màn điểm danh của mỗi thành viên.
