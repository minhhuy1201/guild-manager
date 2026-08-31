# Số trận của một ngày đánh — Design

Ngày: 2026-08-31 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Lịch hiện chỉ nói ngày nào đánh, giờ nào — không nói ngày đó đánh mấy trận. Con số ấy tồn tại trong
đầu mọi người nhưng không có ở đâu trong hệ thống, nên người điểm danh không biết mình đang nhận lời
cho một trận hay hai, còn người xếp team phải hỏi lại trước khi quyết định có cần đội hình thứ hai.

Spec này đưa **số trận thành một thuộc tính của ngày đánh**: scrim mặc định 2 trận và admin chỉnh
được ở `/thiet-lap`; Bang Chiến Thứ 7 theo luật xen kẽ 2 → 1 → 2 → 1 do hệ thống tự tính; con số hiện
thành badge ngay sau nhãn ngày đánh ở mọi màn hình.

## Bối cảnh

- [two-matches-per-day](./2026-08-07-two-matches-per-day-design.md) — một ngày đánh có thể mang 1 hoặc
  2 `FormationMatch`, người xếp team bấm "Tạo trận 2" để nhân bản đội hình trận 1.
- [admin-schedule-settings](./2026-08-05-admin-schedule-settings-design.md) — lịch do admin nhập ở
  `/thiet-lap`, giới hạn tuần này và tuần sau; hạn chót của Bang Chiến là ví dụ mẫu cho một trường
  **hệ thống sở hữu**: gửi lên là 400, và `ensureGuildWar` ghi đè lại ở mỗi lần đọc.

Điều thứ hai quyết định cách xử lý Bang Chiến trong spec này: luật xen kẽ đi đúng con đường mà
`deadline` đã đi, không phát minh cơ chế mới.

## Quyết định thiết kế

### 1. `matchCount` là một cột trên `BattleSession`

```prisma
/// How many matches are played on this day (1 or 2). The cap lives in Zod, not here — same rule
/// FormationMatch.matchIndex follows. Scrim: set by an admin, default 2. Guild War: system-owned,
/// alternating per week.
matchCount Int @default(2)
```

Số trận thuộc về **ngày đánh**, không thuộc về đội hình: nó đúng khi chưa ai xếp một ô nào, và nó là
thứ người điểm danh cần biết trước khi màn xếp team được mở ra lần đầu.

Cột `NOT NULL` có `DEFAULT`, nên migration không phá dữ liệu. Nhưng **không** để mọi hàng cũ nhận 2
một cách mù quáng: tuần cũ có ngày chỉ lưu một `FormationMatch`, và ghi 2 vào đó là bịa ra một sự
thật không có. Migration mang một bước dữ liệu viết tay:

```sql
UPDATE "BattleSession" s
SET "matchCount" = c.n
FROM (SELECT "sessionId", COUNT(*) AS n FROM "FormationMatch" GROUP BY "sessionId") c
WHERE c."sessionId" = s.id;
```

Ngày chưa xếp đội hình giữ mặc định 2. Hàng Bang Chiến sai sẽ tự sửa ở lần `ensureGuildWar` kế tiếp
(§2), nên bước SQL này không cần biết đến luật xen kẽ.

### 2. Bang Chiến: luật xen kẽ do hệ thống sở hữu

Luật tuần thuộc về `apps/api/src/modules/battle-sessions/session-schedule.ts` — architecture.md §7 nói
rõ "nowhere else", và frontend không được tự suy lại.

```ts
/** Monday of the week the alternation is anchored to: that week plays 2 matches. */
const GUILD_WAR_MATCH_COUNT_ANCHOR = new Date('2026-08-31T00:00:00+07:00');

/** 2 for the anchor week and every second week from it, 1 for the weeks in between. */
export function guildWarMatchCount(weekStart: Date): number;
```

Số tuần lệch so với mốc: chẵn ⇒ 2 trận, lẻ ⇒ 1 trận. Mốc ghi bằng offset `+07:00` chứ không phải
`Z`: hằng số nói về một mốc Thứ 2 trên đồng hồ Việt Nam, và viết đúng như vậy thì không ai phải tự
trừ 7 tiếng trong đầu khi đọc lại.

Tuần trước mốc cho số lệch **âm**, và đó là trường hợp duy nhất dễ viết sai: `%` trong JavaScript giữ
dấu của số bị chia, nên `-1 % 2` là `-1` chứ không phải `1`. Phép so `delta % 2 === 0` vẫn cho kết
quả đúng với số âm (`-2 % 2` là `-0`, mà `-0 === 0`), nhưng nó đúng nhờ một chi tiết của `-0` chứ
không nhờ điều người đọc đang nghĩ. Viết `Math.abs(delta) % 2 === 0` để tính chẵn/lẻ không phụ thuộc
vào dấu, và test phải phủ ít nhất một tuần quá khứ để khoá lại điều đó.

