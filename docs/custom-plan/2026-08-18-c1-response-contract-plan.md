# C1 — Đưa chiều response vào contract · Kế hoạch triển khai

> **Cho người/agent thực thi:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc
> `superpowers:executing-plans` để chạy từng task. Các bước dùng cú pháp checkbox (`- [ ]`).

**Mục tiêu:** Đưa 8 shape response vào `packages/shared`, xoá mọi khai báo trùng ở `apps/api`
(`*.entity.ts`) và `apps/web` (`types/*.ts`), để mỗi shape đi qua mạng chỉ còn **một** định nghĩa.

**Kiến trúc:** Response schema viết bằng Zod, nằm cùng file với request schema của cùng domain
(`packages/shared/schemas/*.schema.ts`). Type suy ra bằng `z.infer`. **Không** parse response lúc
chạy ở cả hai đầu — đảm bảo bằng `satisfies <Type>` tại mỗi chỗ API dựng object literal, lỗi lệch
shape nổ ở `tsc` chứ không nổ lúc chạy.

**Tech stack:** Zod 4, NestJS 11 + Prisma (`apps/api`), Next.js 16 + TanStack Query (`apps/web`),
pnpm workspace, Jest (api) / Vitest (web).

**Spec:** [`docs/custom-spec/2026-08-18-c1-response-contract-design.md`](../custom-spec/2026-08-18-c1-response-contract-design.md)

## Global Constraints

- **Refactor giữ nguyên hành vi.** Không thêm/bớt field nào của response. Field mới là việc của C2b.
- **Không parse response lúc chạy** — không `schema.parse()` ở `toEntity()` của API, không truyền
  schema vào `apiFetch` ở web.
- **Không commit lên GitHub.** Tất cả commit là local, trên nhánh `refactor/response-contract`.
  Không `git push`, không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không có dòng attribution ở cuối.
- **Text hiển thị cho người dùng là tiếng Việt**; identifier, tên file, comment code là tiếng Anh
  hoặc giữ nguyên tiếng Việt như file gốc đang có (doc comment trong repo này đang là tiếng Việt —
  giữ nguyên nguyên văn khi chuyển sang schema).
- **`apps/api` không có path alias**: import nội bộ là đường dẫn tương đối, shared là
  `@guild/shared/enums` · `@guild/shared/schemas` · `@guild/shared/lib`.
- **`apps/web` dùng alias** `@/*` và `@shared/*` (khai ở cả `tsconfig.json` lẫn `vitest.config.ts`).
- **Sau mỗi lần sửa `packages/shared`**: `pnpm --filter @guild/shared build`.
- Giá trị `ADMIN_ROLE` thật trong repo là **`'ADMIN'`** (`apps/api/src/common/constants/auth.constant.ts:7`),
  **không phải** `"admin"` như đoạn ví dụ trong spec. Giữ nguyên `'ADMIN'` — đổi giá trị là đổi
  payload JWT đang lưu trong cookie của người dùng.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter @guild/shared build`
  - `pnpm --filter api typecheck` · `pnpm --filter api lint` · `pnpm --filter api test`
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `packages/shared/enums/role.enum.ts` | Hằng `ADMIN_ROLE` + type `Role` — đi qua mạng nên phải ở shared |
| `apps/web/features/attendance/lib/record-key.ts` | Hàm `recordKey()` — logic khoá map phía client, không phải shape trên dây |
| `apps/web/features/attendance/lib/__tests__/record-key.test.ts` | Test cho `recordKey()` sau khi chuyển chỗ |
| `apps/web/__tests__/character-contract.test.ts` | Khẳng định `characterSchema` đúng 3 field |

**Sửa**

| File | Việc |
|---|---|
| `packages/shared/enums/index.ts` | export thêm `role.enum` |
| `packages/shared/schemas/character.schema.ts` | thêm `characterSchema` / `Character` |
| `packages/shared/schemas/attendance.schema.ts` | thêm `attendanceRecordSchema` / `AttendanceRecord` |
| `packages/shared/schemas/battle-session.schema.ts` | thêm `battleSessionSchema` / `weekSchema` |
| `packages/shared/schemas/formation.schema.ts` | thêm `matchFormationSchema` / `sessionFormationSchema` / `formationWeekSchema` |
| `packages/shared/schemas/auth.schema.ts` | thêm `authUserSchema` / `authTokensSchema` |
| `apps/api/src/common/constants/auth.constant.ts` | re-export `ADMIN_ROLE` từ shared, `JwtPayload.role: Role` |
| `apps/api/src/modules/auth/{auth.service,auth.controller}.ts` | dùng `AuthTokens` / `AuthUser` |
| `apps/api/src/modules/characters/{characters.service,characters.controller,characters.module}.ts` | `MemberEntity` → `Character` |
| `apps/api/src/modules/attendance/{attendance.service,attendance.controller}.ts` | `CharacterEntity`/`AttendanceRecordEntity` → `Character`/`AttendanceRecord` |
| `apps/api/src/modules/battle-sessions/{battle-sessions.service,battle-sessions.controller,battle-sessions.module}.ts` | `BattleSessionEntity`/`WeekEntity` → `BattleSession`/`Week` |
| `apps/api/src/modules/team-builder/{team-builder.service,team-builder.controller}.ts` | `*Entity` → type từ shared |
| `apps/web/features/attendance/*` (7 file) | bỏ `types/attendance`, import từ `@shared/schemas` |
| `apps/web/features/members/*` (5 file) | `Member` → `Character` |
| `apps/web/features/settings/*` (7 file) | lấy `BattleSession`/`Week` từ `@shared/schemas` |
| `apps/web/features/team-builder/*` (9 file) | bỏ `Wire*`, lấy type từ `@shared/schemas` |
| `apps/web/features/auth/*` + `apps/web/proxy.ts` | `AuthTokens` từ shared |
| `docs/architecture.md`, `apps/api/CLAUDE.md` | bỏ `entities/` khỏi quy ước |

**Xoá**

- `apps/api/src/modules/characters/entities/character.entity.ts` (+ thư mục `entities/`)
- `apps/api/src/modules/attendance/entities/attendance.entity.ts` (+ thư mục)
- `apps/api/src/modules/battle-sessions/entities/battle-session.entity.ts` (+ thư mục)
- `apps/api/src/modules/team-builder/entities/formation.entity.ts` (+ thư mục)
- `apps/api/src/modules/auth/entities/auth.entity.ts` (+ thư mục)
- `apps/web/features/attendance/types/attendance.ts` (+ thư mục `types/`)
- `apps/web/features/members/types/member.ts` (+ thư mục `types/`)
- `apps/web/features/team-builder/types/session-formation.ts`
  (**giữ** `apps/web/features/team-builder/types/formation.ts` — đó là type nội bộ của màn hình,
  không đi qua mạng)

## Bảng đổi tên (tra cứu nhanh cho mọi task)

| Cũ (api) | Cũ (web) | Mới (`@guild/shared/schemas`) |
|---|---|---|
| `MemberEntity`, `CharacterEntity` | `Member`, `Character` | `Character` |
| `AttendanceRecordEntity` | `AttendanceRecord` | `AttendanceRecord` |
| `BattleSessionEntity` | `BattleSession` | `BattleSession` |
| `WeekEntity` | `Week` | `Week` |
| `MatchFormation` | `WireMatch` | `MatchFormation` |
| — | `WireAssignment` | `MatchFormation["slots"]` |
| — | `WireNotes` | `MatchFormation["notes"]` |
| `SessionFormationEntity` | `SessionFormation` | `SessionFormation` |
| `FormationWeekEntity` | `FormationWeek` | `FormationWeek` |
| `AuthUserEntity` | — | `AuthUser` |
| `AuthTokensEntity` | `AuthTokens` + `AuthTokensResponse` | `AuthTokens` |

---

### Task 0: Nhánh làm việc

**Files:** không có file nào bị sửa.

- [ ] **Bước 1: Kiểm tra nhánh hiện tại**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kỳ vọng: `main`, working tree sạch. Nếu bẩn, dừng lại và hỏi người dùng.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/response-contract
git rev-parse --abbrev-ref HEAD
```

Kỳ vọng: in ra `refactor/response-contract`.

---

### Task 1: `packages/shared` — enum `Role` và toàn bộ response schema

**Files:**
- Create: `packages/shared/enums/role.enum.ts`
- Modify: `packages/shared/enums/index.ts`
- Modify: `packages/shared/schemas/character.schema.ts`
- Modify: `packages/shared/schemas/attendance.schema.ts`
- Modify: `packages/shared/schemas/battle-session.schema.ts`
- Modify: `packages/shared/schemas/formation.schema.ts`
- Modify: `packages/shared/schemas/auth.schema.ts`

**Interfaces:**
- Produces (mọi task sau đều dùng): `Character`, `AttendanceRecord`, `BattleSession`, `Week`,
  `MatchFormation`, `SessionFormation`, `FormationWeek`, `AuthUser`, `AuthTokens` từ
  `@guild/shared/schemas`; `ADMIN_ROLE`, `Role` từ `@guild/shared/enums`.
- Không đụng gì tới các export sẵn có (`markAttendanceSchema`, `loginSchema`,
  `createBattleSessionSchema`, `createCharacterSchema`, `saveFormationSchema`, `NOTE_MAX_LENGTH`…) —
  tên và hành vi giữ nguyên tuyệt đối.

- [ ] **Bước 1: Tạo `packages/shared/enums/role.enum.ts`**

```ts
/**
 * Quyền của tài khoản. Đi qua mạng (nằm trong response `/auth/login`, `/auth/me`
 * và trong payload JWT) nên định nghĩa phải ở package dùng chung.
 */

