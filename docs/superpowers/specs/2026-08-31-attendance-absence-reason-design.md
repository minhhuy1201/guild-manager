# Lý do vắng khi điểm danh "Không" — Design

Ngày: 2026-08-31 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Điểm danh hiện chỉ có hai trạng thái: "Có" hoặc "Không". Người xếp team nhìn một ô "Không" thì không
biết đó là bận việc một hôm hay nghỉ dài, nên phải đi hỏi lại từng người.

Spec này thêm **một câu lý do đi kèm câu trả lời "Không"**: member gõ vào ô hiện ngay dưới nút
"Không" trên màn điểm danh của mình, Enter là lưu; lý do hiện lại cho cả bang ở màn Lịch sử điểm danh
và ở lưới điểm danh của admin.

## Bối cảnh

- [discord-oauth-diem-danh](./2026-08-24-discord-oauth-diem-danh-design.md) — mỗi tài khoản gắn với
  một `Character`; màn `/` chia hai nhánh theo vai: admin thấy `AttendanceGrid` (lưới cả bang), member
  thấy `MemberAttendanceCard` (tile theo ngày, chỉ nhân vật của mình).
- PR #26 (`37d8abb`) — `GET /attendance/characters` và `GET /attendance/records` **không còn lọc theo
  vai**: ai đăng nhập cũng đọc được dữ liệu điểm danh của cả bang. Quyền **ghi** thì vẫn theo vai.

Hai điều đó quyết định spec này: lý do là dữ liệu chung (ai cũng đọc được, không cần endpoint mới),
nhưng chỉ chủ nhân của bản ghi mới ghi được nó.

## Quyết định thiết kế

### 1. `reason` là một cột nullable trên `AttendanceRecord`

```prisma
/// Why the member answered "Không". Null when isPresent = true, or when no reason was given.
reason String? @db.VarChar(255)
```

Lý do thuộc về **một câu trả lời của một người cho một ngày** — đúng hạt dữ liệu mà
`@@unique([characterId, sessionId])` đã mô tả. Không có bảng riêng: nó không có vòng đời riêng, không
có lịch sử, xoá bản ghi điểm danh thì lý do phải đi theo.

Cột nullable nên migration **không phá dữ liệu**: mọi hàng đang có nhận `null`, không cần bước chuyển
đổi viết tay như luật ở CLAUDE.md yêu cầu cho migration phá huỷ. Bảng đã tồn tại nên **không** phải
bật RLS lại (luật ở `20260825071500_bat_rls_cho_bang_moi` chỉ áp cho bảng mới).

`@db.VarChar(255)` chứ không phải `String` trơn: giới hạn 255 là một luật nghiệp vụ, và đặt nó ở
database nghĩa là không đường nào ghi lậu được một chuỗi dài hơn.

### 2. Không có endpoint mới — lý do đi chung `POST /attendance`

```jsonc
// POST /attendance ← { characterId, sessionId, isPresent: false, reason: "Bận đi công tác" }
```

```ts
// packages/shared/schemas/attendance.schema.ts
export const ATTENDANCE_REASON_MAX_LENGTH = 255;

// markAttendanceSchema
reason: z.string().trim().max(ATTENDANCE_REASON_MAX_LENGTH, "Lý do tối đa 255 ký tự.").nullish(),

// attendanceRecordSchema
reason: z.string().nullable(),
```

Lý do là **một phần của câu trả lời**, không phải một resource riêng, nên nó đi cùng đường ghi đã có:
một endpoint, một guard, một luật deadline. Thêm `PATCH /attendance/:id/reason` sẽ là đường ghi thứ
hai phải tự nhắc lại toàn bộ kiểm tra quyền — chỗ để hai đường lệch nhau.

**Hệ quả đã chấp nhận:** gửi lý do là một lần upsert đầy đủ, nên `markedAt` được đóng dấu lại. Cột
"Thời gian điểm danh" ở màn Lịch sử vì thế đọc là *lần cuối câu trả lời này được sửa* — vốn đã đúng
như vậy khi đổi "Có" ⇄ "Không".

`nullish()` chứ không phải `optional()`: client cần gửi được `null` để **xoá** lý do đã ghi.

### 3. Server quyết định `reason`, không tin client

Trong `AttendanceService.mark()`, ngay trước khi upsert:

- `isPresent === true` ⇒ ghi `reason: null`, kể cả khi body có gửi chuỗi. Đi đánh thì không còn lý do
  vắng; đây cũng là câu trả lời cho "đổi Không sang Có thì lý do cũ đi đâu".