Số tuần lệch tính bằng số mili-giây chia cho một tuần rồi làm tròn, chứ không cộng ngày: cả hai đầu
đều là mốc Thứ 2 00:00 giờ VN (UTC+7 cố định) nên khoảng cách luôn là bội số nguyên của 7 ngày, và
`Math.round` hấp thụ mọi sai lệch nếu về sau ai đó truyền vào một mốc chưa chuẩn hoá.

`ensureGuildWar` ghi `matchCount: guildWarMatchCount(weekStart)` ở **cả nhánh `create` lẫn `update`**,
đúng như nó đang làm với `deadline`: một hàng cũ lệch luật tự sửa mình ở lần đọc kế tiếp. Chuyển Bang
Chiến sang tuần khác thì `matchCount` tính lại theo tuần mới, cùng lúc với `deadline`.

Gửi `matchCount` cho một Bang Chiến qua `PATCH` ⇒ **400**, câu chữ đặt cạnh câu của `deadline`:

```
Số trận của Bang Chiến do hệ thống tính theo tuần, không sửa được.
```

### 3. `matchCount` là **trần trên** của số đội hình, không phải mệnh lệnh

Đây là quyết định trung tâm của spec, và nó đi ngược trực giác đầu tiên.

Một ngày 2 trận **không** bắt người xếp team phải tạo hai đội hình. Cùng một đội hình đánh cả hai trận
là chuyện bình thường, và đó là mặc định. `matchCount` chỉ chặn chiều còn lại: ngày 1 trận thì không
thể có đội hình thứ hai.

| | Ngày 1 trận | Ngày 2 trận |
|---|---|---|
| 1 đội hình | ✅ | ✅ (dùng chung cho cả hai trận) |
| 2 đội hình | ❌ chặn | ✅ |

Hệ quả: **`match-tabs.tsx` giữ nguyên** — vẫn "Tạo trận 2", vẫn "Xoá trận 2", vẫn
`delete-match-dialog.tsx`. `use-formation-draft`, `formation-store` và `active-match.ts` không đổi một
dòng nào. Thay đổi duy nhất là `canAddMatch` thêm điều kiện `session.matchCount >= 2`.

Ba chốt chặn giữ cho trần trên này không bị vượt:

- `TeamBuilderService.saveFormation`: `matches.length > session.matchCount` ⇒ **409**
  `Ngày này chỉ đánh N trận, không xếp được nhiều đội hình hơn.` Trước đây payload tự quyết số đội
  hình; giờ ngày đánh đặt ra trần, nên đường ghi phải kiểm.
- Hạ `matchCount` từ 2 xuống 1 ⇒ xoá `FormationMatch` có `matchIndex > matchCount` (§4).
- Bang Chiến tuần 1 trận ⇒ `canAddMatch` tự tắt, không cần luật riêng.

### 4. Hạ số trận xoá đội hình thừa, trong cùng một transaction

`BattleSessionsService.update` khi `matchCount` giảm phải xoá các `FormationMatch` vượt trần **cùng
transaction với lệnh update**:

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.formationMatch.deleteMany({
    where: { sessionId: id, matchIndex: { gt: matchCount } },
  });
  return tx.battleSession.update({ where: { id }, data: { …, matchCount } });
});
```

Tách rời hai lệnh sẽ có một khoảnh khắc số trận đã là 1 mà đội hình vẫn còn 2 — đúng trạng thái mà
`saveFormation` từ chối, tức là dữ liệu tự mâu thuẫn với luật của chính nó.

Việc xoá không im lặng: form hỏi xác nhận trước (§6). Nhưng backend **không** dựa vào lời hứa đó —
nó xoá vì trạng thái sau lệnh update bắt buộc phải hợp lệ, bất kể ai gọi.

### 5. Contract: `hasFormation` nhường chỗ cho `formationMatchCount`

```ts
// packages/shared/schemas/battle-session.schema.ts
export const MATCH_COUNT_MIN = 1;
export const MATCH_COUNT_MAX = 2;
export const MATCH_COUNT_MESSAGE = "Một ngày đánh 1 hoặc 2 trận.";

// battleSessionFields — vào cả create (bắt buộc) và update (partial)
matchCount: z.number().int().min(MATCH_COUNT_MIN, MATCH_COUNT_MESSAGE)
                      .max(MATCH_COUNT_MAX, MATCH_COUNT_MESSAGE),

// battleSessionSchema (response)
matchCount: z.number(),
formationMatchCount: z.number(),   // thay cho hasFormation: z.boolean()

