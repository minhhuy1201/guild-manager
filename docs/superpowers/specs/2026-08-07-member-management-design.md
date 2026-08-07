# Quản lý thành viên — Design

Ngày: 2026-08-07 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Màn **Thiết lập** hiện chỉ có phần lịch đánh. Spec này chia nó thành hai tab — **"Thiết lập trận
đánh"** (giữ nguyên) và **"Quản lý thành viên"** (mới) — và thêm CRUD thành viên cho quản trị viên:
thêm người mới bằng Tên + Lưu phái, hệ thống tự sinh id và mật khẩu điểm danh, xem lại và copy được
mật khẩu bất cứ lúc nào.

## Bối cảnh

Danh sách thành viên hiện chỉ vào được database qua `prisma/seed.ts`. Muốn thêm một người là phải
sửa code và chạy lại seed. Mật khẩu điểm danh cũng nằm trong file seed đó.

`Character` hiện có: `id` (ghi chú là "ID trong game", dùng luôn làm khoá chính), `name`,
`guildClass`, `passwordHash` (scrypt + salt).

## Quyết định thiết kế

### 1. Mật khẩu lưu plaintext, bỏ hash

Yêu cầu là quản trị viên **xem lại được** mật khẩu của từng thành viên và copy để gửi cho họ. Hash
scrypt không đọc ngược được nên không đáp ứng được.

Chọn lưu thẳng plaintext thay vì mã hoá hai chiều: đây là mật khẩu điểm danh trong một công cụ nội
bộ của bang, không phải mật khẩu tài khoản. Kẻ lấy được nó cũng chỉ điểm danh hộ được — mà quản trị
viên vốn đã điểm danh hộ được cho mọi người, không cần mật khẩu. Thêm một lớp mã hoá + khoá trong
env chỉ để bảo vệ chừng đó là không đáng.

Quyết định này **ghi đè** quy tắc "Never store plaintext passwords" trong `AGENTS.md` cho riêng
`Character.password`. Mật khẩu đăng nhập quản trị viên (`ADMIN_PASSWORD`) không đổi gì.

Cột `passwordHash` đổi tên thành `password`. `apps/api/src/shared/utils/password.util.ts`
(`hashPassword` / `verifyPassword`) không còn ai dùng — xoá luôn.

### 2. Mật khẩu cũ của thành viên hiện có sẽ bị đổi

Hash không đọc ngược được nên migration không giữ lại được mật khẩu cũ. Migration ghi mật khẩu mới
sinh ngẫu nhiên cho mọi hàng đang có.

Dev: chạy lại `pnpm --filter api db:seed` là về lại `pass10001`… như cũ. Production: quản trị viên
vào tab mới, copy mật khẩu mới của từng người và báo lại cho họ.

### 3. `id` là khoá nội bộ, sinh tự động từ tên

Khái niệm "ID trong game" bị bỏ khỏi hệ thống — không nhập, không hiển thị ở đâu. `id` chỉ còn là
khoá chính, do backend sinh:

```
slugifyName(name) + "-" + 6 ký tự ngẫu nhiên     // "meo-beo-k7ma3x"
```

`slugifyName` bỏ dấu tiếng Việt, hạ chữ thường, thay mọi ký tự không phải `[a-z0-9]` bằng `-`, gộp
`-` liên tiếp và cắt `-` ở hai đầu. Tên toàn ký tự không slug hoá được (ví dụ tên thuần chữ Hán) thì
prefix fallback là `thanh-vien`.

Prefix chỉ để nhìn vào database còn đoán được là ai; phần ngẫu nhiên mới là thứ đảm bảo duy nhất.
Đổi tên thành viên **không** đổi id — id đứng yên vì mọi bảng khác trỏ vào nó.

25 nhân vật hiện có **giữ nguyên** id `10001`… Không migrate id: id chỉ là khoá, không ai đọc, và
`AttendanceRecord` / `FormationSlot` đang trỏ vào chúng.

### 4. Mật khẩu sinh ngẫu nhiên, không tự gõ

8 ký tự từ bảng chữ cái `abcdefghijkmnpqrstuvwxyz23456789` — bỏ `0/o`, `1/l` để đọc/gõ lại không
nhầm. Sinh bằng `randomInt` của `node:crypto`.