/** Quyền duy nhất hiện có: toàn quyền quản trị. */
export const ADMIN_ROLE = "ADMIN";

/** Quyền hợp lệ của một tài khoản. */
export type Role = typeof ADMIN_ROLE;
```

- [ ] **Bước 2: Export nó ở `packages/shared/enums/index.ts`**

Thêm một dòng, giữ thứ tự alphabet:

```ts
export * from "./attendance.enum";
export * from "./guild-class.enum";
export * from "./role.enum";
```

- [ ] **Bước 3: Thêm `characterSchema` vào `packages/shared/schemas/character.schema.ts`**

Thêm vào **cuối file**, sau `UpdateCharacterInput`:

```ts
/**
 * Một nhân vật trong bang, đúng như API trả về.
 * Dùng chung cho `GET /characters` (màn quản trị) và `GET /attendance/characters`
 * (màn điểm danh công khai) — hai chỗ này trả về cùng một hàng của bảng Character.
 */
export const characterSchema = z.object({
  /** Khoá chính do hệ thống sinh. */
  id: z.string(),
  /** Tên hiển thị của nhân vật */
  name: z.string(),
  /** Lưu phái của nhân vật */
  guildClass: z.enum(GuildClass),
});

/** Kiểu nhân vật API trả về. */
export type Character = z.infer<typeof characterSchema>;
```

- [ ] **Bước 4: Thêm `attendanceRecordSchema` vào `packages/shared/schemas/attendance.schema.ts`**

Thêm vào cuối file:

```ts
/** Một lượt điểm danh của nhân vật ở một trận, đúng như API trả về. */
export const attendanceRecordSchema = z.object({
  /** ID nhân vật */
  characterId: z.string(),
  /** ID buổi đánh */
  sessionId: z.string(),
  /** Trạng thái Có/Không */
  status: z.enum(AttendanceStatus),
  /** Thời điểm điểm danh (ISO string) */
  markedAt: z.string(),
});

/** Kiểu một lượt điểm danh API trả về. */
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
```

- [ ] **Bước 5: Thêm `battleSessionSchema` và `weekSchema` vào `packages/shared/schemas/battle-session.schema.ts`**

Thêm vào cuối file. Dùng lại `isoDateTime` đang có ở đầu file (dòng 4) cho chiều response:

```ts
/** Một trận đánh API trả về, thời gian ở dạng ISO string. */
export const battleSessionSchema = z.object({
  id: z.string(),
  /** Nhãn hiển thị suy ra từ giờ đánh, ví dụ "Thứ 3 · 20:30". Không lưu trong database. */
  label: z.string(),
  dateTime: isoDateTime,
  /** Hạn chót điểm danh do quản trị viên đặt. */
  deadline: isoDateTime,
  isGuildWar: z.boolean(),
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ. */
  opponent: z.string().nullable(),
  /** Mốc Thứ 2 00:00 của tuần chứa trận này. */
  weekStart: isoDateTime,
  /** Số lượt điểm danh đã ghi — dialog xoá cần con số này. */
  attendanceCount: z.number(),
  /** Trận này đã có đội hình xếp sẵn hay chưa. */
  hasFormation: z.boolean(),
});

/** Một tuần điểm danh API trả về. */
export const weekSchema = z.object({
  /** Thứ 2 00:00 (ISO string) */
  weekStart: isoDateTime,
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: isoDateTime,
  /** Có phải tuần đang mở không (phần tử còn lại là tuần kế tiếp) */
  isActive: z.boolean(),
});

/** Kiểu một trận đánh API trả về. */
export type BattleSession = z.infer<typeof battleSessionSchema>;

/** Kiểu một tuần điểm danh API trả về. */
export type Week = z.infer<typeof weekSchema>;
```

> **Chú ý `opponent`:** dùng `.nullable()` chứ **không** `.optional()` — API luôn gửi field này, giá
> trị `null`. Đây là chỗ khác biệt cố ý với biến `opponent` của chiều request (dòng 14-19), vốn có
> `.trim().max(100).nullable().optional()` vì client được phép bỏ trống field.

- [ ] **Bước 6: Thêm 3 schema vào `packages/shared/schemas/formation.schema.ts`**

Thêm vào cuối file:

```ts
/**
 * Đội hình và ghi chú của một trận, đúng như API trả về.
 * Ô trống KHÔNG có khoá, ô không ghi gì cũng KHÔNG có khoá — giống hệt chiều gửi lên.
 * Khác `matchSchema` ở chỗ không mang ràng buộc độ dài: chiều ra không validate,
 * schema này chỉ để suy ra kiểu.
 */
export const matchFormationSchema = z.object({
  /** slotId → characterId. Ô trống không có khoá. */
  slots: z.record(z.string(), z.string()),
  /** slotId → ghi chú. Ô không ghi gì không có khoá. */
  notes: z.record(z.string(), z.string()),
});

/** Một trận kèm đội hình đã lưu của nó, đúng như API trả về. */
export const sessionFormationSchema = z.object({
  /** ID trận đánh */
  sessionId: z.string(),
  /** Nhãn hiển thị của trận, ví dụ "Thứ 7 · Guild War" */
  label: z.string(),
  /** Thời điểm đánh (ISO string) */
  dateTime: z.string(),
  /** Trận Guild War Thứ 7 */
  isGuildWar: z.boolean(),
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: z.string().nullable(),
  /** Trận đã đánh xong — không cho sửa đội hình nữa */
  locked: z.boolean(),
  /**
   * Từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì và cũng chưa ghi chú gì.
   */
  matches: z.array(matchFormationSchema),
});