// sessionFormationSchema (response của team-builder)
matchCount: z.number(),
```

`hasFormation` **đổi thành** `formationMatchCount` chứ không thêm cạnh nhau. Form thiết lập cần trả
lời câu "trận 2 đã có đội hình chưa" để quyết định có hỏi xác nhận hay không, mà một boolean không
trả lời được; giữ cả hai là hai cách nói về cùng một `_count.formationMatches`, đúng thứ mà quy ước
"prefer symmetry" của CLAUDE.md gọi là bất đối xứng vô cớ. Chỗ duy nhất đang đọc `hasFormation` là
`delete-session-dialog.tsx`, nó tự suy `formationMatchCount > 0`.

Số trận **không** nhét vào `label`. `label` vẫn thuần thời gian ("Thứ 5 · 20:30"), đúng như
architecture.md §5 mô tả; số trận là dữ liệu riêng và giao diện tự ghép (§7).

`MATCH_COUNT_MAX` và cap `.max(2)` của `saveFormationSchema` là **hai luật khác nhau tình cờ cùng số**
— một cái giới hạn số trận đánh trong ngày, cái kia giới hạn số đội hình lưu được. Không gộp.

### 6. `/thiet-lap`: ô "Số trận", và một câu hỏi trước khi mất dữ liệu

Form ngày đánh thêm ô **"Số trận"** — một `Select` 1/2, mặc định 2 khi tạo mới. Select chứ không phải
`Input type="number"`: hai lựa chọn thì danh sách nói hết được miền giá trị mà không cần ai đọc thông
báo lỗi.

Bang Chiến hiện dòng chỉ đọc, song song với dòng hạn chót đã có:

```
Số trận:  2 trận — hệ thống tự tính theo tuần, không sửa được.
```

Hạ từ 2 xuống 1 khi `session.formationMatchCount >= 2` ⇒ dialog xác nhận nói rõ cái mất:

```
Hạ xuống 1 trận sẽ xoá đội hình đã xếp cho trận 2. Không khôi phục lại được.
```

Đồng ý mới gửi request. `formationMatchCount < 2` thì gửi thẳng, không hỏi — không có gì để mất.

### 7. Badge số trận đi cùng `SessionLabel`

`SessionLabel` là chỗ duy nhất bốn màn hình thống nhất với nhau về hình dáng một dòng ngày đánh, nên
badge vào đó:

```
⚔ Thứ 7 · Bang Chiến  [2 trận]
  Thứ 5 · 20:30        [2 trận]
  Thứ 3 · 20:30        [1 trận]
```

Prop mở rộng thành `Pick<BattleSession, "label" | "isGuildWar" | "matchCount">`. Cả `BattleSession` và
`SessionFormation` đều mang `matchCount` sau §5, nên mọi nơi đang gọi component đều truyền được: lưới
điểm danh, tile của member, bảng lịch sử, danh sách ở `/thiet-lap`, tab ngày ở màn xếp team.

**Luôn hiện, kể cả "1 trận".** Ẩn ở trường hợp 1 sẽ biến "không thấy badge" thành hai nghĩa — ngày 1
trận, hay màn hình chưa cập nhật — và người đọc không phân biệt được.

## Kiểm thử

Làm theo TDD: mỗi mục dưới đây viết test đỏ trước, rồi mới viết code.

| Chỗ | Hành vi được khoá |
|---|---|
| `session-schedule.spec.ts` | `guildWarMatchCount` ở tuần mốc, ±1, ±2 tuần, và một tuần quá khứ xa (kiểm chẵn/lẻ với số lệch âm) |
| `battle-sessions.service.spec.ts` | tạo scrim với `matchCount`; PATCH Bang Chiến kèm `matchCount` ⇒ 400; hạ 2→1 xoá `FormationMatch` thứ 2; `ensureGuildWar` ghi đè theo luật ở cả create lẫn update; chuyển Bang Chiến sang tuần khác tính lại `matchCount` |
| `battle-sessions.codec.spec.ts` | `matchCount` và `formationMatchCount` ra đúng response |
| `team-builder.service.spec.ts` | lưu 2 đội hình cho ngày `matchCount = 1` ⇒ 409; lưu 1 đội hình cho ngày 2 trận ⇒ hợp lệ |
| `session-label.test.tsx` | badge hiện đúng cho cả 1 và 2 trận, cạnh nhãn |
| `match-tabs` | `canAddMatch` tắt khi `matchCount = 1`; ngày 2 trận vẫn hiện được 1 đội hình |
| form `/thiet-lap` | ô số trận có mặt và mặc định 2; Bang Chiến hiện dòng chỉ đọc; hạ 2→1 khi đã có đội hình ⇒ hỏi xác nhận trước khi gửi |

## Ngoài phạm vi

- Không cho phép 3 trận trở lên. Nới cap nghĩa là sửa `MATCH_COUNT_MAX`, cap của `saveFormationSchema`
  và lưới tab — một việc riêng khi thật sự cần.
- Admin không ghi đè được số trận của Bang Chiến. Luật đổi thì đổi ở `session-schedule.ts`.
- Không có số trận riêng cho từng thành viên: điểm danh vẫn là một câu trả lời cho cả ngày, không phải
  cho từng trận.
- Không đổi luật hạn chót, luật tuần mở, hay quyền ghi của bất kỳ endpoint nào.
- Không hiện số trận ở nơi nào không dùng `SessionLabel`.
