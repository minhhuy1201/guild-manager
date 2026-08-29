# Đặt tên cho từng đội trên lưới đội hình — Design

Ngày: 2026-08-29 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Header của mỗi cột trên lưới Xếp team hiện chỉ hiện **số đội** (`1`..`10`), lấy từ bố cục tĩnh
`lib/mock-formation.ts`. Người xếp team phải tự nhớ "đội 3 là đội thủ nhà", "đội 7 là đội dự bị".

Spec này cho phép **double-click vào header để đổi tên đội**, Enter hoặc click ra ngoài thì chốt,
Escape thì huỷ; tên lưu xuống database và hiện lại cho mọi admin.

## Bối cảnh

- [per-session-formation](./2026-08-02-per-session-formation-design.md) — bố cục lưới (10 đội × 6 ô)
  là dữ liệu tĩnh ở frontend, backend chỉ biết `slotId` là một chuỗi.
- [formation-slot-notes](./2026-08-08-formation-slot-notes-design.md) — ghi chú từng ô: nhập vào
  **nháp** trong Zustand, chỉ chạm API khi bấm nút "Lưu đội hình cả ngày".

Màn hình đang chạy theo một mô hình duy nhất: *server state ở TanStack Query, mọi chỉnh sửa vào nháp
Zustand, một nút Lưu chốt tất cả.* Spec này bám mô hình đó.

## Quyết định thiết kế

### 1. Tên gắn với **số đội**, dùng chung toàn hệ thống

Tên không thuộc về ngày đánh nào, trận nào, tuần nào. Đội 3 tên "Thủ nhà" thì tuần nào cũng vậy.

Lý do: đội hình là **vai trò cố định** trong cách bang tổ chức, không phải thuộc tính của một trận.
Nếu gắn theo session thì đổi tên ở trận Thứ 7 xong sang trận Thứ 3 lại thấy tên cũ — vô lý với chính
thứ mà tên đó mô tả.

Hệ quả quan trọng: **tên KHÔNG nằm trong payload của `PUT /formations/:sessionId`.** Nó là một
resource riêng, một bảng riêng, một endpoint riêng.

### 2. Bảng `TeamName` riêng, không nhét vào `FormationSlot`

```prisma
model TeamName {
  team      Int      @id
  name      String
  updatedAt DateTime @updatedAt
}
```

Vòng đời khác hẳn `FormationSlot`: `FormationSlot` bị xoá theo retention 56 ngày và bị xoá-tạo-lại mỗi
lần lưu đội hình, còn tên đội phải sống mãi. Nhét chung sẽ phải bịa ra một `matchId` giả và phải loại
trừ hàng đó khỏi mọi truy vấn thống kê.

`team` là khoá chính, kiểu `Int` — backend **không** kiểm tra 1..10: bố cục lưới là chuyện của
frontend, đúng như `slotId` hiện nay. Đội nào chưa đặt tên thì **không có hàng**, giống hệt luật "ô
trống thì không có hàng".

Bảng mới phải tự bật RLS (`ALTER TABLE "TeamName" ENABLE ROW LEVEL SECURITY`) — cùng lý do đã ghi ở
migration `20260825071500_bat_rls_cho_bang_moi`: `ALTER DEFAULT PRIVILEGES` chặn được `anon`/
`authenticated` với bảng mới nhưng **không** bật RLS hộ.

### 3. Wire format: ghi đè cả map

```jsonc
// GET  /team-builder/team-names   → { "1": "Thủ nhà", "7": "Dự bị" }
// PUT  /team-builder/team-names   ← { "names": { "1": "Thủ nhà" } }
```

```ts
export const TEAM_NAME_MAX_LENGTH = 24;

export const teamNamesSchema = z.record(
  z.string().regex(/^\d+$/, "Số đội không hợp lệ."),
  z.string().trim().min(1).max(TEAM_NAME_MAX_LENGTH),
);
```

Ghi đè cả map thay vì `PATCH` từng đội, cùng lý do `saveFormation` xoá-rồi-tạo-lại: tối đa 10 hàng, và
**xoá tên** trở thành "thiếu khoá" chứ không cần thêm endpoint. Khoá thiếu ⇒ header quay về số đội.

Cả hai endpoint nằm trên `TeamBuilderController` sẵn có, tức vẫn `JwtAuthGuard + AdminGuard` ở cấp
controller. Không có màn nào cho MEMBER xem lưới, nên chưa cần nới quyền đọc.

### 4. Sửa tên đi vào **nháp**, nút "Lưu" chung chốt cả hai

Đây là chỗ hai yêu cầu đá nhau: tên là dữ liệu **global**, nhưng nút Lưu hiện có là nút lưu đội hình
**của một ngày**. Cách xử lý:

- Ô nhập ghi vào một nháp riêng (`team-name-store.ts`), song song với nháp đội hình.
- Toolbar hợp nhất hai nguồn: `dirty = đội hình bẩn HOẶC tên bẩn`, `saving = 1 trong 2 đang bay`.
- Một cú bấm Lưu chạy **song song** hai mutation, và **chỉ gọi cái nào đang bẩn** (`Promise.all`) —
  đổi mỗi tên thì không đụng gì tới đội hình của ngày đang mở, và ngược lại.
- "Đặt lại" cũng xoá cả hai nháp.

Phương án bị loại: PUT ngay mỗi lần Enter/blur. Nó tạo ra cơ chế lưu thứ hai lệch với toàn màn hình
(ghi chú, kéo thả đều chờ nút Lưu), và mỗi lần sửa một chữ là một request.

**Hệ quả phải chấp nhận:** lưu tên là thao tác global nhưng được kích hoạt từ nút mang chữ "Lưu đội
hình cả ngày". Nút được đổi chữ thành **"Lưu"** để không nói dối.

### 5. Tương tác: double-click → input, Enter/blur chốt, Escape huỷ

- Header ở chế độ đọc là một `<button>` (không phải `<div onDoubleClick>`) — bàn phím phải tới được:
  Enter/Space trên button cũng mở ô nhập, đúng như double-click bằng chuột.
- Vào chế độ sửa thì `autoFocus` + `select()`, gõ đè luôn.
- Enter hoặc blur ⇒ chốt vào nháp. Escape ⇒ trả text về giá trị trước khi sửa rồi đóng.
- Tên rỗng / chỉ khoảng trắng ⇒ xoá khoá ⇒ header về lại số đội.
- `maxLength={TEAM_NAME_MAX_LENGTH}` chặn ngay khi gõ, không để Zod báo lỗi sau lưng — giống
  `SlotNoteInput`.
- Tuần cũ / trận đã đánh (`readOnly`) thì header không sửa được. Về lý thì tên là global nên sửa lúc
  nào cũng được, nhưng cho sửa trong màn hình read-only sẽ khiến người dùng tưởng mình đang sửa đội
  hình của trận đã đóng. Thống nhất với `SlotNoteInput`: đọc thoải mái, không sửa.

### 6. Backdrop khi đang lưu

Nút Lưu đã có spinner, nhưng nó nằm tít trên toolbar còn mắt người dùng đang ở lưới. Trong lúc lưu,
phủ lên **lưới** một lớp `bg-background/60` + spinner + chữ "Đang lưu đội hình...". Lớp phủ này vừa
là tín hiệu chờ, vừa chặn luôn thao tác kéo–thả/gõ giữa chừng.

## Ngoài phạm vi

- Không đổi bố cục lưới, không cho thêm/bớt đội.
- Không có lịch sử đổi tên, không hiển thị ai đổi.
- Không đụng tới quyền: vẫn admin-only như cả module team-builder.