/** Một tuần còn dữ liệu đội hình. */
export const formationWeekSchema = z.object({
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: z.string(),
  /**
   * Tuần điểm danh đang mở. Danh sách còn có cả tuần kế tiếp — tuần đầu mảng
   * KHÔNG phải tuần đang mở, nên client phải đọc cờ này.
   */
  isActive: z.boolean(),
});

/** Kiểu đội hình một trận API trả về. */
export type MatchFormation = z.infer<typeof matchFormationSchema>;

/** Kiểu một ngày đánh kèm đội hình API trả về. */
export type SessionFormation = z.infer<typeof sessionFormationSchema>;

/** Kiểu một tuần còn dữ liệu đội hình. */
export type FormationWeek = z.infer<typeof formationWeekSchema>;
```

- [ ] **Bước 7: Thêm `authUserSchema` và `authTokensSchema` vào `packages/shared/schemas/auth.schema.ts`**

Sửa dòng import ở đầu file thành:

```ts
import { z } from "zod";

import { ADMIN_ROLE } from "../enums/role.enum";
```

Rồi thêm vào cuối file:

```ts
/** Thông tin tài khoản API trả về — không bao giờ chứa mật khẩu. */
export const authUserSchema = z.object({
  /** Tên đăng nhập đã chuẩn hóa chữ thường */
  username: z.string(),
  /** Quyền của tài khoản */
  role: z.literal(ADMIN_ROLE),
});

/** Cặp token phát ra sau khi đăng nhập hoặc refresh thành công. */
export const authTokensSchema = z.object({
  /** Token dùng cho các request cần xác thực (hạn 1 ngày) */
  accessToken: z.string(),
  /** Token dùng để xin cặp token mới (hạn 1 tuần) */
  refreshToken: z.string(),
  /** Tài khoản ứng với cặp token này */
  user: authUserSchema,
});

/** Kiểu thông tin tài khoản API trả về. */
export type AuthUser = z.infer<typeof authUserSchema>;

/** Kiểu cặp token API trả về. */
export type AuthTokens = z.infer<typeof authTokensSchema>;
```

- [ ] **Bước 8: Build package và kiểm tra type suy ra**

```bash
pnpm --filter @guild/shared build
```

Kỳ vọng: không lỗi. Kiểm tra nhanh giá trị/kiểu đã đúng:

```bash
node -e "const s=require('./packages/shared/dist/schemas/index.js'); console.log(Object.keys(s.characterSchema.shape), Object.keys(s.battleSessionSchema.shape).length, s.authUserSchema.shape.role.def.values ?? s.authUserSchema.shape.role.value)"
```

Kỳ vọng: `[ 'id', 'name', 'guildClass' ] 9 ADMIN`.

- [ ] **Bước 9: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # phải là refactor/response-contract
git add packages/shared
git commit -m "feat(core): add response schemas and role enum to shared package"
```

---

### Task 2: `apps/api` — `auth`

**Files:**
- Modify: `apps/api/src/common/constants/auth.constant.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts:11,38,59,88,102`
- Modify: `apps/api/src/modules/auth/auth.controller.ts:8,22,33,46`
- Delete: `apps/api/src/modules/auth/entities/auth.entity.ts` (và thư mục `entities/`)

**Interfaces:**
- Consumes: `AuthTokens`, `AuthUser` từ `@guild/shared/schemas`; `ADMIN_ROLE`, `Role` từ
  `@guild/shared/enums` (Task 1).
- Produces: `apps/api/src/common` tiếp tục export `ADMIN_ROLE` như cũ, nên
  `attendance.service.ts:9`, `attendance.service.spec.ts:4` **không phải sửa**.

- [ ] **Bước 1: `common/constants/auth.constant.ts` re-export `ADMIN_ROLE` từ shared**

Thay toàn bộ nội dung file bằng:

```ts
/**
 * Hằng số và kiểu của JWT dùng chung giữa guard (`common/`) và module auth (`modules/auth`).
 * Đặt ở `common/` vì guard không được phép import từ `modules/`.
 */
import type { Role } from '@guild/shared/enums';

/**
 * Quyền duy nhất hiện có: toàn quyền quản trị.
 * Định nghĩa thật nằm ở `@guild/shared/enums` vì giá trị này đi qua mạng
 * (`/auth/login`, `/auth/me`); re-export ở đây để mọi chỗ đang import từ `common` giữ nguyên.
 */
export { ADMIN_ROLE } from '@guild/shared/enums';

/** Loại token, ghi trong payload để access token không dùng thay refresh token được. */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
} as const;

/** Loại token hợp lệ. */
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** Nội dung được ký trong access/refresh token. */
export interface JwtPayload {
  /** Tên đăng nhập (đã chuẩn hóa chữ thường) */
  sub: string;
  /** Quyền của tài khoản */
  role: Role;
  /** Token này là access hay refresh */
  type: TokenType;
}
```

- [ ] **Bước 2: `auth.service.ts` — đổi type trả về**

Dòng 11, thay import entity:

```ts
import type { AuthTokens } from '@guild/shared/schemas';
```

Đặt nó cùng nhóm import package ở trên (cạnh dòng 6 `import type { LoginInput, RefreshTokenInput } from '@guild/shared/schemas';`) — gộp lại thành một import:

```ts
import type {
  AuthTokens,
  LoginInput,
  RefreshTokenInput,
} from '@guild/shared/schemas';
```

rồi xoá dòng `import type { AuthTokensEntity } from './entities/auth.entity';`.

Đổi 3 chữ ký (dòng 38, 59, 88): `Promise<AuthTokensEntity>` → `Promise<AuthTokens>`.

Đổi câu return của `issueTokens` (dòng 102) để lệch shape nổ ngay tại đây:

```ts
    return {
      accessToken,
      refreshToken,
      user: { username, role: ADMIN_ROLE },
    } satisfies AuthTokens;
```

- [ ] **Bước 3: `auth.controller.ts` — đổi type trả về**

Dòng 8: `import type { AuthTokensEntity, AuthUserEntity } from './entities/auth.entity';` →

```ts
import type { AuthTokens, AuthUser } from '@guild/shared/schemas';
```

(đặt ở nhóm import package, trên `import { CurrentUser, ... } from '../../common';`)

Dòng 22 và 33: `Promise<AuthTokensEntity>` → `Promise<AuthTokens>`.
Dòng 46-48:

```ts
  me(@CurrentUser() user: JwtPayload): AuthUser {
    return { username: user.sub, role: user.role } satisfies AuthUser;
  }
```

- [ ] **Bước 4: Xoá entity**

```bash
rm -r apps/api/src/modules/auth/entities
```

- [ ] **Bước 5: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

Kỳ vọng: cả ba xanh, `auth.service.spec.ts` và `attendance.service.spec.ts` **không sửa gì** mà vẫn
pass. Nếu phải sửa test → đã đổi hành vi ngoài ý muốn, dừng lại.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/common apps/api/src/modules/auth
git commit -m "refactor(auth): type responses from the shared contract"
```

---

### Task 3: `apps/api` — `characters` và `attendance`

**Files:**
- Modify: `apps/api/src/modules/characters/characters.service.ts:10,27,40,58,86,118-130`
- Modify: `apps/api/src/modules/characters/characters.controller.ts:17,35,46,61`
- Modify: `apps/api/src/modules/characters/characters.module.ts:6-10`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts:15-18,31,50,81`
- Modify: `apps/api/src/modules/attendance/attendance.controller.ts:11-14,27,37,55`
- Delete: `apps/api/src/modules/characters/entities/`, `apps/api/src/modules/attendance/entities/`

