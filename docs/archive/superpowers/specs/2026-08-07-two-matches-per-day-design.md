# Hai trận trong một ngày đánh — Design

Ngày: 2026-08-07 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Mỗi ngày đánh thường có **2 trận**. Trang Xếp team hiện chỉ xếp được một đội hình cho mỗi ngày.
Spec này thêm trận thứ hai: mở ra là một trận, có nút **"Tạo trận 2"** clone nguyên đội hình trận 1
sang làm điểm khởi đầu, sửa gì tuỳ ý, rồi **lưu đội hình cả ngày trong một lần**.

## Bối cảnh

Trạng thái hiện tại, sau ba spec trước:

- [per-session-formation](./2026-08-02-per-session-formation-design.md) dựng bảng `Formation` khoá
  1-1 theo `sessionId`, `assignment` là JSON `{slotId: characterId}`, cùng các luật vòng đời: khoá
  trận đã đánh, dọn dữ liệu quá 28 ngày, bỏ id mồ côi lúc đọc.
- [admin-schedule-settings](./2026-08-05-admin-schedule-settings-design.md) chuyển lịch đánh từ code
  sang database: `BattleSession` do admin tự thêm/sửa/xoá, nhãn suy ra từ `dateTime`.

**Một `BattleSession` là một ngày đánh** — một lần điểm danh, một hạn chót, một đối thủ. Hai trận
trong ngày dùng chung tất cả những thứ đó, chỉ khác đội hình. Vì vậy trận 2 **không** phải một
`BattleSession` thứ hai; nó là đội hình thứ hai của cùng một ngày.

Spec này **thay thế** mô hình lưu đội hình của spec per-session-formation: bảng `Formation` với cột
JSON bị bỏ, thay bằng hai bảng chuẩn hoá. Mọi quyết định khác của các spec trước (bố cục lưới, logic
kéo–thả, pool là derived state, tách state server/nháp, tuần cũ chỉ đọc) **giữ nguyên**.

## Quyết định thiết kế

### 1. Tối đa 2 trận, trần đặt ở Zod chứ không ở database

Mỗi ngày có 1 hoặc 2 trận. Bấm "Tạo trận 2" xong thì nút biến mất.

Trần này nằm trong schema Zod dùng chung FE/BE (`.max(2)`), **không** nằm trong cấu trúc bảng. Nếu
sau này bang đánh 3 trận một ngày thì sửa một con số — không có migration nào phải chạy.

### 2. Chuẩn hoá xuống từng ô, không dùng JSON

Spec per-session-formation chọn JSON và ghi rõ đánh đổi: không truy vấn được theo nhân vật, không
có khoá ngoại tới `Character`. Nhu cầu thống kê giờ đã được nêu rõ — **"đếm số trận mỗi thành viên
tham gia trong một khoảng thời gian"** — nên đánh đổi đó không còn đúng nữa.

Chuyển sang mô hình chuẩn hoá **ngay bây giờ** thay vì mở rộng JSON rồi chuyển sau: chuyển sau tuy
không mất dữ liệu nhưng phải làm lại cả tầng API lẫn bộ test, mà tầng đó đang được viết lại trong
chính spec này.

Với mô hình chuẩn hoá, câu thống kê là một câu Prisma bình thường, có index, không cần raw SQL:

```ts
prisma.formationSlot.groupBy({
  by: ["characterId"],
  where: { match: { session: { dateTime: { gte: from, lte: to } } } },
  _count: true,
});
```

Đổi bố cục lưới (10 team → 12) vẫn không cần migrate, vì `slotId` là chuỗi tự do — điểm này giống
hệt mô hình JSON.

### 3. Hai bảng: trận và ô

> **Cập nhật 2026-09-01:** câu dưới đây không còn đúng. Trận 2 không có ai giờ bị bỏ ở cả hai
> chiều của wire, nên "trận 2 rỗng" không còn là trạng thái lưu được — xem
> [drop-empty-second-match](./2026-09-01-drop-empty-second-match-design.md). Việc tách bảng vẫn giữ
> nguyên: nó là chỗ gắn dữ liệu riêng theo trận (đoạn ngay dưới).