- `isPresent === false` ⇒ lấy `reason` đã trim; chuỗi rỗng ⇒ `null`. "Bỏ trống" và "chưa từng nhập"
  là cùng một trạng thái, và chỉ có một cách biểu diễn nó.

Một hàm thuần `resolveReason(isPresent, reason)` giữ luật này ở đúng một chỗ, test được không cần
Prisma.

**Quyền ghi không đổi một dòng nào.** Member vẫn chỉ ghi được cho nhân vật của mình
(`NOT_YOUR_CHARACTER`), vẫn bị chặn khi quá hạn (409) và ngoài tuần đang mở (404). Nghĩa là **hết hạn
thì không sửa được lý do nữa** — nhất quán với chính câu trả lời mà nó giải thích. Admin bypass hạn
như cũ.

### 4. Ghi ở màn member, chỉ đọc ở hai màn còn lại

| Màn | Nhập | Xem |
|---|---|---|
| `MemberAttendanceCard` (`/`, member) | ✅ | ✅ nhân vật của mình |
| `AttendanceLogTable` (`/lich-su-diem-danh`) | ❌ | ✅ cả bang |
| `AttendanceGrid` (`/`, admin) | ❌ | ✅ cả bang |

Lưới admin **chỉ hiển thị**. Cho sửa ở đó buộc `AttendanceDraft` phải mang thêm chuỗi cho từng ô của
từng ngày, và mỗi lần Xác nhận lại phải so cả hai trường trên mọi cột — một cái giá lớn cho một việc
mà admin gần như không làm: lý do là lời của người vắng, admin không có gì để điền hộ.

### 5. Tương tác ở `MemberAttendanceCard`

Ô nhập nằm **trong tile của ngày đó**, ngay dưới nút "Không", chỉ hiện khi câu trả lời đã lưu là
"Không" (`current === false`) và ngày chưa quá hạn.

- Bấm "Không" ⇒ ghi ngay như hiện tại, rồi ô nhập mới hiện ra. Ô nhập **không chặn** việc điểm danh:
  người không muốn giải thích thì bỏ qua, bản ghi vẫn hợp lệ.
- Giá trị khởi tạo lấy từ `record.reason ?? ""`.
- **Enter** ⇒ gửi. **Escape** ⇒ trả về giá trị đã lưu rồi bỏ focus. **Blur không gửi** — rời ô là
  thao tác vô tình, không phải một quyết định; `TeamNameField` chốt khi blur vì nó chỉ ghi vào nháp,
  còn ở đây blur sẽ là một request.
- `maxLength={ATTENDANCE_REASON_MAX_LENGTH}` chặn ngay khi gõ, không để Zod báo lỗi sau lưng — giống
  `SlotNoteInput` và `TeamNameField`.
- Đang bay thì khoá ô và cả hai nút của ngày đó, đúng luật "một lần ghi tại một thời điểm" mà tile đang
  theo. Xong thì toast `Đã lưu lý do.`; lỗi thì toast lỗi và **giữ nguyên chữ đang gõ** để không mất
  công gõ lại.
- Ngày đã khoá ⇒ không có ô nhập, chỉ hiện lý do dạng chữ (nếu có).

### 6. Hiển thị ở hai màn đọc

- **`AttendanceLogTable`**: thêm cột **"Lý do"** đứng thứ tư, ngay trước "Thời gian điểm danh" — nó
  giải thích cột "Trạng thái" nên phải đứng cạnh. Ô rỗng hiện `—`. Chuỗi dài `truncate` kèm
  `title` để một câu 255 ký tự không kéo giãn bảng.
- **`AttendanceGrid`**: trong ô chỉ-đọc, lý do hiện thành dòng chữ nhỏ (`text-xs text-muted-foreground`,
  `truncate` + `title`) ngay dưới badge trạng thái. Ô đang sửa không hiện gì thêm: lúc đó admin đang
  chọn đáp án mới, chữ cũ chỉ gây nhiễu.

Không lọc, không tìm kiếm theo lý do — chưa có ai cần.

## Ngoài phạm vi

- Không có lý do cho câu trả lời "Có".
- Admin không sửa/xoá được lý do của người khác.
- Không lưu lịch sử các lần đổi lý do, không hiện ai sửa lần cuối.
- Không đụng vào `GET /attendance/summary` (đếm số, không mang danh tính).
- Không lọc/sắp xếp/tìm kiếm theo lý do.