**Interfaces:**
- Consumes: `Character`, `AttendanceRecord` từ `@guild/shared/schemas` (Task 1).
- Produces: không còn `MemberEntity` / `CharacterEntity` / `AttendanceRecordEntity` ở đâu trong repo.

- [ ] **Bước 1: `characters.service.ts`**

Dòng 10: xoá `import type { MemberEntity } from './entities/character.entity';`.
Sửa import shared (dòng 3-6) thành:

```ts
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '@guild/shared/schemas';
```

Đổi 4 chữ ký: `Promise<MemberEntity[]>` → `Promise<Character[]>` (dòng 27),
`Promise<MemberEntity>` → `Promise<Character>` (dòng 40, 58, 86).

Đổi `toEntity` (dòng 113-130) — bỏ annotation, dùng `satisfies`:

```ts
/**
 * Đổi một hàng Prisma thành object trả cho client.
 * @param row - Hàng Character đọc từ database
 * @returns Nhân vật đúng shape contract
 */
function toEntity(row: { id: string; name: string; guildClass: string }) {
  return {
    id: row.id,
    name: row.name,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
    guildClass: row.guildClass as GuildClass,
  } satisfies Character;
}
```

(`import type { GuildClass } from '@guild/shared/enums';` ở dòng 2 giữ nguyên.)

- [ ] **Bước 2: `characters.controller.ts`**

Dòng 17: `import type { MemberEntity } from './entities/character.entity';` →

```ts
import type { Character } from '@guild/shared/schemas';
```

đặt ở nhóm import package (trên `import { JwtAuthGuard } from '../../common';`).
Dòng 35: `Promise<MemberEntity[]>` → `Promise<Character[]>`.
Dòng 46, 61: `Promise<MemberEntity>` → `Promise<Character>`.

- [ ] **Bước 3: `characters.module.ts` — bỏ re-export type**

Xoá cả khối comment lẫn dòng export (dòng 6-11 hiện tại), file còn lại:

```ts
import { Module } from '@nestjs/common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/** Module quản lý thành viên: CRUD nhân vật trong bang, chỉ quản trị viên dùng. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
```

Lý do bỏ luôn comment: nó mô tả khối `export type` vừa xoá, module này giờ không export gì cho module
khác nữa.

- [ ] **Bước 4: `attendance.service.ts`**

Xoá dòng 15-18 (`import type { AttendanceRecordEntity, CharacterEntity } ...`).
Sửa import shared dòng 7 thành:

```ts
import type {
  AttendanceRecord,
  Character,
  MarkAttendanceInput,
} from '@guild/shared/schemas';
```

Dòng 31: `Promise<CharacterEntity[]>` → `Promise<Character[]>`, và thêm `satisfies` vào map:

```ts
    return characters.map(
      (character) =>
        ({
          ...character,
          // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
          // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
          guildClass: character.guildClass as GuildClass,
        }) satisfies Character,
    );
```

Dòng 50: `Promise<AttendanceRecordEntity[]>` → `Promise<AttendanceRecord[]>`, map thêm `satisfies`:

```ts
    return records.map(
      (record) =>
        ({
          characterId: record.characterId,
          sessionId: record.sessionId,
          status: record.status as AttendanceStatus,
          markedAt: record.markedAt.toISOString(),
        }) satisfies AttendanceRecord,
    );
```

Dòng 81: `Promise<AttendanceRecordEntity>` → `Promise<AttendanceRecord>`, và câu return cuối `mark()`:

```ts
    return {
      characterId: record.characterId,
      sessionId: record.sessionId,
      status: record.status as AttendanceStatus,
      markedAt: record.markedAt.toISOString(),
    } satisfies AttendanceRecord;
```

- [ ] **Bước 5: `attendance.controller.ts`**

Dòng 11-14: thay import entity bằng

```ts
import type { AttendanceRecord, Character } from '@guild/shared/schemas';
```

Dòng 27: `Promise<CharacterEntity[]>` → `Promise<Character[]>`.
Dòng 37: `Promise<AttendanceRecordEntity[]>` → `Promise<AttendanceRecord[]>`.
Dòng 55: `Promise<AttendanceRecordEntity>` → `Promise<AttendanceRecord>`.

- [ ] **Bước 6: Xoá entity**

```bash
rm -r apps/api/src/modules/characters/entities apps/api/src/modules/attendance/entities
```

- [ ] **Bước 7: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

Kỳ vọng: xanh, `characters.service.spec.ts` và `attendance.service.spec.ts` không sửa gì.

- [ ] **Bước 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/characters apps/api/src/modules/attendance
git commit -m "refactor(api): type character and attendance responses from shared"
```

---

### Task 4: `apps/api` — `battle-sessions` và `team-builder`

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts:12-15,65,84,107,126,161,291`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts:21-24,37,48,60,76`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.module.ts:12-15`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:13-17,39,66,109,167,183`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts:14-16,32,45,60`
- Delete: `apps/api/src/modules/battle-sessions/entities/`, `apps/api/src/modules/team-builder/entities/`

**Interfaces:**
- Consumes: `BattleSession`, `Week`, `MatchFormation`, `SessionFormation`, `FormationWeek` từ
  `@guild/shared/schemas` (Task 1).
- Produces: `battle-sessions.module.ts` chỉ còn export `BattleSessionsService`, `formatSessionLabel`,
  `isDeadlinePassed` — `attendance.service.ts:11-14` và `team-builder.service.ts:9-12` đã chỉ import
  đúng ba thứ đó nên **không phải sửa**.

- [ ] **Bước 1: `battle-sessions.service.ts`**

Xoá dòng 12-15 (`import type { BattleSessionEntity, WeekEntity } from './entities/...'`).
Sửa import shared (dòng 7-10) thành:

```ts
import type {
  BattleSession,
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
  Week,
} from '@guild/shared/schemas';
```

Đổi chữ ký: dòng 65 `WeekEntity[]` → `Week[]`; dòng 84 `Promise<BattleSessionEntity[]>` →
`Promise<BattleSession[]>`; dòng 107 `Promise<BattleSessionEntity | null>` →
`Promise<BattleSession | null>`; dòng 126 và 161 `Promise<BattleSessionEntity>` →
`Promise<BattleSession>`.

`getEditableWeeks` (dòng 65-71) thêm `satisfies`:

```ts
  getEditableWeeks(now: Date = new Date()): Week[] {
    return getEditableWeeks(now).map(
      (week, index) =>
        ({
          weekStart: week.weekStart.toISOString(),
          weekEnd: week.weekEnd.toISOString(),
          isActive: index === 0,
        }) satisfies Week,
    );
  }
```

`toEntity` (dòng 285-302) bỏ annotation, dùng `satisfies`:

```ts
  /**
   * Đổi một hàng BattleSession thành object trả về cho client.
   * @param row - Hàng đọc từ Prisma kèm `_count`
   * @returns Trận đánh đã dựng nhãn và đổi thời gian sang ISO string
   */
  private toEntity(row: SessionRow) {
    return {
      id: row.id,
      label: formatSessionLabel(row.dateTime, row.isGuildWar),
      dateTime: row.dateTime.toISOString(),
      deadline: row.deadline.toISOString(),
      isGuildWar: row.isGuildWar,
      opponent: row.opponent,
      weekStart: row.weekStart.toISOString(),
      attendanceCount: row._count.attendanceRecords,
      hasFormation: row._count.formationMatches > 0,
    } satisfies BattleSession;
  }
```

- [ ] **Bước 2: `battle-sessions.controller.ts`**

Dòng 21-24: thay import entity bằng

```ts
import type { BattleSession, Week } from '@guild/shared/schemas';
```