`FormationMatch` tồn tại tách khỏi `FormationSlot` vì **một trận 2 rỗng là trạng thái hợp lệ**:
người dùng tạo trận 2 rồi xoá sạch người, nó vẫn phải còn đó sau khi tải lại trang. Nếu chỉ có bảng
ô thì "trận 2 rỗng" không phân biệt được với "không có trận 2".

`FormationMatch` cũng là chỗ gắn dữ liệu riêng theo từng trận sau này (ghi chú, đối thủ riêng,
`updatedAt` riêng) mà không phải đổi mô hình lần nữa.

### 4. Đơn vị lưu là **cả ngày**

Nút Lưu ghi đội hình của cả hai trận trong một request, một transaction. Không có nút lưu riêng cho
từng trận.

Hệ quả bắt buộc: nút **Đặt lại** cũng phải là cả ngày. Lưu một phạm vi mà đặt lại một phạm vi khác
là kiểu bất đối xứng khiến người dùng đoán sai nút Lưu làm gì.

Cũng vì vậy, **xoá trận 2 không cần endpoint riêng**: gửi mảng một phần tử là xoá.

### 5. Điền sẵn lấy từ trận cuối cùng của ngày trước

Luật điền sẵn cũ ("mở một ngày chưa có đội hình thì copy từ ngày đánh trước đó trong tuần") giữ
nguyên, chỉ làm rõ nguồn khi ngày trước có hai trận: lấy **trận cuối cùng**, vì đó là đội hình gần
hiện trạng nhất.

Điền sẵn chỉ tạo **một** trận. Ngày mới luôn bắt đầu với một trận; muốn trận 2 thì bấm nút.

### 6. Pool độc lập theo từng trận, có đánh dấu chéo

Hai trận dùng chung một lần điểm danh nên `presentIds` giống nhau. Pool của mỗi trận = người báo
"Có" trừ đi người đã xếp **trong chính trận đó** — một người đánh cả hai trận là chuyện bình thường,
và vì trận 2 clone từ trận 1 nên lúc mới tạo hai pool giống hệt nhau.

Thẻ người trong pool có thêm nhãn nhỏ *"đang đánh trận 1"* / *"đang đánh trận 2"* khi người đó đã
được xếp ở trận kia. Nhãn này trả lời đúng câu hỏi hay gặp: ai đang bị để ngoài **cả hai** trận.

### 7. Giữ dữ liệu 2 tháng

`RETENTION_DAYS`: 28 → **56**. Thống kê "trong một khoảng thời gian" mà dữ liệu chỉ sống 4 tuần thì
gần như vô nghĩa.

Vẫn là 8 tuần chẵn chứ không phải "2 tháng" theo lịch, để giữ lý do cũ: dữ liệu gom theo tuần nên
mốc cắt luôn rơi đúng Thứ 2.

## Thay đổi schema

Bảng `Formation` **bị xoá**, thay bằng:

```prisma
/// Một trận trong ngày đánh (tối đa 2). Tồn tại kể cả khi chưa xếp ai —
/// đó là cách phân biệt "ngày này có 2 trận" với "trận 2 đang để trống".
model FormationMatch {
  id         String @id @default(cuid())
  sessionId  String
  /// 1 hoặc 2. Backend gán theo vị trí trong mảng gửi lên, không nhận từ client.
  matchIndex Int

  session BattleSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  slots   FormationSlot[]

  @@unique([sessionId, matchIndex])
}

/// Một ô đã xếp người. Ô trống thì KHÔNG có hàng.
model FormationSlot {
  matchId     String
  /// "team-1-pos-1" — bố cục lưới vẫn nằm hẳn ở frontend.
  slotId      String
  characterId String

  match     FormationMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  character Character      @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@id([matchId, slotId])
  @@index([characterId])
}
```