Quản trị viên không tự đặt mật khẩu; muốn đổi thì bấm **"Cấp lại mật khẩu"** để sinh lại. Bớt được
một ô nhập và một nhánh validate, mà nhu cầu đặt mật khẩu theo ý mình thì không có.

### 5. Xoá là xoá thẳng

`AttendanceRecord` và `FormationSlot` đã đặt `onDelete: Cascade`, nên xoá một thành viên là mất toàn
bộ lịch sử điểm danh và các ô đã xếp team của người đó, kể cả tuần cũ. Chấp nhận: người đã rời bang
thì lịch sử của họ cũng không còn để làm gì.

Không thêm cột `isActive` / xoá mềm — sẽ phải sửa thêm query ở `attendance` và `team-builder`, đổi
lấy một khả năng chưa ai cần. Dialog xác nhận nêu rõ hậu quả là đủ.

### 6. Module `characters` tách khỏi `attendance`

`attendance` là luồng công khai (thành viên tự điểm danh, không đăng nhập). CRUD thành viên là luồng
quản trị. Trộn hai thứ vào một module sẽ khiến một controller vừa có endpoint mở vừa có endpoint
khoá — dễ gắn nhầm guard.

`GET /api/attendance/characters` **giữ nguyên** (danh sách rút gọn, không kèm mật khẩu) — màn điểm
danh công khai vẫn dùng nó.

## Thay đổi dữ liệu

```prisma
model Character {
  /// Khoá chính do hệ thống sinh: slug tên + hậu tố ngẫu nhiên ("meo-beo-k7ma3x").
  id         String     @id
  name       String
  guildClass GuildClass
  /// Mật khẩu điểm danh dạng plaintext — quản trị viên cấp và xem lại được.
  password   String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  ...
}
```

Migration gồm hai câu:

```sql
ALTER TABLE "Character" RENAME COLUMN "passwordHash" TO "password";

UPDATE "Character" SET "password" = (
  SELECT string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', floor(random() * 32)::int + 1, 1), '')
  FROM generate_series(1, 8)
);
```

Câu `UPDATE` chạy lại subquery cho từng hàng nên mỗi người một mật khẩu khác nhau, cùng bảng chữ cái
với `generatePassword` ở mục 4.

`prisma/seed.ts` ghi thẳng `password` plaintext, bỏ `hashPassword`.

## API

Tất cả bọc `JwtAuthGuard` — chỉ quản trị viên.

| Method | Path | Body | Trả về |
|---|---|---|---|
| `GET` | `/api/characters` | — | `MemberEntity[]` (có `password`), sắp theo `name` |
| `POST` | `/api/characters` | `{ name, guildClass }` | `MemberEntity` vừa tạo |
| `PATCH` | `/api/characters/:id` | `{ name?, guildClass? }` | `MemberEntity` sau khi sửa |
| `POST` | `/api/characters/:id/password` | — | `MemberEntity` với mật khẩu mới |
| `DELETE` | `/api/characters/:id` | — | `204` |

`MemberEntity` = `{ id, name, guildClass, password }` — đặt tên khác `CharacterEntity` của module
`attendance` (bản rút gọn, không có mật khẩu) để không nhầm hai thứ.

`PATCH` và `DELETE` với id không tồn tại → `404` "Không tìm thấy thành viên.".

### Cấu trúc file

```
apps/api/src/modules/characters/
├── characters.module.ts
├── characters.controller.ts
├── characters.service.ts
├── characters.lib.ts              # slugifyName, generatePassword — hàm thuần
├── dto/
│   ├── create-character.dto.ts
│   └── update-character.dto.ts
├── entities/character.entity.ts
└── __tests__/
    ├── characters.lib.spec.ts
    └── characters.service.spec.ts
```

Flow Controller → Service → Prisma, không thêm lớp repository (các module hiện có cũng không có).

Tạo mới: sinh id, `create`; nếu Prisma báo trùng khoá chính (`P2002`) thì sinh lại id và thử một lần
nữa, lần hai hỏng thì để lỗi nổi lên.

### Schema dùng chung

`packages/shared/schemas/character.schema.ts`:

```ts
createCharacterSchema = z.object({
  name: z.string().trim().min(1).max(50),
  guildClass: z.nativeEnum(GuildClass),
});
updateCharacterSchema = createCharacterSchema.partial();
```