Dòng 37 `WeekEntity[]` → `Week[]`; dòng 48 `Promise<BattleSessionEntity[]>` →
`Promise<BattleSession[]>`; dòng 60 và 76 `Promise<BattleSessionEntity>` → `Promise<BattleSession>`.

- [ ] **Bước 3: `battle-sessions.module.ts` — bỏ re-export type**

Xoá dòng 12-15, khối export còn lại:

```ts
/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export { BattleSessionsService } from './battle-sessions.service';
export { formatSessionLabel, isDeadlinePassed } from './session-schedule';
```

(Comment giữ lại vì hai export còn lại vẫn là public API của module.)

- [ ] **Bước 4: `team-builder.service.ts`**

Xoá dòng 13-17 (`import type { FormationWeekEntity, MatchFormation, SessionFormationEntity } ...`).
Sửa import shared dòng 6 thành:

```ts
import type {
  FormationWeek,
  MatchFormation,
  MatchInput,
  SessionFormation,
} from '@guild/shared/schemas';
```

Đổi chữ ký: dòng 66 `Promise<FormationWeekEntity[]>` → `Promise<FormationWeek[]>`; dòng 109
`Promise<SessionFormationEntity[]>` → `Promise<SessionFormation[]>`; dòng 167
`Promise<SessionFormationEntity>` → `Promise<SessionFormation>`.
`buildSlotRows(match: MatchFormation)` (dòng 39) và `const cleaned: MatchFormation[]` (dòng 183) giữ
nguyên tên type — giờ đến từ shared.

`getWeeks` (dòng 77-81) thêm `satisfies`:

```ts
    return sessions.map((session) => {
      const weekStart = session.weekStart.toISOString();

      return { weekStart, isActive: weekStart === activeWeekStart } satisfies FormationWeek;
    });
```

`getFormations` (dòng 130-150) thêm `satisfies` ở object ngoài cùng:

```ts
    return sessions.map(
      (session) =>
        ({
          sessionId: session.id,
          label: formatSessionLabel(session.dateTime, session.isGuildWar),
          opponent: session.opponent,
          dateTime: session.dateTime.toISOString(),
          isGuildWar: session.isGuildWar,
          locked: session.dateTime.getTime() < now.getTime(),
          matches: session.formationMatches.map((match) => ({
            slots: Object.fromEntries(
              match.slots
                .filter((slot) => slot.characterId !== null)
                .map((slot) => [slot.slotId, slot.characterId as string]),
            ),
            notes: Object.fromEntries(
              match.slots
                .filter((slot) => slot.note !== null)
                .map((slot) => [slot.slotId, slot.note as string]),
            ),
          })),
        }) satisfies SessionFormation,
    );
```

- [ ] **Bước 5: `team-builder.controller.ts`**

Dòng 14-16: thay import entity bằng

```ts
import type { FormationWeek, SessionFormation } from '@guild/shared/schemas';
```

Dòng 32 `Promise<FormationWeekEntity[]>` → `Promise<FormationWeek[]>`; dòng 45
`Promise<SessionFormationEntity[]>` → `Promise<SessionFormation[]>`; dòng 60
`Promise<SessionFormationEntity>` → `Promise<SessionFormation>`.

- [ ] **Bước 6: Xoá entity và khẳng định không còn `*Entity` nào**

```bash
rm -r apps/api/src/modules/battle-sessions/entities apps/api/src/modules/team-builder/entities
find apps/api/src -name '*.entity.ts'
grep -rn "Entity" apps/api/src --include='*.ts'
```

Kỳ vọng: `find` không in gì; `grep` chỉ còn (nếu có) các chỗ không liên quan tới response — nếu còn
`MemberEntity|CharacterEntity|AttendanceRecordEntity|BattleSessionEntity|WeekEntity|SessionFormationEntity|FormationWeekEntity|AuthUserEntity|AuthTokensEntity` thì chưa xong.

- [ ] **Bước 7: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

Kỳ vọng: xanh, `battle-sessions.service.spec.ts` và `team-builder.service.spec.ts` không sửa gì.

- [ ] **Bước 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/battle-sessions apps/api/src/modules/team-builder
git commit -m "refactor(api): type schedule and formation responses from shared"
```

---

### Task 5: `apps/web` — `attendance` (chuyển `recordKey`, xoá `types/attendance.ts`)

**Files:**
- Create: `apps/web/features/attendance/lib/record-key.ts`
- Create: `apps/web/features/attendance/lib/__tests__/record-key.test.ts`
- Modify: `apps/web/features/attendance/api/attendance-api.ts:4-10`
- Modify: `apps/web/features/attendance/api/mark-attendance-action.ts:7`
- Modify: `apps/web/features/attendance/api/__tests__/attendance-api.test.ts:4`
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts:19`
- Modify: `apps/web/features/attendance/hooks/use-deadline-refresh.ts:7`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx:36-37`
- Modify: `apps/web/features/attendance/components/attendance-row.tsx:14-19`
- Modify: `apps/web/features/attendance/components/character-name.tsx:2`
- Modify: `apps/web/features/attendance/index.ts:11-16`
- Delete: `apps/web/features/attendance/types/attendance.ts` (và thư mục `types/`)

**Interfaces:**
- Consumes: `AttendanceRecord`, `BattleSession`, `Character`, `Week` từ `@shared/schemas` (Task 1).
- Produces: `recordKey(characterId: string, sessionId: string): string` tại
  `@/features/attendance/lib/record-key` — Task 6 và Task 7 **không** dùng nó, chỉ nội bộ feature.
  `features/attendance/index.ts` **thôi export type** — Task 6 và 7 phải lấy type từ `@shared/schemas`.

- [ ] **Bước 1: Tạo `lib/record-key.ts`**

```ts
/**
 * Khóa duy nhất cho một record điểm danh: cặp (characterId, sessionId).
 * Chỉ là khoá map phía client — không phải shape đi qua mạng, nên không nằm ở
 * `packages/shared`.
 * @param characterId - ID nhân vật
 * @param sessionId - ID buổi đánh
 * @returns Chuỗi khóa duy nhất
 */
export function recordKey(characterId: string, sessionId: string): string {
  return `${characterId}__${sessionId}`;
}
```

- [ ] **Bước 2: Viết test cho `recordKey` và chạy để thấy nó FAIL**

Tạo `apps/web/features/attendance/lib/__tests__/record-key.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { recordKey } from "../record-key";

describe("recordKey", () => {
  it("ghép characterId và sessionId thành một khoá", () => {
    expect(recordKey("c1", "s1")).toBe("c1__s1");
  });

  it("sinh khoá khác nhau cho hai cặp khác nhau", () => {
    expect(recordKey("c1", "s2")).not.toBe(recordKey("c2", "s1"));
  });
});
```

Chạy:

```bash
pnpm --filter web test -- record-key
```

Kỳ vọng: PASS (file `record-key.ts` đã tạo ở bước 1 — đây là test khoá hành vi trước khi xoá bản gốc,
nếu FAIL nghĩa là bước 1 sai).

- [ ] **Bước 3: Đổi import ở 5 chỗ đang dùng `recordKey`**

| File | Sửa |
|---|---|
| `api/attendance-api.ts:10` | `import { recordKey } from "../types/attendance";` → `import { recordKey } from "../lib/record-key";` |
| `api/__tests__/attendance-api.test.ts:4` | `from "../../types/attendance"` → `from "../../lib/record-key"` |
| `components/attendance-grid.tsx:37` | `from "../types/attendance"` → `from "../lib/record-key"` |
| `components/attendance-row.tsx:19` | `from "../types/attendance"` → `from "../lib/record-key"` |

- [ ] **Bước 4: Đổi mọi import type sang `@shared/schemas`**

`api/attendance-api.ts` — dòng 1-10 thành:

```ts
import type {
  AttendanceRecord,
  BattleSession,
  Character,
  MarkAttendanceInput,
  Week,
} from "@shared/schemas";