`BattleSession.formation Formation?` → `formationMatches FormationMatch[]`.
`Character` thêm quan hệ ngược `formationSlots FormationSlot[]`.

### Hai khoản nợ được trả nhờ đổi mô hình

| Bỏ được | Vì sao |
|---|---|
| `Formation.weekStart` (bản copy denormalize) | Dọn dữ liệu quá hạn lọc qua quan hệ `match.session.weekStart`. Kéo theo: transaction trong `battle-sessions.service` phải cập nhật `Formation.weekStart` khi admin dời giờ đánh sang tuần khác **không còn cần thiết** — xoá luôn phần đó. |
| `pruneMissingCharacters` lúc đọc | Đã có khoá ngoại thật tới `Character` với `onDelete: Cascade`. Đổi lại phải lọc lúc **ghi**: một nhân vật vừa bị xoá mà còn trong nháp sẽ làm cả câu insert vỡ vì lỗi khoá ngoại. |

### Migration

1. Tạo `FormationMatch` + `FormationSlot`.
2. Với mỗi hàng `Formation`: tạo một `FormationMatch` (`matchIndex = 1`), rồi bung `assignment` ra
   các hàng `FormationSlot` bằng `jsonb_each_text`.
3. **Bỏ các ô trỏ tới `characterId` không còn trong bảng `Character` trước khi tạo khoá ngoại**,
   nếu không migration vỡ. Dữ liệu cũ chắc chắn có id mồ côi — luật cũ lọc chúng lúc đọc chứ không
   xoá khỏi database.
4. Xoá bảng `Formation`.

## Backend

### Hợp đồng dữ liệu

`packages/shared/schemas/formation.schema.ts`:

```ts
/** slotId → characterId. Ô trống thì KHÔNG có khoá. */
export const assignmentSchema = z.record(z.string(), z.string());

/** Body của PUT /team-builder/formations/:sessionId — đội hình cả ngày. */
export const saveFormationSchema = z.object({
  matches: z.array(assignmentSchema).min(1).max(2),
});
```

### Endpoint

| Endpoint | Đổi gì |
|---|---|
| `GET /team-builder/weeks` | Không đổi hợp đồng. Dọn theo mốc 56 ngày, lọc qua quan hệ. |
| `GET /team-builder/formations?weekStart=…` | `assignment: WireAssignment` → `matches: WireAssignment[]` (0, 1 hoặc 2 phần tử; `[]` = chưa xếp gì) |
| `PUT /team-builder/formations/:sessionId` | Body `{ matches }`. Ghi đè đội hình **cả ngày**. |

### Luồng lưu

Trong một `$transaction`:

1. Tìm session → không có thì `404 "Không tìm thấy ngày đánh."`
2. `session.dateTime < now` → `409 "Trận này đã đánh xong, không sửa được nữa."`
3. Lọc bỏ `characterId` không còn trong bảng `Character`.
4. `deleteMany` toàn bộ `FormationMatch` của session (ô bị cascade xoá theo).
5. Tạo lại `FormationMatch` + `FormationSlot` theo mảng gửi lên, `matchIndex` = vị trí + 1.

Xoá và tạo lại thay vì diff từng ô: nhiều nhất ~120 hàng, và nó khiến "xoá trận 2" không cần code
riêng. Vẫn idempotent — gửi cùng payload nhiều lần cho cùng kết quả.

### Dọn phụ thuộc

- `battle-sessions.service`: bỏ phần cập nhật `Formation.weekStart` trong transaction đổi giờ đánh.
- `hasFormation` trong `BattleSessionEntity`: tính bằng `_count.formationMatches > 0`.

## Frontend

### Store

Nháp đổi từ "đội hình một trận" sang "đội hình cả ngày":

```ts
drafts: Record<string, Assignment[]>   // sessionId → [trận 1, trận 2?]
activeMatchIndex: number               // tab con đang mở; reset về 0 khi đổi ngày hoặc tuần
```

Đây là thay đổi cốt lõi, và nó khiến ba thứ tự đúng mà không cần code riêng: **Lưu** gửi cả mảng,
**Đặt lại** xoá một khoá, **tạo/xoá trận 2** chỉ là đổi độ dài mảng.