Tên **không** ràng buộc duy nhất — trong game trùng tên vẫn được, id mới là thứ phân biệt.

## Frontend

### Chia tab

- `features/settings/components/settings-tabs.tsx` — client component, dùng `Tabs` của shadcn (đã
  có sẵn ở `components/ui/tabs.tsx`). Tab **"Thiết lập trận đánh"** render `SettingsScreen` hiện tại
  (không sửa gì), tab **"Quản lý thành viên"** render `MembersPanel` import qua
  `@/features/members`. Mặc định mở tab đầu. Trạng thái tab là `useState` — không đưa vào URL,
  không Zustand.
- `app/thiet-lap/page.tsx` đổi từ render `SettingsScreen` sang `SettingsTabs`. Kiểm tra session
  giữ nguyên.

### Feature `features/members`

```
apps/web/features/members/
├── index.ts                       # public API: MembersPanel
├── api/
│   ├── members-api.ts             # apiFetch, theo khuôn battle-sessions-api.ts
│   └── members-keys.ts
├── hooks/
│   ├── use-members.ts             # useQuery danh sách
│   └── use-member-mutations.ts    # create / update / resetPassword / delete
└── components/
    ├── members-panel.tsx
    ├── member-row.tsx
    ├── member-form-dialog.tsx
    └── delete-member-dialog.tsx
```

Mọi mutation `invalidateQueries` key danh sách.

**`members-panel.tsx`** — ô tìm theo tên (lọc client-side; cả bang vài chục người nên không phân
trang, không tìm phía server), nút "Thêm thành viên", `Table` shadcn với cột Tên · Lưu phái · Mật
khẩu · thao tác. Skeleton lúc chờ và `ErrorState` kèm nút thử lại, giống `SettingsScreen`.

**`member-row.tsx`** — ô mật khẩu mặc định hiện `••••••••` với icon con mắt để hiện/ẩn (state cục bộ
từng hàng, để share màn hình không phơi cả bang) và icon copy dùng `navigator.clipboard`; copy xong
icon đổi thành dấu tích ~1.5s rồi trở lại. Hai nút Sửa / Xoá.

**`member-form-dialog.tsx`** — một dialog dùng cho cả thêm và sửa (theo khuôn
`session-form-dialog.tsx`): ô Tên + `Select` lưu phái. Ở chế độ sửa có thêm nút "Cấp lại mật khẩu"
với một bước xác nhận; xong thì mật khẩu mới hiện ngay ở bảng. Ở chế độ thêm, tạo thành công thì
dialog chuyển sang trạng thái kết quả hiển thị **Tên + mật khẩu** kèm nút copy; đóng lại là thôi,
không hiện lại lần hai (vẫn xem lại được ở bảng).

**`delete-member-dialog.tsx`** — xác nhận, nêu rõ sẽ mất toàn bộ lịch sử điểm danh và đội hình đã
xếp của người đó.

Toàn bộ text hiển thị bằng tiếng Việt.

## Kiểm thử

Backend (Jest, theo khuôn `attendance.service.spec.ts`):

- `characters.lib.spec.ts` — `slugifyName` bỏ dấu tiếng Việt, thay khoảng trắng và ký tự lạ, fallback
  `thanh-vien` khi không còn ký tự nào; `generatePassword` đúng 8 ký tự và chỉ dùng bảng chữ cái đã
  chọn.
- `characters.service.spec.ts` — tạo thì id mang prefix từ tên và trả về mật khẩu; sinh lại id khi
  đụng khoá chính; sửa chỉ đổi trường được gửi; cấp lại mật khẩu ra giá trị khác cũ; xoá và sửa với
  id không tồn tại thì ném `NotFoundException`.
- `attendance.service.spec.ts` sửa lại cho khớp việc bỏ hash (so sánh plaintext).

Frontend: không thêm test component — dự án chưa có tiền lệ; `features/settings/lib/__tests__` chỉ
test hàm thuần, và feature này không sinh ra hàm thuần nào đáng test riêng.

## Ngoài phạm vi

- Phân quyền nhiều mức cho quản trị viên (mọi admin vẫn toàn quyền như hiện tại).
- Nhập/xuất danh sách thành viên hàng loạt.
- Xoá mềm / lưu trữ thành viên đã rời bang.
- Cho thành viên tự đổi mật khẩu.