import { apiFetch } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";
```

`api/mark-attendance-action.ts` — gộp dòng 3 và 7:

```ts
import type { AttendanceRecord, MarkAttendanceInput } from "@shared/schemas";
```

`hooks/use-attendance.ts:19` → `import type { Character } from "@shared/schemas";` (chuyển lên nhóm
import package, trên các import `../…`).

`hooks/use-deadline-refresh.ts:7` → `import type { BattleSession } from "@shared/schemas";`.

`components/attendance-grid.tsx:36` → `import type { Character } from "@shared/schemas";`.

`components/attendance-row.tsx:14-18` →

```ts
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@shared/schemas";
```

`components/character-name.tsx:2` → `import type { Character } from "@shared/schemas";`.

- [ ] **Bước 5: Bỏ khối `export type` khỏi `features/attendance/index.ts`**

Xoá dòng 11-16. File còn lại:

```ts
export { AttendanceScreen } from "./components/attendance-screen";
export { AttendanceFilters } from "./components/attendance-filters";
export { AttendanceLogTable } from "./components/attendance-log-table";
export { attendanceKeys } from "./api/attendance-api";
export { getSessionSubtitle } from "./lib/session-subtitle";
export {
  useCharacters,
  useBattleSessions,
  useAttendanceRecords,
} from "./hooks/use-attendance";
```

> Sau bước này `apps/web` sẽ **chưa** typecheck xanh: `features/settings` và `features/team-builder`
> còn import type qua `@/features/attendance`. Task 6 và 7 sửa nốt. Đây là lý do Task 5-7 không tách
> commit riêng cho từng feature ở phía web — commit ở cuối Task 7.

- [ ] **Bước 6: Xoá `types/attendance.ts`**

```bash
rm -r apps/web/features/attendance/types
grep -rn "types/attendance" apps/web --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.next'
```

Kỳ vọng: `grep` không in gì.

- [ ] **Bước 7: Chạy test của feature attendance**

```bash
pnpm --filter web test
```

Kỳ vọng: PASS (test hiện có `attendance-api.test.ts` không sửa nội dung, chỉ đổi đường dẫn import).

---

### Task 6: `apps/web` — `members` và `settings`

**Files:**
- Modify: `apps/web/features/members/api/members-api.ts:10`
- Modify: `apps/web/features/members/components/member-row.tsx:10`
- Modify: `apps/web/features/members/components/delete-member-dialog.tsx:15`
- Modify: `apps/web/features/members/components/member-form-dialog.tsx:32`
- Modify: `apps/web/features/members/components/members-panel.tsx:22`
- Modify: `apps/web/features/settings/api/battle-sessions-api.ts:8`
- Modify: `apps/web/features/settings/components/session-list.tsx:6`
- Modify: `apps/web/features/settings/components/delete-session-dialog.tsx:14`
- Modify: `apps/web/features/settings/components/session-row.tsx:11`
- Modify: `apps/web/features/settings/components/week-selector.tsx:7`
- Modify: `apps/web/features/settings/components/settings-screen.tsx:8`
- Modify: `apps/web/features/settings/components/session-form-dialog.tsx:18`
- Delete: `apps/web/features/members/types/member.ts` (và thư mục `types/`)

**Interfaces:**
- Consumes: `Character`, `BattleSession`, `Week` từ `@shared/schemas` (Task 1).
- Produces: không còn type `Member` trong repo — mọi chỗ dùng `Character`.

- [ ] **Bước 1: `members` — đổi `Member` thành `Character`**

Ở cả 5 file, đổi `import type { Member } from "../types/member";` thành

```ts
import type { Character } from "@shared/schemas";
```

(đặt ở nhóm import package, trên các import `@/…` và `../…`), rồi đổi **mọi** chỗ dùng `Member` /
`Member[]` thành `Character` / `Character[]`. Tên biến, tên prop, text tiếng Việt hiển thị cho người
dùng **giữ nguyên** — chỉ đổi tên type.

Lệnh tìm cho chắc:

```bash
grep -rn "\bMember\b" apps/web/features/members --include='*.ts' --include='*.tsx'
```

Kỳ vọng sau khi sửa: chỉ còn các tên như `MembersPanel`, `MemberRow`, `MemberFormDialog`,
`memberKeys` (tên component/khoá query, **không** phải type) — không còn `: Member`, `Member[]`,
`Partial<Member>`.

- [ ] **Bước 2: Xoá `features/members/types/`**

```bash
rm -r apps/web/features/members/types
```

- [ ] **Bước 3: `settings` — lấy `BattleSession` / `Week` từ shared**

| File | Sửa |
|---|---|
| `api/battle-sessions-api.ts:8` | `import type { BattleSession, Week } from "@/features/attendance";` → `import type { BattleSession, Week } from "@shared/schemas";` |
| `components/session-list.tsx:6` | `import type { BattleSession } from "@shared/schemas";` |
| `components/week-selector.tsx:7` | `import type { Week } from "@shared/schemas";` |
| `components/settings-screen.tsx:8` | `import type { BattleSession } from "@shared/schemas";` |
| `components/session-form-dialog.tsx:18` | `import type { BattleSession } from "@shared/schemas";` |
| `components/delete-session-dialog.tsx:14` | tách làm hai: `import { getSessionSubtitle } from "@/features/attendance";` **và** `import type { BattleSession } from "@shared/schemas";` |
| `components/session-row.tsx:11` | tách y hệt dòng trên |

- [ ] **Bước 4: Quét chỗ còn sót**

```bash
grep -rn "from \"@/features/attendance\"" apps/web --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.next'
```

Kỳ vọng: chỉ còn các import **giá trị** (`AttendanceScreen`, `AttendanceFilters`,
`AttendanceLogTable`, `attendanceKeys`, `getSessionSubtitle`, `useCharacters`, `useBattleSessions`,
`useAttendanceRecords`) — không còn `import type`.

- [ ] **Bước 5: Chạy nhanh**

```bash
pnpm --filter web test
```

Kỳ vọng: PASS. (`typecheck` vẫn còn đỏ vì `team-builder` chưa sửa — Task 7.)

---

### Task 7: `apps/web` — `team-builder` và `auth`

**Files:**
- Modify: `apps/web/features/team-builder/api/team-builder-api.ts:6-9,16`
- Modify: `apps/web/features/team-builder/components/week-picker.tsx:11`
- Modify: `apps/web/features/team-builder/components/session-tabs.tsx:7,29`
- Modify: `apps/web/features/team-builder/components/{member-card,member-pool,formation-grid,slot-cell,team-column,draggable-member}.tsx` (import `Character`)
- Modify: `apps/web/features/team-builder/lib/{wire,prefill,active-session,session-status,week-status}.ts`
- Modify: `apps/web/features/team-builder/hooks/use-prefill.ts:8`
- Modify: `apps/web/features/team-builder/lib/__tests__/prefill.test.ts:4`
- Modify: `apps/web/features/auth/lib/auth-cookies.ts:19-23`
- Modify: `apps/web/features/auth/api/auth-api.ts:1-13,21,22,36,37`
- Modify: `apps/web/features/auth/api/session.ts:5-12`
- Modify: `apps/web/proxy.ts:10-11`
- Delete: `apps/web/features/team-builder/types/session-formation.ts`

**Interfaces:**
- Consumes: `Character`, `MatchFormation`, `SessionFormation`, `FormationWeek`, `AuthTokens` từ
  `@shared/schemas` (Task 1).
- Produces: `wire.ts` giữ nguyên tên hàm — `toWire`, `fromWire`, `toWireNotes`, `fromWireNotes`,
  `toWireMatches(matches: MatchDraft[]): MatchFormation[]`,
  `fromWireMatches(wire: MatchFormation[], slots: Slot[]): MatchDraft[]`. `wire.test.ts` **không sửa**.

- [ ] **Bước 1: `lib/wire.ts` — bỏ `Wire*`, dùng `MatchFormation`**

Dòng 1-6 thành:

```ts
import type { MatchFormation } from "@shared/schemas";