`activeMatchIndex` là một biến chung chứ không lưu theo từng ngày — đổi tab ngày thì quay về Trận 1.
Đơn giản hơn, đổi lại phải kẹp qua `resolveActiveMatchIndex(matchCount, stored)` cho trường hợp đang
mở Trận 2 rồi chuyển sang ngày chỉ có một trận.

`drop()` nhận thêm `matchIndex` và chỉ sửa đúng phần tử đó của mảng.

### Chuẩn hoá `matches` rỗng

Server trả `[]` khi ngày đó chưa xếp gì. FE quy về `[{}]` ngay lúc đọc, nên phần còn lại của màn
hình luôn thấy mảng có ít nhất một trận — không chỗ nào phải xử lý trường hợp "không có trận nào".

### Hàm thuần (`lib/`)

Đây là nơi mọi quyết định thật sự nằm, để test chạy được ở `environment: "node"`.

| File | Đổi gì |
|---|---|
| `wire.ts` | Thêm `toWireMatches` / `fromWireMatches`; `fromWireMatches` chuẩn hoá `[]` → `[{}]` |
| `formation-diff.ts` | Thêm `isDayDirty(draft?, saved)` — khác độ dài là dirty, bằng thì so từng trận bằng `isDirty` hiện có |
| `prefill.ts` | Nguồn đổi thành trận **cuối cùng** của ngày trước đó có đội hình (`source.matches.at(-1)`); nhãn banner ghi rõ "Thứ 3 · trận 2" khi nguồn là trận 2 |
| `active-match.ts` (mới) | `resolveActiveMatchIndex(matchCount, stored)` |
| `assignment.ts` | **Không đổi một dòng** — `applyDrop` vẫn làm việc trên một `Assignment` |

### Component

```
┌─ Tuần 03/08 ─┐
[T3 12/60 · 8/60] [T5 0/60] [T7 GW 20/60]
──────────────────────────────────────────
 VS Hắc Long Đường · 20:30
 ( Trận 1 • ) ( Trận 2 )      [Xoá trận 2]
──────────────────────────────────────────
 [Lưới 10 team × 6 ô]              [Pool]

              [Đặt lại] [Lưu đội hình cả ngày]
```

- `match-tabs.tsx` (mới) — hàng tab con, kèm nút `+ Tạo trận 2` (khi mới có một trận) hoặc
  `Xoá trận 2` (khi đang mở tab con Trận 2).
- `session-tabs.tsx` — badge thành `12/60` khi một trận, `12/60 · 8/60` khi hai.
- `formation-toolbar.tsx` — nhãn nút thành **"Lưu đội hình cả ngày"**; "Đặt lại" huỷ nháp cả ngày.
- `member-pool.tsx` / `member-card.tsx` — nhãn nhỏ *"đang đánh trận 1"* trên thẻ người đã được xếp
  ở trận kia.
- `delete-match-dialog.tsx` (mới) — *"Xoá trận 2 khỏi ngày này? Đội hình trận 2 sẽ mất khi bạn bấm
  Lưu."* Chỉ hỏi khi trận 2 có người.

**Tạo trận 2** = `setDraft(sessionId, [...matches, { ...matches[0] }])` rồi chuyển sang tab con Trận
2. Clone **nguyên vẹn**, kể cả người đã báo nghỉ đang nằm trong ô — nhất quán với luật cũ "không bao
giờ tự gỡ người sau lưng người dùng".

## Edge case

