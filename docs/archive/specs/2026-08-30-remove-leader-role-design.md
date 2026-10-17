# Gỡ vai trò LEADER khỏi hệ thống — Design

Ngày: 2026-08-30 · Phạm vi: `packages/shared` + `apps/api` (kèm `prisma/schema.prisma`) + `apps/web`
+ tài liệu sống.

`GuildRole` hiện có ba giá trị: `ADMIN`, `LEADER`, `MEMBER`. LEADER ("Cán bộ") được thiết kế để **nhìn
thấy cả bang mà không sửa được gì** — một vai trò chỉ để nhắc nhở người chưa điểm danh. Trong thực tế
bang không dùng tới nó: người cần nhìn cả bang thì đằng nào cũng là admin.

Spec này gỡ LEADER hoàn toàn. Sau thay đổi chỉ còn hai vai trò và một ranh giới quyền duy nhất.

## Bối cảnh

- [discord-oauth-diem-danh](./2026-08-24-discord-oauth-diem-danh-design.md) — nơi `GuildRole` ra đời,
  cùng hai hàm quyền `canViewAllAttendance` và `canManageGuild`. Spec đó vẫn là bản ghi lịch sử đúng
  của quyết định tại thời điểm ấy và **không bị sửa lại**.

Hình dạng quyền hiện tại (`packages/shared/lib/permissions.ts`):

| | MEMBER | LEADER | ADMIN |
|---|---|---|---|
| `canViewAllAttendance` | ✗ | ✓ | ✓ |
| `canManageGuild` | ✗ | ✗ | ✓ |

## Quyết định thiết kế

### 1. Hai vai trò, một ranh giới quyền

Bỏ LEADER thì cột giữa của bảng trên biến mất, và hai hàm quyền trở thành **cùng một vị từ**: chỉ
ADMIN mới true.

Giữ lại hai hàm cùng thân là bịa ra một sự phân biệt không tồn tại — người đọc sẽ tưởng có vai trò nào
đó chỉ-xem. Vì vậy `canViewAllAttendance` **bị xoá**, mọi call site chuyển sang `canManageGuild`.

Đánh đổi đã cân nhắc: nếu sau này bang muốn lại một vai trò chỉ-xem thì phải tách hàm ra lần nữa. Đó
là công việc nhỏ, và YAGNI thắng: giữ một trừu tượng cho một vai trò không tồn tại đắt hơn.

Bảng quyền sau thay đổi:

| | MEMBER | ADMIN |
|---|---|---|
| `canManageGuild` — xem cả bang, sửa thành viên/lịch/đội hình, điểm danh hộ, vượt deadline | ✗ | ✓ |

Ba nơi tiêu thụ quyền không đổi hành vi với MEMBER và ADMIN: `AdminGuard` (API), `access.ts` +
`proxy.ts` (web), và `AttendanceService.getCharacters/getRecords/mark`.

### 2. Dữ liệu cũ hạ xuống MEMBER, không lên ADMIN

Character đang mang `role = 'LEADER'` trong database được `UPDATE` thành `MEMBER` **trước khi** giá trị
enum biến mất.

Chọn MEMBER chứ không phải ADMIN vì migration không được âm thầm cấp quyền quản trị cho ai. Ai thật sự
cần quyền admin thì một admin bật tay trên màn `/thiet-lap` — hành động có chủ ý, nhìn thấy được, thay
vì một tác dụng phụ của lần deploy.

Đây là **migration phá huỷ** theo đúng định nghĩa trong `CLAUDE.md`: Prisma sinh ra khối đổi type chứ
không sinh bước chuyển dữ liệu, nên câu `UPDATE` phải viết tay và đứng đầu file migration.

```sql
-- Vai trò LEADER bị gỡ: hạ mọi cán bộ cũ xuống MEMBER trước khi giá trị enum biến mất.
UPDATE "Character" SET "role" = 'MEMBER' WHERE "role" = 'LEADER';
-- (tiếp theo là khối AlterEnum Prisma sinh: CREATE TYPE "GuildRole_new" AS ENUM ('ADMIN', 'MEMBER'); …)
```

`'MEMBER'` là giá trị đã tồn tại từ trước nên câu `UPDATE` chạy an toàn trong cùng transaction với
khối đổi type. Khối đó phải kết thúc bằng `SET DEFAULT 'MEMBER'` vì cột `role` có default.

Migration cũ `20260824013748_discord_login` **không sửa**: lịch sử migration là bất biến, ở đó
`GuildRole` vẫn có ba giá trị và điều đó đúng với thời điểm nó chạy.

### 3. Enum thu về hai giá trị ở cả hai nguồn

`packages/shared/enums/role.enum.ts` là nguồn sự thật đi qua network (JWT, `/auth/me`), còn
`prisma/schema.prisma` là nguồn sự thật của database. Hai chỗ phải khớp nhau, như comment trong schema
đã ghi.

`GUILD_ROLE_LABEL` bỏ dòng `"Cán bộ"`; `GUILD_ROLE_OPTIONS` còn `[MEMBER, ADMIN]`. Dropdown cột
**Quyền** ở `/thiet-lap` đọc thẳng hai hằng này nên tự co lại — không sửa `member-row.tsx`.

### 4. TypeScript là lưới an toàn

Không cần rà tay từng chỗ dùng: xoá một thành viên enum và một hàm export khiến mọi tham chiếu còn sót
thành lỗi biên dịch. Quy trình là sửa `packages/shared`, chạy `pnpm --filter @guild/shared build`, rồi
đi theo danh sách lỗi.

### 5. Tài liệu: sửa cái đang sống, giữ cái đang ghi lịch sử

- **Sửa**: `docs/architecture.md`, `docs/production.md`, `docs/development.md`, comment/JSDoc trong
  code — chúng mô tả hệ thống *hiện tại*, để lại chữ LEADER là nói sai.
- **Giữ nguyên**: `docs/superpowers/specs`, `docs/custom-spec`, `docs/custom-plan` — chúng ghi lại
  *đã quyết định gì, khi nào*. Viết lại chúng sẽ xoá mất lý do vì sao LEADER từng tồn tại.

Riêng `docs/production.md` mô tả `DISCORD_ADMIN_IDS` là "the guild leader's Discord ID" — chữ "leader"
ở đây là nghĩa đời thường (bang chủ), nhưng sau khi vai trò biến mất nó dễ bị đọc nhầm, nên đổi thành
"the guild admin's Discord ID".

## Ngoài phạm vi

- Không đổi cách `DISCORD_ADMIN_IDS` hoạt động: các ID cứu hộ vẫn luôn đăng nhập thành `ADMIN`.
- Không đổi luật deadline, không đổi endpoint nào, không đổi wire format nào ngoài tập giá trị hợp lệ
  của `role`.
- Không thêm màn hình hay cơ chế nào để cấp quyền — việc đó đã có sẵn ở cột **Quyền** của `/thiet-lap`.
