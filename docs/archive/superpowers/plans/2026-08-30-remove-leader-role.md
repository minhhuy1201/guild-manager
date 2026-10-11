# Gỡ vai trò LEADER khỏi hệ thống — Implementation Plan

**Goal:** `GuildRole` chỉ còn `ADMIN` và `MEMBER`; `canViewAllAttendance` biến mất, mọi nơi dùng
`canManageGuild`; Character đang là LEADER trong database được hạ xuống MEMBER bằng một migration
viết tay; tài liệu sống không còn nhắc tới vai trò này.

**Architecture:** Đổi từ **nguồn sự thật ra ngoài**. `packages/shared` giữ enum và hàm quyền đi qua
network; xoá ở đó xong thì TypeScript chỉ ra chính xác mọi chỗ còn sót ở `apps/api` và `apps/web`.
Database đi một đường riêng: `schema.prisma` + một migration có bước chuyển dữ liệu viết tay.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 (nestjs-zod) · Jest · Next.js App Router ·
Vitest · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-08-30-remove-leader-role-design.md](../specs/2026-08-30-remove-leader-role-design.md)

## Global Constraints

- Đây là refactor **xoá**, không phải tính năng mới: không viết test mới cho hành vi mới, mà **sửa test
  hiện có** cho khớp tập vai trò mới, trong cùng commit với code (quy ước repo).
- Lưới an toàn là trình biên dịch: sau mỗi bước, `pnpm --filter @guild/shared build` rồi đi theo danh
  sách lỗi TypeScript.
- Comment/JSDoc theo ngôn ngữ file đang sửa (API và web ở các file này là tiếng Anh).
- Không sửa file trong `docs/superpowers/specs` (trừ spec mới), `docs/custom-spec`, `docs/custom-plan`,
  và không sửa migration cũ.