| Tình huống | Xử lý |
|---|---|
| Tạo trận 2 khi trận 1 còn trống | Cho phép, clone ra lưới rỗng. Không có lý do để chặn. |
| Trận 2 đã lưu nhưng trống trơn | Vẫn hiện tab con Trận 2 sau khi tải lại — đây chính là lý do có bảng `FormationMatch`. |
| Bấm Đặt lại sau khi vừa tạo trận 2 | Trận 2 biến mất, về đúng bản server. Đối xứng với nút Lưu. |
| Xoá trận 2 đã lưu rồi bấm Lưu | `deleteMany` + tạo lại một trận trong cùng transaction — hàng trận 2 và các ô của nó biến mất sạch. |
| Đang mở tab con Trận 2 thì bấm Xoá | Về tab con Trận 1 ngay. |
| Đổi tab ngày rồi quay lại | Nháp cả ngày còn nguyên (kể cả trận 2), nhưng tab con về Trận 1. |
| Ngày đã qua giờ đánh | `locked` tính theo `session.dateTime` → khoá **cả hai** trận. Không có luật riêng cho trận 2. |
| Người đã xếp rồi báo nghỉ | Hai trận chung một lần điểm danh, nên cảnh báo "đã báo nghỉ" hiện ở cả hai trận nếu người đó nằm trong cả hai. Giữ nguyên cơ chế `absentIds`, tính theo trận đang mở. |
| Nhân vật bị xoá khỏi bang giữa chừng | Hàng ô bị cascade xoá. Nháp trong bộ nhớ vẫn còn id đó → lúc lưu backend lọc bỏ trước khi insert; refetch xong ô thành trống. |
| Lưu hỏng giữa chừng | Transaction rollback — không có trạng thái "trận 1 đã lưu, trận 2 chưa". Nháp giữ nguyên, không optimistic update. |
| `409` (trận vừa tới giờ đánh) | Refetch, màn hình chuyển sang chỉ đọc. Như cũ. |
| Tuần cũ / chỉ đọc | Hiện đủ cả hai tab con, không có nút Tạo/Xoá, không có pool. |
| Admin xoá ngày đánh ở trang Thiết lập | `resolveActiveSessionId` đã lo, không đổi gì. |
| Client gửi `matchIndex` bậy | Backend không nhận `matchIndex` từ client — gán theo vị trí trong mảng. |

## Kiểm thử

**API (Jest)** — `team-builder.service.spec.ts`, viết lại phần lưu:

1. Lưu mảng 2 trận → tạo đúng 2 `FormationMatch` với `matchIndex` 1 và 2.
2. Lưu lại mảng 1 trận → trận 2 và các ô của nó bị xoá sạch.
3. Idempotent: gửi hai lần cùng payload cho cùng kết quả.
4. Bỏ `characterId` không còn trong bảng `Character` lúc ghi.
5. Chặn ghi vào trận đã khoá (409); không tìm thấy session (404).
6. Dọn đúng dữ liệu cũ hơn 56 ngày, lọc qua `match.session.weekStart`.

`battle-sessions.service.spec.ts`: bỏ test "đổi tuần có cập nhật `Formation.weekStart`".

**Web (Vitest)** — hàm thuần:

- `isDayDirty`: khác độ dài / khác nội dung / giống hệt.
- `fromWireMatches`: chuẩn hoá `[]` → `[{}]`, giữ đúng thứ tự hai trận.
- `buildPrefill`: lấy đúng trận cuối của ngày trước, bỏ đúng người không báo "Có", trả `null` khi
  không có ngày trước nào có đội hình.
- `resolveActiveMatchIndex`: kẹp về 0 khi ngày mới chỉ có một trận.

Không test component — vitest vẫn đang ở `environment: "node"`, thêm jsdom là việc riêng.

## Ngoài phạm vi

- **Trận 3 trở lên** — mô hình dữ liệu đã chịu được, chỉ là đổi con số trong Zod khi thật sự cần.
- **Màn hình thống kê số trận theo thành viên** — schema đã sẵn sàng cho câu truy vấn đó, nhưng
  endpoint và giao diện là spec riêng.
- **Kéo thả người trực tiếp giữa hai trận** — muốn đổi thì thao tác trong từng tab con.
- **Sửa đội hình tuần cũ** — vẫn chỉ đọc.
- **Metadata riêng theo từng trận** (ghi chú, đối thủ riêng) — `FormationMatch` đã có chỗ, chưa làm.