import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";
```

Rồi đổi chữ ký (giữ nguyên thân hàm và doc comment):

- `toWire(assignment: Assignment): MatchFormation["slots"]`
- `fromWire(wire: MatchFormation["slots"], slots: Slot[]): Assignment`
- `toWireNotes(notes: Notes): MatchFormation["notes"]`
- `fromWireNotes(wire: MatchFormation["notes"], slots: Slot[]): Notes`
- `toWireMatches(matches: MatchDraft[]): MatchFormation[]`
- `fromWireMatches(wire: MatchFormation[], slots: Slot[]): MatchDraft[]`

> File này **ở lại** đúng như spec §"apps/web": nó đổi giữa shape trên dây và `MatchDraft` nội bộ của
> màn hình — chuyển đổi thật, không phải khai lại shape. `types/formation.ts` (chứa `Slot`,
> `Assignment`, `Notes`, `MatchDraft`, `DragSource`, `DropTarget`) cũng ở lại vì không đi qua mạng.

- [ ] **Bước 2: Các file `team-builder` khác đổi import**

| File | Sửa |
|---|---|
| `api/team-builder-api.ts:6-9` | `import type { FormationWeek, MatchFormation, SessionFormation } from "@shared/schemas";` và dòng 16 `matches: WireMatch[]` → `matches: MatchFormation[]` |
| `components/week-picker.tsx:11` | `import type { FormationWeek } from "@shared/schemas";` |
| `components/session-tabs.tsx:7` | `import type { MatchFormation, SessionFormation } from "@shared/schemas";`; dòng 29 `matches: WireMatch[]` → `matches: MatchFormation[]` |
| `components/{member-card,member-pool,formation-grid,slot-cell,team-column,draggable-member}.tsx` | `import type { Character } from "@/features/attendance";` → `import type { Character } from "@shared/schemas";` |
| `lib/active-session.ts:1`, `lib/session-status.ts:1`, `lib/prefill.ts:2` | `import type { SessionFormation } from "@shared/schemas";` |
| `lib/week-status.ts:1` | `import type { FormationWeek } from "@shared/schemas";` |
| `hooks/use-prefill.ts:8` | `import type { SessionFormation } from "@shared/schemas";` |
| `lib/__tests__/prefill.test.ts:4` | `import type { SessionFormation } from "@shared/schemas";` |

- [ ] **Bước 3: Xoá `types/session-formation.ts` và quét chỗ sót**

```bash
rm apps/web/features/team-builder/types/session-formation.ts
grep -rn "Wire\(Match\|Assignment\|Notes\)\|types/session-formation" apps/web --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.next'
```

Kỳ vọng: `grep` không in gì (các hàm `toWire*` / `fromWire*` không khớp pattern này vì không có
`WireMatch`/`WireAssignment`/`WireNotes`).

- [ ] **Bước 4: `auth` — một `AuthTokens` duy nhất từ shared**

`features/auth/lib/auth-cookies.ts`: xoá dòng 19-23 (`export interface AuthTokens {...}`). File này
**không** thêm import nào — nó cố ý không kéo thêm dependency để proxy chạy được ở Edge; chỗ nào cần
type thì import thẳng từ `@shared/schemas`.

`features/auth/api/session.ts:5-12` — tách `AuthTokens` ra:

```ts
import type { AuthTokens } from "@shared/schemas";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "../lib/auth-cookies";
```

`features/auth/api/auth-api.ts` — bỏ hẳn `AuthTokensResponse`, file thành:

```ts
import type { AuthTokens, LoginInput } from "@shared/schemas";

import { apiFetch } from "@/lib/api-client";

/**
 * Gọi API đăng nhập để lấy cặp token.
 * @param input - Tên đăng nhập và mật khẩu
 * @returns Access token, refresh token và thông tin tài khoản
 * @throws ApiError khi sai thông tin đăng nhập (message tiếng Việt của backend)
 */
export function loginRequest(input: LoginInput): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Đổi refresh token còn hạn thành cặp token mới.
 * @param refreshToken - Refresh token hiện tại
 * @returns Cặp token mới và thông tin tài khoản
 * @throws ApiError khi refresh token hỏng hoặc đã hết hạn
 */