- Nhánh `refactor/remove-leader-role`, mỗi task một commit, không dòng `Co-Authored-By`.
- Lệnh kiểm tra cuối: `pnpm --filter api test`, `pnpm --filter web test`, `pnpm --filter api build`,
  `pnpm --filter web build`.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/migrations/<timestamp>_go_vai_tro_leader/migration.sql` | Hạ LEADER → MEMBER rồi thu enum còn hai giá trị |

**Sửa**

| File | Đổi gì |
|---|---|
| `packages/shared/enums/role.enum.ts` | Xoá `LEADER`, nhãn "Cán bộ", phần tử trong `GUILD_ROLE_OPTIONS` |
| `packages/shared/lib/permissions.ts` | Xoá `canViewAllAttendance`, mở rộng JSDoc của `canManageGuild` |
| `packages/shared/schemas/character.schema.ts` | Comment `guildMemberSchema` không còn nhắc "leaders" |
| `apps/api/prisma/schema.prisma` | Enum `GuildRole` còn `ADMIN`, `MEMBER` |
| `apps/api/src/modules/attendance/attendance.service.ts` | Hai call site + JSDoc + comment nội bộ |
| `apps/api/src/modules/attendance/attendance.controller.ts` | JSDoc của `mark` |
| `apps/web/features/attendance/components/attendance-screen.tsx` | Một biến `isAdmin` duy nhất + JSDoc |
| `apps/web/app/xep-team/page.tsx`, `apps/web/app/thiet-lap/page.tsx` | Comment về token hợp lệ |
| 6 file test (xem Task 4) | Bỏ mọi tham chiếu `GuildRole.LEADER` |
| `docs/architecture.md`, `docs/production.md`, `docs/development.md` | Rà và sửa mô tả vai trò |

---

## Task 1 — `packages/shared`: thu enum và gộp hàm quyền

1. `enums/role.enum.ts`: xoá `LEADER = "LEADER"`, xoá `[GuildRole.LEADER]: "Cán bộ"`, `GUILD_ROLE_OPTIONS`
   còn `[GuildRole.MEMBER, GuildRole.ADMIN]`. Sửa JSDoc của `ADMIN`/`MEMBER` cho khớp hai vai trò.
2. `lib/permissions.ts`: xoá cả hàm `canViewAllAttendance` và JSDoc của nó. `lib/index.ts` dùng
   `export *` nên không phải sửa.
3. `schemas/character.schema.ts`: comment "so leaders cannot read the whole guild's Discord IDs" →
   nói về màn điểm danh thay vì vai trò.
4. JSDoc `canManageGuild` phải nêu rõ nó **là** ranh giới duy nhất: xem cả bang, quản trị, điểm danh
   hộ, vượt deadline.

**Verify:** `pnpm --filter @guild/shared build` xanh.

**Commit:** `refactor(shared): drop the LEADER role and fold canViewAllAttendance into canManageGuild`

## Task 2 — Database: schema + migration có bước chuyển dữ liệu

1. `apps/api/prisma/schema.prisma`: enum `GuildRole { ADMIN MEMBER }`.
2. `pnpm --filter api prisma:migrate` với tên `go_vai_tro_leader` (chạy trên DB local, `apps/api/.env`).
3. **Sửa tay** file SQL sinh ra — thêm lên đầu file, trước khối `AlterEnum`:

```sql
-- Vai trò LEADER bị gỡ: hạ mọi cán bộ cũ xuống MEMBER trước khi giá trị enum biến mất.
UPDATE "Character" SET "role" = 'MEMBER' WHERE "role" = 'LEADER';
```

4. Kiểm khối Prisma sinh ra đủ chuỗi: `DROP DEFAULT` → `ALTER COLUMN "role" TYPE "GuildRole_new"` →
   rename type → `DROP TYPE` cũ → `SET DEFAULT 'MEMBER'`. Thiếu `SET DEFAULT` thì thêm.
5. Nếu Prisma đã apply migration trước khi ta chèn câu `UPDATE`, reset DB local rồi apply lại để chắc
   chắn file SQL cuối cùng chạy được từ đầu.

**Verify:** `psql` (hoặc `prisma studio`) chạy
`select role, count(*) from "Character" group by role;` — không còn LEADER, tổng số hàng không đổi.

**Commit:** `refactor(api): drop LEADER from the GuildRole enum, demoting existing leaders to member`

## Task 3 — Call site ở `apps/api` và `apps/web`

Chạy `pnpm --filter @guild/shared build` rồi để lỗi TypeScript dẫn đường.

- `attendance.service.ts`: bỏ `canViewAllAttendance` khỏi import. `getCharacters` dùng
  `canManageGuild(actor.role)`; `getRecords` đổi `seesEveryone` → `isAdmin` (tên biến phải nói đúng
  vị từ nó giữ). JSDoc "The whole guild for leaders/admins" → "for admins"; comment "must not hand to
  leaders" → "must not hand to members"; "Members and leaders may only mark…" → "Members may only mark…".
- `attendance.controller.ts`: cùng câu JSDoc đó ở `mark`.
- `attendance-screen.tsx`: chỉ import `canManageGuild`, tính một `const isAdmin` dùng cho cả early
  return lẫn `<AttendanceGrid isAdmin={isAdmin} />`. Sửa JSDoc đầu file.
- `app/xep-team/page.tsx`, `app/thiet-lap/page.tsx`: comment "leader and member tokens are valid too"
  → "member tokens are valid too".
- `member-row.tsx`, `admin.guard.ts`, `access.ts`: **không sửa** — chúng đọc hằng/hàm đã đổi.

**Verify:** `pnpm --filter api build`, `pnpm --filter web build` xanh.

**Commit:** `refactor(api,web): read guild-wide access off canManageGuild`

## Task 4 — Test

| File | Đổi gì |
|---|---|
| `apps/api/src/__tests__/permissions.spec.ts` | Xoá cả block `canViewAllAttendance`; block `canManageGuild` còn `MEMBER=false`, `ADMIN=true` |
| `apps/api/src/common/guards/__tests__/admin.guard.spec.ts:32` | Vòng lặp còn `[GuildRole.MEMBER]` |
| `apps/web/features/auth/core/__tests__/access.test.ts:17` | Vòng lặp còn `[GuildRole.MEMBER]` |
| `apps/api/src/modules/auth/__tests__/auth.service.spec.ts:252,263` | `LEADER` chỉ là giá trị bất kỳ chứng minh role đi qua nguyên vẹn → `ADMIN` |
| `apps/api/src/modules/characters/__tests__/characters.service.spec.ts:198,203` | Như trên → `ADMIN` |

`apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts` — xoá fixture `LEADER`, rồi
chuyển từng case theo **ý nghĩa nó đang khẳng định**, không chuyển đồng loạt:

- `getCharacters` "cán bộ nhận cả bang, đã lược danh tính Discord" → fixture `ADMIN`, tên test đổi
  thành "quản trị viên nhận cả bang…". Đây là case duy nhất chứng minh nhánh xem-cả-bang **có lược
  Discord ID**, phải giữ.
- `getRecords` "chỉ đọc record của các trận trong tuần đang mở" và "dựng record qua codec" → fixture
  `ADMIN` (chúng cần nhánh xem-cả-bang, không cần vai trò cụ thể).
- "cán bộ điểm danh hộ người khác thì bị chặn" → fixture `MEMBER`, tên đổi thành "bang chúng điểm danh
  hộ người khác thì bị chặn". **Không xoá**: đây là case duy nhất phủ nhánh `ForbiddenException` khi
  người không phải admin điểm danh hộ.

**Verify:** `pnpm --filter api test`, `pnpm --filter web test` xanh.

**Commit:** `test: drop the LEADER role from the role fixtures`

## Task 5 — Tài liệu

- `docs/architecture.md`: rà mô tả `Character` (~dòng 292) và phần auth (~189-190, ~276) — chỉ được
  nhắc `ADMIN`/`MEMBER`.
- `docs/production.md:77`: "The guild leader's Discord ID" → "The guild admin's Discord ID".
- `docs/development.md`: rà `role`/seed, sửa nếu có nhắc LEADER.
- Không đụng spec/plan lịch sử.

**Verify:**
`grep -rn "LEADER\|Cán bộ\|leader" --include="*.ts" --include="*.tsx" --include="*.prisma" --include="*.md" . | grep -v node_modules`
— chỉ còn trúng migration `20260824013748_discord_login`, spec `2026-08-24-discord-oauth-diem-danh`,
và hai file spec/plan của chính lần thay đổi này.

**Commit:** `docs: describe the two remaining guild roles`

---

## Verification cuối

1. `pnpm --filter @guild/shared build && pnpm --filter api test && pnpm --filter web test`.
2. `pnpm --filter api build && pnpm --filter web build`.
3. `select role, count(*) from "Character" group by role;` trên DB local — chỉ còn ADMIN/MEMBER.
4. Chạy app: MEMBER đăng nhập chỉ thấy nhân vật mình và không điểm danh hộ được; ADMIN thấy cả bang,
   sửa được, và cột **Quyền** ở `/thiet-lap` chỉ còn `Bang chúng / Quản trị`.
5. PR theo `.github/pull_request_template.md`; merge vào `main` sẽ chạy migration production **trước**
   khi deploy — đúng thứ tự cần thiết vì code mới không hiểu giá trị `LEADER`.