export function refreshRequest(refreshToken: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
```

`apps/web/proxy.ts:10-11` — bỏ `type AuthTokens` khỏi import `auth-cookies`, thêm import riêng:

```ts
import type { AuthTokens } from "@shared/schemas";
```

> **Vì sao an toàn:** `AuthTokens` của shared có thêm field `user` so với interface cũ ở
> `auth-cookies.ts`. `createSession()` và `renewSession()` chỉ đọc `accessToken`/`refreshToken`, còn
> giá trị truyền vào vốn là response đầy đủ của `/auth/login` — chỉ là kiểu hẹp lại đúng thực tế.
> Import là `import type` nên bị xoá lúc biên dịch: proxy chạy Edge không kéo theo zod.

- [ ] **Bước 5: Quét toàn bộ tên cũ ở web**

```bash
grep -rn "AuthTokensResponse\|\bMemberEntity\b\|WireMatch" apps/web --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.next'
```

Kỳ vọng: không in gì.

- [ ] **Bước 6: Kiểm tra toàn bộ web**

```bash
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
```

Kỳ vọng: cả ba xanh. Đây là lần đầu web xanh trở lại kể từ Task 5.

- [ ] **Bước 7: Commit cả ba task web**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web
git commit -m "refactor(ui): read response types from the shared contract"
```

---

### Task 8: Test contract cho `Character` + kiểm tra cuối + cập nhật tài liệu

**Files:**
- Create: `apps/web/__tests__/character-contract.test.ts`
- Modify: `docs/architecture.md:132,303`
- Modify: `apps/api/CLAUDE.md:21`

**Interfaces:**
- Consumes: `characterSchema` từ `@shared/schemas` (Task 1).

- [ ] **Bước 1: Viết test contract và chạy để thấy nó PASS**

Tạo `apps/web/__tests__/character-contract.test.ts`:

```ts
import { characterSchema } from "@shared/schemas";
import { describe, expect, it } from "vitest";

/**
 * Contract của `Character` được đọc ở rất nhiều call site (bảng điểm danh, pool
 * xếp team, màn quản lý thành viên). Test này khoá số field lại để việc thêm một
 * field vào response là thay đổi có chủ đích, không phải vô tình.
 */
describe("characterSchema", () => {
  it("có đúng ba field id, name, guildClass", () => {
    expect(Object.keys(characterSchema.shape).sort()).toEqual([
      "guildClass",
      "id",
      "name",
    ]);
  });
});
```

Chạy:

```bash
pnpm --filter web test -- character-contract
```

Kỳ vọng: PASS. Nếu FAIL vì không resolve được `@shared/schemas` → kiểm tra alias trong
`apps/web/vitest.config.ts` (đã có sẵn dòng `"@shared": …/packages/shared`).

- [ ] **Bước 2: Kiểm tra rằng test thật sự bắt được thay đổi**

Thêm tạm một field vào `packages/shared/schemas/character.schema.ts`
(`note: z.string(),` trong `characterSchema`), rồi:

```bash
pnpm --filter web test -- character-contract
```

Kỳ vọng: FAIL. Xoá field vừa thêm, chạy lại → PASS.

- [ ] **Bước 3: Sửa `docs/architecture.md`**

Dòng ~131-132, đổi:

> Each is `<domain>.module.ts` + `<domain>.controller.ts` + `<domain>.service.ts`, with `dto/`,
> `entities/` and `__tests__/` beside it.

thành:

```markdown
Each is `<domain>.module.ts` + `<domain>.controller.ts` + `<domain>.service.ts`, with `dto/` and
`__tests__/` beside it. Response shapes are **not** declared per module — they are Zod schemas in
`packages/shared/schemas`, and services assert against them with `satisfies`.
```

Dòng ~303 (bảng §7, hàng **A new backend domain**), bỏ `và entities/`:

```markdown
| **A new backend domain** | `src/modules/<domain>/` with `<domain>.module.ts`, `.controller.ts`, `.service.ts`, plus `dto/`. Response shapes go in `packages/shared/schemas`. Register it in `app.module.ts`. Add a `<domain>.repository.ts` only once the queries are complex or repeated; simple CRUD calls `PrismaService` from the service. |
```

- [ ] **Bước 4: Sửa `apps/api/CLAUDE.md` dòng ~21**

Đổi:

> returns a Prisma model: map it to the module's entity so `password` cannot leak.

thành:

```markdown
  returns a Prisma model: map it to the shared response type (`@guild/shared/schemas`) with
  `satisfies` so `password` cannot leak.
```

- [ ] **Bước 5: Kiểm tra toàn bộ workspace**

```bash
pnpm --filter @guild/shared build
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
```

Kỳ vọng: tất cả xanh.

- [ ] **Bước 6: Khẳng định không còn khai báo trùng**

```bash
find apps/api/src -name '*.entity.ts'
ls apps/web/features/attendance/types apps/web/features/members/types 2>&1
ls apps/web/features/team-builder/types
git status --short
```

Kỳ vọng: `find` trống; hai lệnh `ls` đầu báo "No such file or directory";
`apps/web/features/team-builder/types` chỉ còn `formation.ts`.

- [ ] **Bước 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/__tests__ docs/architecture.md apps/api/CLAUDE.md
git commit -m "test(core): lock the character contract and update the module docs"
```

- [ ] **Bước 8: Xem lại toàn bộ diff, KHÔNG push**

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

Kỳ vọng: 5-6 commit (`packages/shared`, 3 commit api, 1 commit web, 1 commit test+docs).
**Không chạy `git push`, không mở PR** — người dùng đã yêu cầu không đưa lên GitHub.

---

## Edge case đã xét (đối chiếu spec §"Edge case")

| Edge case | Xử lý trong kế hoạch |
|---|---|
| `z.enum(GuildClass)` / `z.enum(AttendanceStatus)` với TypeScript enum | Zod 4 nhận enum gốc; enum vẫn ở `packages/shared/enums`, schema chỉ tham chiếu — Task 1 bước 3, 4 |
| `opponent: string \| null` | `.nullable()` chứ không `.optional()`, khác cố ý với `opponent` chiều request — Task 1 bước 5 (kèm ghi chú) |
| `markedAt` / `dateTime` / `deadline` / `weekStart` là ISO string | `z.string()`; `battleSessionSchema` và `weekSchema` dùng lại `isoDateTime` đã có sẵn ở đầu file — Task 1 bước 5 |
| `matches: MatchFormation[]` rỗng nghĩa "chưa xếp gì" | Doc comment chuyển nguyên văn từ `formation.entity.ts:23-26` sang `sessionFormationSchema` — Task 1 bước 6 |
| Swagger response vẫn trống | Không đụng tới. Entity vốn là `interface` thuần, không có decorator, nên xoá chúng không làm tài liệu tệ hơn. Việc gắn `createZodDto` cho response là việc riêng |
| **`ADMIN_ROLE` thật là `'ADMIN'`, không phải `"admin"` như ví dụ trong spec** | Task 1 bước 1 giữ `'ADMIN'`; đổi giá trị sẽ vô hiệu mọi JWT đang lưu trong cookie |
| `grep -rn ADMIN_ROLE apps/api/src` ra 7 chỗ | Chọn phương án **re-export từ `common`** (Task 2 bước 1) thay vì sửa từng call site: `auth.service.ts`, `attendance.service.ts` và `attendance.service.spec.ts` không phải sửa import |
| `common/` không được import `modules/` | Vẫn đúng: `common/constants/auth.constant.ts` import từ `@guild/shared/enums`, luật ESLint chỉ chặn pattern đường dẫn tương đối |
| `Character` và `Member` gộp làm một | Task 3 (api) + Task 6 (web). Nếu sau này cần tách, tách bằng `characterSchema.pick(...)` |
| Web có **hai** `AuthTokens` chồng nhau | Task 7 bước 4: xoá cả `AuthTokens` ở `auth-cookies.ts` lẫn `AuthTokensResponse` ở `auth-api.ts`, còn một type từ shared |
| `auth-cookies.ts` cố ý không import `next/headers` để Edge dùng lại được | Không thêm import nào vào file đó; `session.ts` và `proxy.ts` tự import `type AuthTokens` từ `@shared/schemas`, `import type` bị xoá lúc biên dịch nên Edge không kéo zod |
| `WireAssignment` / `WireNotes` không có tên tương ứng ở shared | Dùng `MatchFormation["slots"]` và `MatchFormation["notes"]` trong `wire.ts` — Task 7 bước 1 |
| `features/team-builder/types/formation.ts` | **Giữ nguyên** — `Slot`, `MatchDraft`, `DragSource`… là state nội bộ màn hình, không đi qua mạng |
| `recordKey()` | Chuyển sang `features/attendance/lib/record-key.ts` kèm test riêng — Task 5 bước 1-3 |
| `matchFormationSchema` gần trùng `matchSchema` (chiều request) | Định nghĩa riêng, có doc comment nói rõ khác biệt: chiều ra không mang ràng buộc `.min(1)` / `.max(NOTE_MAX_LENGTH)` vì không validate — Task 1 bước 6 |
| Quên `pnpm --filter @guild/shared build` → API chạy `dist` cũ | Task 1 bước 8 build ngay sau khi sửa shared; Task 8 bước 5 build lại lần cuối. Riêng lần này rủi ro thấp vì API chỉ import **type** từ shared (bị xoá lúc biên dịch) — nhưng vẫn build để `dist` khớp source |
| `apps/web` không khai `zod` trong `package.json` | Đã kiểm tra: `zod` nằm ở `packages/shared/node_modules/zod` và resolve theo vị trí file schema, nên `@shared/schemas` chạy được cả ở Vitest lẫn bundler (`slot-note-input.tsx` đang import `NOTE_MAX_LENGTH` từ đó và app build được) |
| Diff lớn, chạm gần như mọi feature | Tách 6 commit: 1 cho `packages/shared`, 3 cho `apps/api` (auth / characters+attendance / battle-sessions+team-builder), 1 cho `apps/web`, 1 cho test+docs |
| Test hiện có phải chạy lại **không sửa gì** | Task 2/3/4 bước kiểm tra ghi rõ: nếu phải sửa spec của service thì đã đổi hành vi ngoài ý muốn → dừng |

## Ngoài phạm vi (theo spec)

- Thêm field mới vào response (`isDeadlinePassed`, `weekEnd` cho formation week) — **C2b**.
- Parse response lúc chạy ở web — đã loại ở spec §2.
- Sinh client TypeScript từ OpenAPI.
- `createZodDto` cho response để Swagger đọc được.
