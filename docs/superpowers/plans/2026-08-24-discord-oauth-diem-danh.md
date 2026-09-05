# Đăng nhập Discord OAuth2 và điểm danh theo tài khoản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay đăng nhập admin bằng username/password bằng đăng nhập Discord OAuth2, gắn mỗi tài khoản Discord vào đúng một `Character`, và khoá điểm danh theo danh tính đó với ba vai ADMIN / LEADER / MEMBER.

**Architecture:** API (NestJS) cầm toàn bộ OAuth flow và là nơi duy nhất chạm database, ký JWT; nó giao cặp token cho web qua một mã đổi dùng-một-lần (bảng `AuthExchange`, TTL 60 giây) vì hai app nằm ở hai domain Vercel khác nhau nên API không set được cookie cho web. `discordId` là một cột trên `Character` do admin nhập tay — đăng nhập là phép tra cứu, không khớp thì cấm hoàn toàn. Quyền đọc/ghi rút về hai vị ngữ dùng chung trong `packages/shared`.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · `@nestjs/jwt` · Zod + nestjs-zod · Next.js 16 App Router · TanStack Query · Jest (API) · Vitest (web) · pnpm workspace.

**Spec:** [`docs/superpowers/specs/2026-08-24-discord-oauth-diem-danh-design.md`](../specs/2026-08-24-discord-oauth-diem-danh-design.md)

## Global Constraints

- **Mọi câu chữ hiển thị cho người dùng là tiếng Việt** — message lỗi, nhãn, đường dẫn route. Backend trả `message` tiếng Việt và frontend hiển thị nguyên văn.
- **`apps/api` không có path alias.** Import nội bộ là tương đối (`../../config`); code dùng chung import bằng tên package thật (`@guild/shared/*`). Không tái lập `@/…`.
- **Doc comment**: file trong repo này đang viết JSDoc **tiếng Việt** (dù `CLAUDE.md` nói comment tiếng Anh). Quy tắc thi hành: **viết cùng ngôn ngữ với file đang sửa**; file mới trong `apps/api`/`apps/web` viết tiếng Việt cho khớp hàng xóm. Mọi hàm phải có doc comment nêu mục đích, từng tham số và giá trị trả về.
- **`packages/shared` là nơi duy nhất khai báo shape đi qua mạng.** Sau khi sửa package phải chạy `pnpm --filter @guild/shared build` trước khi app nào đó chạy được (kiểu thì cập nhật ngay).
- **Controller → Service → Prisma.** Controller không chạm Prisma và không trả model Prisma; mọi object trả ra dựng qua `verifyResponse(<shape>Schema, { … } satisfies <Shape>)`.
- **`common/` và `config/` không được import từ `modules/` hay `infrastructure/`.** Module khác chỉ được import qua `<domain>.public.ts`.
- **Không `forwardRef()`.**
- **Nothing reads `process.env`** trong `apps/api/src` ngoài `config/response-verification.ts`: khai biến trong `config/env.validation.ts` rồi inject `AppConfigService`.
- **Enum Prisma phải trùng giá trị với `packages/shared/enums`.**
- **Commit theo Conventional Commits, tiếng Anh**, `<type>(<scope>): <description>`, mô tả chữ thường, thể mệnh lệnh, không dấu chấm cuối, **không** dòng attribution.
- **Nhánh làm việc**: `feat/discord-oauth-attendance`. Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit; không commit lên `main`.
- **Lệnh**: `pnpm --filter api test`, `pnpm --filter api lint`, `pnpm --filter api typecheck`, `pnpm --filter web test`, `pnpm --filter web typecheck`. Test API là Jest (`*.spec.ts` dưới `src/`), test web là Vitest (`*.test.ts` cạnh code).

---

## File Structure

**`packages/shared`**
- `enums/role.enum.ts` — *sửa*: `ADMIN_ROLE`/`Role` → enum `GuildRole` (ADMIN, LEADER, MEMBER) + nhãn tiếng Việt.
- `lib/permissions.ts` — *mới*: `canViewAllAttendance`, `canManageGuild`.
- `schemas/auth.schema.ts` — *sửa*: bỏ `loginSchema`; thêm `discordExchangeSchema`, `sessionUserSchema`.
- `schemas/character.schema.ts` — *sửa*: giữ `characterSchema` (id/name/guildClass) cho màn điểm danh; thêm `guildMemberSchema` (thêm discordId, discordUsername, lastLoginAt, role) cho màn quản trị; `updateCharacterSchema` nhận thêm `discordId`, `role`.
- `schemas/attendance.schema.ts` — *sửa*: thêm `attendanceSummarySchema`.

**`apps/api`**
- `prisma/schema.prisma` — *sửa*: enum `GuildRole`; `Character.discordId/discordUsername/lastLoginAt/role`; model `AuthExchange`; `AttendanceRecord.markedByCharacterId`.
- `src/config/env.validation.ts` — *sửa*: thêm 4 biến Discord, bỏ 2 biến admin.
- `src/common/constants/auth.constant.ts` — *sửa*: `JwtPayload.sub` là discordId, `role: GuildRole`, thêm `TOKEN_TYPE.oauthState`.
- `src/common/guards/admin.guard.ts` — *mới*.
- `src/common/guards/optional-jwt-auth.guard.ts` — *xoá* (Task 8).
- `src/modules/auth/discord-oauth.ts` — *mới*: gọi Discord (đổi code, đọc hồ sơ) + dựng authorize URL.
- `src/modules/auth/oauth-redirect.ts` — *mới*: `safeRedirect` (chống open redirect) + dựng URL lỗi về web.
- `src/modules/auth/auth.service.ts` — *viết lại*.
- `src/modules/auth/auth.controller.ts` — *viết lại*.
- `src/modules/auth/dto/discord-exchange.dto.ts` — *mới*; `dto/login.dto.ts` — *xoá*.
- `src/modules/characters/*` — *sửa*: codec `toGuildMember`, service `findByDiscordId`/`touchLogin`/409, controller dùng `AdminGuard`.
- `src/modules/attendance/*` — *sửa*: lọc theo vai, endpoint `summary`, luật `mark`.
- `src/modules/battle-sessions/*`, `src/modules/team-builder/*` — *sửa*: `AdminGuard` cho route quản trị.

**`apps/web`**
- `features/auth/core/auth-api.ts` — *sửa*: bỏ `loginRequest`, thêm `exchangeRequest`.
- `features/auth/core/access.ts` — *mới*: `decideAccess` (logic thuần của proxy) + test.
- `features/auth/api/session.ts` — *sửa*: `SessionUser` = `{ discordId, role }`.
- `features/auth/api/me.ts` — *mới*: server action `fetchMe()`.
- `features/auth/hooks/use-session.ts` — *mới*: TanStack query bọc `fetchMe`.
- `features/auth/api/login-action.ts` — *sửa*: chỉ còn `logout`.
- `features/auth/components/login-dialog.tsx`, `store/auth-store.ts` — *xoá*.
- `features/auth/components/discord-login-button.tsx` — *mới*.
- `app/dang-nhap/page.tsx` — *mới*; `app/dang-nhap/discord/route.ts` — *mới* (Route Handler: chỗ duy nhất ngoài proxy ghi được cookie).
- `proxy.ts` — *sửa*: đảo mặc định + kiểm vai.
- `features/attendance/api/attendance-api.ts` — *sửa*: chuyển thành `"use server"`, gắn Bearer; `api/mark-attendance-action.ts` — *xoá*.
- `features/attendance/components/member-attendance-card.tsx` — *mới*.
- `features/members/*` — *sửa*: cột Discord ID + cột Quyền.

---

## Task 1: `packages/shared` — vai trò và hai vị ngữ quyền

**Files:**
- Modify: `packages/shared/enums/role.enum.ts`
- Create: `packages/shared/lib/permissions.ts`
- Modify: `packages/shared/lib/index.ts`
- Test: `apps/api/src/__tests__/permissions.spec.ts`

`packages/shared` không có test runner riêng; test cho code dùng chung chạy bằng Jest của `apps/api` (script `pretest` của nó tự build lại package).

**Interfaces:**
- Produces: `enum GuildRole { ADMIN = "ADMIN", LEADER = "LEADER", MEMBER = "MEMBER" }`, `GUILD_ROLE_LABEL: Record<GuildRole, string>`, `canViewAllAttendance(role: GuildRole): boolean`, `canManageGuild(role: GuildRole): boolean` — import từ `@guild/shared/enums` và `@guild/shared/lib`.

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/api/src/__tests__/permissions.spec.ts
import { GuildRole } from '@guild/shared/enums';
import { canManageGuild, canViewAllAttendance } from '@guild/shared/lib';

describe('quyền theo vai', () => {
  it('chỉ MEMBER không được xem điểm danh cả bang', () => {
    expect(canViewAllAttendance(GuildRole.MEMBER)).toBe(false);
    expect(canViewAllAttendance(GuildRole.LEADER)).toBe(true);
    expect(canViewAllAttendance(GuildRole.ADMIN)).toBe(true);
  });

  it('chỉ ADMIN được quản trị bang', () => {
    expect(canManageGuild(GuildRole.MEMBER)).toBe(false);
    expect(canManageGuild(GuildRole.LEADER)).toBe(false);
    expect(canManageGuild(GuildRole.ADMIN)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- permissions`
Expected: FAIL — `Cannot find module` hoặc `canViewAllAttendance is not a function`.

- [ ] **Step 3: Viết enum vai trò**

```ts
// packages/shared/enums/role.enum.ts
/**
 * Vai trò trong bang. Đi qua mạng (nằm trong payload JWT và response `/auth/me`)
 * nên định nghĩa phải ở package dùng chung, và phải trùng giá trị enum GuildRole của Prisma.
 */
export enum GuildRole {
  /** Toàn quyền: quản lý thành viên, lịch đánh, đội hình, điểm danh hộ */
  ADMIN = "ADMIN",
  /** Cán bộ: xem điểm danh cả bang để nhắc nhở, chỉ tự điểm danh cho mình */
  LEADER = "LEADER",
  /** Bang chúng: chỉ thấy và điểm danh cho nhân vật của mình */
  MEMBER = "MEMBER",
}

/** Nhãn hiển thị tiếng Việt cho từng vai. */
export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  [GuildRole.ADMIN]: "Quản trị",
  [GuildRole.LEADER]: "Cán bộ",
  [GuildRole.MEMBER]: "Bang chúng",
};

/** Danh sách vai theo thứ tự hiển thị trong dropdown. */
export const GUILD_ROLE_OPTIONS: GuildRole[] = [
  GuildRole.MEMBER,
  GuildRole.LEADER,
  GuildRole.ADMIN,
];
```

- [ ] **Step 4: Viết hai vị ngữ quyền**

```ts
// packages/shared/lib/permissions.ts
import { GuildRole } from "../enums/role.enum";

/**
 * Vai này có được xem điểm danh của cả bang không.
 * Bang chúng chỉ thấy nhân vật của chính mình; cán bộ và quản trị thấy toàn bộ.
 * @param role - Vai của người đang đăng nhập
 * @returns true khi được xem toàn bang
 */
export function canViewAllAttendance(role: GuildRole): boolean {
  return role !== GuildRole.MEMBER;
}

/**
 * Vai này có được quản trị bang không (thành viên, lịch đánh, đội hình, điểm danh hộ).
 * @param role - Vai của người đang đăng nhập
 * @returns true khi là quản trị viên
 */
export function canManageGuild(role: GuildRole): boolean {
  return role === GuildRole.ADMIN;
}
```

```ts
// packages/shared/lib/index.ts — thêm dòng cuối
export * from './permissions';
```

- [ ] **Step 5: Build package rồi chạy lại test**

Run: `pnpm --filter @guild/shared build && pnpm --filter api test -- permissions`
Expected: PASS (2 test).

- [ ] **Step 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # phải là feat/discord-oauth-attendance
git add packages/shared apps/api/src/__tests__/permissions.spec.ts
git commit -m "feat(shared): add guild role enum and permission predicates"
```

**Lưu ý:** `ADMIN_ROLE` và type `Role` cũ vẫn còn được import ở `apps/api/src/common/constants/auth.constant.ts`, `auth.service.ts`, `attendance.service.ts` và `auth.schema.ts` → chúng vỡ ngay bây giờ. Task 2–8 sửa hết; nếu muốn typecheck xanh giữa chừng, làm liền mạch Task 1 → 8 rồi mới chạy `pnpm --filter api typecheck`.

---

## Task 2: Prisma schema và migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_discord_login/migration.sql` (do `prisma migrate dev` sinh)

**Interfaces:**
- Produces: cột `Character.discordId | discordUsername | lastLoginAt | role`, model `AuthExchange`, cột `AttendanceRecord.markedByCharacterId`, enum Prisma `GuildRole`.

- [ ] **Step 1: Sửa schema**

```prisma
/// Vai trò trong bang. Giá trị phải khớp enum GuildRole ở packages/shared/enums.
enum GuildRole {
  ADMIN
  LEADER
  MEMBER
}
```

Thêm vào model `Character` (giữ nguyên các trường cũ):

```prisma
  /// Discord ID (snowflake) do quản trị viên nhập tay. Null = thành viên chưa đăng nhập được.
  /// Nullable + @unique: Postgres cho nhiều NULL cùng tồn tại, nên "nhiều người chưa gán" là hợp lệ,
  /// còn "hai người cùng một ID" thì không.
  discordId       String?   @unique
  /// Tên Discord đọc lúc đăng nhập gần nhất — để quản trị viên xác nhận đã gán đúng người.
  discordUsername String?
  /// Null = chưa từng đăng nhập lần nào.
  lastLoginAt     DateTime?
  role            GuildRole @default(MEMBER)
```

Thêm vào model `AttendanceRecord`:

```prisma
  /// Ai bấm lượt điểm danh này. Null với dữ liệu ghi trước khi có đăng nhập.
  /// Không đặt quan hệ: xoá người bấm không được phép làm mất lượt điểm danh của người khác.
  markedByCharacterId String?
```

Thêm model mới:

```prisma
/// Mã dùng một lần để web đổi lấy cặp JWT sau khi API xử lý xong OAuth callback.
/// Sống 60 giây; hàng hết hạn được dọn ngay trong lần đổi mã kế tiếp.
model AuthExchange {
  /// 32 byte ngẫu nhiên base64url — chính là giá trị gửi cho web qua URL.
  id        String    @id
  /// Lưu discordId chứ không phải khoá ngoại: admin cứu hộ có thể không ứng với Character nào.
  discordId String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([expiresAt])
}
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm --filter api prisma:migrate --name discord_login`
Expected: tạo thư mục migration mới, `prisma generate` chạy lại, không hỏi reset dữ liệu (mọi cột mới đều nullable hoặc có default).

- [ ] **Step 3: Kiểm tra migration không phá dữ liệu**

Run: `pnpm --filter api prisma:status`
Expected: `Database schema is up to date!`

Đọc `migration.sql` vừa sinh và xác nhận: chỉ có `ALTER TABLE … ADD COLUMN`, `CREATE TYPE`, `CREATE TABLE`, `CREATE UNIQUE INDEX` — **không** có `DROP`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): add discord identity columns and auth exchange table"
```

---

## Task 3: Biến môi trường Discord

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/.env.example`
- Test: `apps/api/src/config/__tests__/env.validation.spec.ts` (tạo mới nếu chưa có)

**Interfaces:**
- Produces: `Env` có thêm `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_ADMIN_IDS`; **bỏ** `ADMIN_USERNAMES`, `ADMIN_PASSWORD`.

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/api/src/config/__tests__/env.validation.spec.ts
import { validateEnv } from '../env.validation';

/** Bộ biến môi trường tối thiểu để validateEnv đi qua. */
const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/guild',
  AUTH_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: '1234567890',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
};

describe('validateEnv', () => {
  it('nhận cấu hình Discord hợp lệ và mặc định DISCORD_ADMIN_IDS rỗng', () => {
    const env = validateEnv(base);

    expect(env.DISCORD_CLIENT_ID).toBe('1234567890');
    expect(env.DISCORD_ADMIN_IDS).toBe('');
  });

  it('chết ngay khi thiếu DISCORD_CLIENT_SECRET', () => {
    const { DISCORD_CLIENT_SECRET: _omitted, ...withoutSecret } = base;

    expect(() => validateEnv(withoutSecret)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- env.validation`
Expected: FAIL — `env.DISCORD_CLIENT_ID` là `undefined`.

- [ ] **Step 3: Sửa schema env**

Trong `envSchema`, **xoá** hai khối `ADMIN_USERNAMES` và `ADMIN_PASSWORD`, thêm:

```ts
  /** Client ID của Discord Application (Developer Portal → OAuth2). */
  DISCORD_CLIENT_ID: z.string().min(1),
  /** Client secret của Discord Application — chỉ tồn tại ở API, không bao giờ ở web. */
  DISCORD_CLIENT_SECRET: z.string().min(1),
  /**
   * Redirect URI đã khai trong Discord Developer Portal.
   * Phải khớp từng ký tự, kể cả dấu `/` cuối — Discord từ chối nếu lệch.
   */
  DISCORD_REDIRECT_URI: z.url(),
  /**
   * Danh sách Discord ID cứu hộ, phân tách bằng dấu phẩy.
   * Các ID này luôn đăng nhập được với quyền ADMIN kể cả khi không khớp Character nào —
   * đó là lối vào duy nhất khi database chưa ai được gán Discord ID.
   */
  DISCORD_ADMIN_IDS: z.string().default(''),
```

- [ ] **Step 4: Chạy lại test**

Run: `pnpm --filter api test -- env.validation`
Expected: PASS (2 test).

- [ ] **Step 5: Cập nhật `.env.example`**

Xoá hai dòng `ADMIN_USERNAMES=` / `ADMIN_PASSWORD=`, thêm:

```bash
# Discord OAuth2 — lấy ở https://discord.com/developers/applications
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback
# Discord ID cứu hộ (phân tách bằng dấu phẩy) — luôn vào được với quyền ADMIN
DISCORD_ADMIN_IDS=
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config apps/api/.env.example
git commit -m "feat(api): replace admin credentials env with discord oauth config"
```

---

## Task 4: `common` — payload JWT mới và `AdminGuard`

**Files:**
- Modify: `apps/api/src/common/constants/auth.constant.ts`
- Create: `apps/api/src/common/guards/admin.guard.ts`
- Modify: `apps/api/src/common/index.ts`
- Test: `apps/api/src/common/guards/__tests__/admin.guard.spec.ts`

**Interfaces:**
- Consumes: `GuildRole`, `canManageGuild` (Task 1).
- Produces: `JwtPayload { sub: string /* discordId */, role: GuildRole, type: TokenType }`, `TOKEN_TYPE.oauthState = 'oauth_state'`, `class AdminGuard implements CanActivate`.

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/api/src/common/guards/__tests__/admin.guard.spec.ts
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { AdminGuard } from '../admin.guard';
import { TOKEN_TYPE, type JwtPayload } from '../../constants/auth.constant';

/**
 * Dựng ExecutionContext giả chỉ mang `request.user`.
 * @param user - Payload JWT mà JwtAuthGuard lẽ ra đã gắn, undefined khi chưa qua guard đó
 * @returns Context đủ dùng cho AdminGuard
 */
function contextWith(user?: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('cho quản trị viên đi qua', () => {
    const user: JwtPayload = {
      sub: '123',
      role: GuildRole.ADMIN,
      type: TOKEN_TYPE.access,
    };

    expect(guard.canActivate(contextWith(user))).toBe(true);
  });

  it('chặn cán bộ và bang chúng', () => {
    for (const role of [GuildRole.LEADER, GuildRole.MEMBER]) {
      const user: JwtPayload = { sub: '123', role, type: TOKEN_TYPE.access };

      expect(() => guard.canActivate(contextWith(user))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('chặn khi request chưa qua JwtAuthGuard', () => {
    expect(() => guard.canActivate(contextWith())).toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- admin.guard`
Expected: FAIL — `Cannot find module '../admin.guard'`.

- [ ] **Step 3: Sửa hằng số JWT**

```ts
// apps/api/src/common/constants/auth.constant.ts
/**
 * Hằng số và kiểu của JWT dùng chung giữa guard (`common/`) và module auth (`modules/auth`).
 * Đặt ở `common/` vì guard không được phép import từ `modules/`.
 */
import type { GuildRole } from '@guild/shared/enums';

/**
 * Vai trò trong bang.
 * Định nghĩa thật nằm ở `@guild/shared/enums` vì giá trị này đi qua mạng
 * (`/auth/me`, payload JWT); re-export ở đây để guard không phải biết đường dẫn package.
 */
export { GuildRole } from '@guild/shared/enums';

/**
 * Loại token, ghi trong payload để một loại không dùng thay loại khác được.
 * `oauthState` là token ngắn hạn đi kèm tham số `state` của OAuth — nó không phải phiên đăng nhập.
 */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
  oauthState: 'oauth_state',
} as const;

/** Loại token hợp lệ. */
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** Nội dung được ký trong access/refresh token. */
export interface JwtPayload {
  /** Discord ID của người đăng nhập — khoá tra ngược ra Character */
  sub: string;
  /** Vai trong bang tại thời điểm phát token */
  role: GuildRole;
  /** Token này là access hay refresh */
  type: TokenType;
}
```

- [ ] **Step 4: Viết `AdminGuard`**

```ts
// apps/api/src/common/guards/admin.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { canManageGuild } from '@guild/shared/lib';

import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Chặn mọi request không phải quản trị viên.
 *
 * Luôn đứng **sau** `JwtAuthGuard` (`@UseGuards(JwtAuthGuard, AdminGuard)`): guard này chỉ đọc
 * `request.user` do guard kia gắn, tự nó không verify token. Trước khi có nhiều vai, `JwtAuthGuard`
 * chính là kiểm tra quyền admin — từ khi token của bang chúng cũng hợp lệ thì không còn đúng nữa.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  /**
   * Kiểm vai của người gọi.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns true khi người gọi là quản trị viên
   * @throws ForbiddenException khi không phải quản trị viên, hoặc request chưa qua JwtAuthGuard
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;

    if (!role || !canManageGuild(role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.');
    }

    return true;
  }
}
```

```ts
// apps/api/src/common/index.ts — thêm dòng, giữ thứ tự alphabet
export * from './guards/admin.guard';
```

- [ ] **Step 5: Chạy lại test**

Run: `pnpm --filter api test -- admin.guard`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common
git commit -m "feat(api): add admin guard and role-aware jwt payload"
```

---

## Task 5: `characters` — Discord ID, vai, và 409 khi trùng

**Files:**
- Modify: `packages/shared/schemas/character.schema.ts`
- Modify: `apps/api/src/modules/characters/characters.codec.ts`
- Modify: `apps/api/src/modules/characters/characters.service.ts`
- Modify: `apps/api/src/modules/characters/characters.controller.ts`
- Modify: `apps/api/src/modules/characters/characters.public.ts`
- Test: `apps/api/src/modules/characters/__tests__/characters.service.spec.ts`

**Interfaces:**
- Consumes: `GuildRole` (Task 1), `AdminGuard` (Task 4), cột mới (Task 2).
- Produces:
  - `guildMemberSchema` / `type GuildMember` (`@guild/shared/schemas`) — `characterSchema` **giữ nguyên** ba trường cũ và vẫn là shape của `/attendance/characters`.
  - `toGuildMember(row: GuildMemberRow): GuildMember` (`characters.public.ts`).
  - `CharactersService.findByDiscordId(discordId: string): Promise<{ id: string; role: GuildRole } | null>`
  - `CharactersService.touchLogin(id: string, discordUsername: string, at: Date): Promise<void>`

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/api/src/modules/characters/__tests__/characters.service.spec.ts — thêm describe mới
describe('gán Discord ID', () => {
  it('trả 409 khi Discord ID đã thuộc thành viên khác', async () => {
    const prisma = {
      character: {
        findUnique: jest.fn().mockResolvedValue({ id: 'meo-beo-k7ma3x' }),
        update: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    } as unknown as PrismaService;
    const service = new CharactersService(prisma);

    await expect(
      service.update('meo-beo-k7ma3x', { discordId: '123456789012345678' }),
    ).rejects.toThrow('Discord ID này đã được gán cho thành viên khác.');
  });

  it('tra được thành viên theo Discord ID', async () => {
    const prisma = {
      character: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'meo-beo-k7ma3x', role: 'LEADER' }),
      },
    } as unknown as PrismaService;
    const service = new CharactersService(prisma);

    await expect(service.findByDiscordId('123456789012345678')).resolves.toEqual({
      id: 'meo-beo-k7ma3x',
      role: 'LEADER',
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- characters.service`
Expected: FAIL — `service.findByDiscordId is not a function`.

- [ ] **Step 3: Mở rộng schema dùng chung**

```ts
// packages/shared/schemas/character.schema.ts — thêm vào cuối, giữ nguyên phần cũ
import { GuildRole } from "../enums/role.enum";

/** Regex Discord snowflake: 17–19 chữ số. */
const DISCORD_ID_PATTERN = /^\d{17,19}$/;

/**
 * Body của PATCH /characters/:id — sửa được từng phần.
 * `discordId` nhận null để gỡ liên kết; chuỗi rỗng cũng quy về null cho form dễ viết.
 */
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  discordId: z
    .union([z.string(), z.null()])
    .transform((value) => (value === null || value.trim() === "" ? null : value.trim()))
    .refine((value) => value === null || DISCORD_ID_PATTERN.test(value), {
      message: "Discord ID phải gồm 17–19 chữ số.",
    })
    .optional(),
  role: z.enum(GuildRole).optional(),
});

/**
 * Một thành viên nhìn từ màn quản trị: nhân vật cộng phần danh tính Discord.
 * Màn điểm danh dùng `characterSchema` (không có Discord ID) để cán bộ không đọc được
 * Discord ID của cả bang.
 */
export const guildMemberSchema = characterSchema.extend({
  /** Discord ID quản trị viên đã gán; null = chưa gán, người này chưa đăng nhập được */
  discordId: z.string().nullable(),
  /** Tên Discord đọc được ở lần đăng nhập gần nhất */
  discordUsername: z.string().nullable(),
  /** Thời điểm đăng nhập gần nhất (ISO string); null = chưa từng đăng nhập */
  lastLoginAt: z.string().nullable(),
  /** Vai trong bang */
  role: z.enum(GuildRole),
});

/** Kiểu thành viên ở màn quản trị. */
export type GuildMember = z.infer<typeof guildMemberSchema>;
```

Xoá dòng `export const updateCharacterSchema = createCharacterSchema.partial();` cũ (đã thay ở trên).

- [ ] **Step 4: Codec mới**

```ts
// apps/api/src/modules/characters/characters.codec.ts — thêm, giữ nguyên toCharacter
import type { GuildClass, GuildRole } from '@guild/shared/enums';
import { guildMemberSchema, type GuildMember } from '@guild/shared/schemas';

/** Những cột của bảng Character mà codec quản trị cần. */
export type GuildMemberRow = CharacterRow & {
  discordId: string | null;
  discordUsername: string | null;
  lastLoginAt: Date | null;
  role: string;
};

/**
 * Đổi một hàng Character thành object cho màn quản trị (kèm danh tính Discord).
 * @param row - Hàng đọc từ Prisma
 * @returns Thành viên đúng shape contract, thời điểm ở dạng ISO string
 */
export function toGuildMember(row: GuildMemberRow): GuildMember {
  return verifyResponse(guildMemberSchema, {
    id: row.id,
    name: row.name,
    guildClass: row.guildClass as GuildClass,
    discordId: row.discordId,
    discordUsername: row.discordUsername,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    role: row.role as GuildRole,
  } satisfies GuildMember);
}
```

- [ ] **Step 5: Sửa service**

Trong `characters.service.ts`:

1. Đổi `list()` và `create()`/`update()` sang `toGuildMember` và kiểu trả `GuildMember` (màn quản trị là người dùng duy nhất của chúng).
2. Thêm hằng và bọc `update` bằng try/catch:

```ts
/** Thông báo khi Discord ID đã thuộc về thành viên khác. */
const DISCORD_ID_TAKEN = 'Discord ID này đã được gán cho thành viên khác.';
```

```ts
  /**
   * Sửa tên, lưu phái, Discord ID và/hoặc vai. Id không đổi vì bảng khác đang trỏ vào nó.
   * @param id - Id thành viên
   * @param input - Các field cần đổi
   * @returns Thành viên sau khi sửa
   * @throws NotFoundException khi không có thành viên đó
   * @throws ConflictException khi Discord ID đã thuộc thành viên khác
   */
  async update(id: string, input: UpdateCharacterInput): Promise<GuildMember> {
    await this.ensureExists(id);

    try {
      const row = await this.prisma.character.update({ where: { id }, data: input });

      return toGuildMember(row);
    } catch (error) {
      // Ràng buộc duy nhất duy nhất có thể vỡ ở đây là discordId — id không nằm trong `data`.
      if (isUniqueViolation(error)) throw new ConflictException(DISCORD_ID_TAKEN);
      throw error;
    }
  }
```

3. Thêm hai method mới:

```ts
  /**
   * Tra thành viên theo Discord ID — đường vào của luồng đăng nhập.
   * @param discordId - Discord ID đọc từ hồ sơ OAuth
   * @returns Id và vai của thành viên, hoặc null khi chưa ai được gán ID này
   */
  async findByDiscordId(
    discordId: string,
  ): Promise<{ id: string; role: GuildRole } | null> {
    const row = await this.prisma.character.findUnique({
      where: { discordId },
      select: { id: true, role: true },
    });

    return row === null ? null : { id: row.id, role: row.role as GuildRole };
  }

  /**
   * Ghi lại tên Discord và thời điểm đăng nhập gần nhất.
   * Quản trị viên đọc hai giá trị này ở màn Thành viên để xác nhận đã gán đúng người.
   * @param id - Id thành viên
   * @param discordUsername - Tên Discord vừa đọc được
   * @param at - Thời điểm đăng nhập
   * @returns Promise hoàn tất khi đã ghi
   */
  async touchLogin(id: string, discordUsername: string, at: Date): Promise<void> {
    await this.prisma.character.update({
      where: { id },
      data: { discordUsername, lastLoginAt: at },
    });
  }
```

4. `characters.public.ts`: thêm `export { toGuildMember } from './characters.codec';` và `export type { GuildMemberRow } from './characters.codec';`.

- [ ] **Step 6: Siết controller sang `AdminGuard`**

```ts
// apps/api/src/modules/characters/characters.controller.ts
import { AdminGuard, JwtAuthGuard } from '../../common';
// …
@Controller('characters')
@UseGuards(JwtAuthGuard, AdminGuard)
```

Đổi kiểu trả của bốn method từ `Character` sang `GuildMember`.

- [ ] **Step 7: Chạy test**

Run: `pnpm --filter @guild/shared build && pnpm --filter api test -- characters`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/shared apps/api/src/modules/characters
git commit -m "feat(api): manage discord id and guild role on characters"
```

---

## Task 6: Client Discord và mã `state` (phần thuần, tách khỏi Nest)

**Files:**
- Create: `apps/api/src/modules/auth/discord-oauth.ts`
- Create: `apps/api/src/modules/auth/oauth-redirect.ts`
- Modify: `apps/api/src/modules/auth/auth.constant.ts`
- Test: `apps/api/src/modules/auth/__tests__/discord-oauth.spec.ts`
- Test: `apps/api/src/modules/auth/__tests__/oauth-redirect.spec.ts`

**Interfaces:**
- Produces:
  - `buildAuthorizeUrl(config: DiscordConfig, state: string): string`
  - `exchangeCodeForProfile(config: DiscordConfig, code: string): Promise<DiscordProfile>` với `DiscordProfile = { id: string; username: string }`
  - `type DiscordConfig = { clientId: string; clientSecret: string; redirectUri: string }`
  - `safeRedirect(value: string | undefined): string`
  - `webUrl(origin: string, path: string, params?: Record<string, string>): string`
  - `OAUTH_STATE_TTL = '5m'`, `EXCHANGE_TTL_MS = 60_000`, `AUTH_ERROR` (bảng mã lỗi)

- [ ] **Step 1: Viết test thất bại cho redirect**

```ts
// apps/api/src/modules/auth/__tests__/oauth-redirect.spec.ts
import { safeRedirect, webUrl } from '../oauth-redirect';

describe('safeRedirect', () => {
  it('giữ nguyên đường dẫn tương đối', () => {
    expect(safeRedirect('/lich-su-diem-danh')).toBe('/lich-su-diem-danh');
  });

  it('từ chối URL tuyệt đối và đường dẫn hai gạch (chống open redirect)', () => {
    expect(safeRedirect('https://evil.example/phish')).toBe('/');
    expect(safeRedirect('//evil.example/phish')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
  });
});

describe('webUrl', () => {
  it('ghép origin, path và query', () => {
    expect(webUrl('http://localhost:3000', '/dang-nhap', { error: 'tu-choi' })).toBe(
      'http://localhost:3000/dang-nhap?error=tu-choi',
    );
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- oauth-redirect`
Expected: FAIL — `Cannot find module '../oauth-redirect'`.

- [ ] **Step 3: Viết `oauth-redirect.ts`**

```ts
// apps/api/src/modules/auth/oauth-redirect.ts

/** Trang mặc định sau khi đăng nhập, cũng là giá trị an toàn khi redirect không hợp lệ. */
const DEFAULT_REDIRECT = '/';

/**
 * Lọc tham số `redirect` do client gửi lên.
 *
 * Chỉ chấp nhận đường dẫn tương đối một gạch. `//host` bị loại vì trình duyệt hiểu nó là
 * protocol-relative URL — nhận vào là mở đường cho open redirect ngay giữa luồng đăng nhập.
 * @param value - Giá trị `redirect` thô, undefined khi không có
 * @returns Đường dẫn an toàn để redirect sau khi đăng nhập
 */
export function safeRedirect(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT;

  return value;
}

/**
 * Dựng URL tuyệt đối trỏ về frontend.
 * @param origin - WEB_ORIGIN đã cấu hình
 * @param path - Đường dẫn tương đối, bắt đầu bằng `/`
 * @param params - Query string cần gắn thêm
 * @returns URL đầy đủ để trả trong header Location
 */
export function webUrl(
  origin: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
```

- [ ] **Step 4: Viết test thất bại cho client Discord**

```ts
// apps/api/src/modules/auth/__tests__/discord-oauth.spec.ts
import { buildAuthorizeUrl, exchangeCodeForProfile } from '../discord-oauth';

const config = {
  clientId: 'app-id',
  clientSecret: 'app-secret',
  redirectUri: 'http://localhost:3001/api/auth/discord/callback',
};

describe('buildAuthorizeUrl', () => {
  it('xin đúng scope identify và mang theo state', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-token'));

    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('scope')).toBe('identify');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-token');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
  });
});

describe('exchangeCodeForProfile', () => {
  afterEach(() => jest.restoreAllMocks());

  it('đổi code lấy token rồi đọc hồ sơ', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'discord-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '123456789012345678', username: 'meobeo' }), {
          status: 200,
        }),
      );

    await expect(exchangeCodeForProfile(config, 'auth-code')).resolves.toEqual({
      id: '123456789012345678',
      username: 'meobeo',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ném lỗi khi Discord từ chối đổi code', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{"error":"invalid_grant"}', { status: 400 }));

    await expect(exchangeCodeForProfile(config, 'bad-code')).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- discord-oauth`
Expected: FAIL — `Cannot find module '../discord-oauth'`.

- [ ] **Step 6: Viết `discord-oauth.ts`**

```ts
// apps/api/src/modules/auth/discord-oauth.ts

/** Endpoint OAuth2 của Discord — hằng số, không phải cấu hình theo môi trường. */
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const PROFILE_URL = 'https://discord.com/api/users/@me';

/**
 * Chỉ xin `identify`: tư cách thành viên do bảng Character quyết định, không do Discord.
 * Xin thêm scope là xin thêm dữ liệu không dùng tới.
 */
const SCOPE = 'identify';

/** Cấu hình Discord Application, đọc từ biến môi trường. */
export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Phần hồ sơ Discord mà hệ thống thực sự dùng. */
export interface DiscordProfile {
  /** Snowflake — khoá tra ngược ra Character */
  id: string;
  /** Tên hiển thị, chỉ dùng để quản trị viên xác nhận gán đúng người */
  username: string;
}

/**
 * Dựng URL đưa người dùng sang trang cho phép của Discord.
 * @param config - Cấu hình Discord Application
 * @param state - Token state ngắn hạn, Discord trả lại nguyên văn ở callback
 * @returns URL tuyệt đối để redirect
 */
export function buildAuthorizeUrl(config: DiscordConfig, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);

  return url.toString();
}

/**
 * Đổi `code` lấy access token của Discord rồi đọc hồ sơ người dùng.
 *
 * Access token ấy **không được lưu lại**: nó chỉ phục vụ đúng lời gọi `/users/@me` ngay dưới đây.
 * Bot sau này dùng bot token riêng, nên giữ token người dùng chỉ là thêm một thứ phải bảo vệ.
 * @param config - Cấu hình Discord Application
 * @param code - Mã uỷ quyền Discord gửi kèm callback
 * @returns Hồ sơ Discord tối giản
 * @throws Error khi Discord từ chối đổi code hoặc từ chối trả hồ sơ
 */
export async function exchangeCodeForProfile(
  config: DiscordConfig,
  code: string,
): Promise<DiscordProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord từ chối đổi code (${tokenResponse.status}).`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as {
    access_token?: string;
  };
  if (!accessToken) throw new Error('Discord không trả access token.');

  const profileResponse = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Không đọc được hồ sơ Discord (${profileResponse.status}).`);
  }

  const profile = (await profileResponse.json()) as { id?: string; username?: string };
  if (!profile.id || !profile.username) {
    throw new Error('Hồ sơ Discord thiếu id hoặc username.');
  }

  return { id: profile.id, username: profile.username };
}
```

- [ ] **Step 7: Bổ sung hằng số của module auth**

```ts
// apps/api/src/modules/auth/auth.constant.ts — thêm vào cuối, giữ nguyên hai hằng TTL cũ

/** Hạn của token `state` trong OAuth flow — chỉ cần đủ cho một vòng bấm "Cho phép". */
export const OAUTH_STATE_TTL = '5m';

/** Hạn của mã đổi lấy JWT (mili giây) — đủ cho một lần redirect, không hơn. */
export const EXCHANGE_TTL_MS = 60_000;

/** Mã lỗi gửi về web qua query string; web tra ra câu tiếng Việt. */
export const AUTH_ERROR = {
  /** Người dùng bấm Huỷ ở màn cho phép của Discord */
  denied: 'tu-choi',
  /** Discord ID không khớp thành viên nào và không nằm trong danh sách cứu hộ */
  notMember: 'khong-thuoc-bang',
  /** State hỏng, hết hạn hoặc sai loại */
  expired: 'phien-het-han',
  /** Không gọi được Discord */
  upstream: 'discord-loi',
} as const;
```

- [ ] **Step 8: Chạy test**

Run: `pnpm --filter api test -- "oauth"`
Expected: PASS (5 test).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): add discord oauth client and redirect helpers"
```

---

## Task 7: Module `auth` — ba endpoint OAuth, refresh và me

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts` (viết lại)
- Modify: `apps/api/src/modules/auth/auth.controller.ts` (viết lại)
- Modify: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/dto/discord-exchange.dto.ts`
- Delete: `apps/api/src/modules/auth/dto/login.dto.ts`
- Modify: `packages/shared/schemas/auth.schema.ts`
- Test: `apps/api/src/modules/auth/__tests__/auth.service.spec.ts` (viết lại)

**Interfaces:**
- Consumes: `CharactersService.findByDiscordId` / `touchLogin` (Task 5), `buildAuthorizeUrl` / `exchangeCodeForProfile` / `safeRedirect` / `webUrl` / `AUTH_ERROR` (Task 6), `Clock` (`common`), `PrismaService`.
- Produces:
  - `AuthService.authorizeUrl(redirect?: string): Promise<string>`
  - `AuthService.handleCallback(query: { code?: string; state?: string; error?: string }): Promise<string>` — trả **URL để redirect**, không bao giờ ném.
  - `AuthService.exchange(input: { code: string }): Promise<AuthTokens>`
  - `AuthService.refresh(input: RefreshTokenInput): Promise<AuthTokens>`
  - `AuthService.me(payload: JwtPayload): Promise<SessionUser>`
  - `sessionUserSchema` / `type SessionUser`, `discordExchangeSchema` (`@guild/shared/schemas`)

- [ ] **Step 1: Sửa schema dùng chung**

```ts
// packages/shared/schemas/auth.schema.ts — viết lại toàn bộ file
import { z } from "zod";

import { GuildRole } from "../enums/role.enum";
import { characterSchema } from "./character.schema";

/** Payload xin cặp token mới khi accessToken đã hết hạn. */
export const refreshTokenSchema = z.object({
  /** Refresh token còn hạn lấy từ lần đăng nhập/refresh trước */
  refreshToken: z.string().min(1, "Thiếu refresh token."),
});

/** Kiểu payload refresh đã validate. */
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/** Payload đổi mã dùng-một-lần (do API phát ở cuối OAuth callback) lấy cặp JWT. */
export const discordExchangeSchema = z.object({
  /** Mã ngẫu nhiên nằm trên query string mà API redirect về web */
  code: z.string().min(1, "Thiếu mã đăng nhập."),
});

/** Kiểu payload đổi mã đã validate. */
export type DiscordExchangeInput = z.infer<typeof discordExchangeSchema>;

/** Thông tin phiên đăng nhập API trả về — không bao giờ chứa token của Discord. */
export const sessionUserSchema = z.object({
  /** Discord ID của người đang đăng nhập */
  discordId: z.string(),
  /** Tên Discord đọc được ở lần đăng nhập gần nhất */
  discordUsername: z.string().nullable(),
  /** Vai trong bang */
  role: z.enum(GuildRole),
  /** Nhân vật gắn với tài khoản này; null chỉ xảy ra với quản trị viên cứu hộ */
  character: characterSchema.nullable(),
});

/** Cặp token phát ra sau khi đổi mã hoặc refresh thành công. */
export const authTokensSchema = z.object({
  /** Token dùng cho các request cần xác thực (hạn 1 ngày) */
  accessToken: z.string(),
  /** Token dùng để xin cặp token mới (hạn 1 tuần) */
  refreshToken: z.string(),
  /** Phiên ứng với cặp token này */
  user: sessionUserSchema,
});

/** Kiểu thông tin phiên API trả về. */
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Kiểu cặp token API trả về. */
export type AuthTokens = z.infer<typeof authTokensSchema>;
```

- [ ] **Step 2: Viết test thất bại**

```ts
// apps/api/src/modules/auth/__tests__/auth.service.spec.ts — viết lại toàn bộ file
import { UnauthorizedException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { AuthService } from '../auth.service';
import { AUTH_ERROR } from '../auth.constant';

/** Cấu hình env giả cho service. */
const config = {
  get: (key: string) =>
    ({
      WEB_ORIGIN: 'http://localhost:3000',
      DISCORD_CLIENT_ID: 'app-id',
      DISCORD_CLIENT_SECRET: 'app-secret',
      DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
      DISCORD_ADMIN_IDS: '999888777666555444',
    })[key],
} as never;

const now = new Date('2026-08-24T10:00:00.000Z');
const clock = { now: () => now } as never;

/**
 * Dựng AuthService với các phụ thuộc giả.
 * @param overrides - Prisma và CharactersService giả cho từng ca test
 * @returns Service đã sẵn sàng gọi
 */
function makeService(overrides: {
  characters?: Partial<Record<string, unknown>>;
  prisma?: Partial<Record<string, unknown>>;
  jwt?: Partial<Record<string, unknown>>;
}) {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
    ...overrides.jwt,
  };
  const prisma = {
    authExchange: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides.prisma,
  };
  const characters = {
    findByDiscordId: jest.fn().mockResolvedValue(null),
    touchLogin: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    ...overrides.characters,
  };

  return {
    service: new AuthService(config, jwt as never, prisma as never, characters as never, clock),
    jwt,
    prisma,
    characters,
  };
}

describe('AuthService.handleCallback', () => {
  it('đá về trang đăng nhập khi Discord ID không thuộc bang', async () => {
    const { service, jwt, prisma } = makeService({});
    jwt.verifyAsync.mockResolvedValue({
      sub: 'nonce',
      type: 'oauth_state',
      redirect: '/',
    });
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 't' }), { status: 200 }),
    );
    // Hồ sơ trả về một Discord ID lạ.
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 't' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '111', username: 'nguoila' }), { status: 200 }),
      );

    const url = await service.handleCallback({ code: 'c', state: 's' });

    expect(url).toContain(`error=${AUTH_ERROR.notMember}`);
    expect(prisma.authExchange.create).not.toHaveBeenCalled();
  });

  it('đá về trang đăng nhập khi người dùng bấm Huỷ', async () => {
    const { service } = makeService({});

    const url = await service.handleCallback({ error: 'access_denied' });

    expect(url).toContain(`error=${AUTH_ERROR.denied}`);
  });

  it('đá về trang đăng nhập khi state hỏng', async () => {
    const { service, jwt } = makeService({});
    jwt.verifyAsync.mockRejectedValue(new Error('bad signature'));

    const url = await service.handleCallback({ code: 'c', state: 'hong' });

    expect(url).toContain(`error=${AUTH_ERROR.expired}`);
  });
});

describe('AuthService.exchange', () => {
  it('từ chối mã đã dùng', async () => {
    const { service } = makeService({
      prisma: {
        authExchange: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    });

    await expect(service.exchange({ code: 'da-dung' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ép vai ADMIN cho Discord ID trong danh sách cứu hộ', async () => {
    const { service, prisma, characters } = makeService({
      characters: {
        findByDiscordId: jest
          .fn()
          .mockResolvedValue({ id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER }),
        findById: jest.fn().mockResolvedValue({
          id: 'meo-beo-k7ma3x',
          name: 'Mèo Béo',
          guildClass: 'THIET_Y',
        }),
      },
    });
    prisma.authExchange.updateMany.mockResolvedValue({ count: 1 });
    prisma.authExchange.findUnique.mockResolvedValue({
      id: 'ma',
      discordId: '999888777666555444',
    });

    const tokens = await service.exchange({ code: 'ma' });

    expect(tokens.user.role).toBe(GuildRole.ADMIN);
    expect(characters.findByDiscordId).toHaveBeenCalledWith('999888777666555444');
  });
});
```

- [ ] **Step 3: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- auth.service`
Expected: FAIL — `service.handleCallback is not a function`.

- [ ] **Step 4: Viết lại `auth.service.ts`**

```ts
// apps/api/src/modules/auth/auth.service.ts
import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GuildRole } from '@guild/shared/enums';
import type {
  AuthTokens,
  DiscordExchangeInput,
  RefreshTokenInput,
  SessionUser,
} from '@guild/shared/schemas';
import { sessionUserSchema } from '@guild/shared/schemas';

import { Clock, TOKEN_TYPE, readToken, type JwtPayload } from '../../common';
import { verifyResponse, type AppConfigService } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CharactersService, toCharacter } from '../characters/characters.public';
import {
  ACCESS_TOKEN_TTL,
  AUTH_ERROR,
  EXCHANGE_TTL_MS,
  OAUTH_STATE_TTL,
  REFRESH_TOKEN_TTL,
} from './auth.constant';
import {
  buildAuthorizeUrl,
  exchangeCodeForProfile,
  type DiscordConfig,
} from './discord-oauth';
import { safeRedirect, webUrl } from './oauth-redirect';

/** Thông báo duy nhất cho mọi ca phiên không dùng được — phân biệt là thông tin thừa. */
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

/** Đường dẫn trang đăng nhập ở web. */
const LOGIN_PATH = '/dang-nhap';

/** Đường dẫn route handler nhận mã đổi ở web. */
const CALLBACK_PATH = '/dang-nhap/discord';

/**
 * Xác thực bằng Discord OAuth2 và phát JWT.
 *
 * Danh tính đến từ cột `Character.discordId` do quản trị viên nhập tay: đăng nhập là một phép tra
 * cứu, không khớp thì cấm hoàn toàn. `DISCORD_ADMIN_IDS` là lối vào cứu hộ duy nhất cho tình huống
 * chưa ai được gán ID.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(ConfigService) private readonly config: AppConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Dựng URL đưa người dùng sang Discord, mang theo state đã ký.
   * @param redirect - Đường dẫn muốn quay lại sau khi đăng nhập
   * @returns URL tuyệt đối để redirect sang Discord
   */
  async authorizeUrl(redirect?: string): Promise<string> {
    const state = await this.jwt.signAsync(
      {
        sub: randomBytes(16).toString('base64url'),
        type: TOKEN_TYPE.oauthState,
        redirect: safeRedirect(redirect),
      },
      { expiresIn: OAUTH_STATE_TTL },
    );

    return buildAuthorizeUrl(this.discordConfig, state);
  }

  /**
   * Xử lý callback của Discord và cho biết phải redirect người dùng đi đâu.
   *
   * Không bao giờ ném: trình duyệt đang ở giữa một chuỗi redirect chứ không phải trong một lời gọi
   * fetch, nên mọi lỗi đều phải trở thành một URL kèm mã lỗi.
   * @param query - Tham số Discord gắn vào callback
   * @returns URL tuyệt đối để trả trong header Location
   */
  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (query.error || !query.code || !query.state) {
      return this.errorUrl(AUTH_ERROR.denied, '/');
    }

    const state = await this.readState(query.state);
    if (!state) return this.errorUrl(AUTH_ERROR.expired, '/');

    const profile = await exchangeCodeForProfile(this.discordConfig, query.code).catch(
      () => null,
    );
    if (!profile) return this.errorUrl(AUTH_ERROR.upstream, state.redirect);

    const member = await this.characters.findByDiscordId(profile.id);
    if (!member && !this.isRescueAdmin(profile.id)) {
      return this.errorUrl(AUTH_ERROR.notMember, state.redirect);
    }

    if (member) {
      await this.characters.touchLogin(member.id, profile.username, this.clock.now());
    }

    const code = await this.issueExchangeCode(profile.id);

    return webUrl(this.webOrigin, CALLBACK_PATH, {
      exchange: code,
      redirect: state.redirect,
    });
  }

  /**
   * Đổi mã dùng-một-lần lấy cặp JWT.
   * @param input - Mã lấy từ query string mà API vừa redirect về web
   * @returns Cặp token và thông tin phiên
   * @throws UnauthorizedException khi mã sai, đã dùng, hoặc đã quá 60 giây
   */
  async exchange(input: DiscordExchangeInput): Promise<AuthTokens> {
    const now = this.clock.now();

    // Dọn rác ngay tại đây thay vì dựng cron cho một bảng vài hàng.
    await this.prisma.authExchange.deleteMany({ where: { expiresAt: { lt: now } } });

    // Tiêu mã bằng một update nguyên tử: hai request cùng mã thì chỉ một request thắng.
    const consumed = await this.prisma.authExchange.updateMany({
      where: { id: input.code, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new UnauthorizedException(SESSION_EXPIRED);

    const row = await this.prisma.authExchange.findUnique({ where: { id: input.code } });
    if (!row) throw new UnauthorizedException(SESSION_EXPIRED);

    return this.issueTokens(row.discordId);
  }

  /**
   * Đổi refresh token còn hạn thành cặp token mới.
   *
   * Đây là chỗ việc đuổi một người khỏi hệ thống có hiệu lực: `discordId` đã bị gỡ khỏi mọi nhân
   * vật (và không nằm trong danh sách cứu hộ) thì phiên chấm dứt.
   * @param input - Refresh token hiện tại
   * @returns Cặp token mới và thông tin phiên
   * @throws UnauthorizedException khi token hỏng/hết hạn hoặc người này không còn trong bang
   */
  async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const payload = await readToken(
      input.refreshToken,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.refresh,
    );
    if (!payload) throw new UnauthorizedException(SESSION_EXPIRED);

    return this.issueTokens(payload.sub);
  }

  /**
   * Thông tin phiên của access token đang dùng.
   * @param payload - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Discord ID, vai và nhân vật gắn với tài khoản
   * @throws UnauthorizedException khi tài khoản không còn hợp lệ
   */
  async me(payload: JwtPayload): Promise<SessionUser> {
    return this.describeSession(payload.sub);
  }

  /** Cấu hình Discord Application đọc từ env. */
  private get discordConfig(): DiscordConfig {
    return {
      clientId: this.config.get('DISCORD_CLIENT_ID', { infer: true }),
      clientSecret: this.config.get('DISCORD_CLIENT_SECRET', { infer: true }),
      redirectUri: this.config.get('DISCORD_REDIRECT_URI', { infer: true }),
    };
  }

  /** Origin của frontend, dùng cho mọi URL redirect trả về. */
  private get webOrigin(): string {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }

  /**
   * Discord ID này có nằm trong danh sách cứu hộ không.
   * @param discordId - Discord ID vừa đọc từ hồ sơ
   * @returns true khi ID thuộc danh sách DISCORD_ADMIN_IDS
   */
  private isRescueAdmin(discordId: string): boolean {
    return this.config
      .get('DISCORD_ADMIN_IDS', { infer: true })
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .includes(discordId);
  }

  /**
   * Verify token `state` và đọc đường dẫn quay lại.
   * @param value - Giá trị state Discord trả lại
   * @returns Đường dẫn quay lại đã lọc, hoặc null khi state không dùng được
   */
  private async readState(value: string): Promise<{ redirect: string } | null> {
    const payload = await this.jwt
      .verifyAsync<{ type?: string; redirect?: string }>(value)
      .catch(() => null);

    if (payload?.type !== TOKEN_TYPE.oauthState) return null;

    return { redirect: safeRedirect(payload.redirect) };
  }

  /**
   * Ghi một mã đổi mới cho Discord ID vừa xác thực.
   * @param discordId - Discord ID đã qua kiểm tra tư cách thành viên
   * @returns Mã ngẫu nhiên để gắn vào URL trả về web
   */
  private async issueExchangeCode(discordId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');

    await this.prisma.authExchange.create({
      data: {
        id,
        discordId,
        expiresAt: new Date(this.clock.now().getTime() + EXCHANGE_TTL_MS),
      },
    });

    return id;
  }

  /**
   * Dựng thông tin phiên từ Discord ID.
   * @param discordId - Discord ID của người đăng nhập
   * @returns Thông tin phiên đã verify theo contract
   * @throws UnauthorizedException khi người này không còn trong bang và không phải admin cứu hộ
   */
  private async describeSession(discordId: string): Promise<SessionUser> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = this.isRescueAdmin(discordId);

    if (!member && !isRescue) throw new UnauthorizedException(SESSION_EXPIRED);

    const row = member ? await this.characters.findById(member.id) : null;

    return verifyResponse(sessionUserSchema, {
      discordId,
      discordUsername: row?.discordUsername ?? null,
      // Danh sách cứu hộ thắng giá trị trong database: quản trị viên không tự khoá mình ra ngoài.
      role: isRescue ? GuildRole.ADMIN : (member?.role ?? GuildRole.MEMBER),
      character: row ? toCharacter(row) : null,
    } satisfies SessionUser);
  }

  /**
   * Ký cặp token cho một Discord ID.
   * @param discordId - Discord ID đã xác thực
   * @returns Cặp token kèm thông tin phiên
   */
  private async issueTokens(discordId: string): Promise<AuthTokens> {
    const user = await this.describeSession(discordId);
    const base = { sub: discordId, role: user.role } as const;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, type: TOKEN_TYPE.access } satisfies JwtPayload, {
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwt.signAsync({ ...base, type: TOKEN_TYPE.refresh } satisfies JwtPayload, {
        expiresIn: REFRESH_TOKEN_TTL,
      }),
    ]);

    return { accessToken, refreshToken, user };
  }

  /**
   * URL trang đăng nhập kèm mã lỗi.
   * @param error - Mã lỗi trong bảng AUTH_ERROR
   * @param redirect - Đường dẫn người dùng định vào, để thử lại sau khi đăng nhập
   * @returns URL tuyệt đối để redirect
   */
  private errorUrl(error: string, redirect: string): string {
    return webUrl(this.webOrigin, LOGIN_PATH, { error, redirect });
  }
}
```

**Phụ thuộc mới cần thêm ở `characters` (nếu chưa có):** `CharactersService.findById(id)` trả nguyên hàng `GuildMemberRow` (dùng cho `describeSession`). Thêm vào `characters.service.ts` và export qua `characters.public.ts`:

```ts
  /**
   * Đọc nguyên một hàng thành viên theo id.
   * @param id - Id thành viên
   * @returns Hàng Character, hoặc null khi không tồn tại
   */
  async findById(id: string): Promise<GuildMemberRow | null> {
    return this.prisma.character.findUnique({ where: { id } });
  }
```

- [ ] **Step 5: Viết lại controller**

```ts
// apps/api/src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Gone, HttpCode, Post, Query, Redirect, UseGuards } from '@nestjs/common';
```

> `Gone` không phải decorator của Nest — dùng `GoneException` từ `@nestjs/common` bên trong handler.

```ts
import {
  Body,
  Controller,
  Get,
  GoneException,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthTokens, SessionUser } from '@guild/shared/schemas';

import { CurrentUser, JwtAuthGuard, type JwtPayload } from '../../common';
import { AuthService } from './auth.service';
import { DiscordExchangeDto } from './dto/discord-exchange.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Mở luồng đăng nhập: đưa người dùng sang trang cho phép của Discord.
   * @param redirect - Đường dẫn muốn quay lại sau khi đăng nhập
   * @returns Chỉ dẫn redirect cho Nest
   */
  @Get('discord')
  @Redirect()
  @ApiOperation({ summary: 'Mở đăng nhập bằng Discord' })
  async discord(@Query('redirect') redirect?: string): Promise<{ url: string }> {
    return { url: await this.auth.authorizeUrl(redirect) };
  }

  /**
   * Nhận callback của Discord rồi đẩy người dùng về web.
   * Mọi lỗi đều thành một redirect kèm mã lỗi — trình duyệt đang giữa chuỗi redirect.
   * @param query - code, state hoặc error do Discord gắn vào
   * @returns Chỉ dẫn redirect cho Nest
   */
  @Get('discord/callback')
  @Redirect()
  @ApiOperation({ summary: 'Callback OAuth2 của Discord' })
  async discordCallback(
    @Query() query: { code?: string; state?: string; error?: string },
  ): Promise<{ url: string }> {
    return { url: await this.auth.handleCallback(query) };
  }

  /**
   * Đổi mã dùng-một-lần lấy cặp JWT.
   * @param body - Mã lấy từ query string của trang callback
   * @returns Cặp token và thông tin phiên
   */
  @Post('discord/exchange')
  @ApiOperation({ summary: 'Đổi mã đăng nhập lấy token' })
  exchange(@Body() body: DiscordExchangeDto): Promise<AuthTokens> {
    return this.auth.exchange(body);
  }

  /**
   * Đổi refresh token còn hạn thành cặp token mới.
   * @param body - Refresh token hiện tại
   * @returns Cặp token mới và thông tin phiên
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Cấp lại token từ refresh token' })
  refresh(@Body() body: RefreshTokenDto): Promise<AuthTokens> {
    return this.auth.refresh(body);
  }

  /**
   * Thông tin phiên của access token đang dùng.
   * @param user - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Discord ID, vai và nhân vật gắn với tài khoản
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin phiên đang đăng nhập' })
  me(@CurrentUser() user: JwtPayload): Promise<SessionUser> {
    return this.auth.me(user);
  }

  /**
   * Đường đăng nhập cũ bằng tên đăng nhập/mật khẩu.
   * Giữ tạm để bản web cũ còn cache không nhận về một lỗi khó hiểu trong lúc hai app deploy lệch
   * nhau; xoá ở lần dọn sau khi cả hai đã lên.
   * @throws GoneException luôn luôn
   */
  @Post('login')
  @ApiOperation({ summary: 'Đã ngừng — đăng nhập nay dùng Discord', deprecated: true })
  login(): never {
    throw new GoneException('Cách đăng nhập đã thay đổi, vui lòng tải lại trang.');
  }
}
```

- [ ] **Step 6: DTO và module**

```ts
// apps/api/src/modules/auth/dto/discord-exchange.dto.ts
import { discordExchangeSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request đổi mã đăng nhập lấy token.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class DiscordExchangeDto extends createZodDto(discordExchangeSchema) {}
```

Xoá `apps/api/src/modules/auth/dto/login.dto.ts`.

`auth.module.ts`: thêm `imports: [JwtModule.registerAsync({…}), CharactersModule]` (giữ nguyên khối `JwtModule`), vì `AuthService` nay inject `CharactersService`. `PrismaModule` là `@Global` nên không cần import.

- [ ] **Step 7: Chạy test**

Run: `pnpm --filter @guild/shared build && pnpm --filter api test -- auth`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth packages/shared/schemas/auth.schema.ts
git commit -m "feat(api): replace password login with discord oauth endpoints"
```

---

## Task 8: `attendance` — lọc theo vai, luật ghi mới, endpoint summary

**Files:**
- Modify: `packages/shared/schemas/attendance.schema.ts`
- Modify: `apps/api/src/modules/attendance/attendance.controller.ts`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`
- Delete: `apps/api/src/common/guards/optional-jwt-auth.guard.ts` (+ dòng export trong `common/index.ts`)
- Test: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`

**Interfaces:**
- Consumes: `canViewAllAttendance` (Task 1), `JwtPayload` (Task 4), `CharactersService.findByDiscordId` (Task 5).
- Produces: `attendanceSummarySchema` / `type AttendanceSummary`; `AttendanceService.getCharacters(actor)`, `.getRecords(actor)`, `.getSummary()`, `.mark(input, actor)`.

- [ ] **Step 1: Thêm schema summary**

```ts
// packages/shared/schemas/attendance.schema.ts — thêm vào cuối
/**
 * Số lượt điểm danh của một trận, không kèm danh tính.
 * Bang chúng chỉ thấy hàng của chính mình nên mất cảm giác "trận này thiếu người";
 * con số này bù lại mà không lộ ai đăng ký trận nào.
 */
export const attendanceSummarySchema = z.object({
  /** ID buổi đánh */
  sessionId: z.string(),
  /** Số người trả lời Có */
  coCount: z.number().int().nonnegative(),
  /** Số người trả lời Không */
  khongCount: z.number().int().nonnegative(),
});

/** Kiểu số đếm điểm danh API trả về. */
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
```

- [ ] **Step 2: Viết test thất bại**

```ts
// apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts — thêm describe mới
import { ForbiddenException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

describe('điểm danh theo vai', () => {
  /** Payload JWT giả cho một vai. */
  const actor = (role: GuildRole, discordId = '111') => ({
    sub: discordId,
    role,
    type: 'access' as const,
  });

  it('bang chúng chỉ nhận nhân vật của chính mình', async () => {
    // characters.findByDiscordId trả nhân vật "meo-beo"; list() trả cả bang.
    const result = await service.getCharacters(actor(GuildRole.MEMBER));

    expect(result.map((c) => c.id)).toEqual(['meo-beo-k7ma3x']);
  });

  it('cán bộ nhận cả bang', async () => {
    const result = await service.getCharacters(actor(GuildRole.LEADER));

    expect(result.length).toBeGreaterThan(1);
  });

  it('cán bộ điểm danh hộ người khác thì bị chặn', async () => {
    await expect(
      service.mark(
        { characterId: 'nguoi-khac-abc123', sessionId: 'gw-2026-08-24', status: 'CO' },
        actor(GuildRole.LEADER),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('quản trị viên điểm danh hộ được và ghi lại người bấm', async () => {
    await service.mark(
      { characterId: 'nguoi-khac-abc123', sessionId: 'gw-2026-08-24', status: 'CO' },
      actor(GuildRole.ADMIN, '999'),
    );

    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ markedByCharacterId: expect.anything() }),
      }),
    );
  });
});
```

> Dựng `service`, `prisma`, `characters` giả theo đúng khuôn các test đã có trong file này (fixtures nằm ở `__tests__/fixtures`).

- [ ] **Step 3: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- attendance.service`
Expected: FAIL — `getCharacters` chưa nhận tham số, `mark` chưa ném `ForbiddenException`.

- [ ] **Step 4: Sửa service**

Thêm hằng và helper:

```ts
/** Thông báo khi người không phải quản trị viên điểm danh cho nhân vật khác. */
const NOT_YOUR_CHARACTER = 'Bạn chỉ điểm danh được cho nhân vật của mình.';
```

```ts
  /**
   * Nhân vật gắn với người đang gọi.
   * @param actor - Payload JWT của người gọi
   * @returns Id nhân vật, hoặc null khi tài khoản không gắn nhân vật nào (quản trị viên cứu hộ)
   */
  private async ownCharacterId(actor: JwtPayload): Promise<string | null> {
    const member = await this.characters.findByDiscordId(actor.sub);

    return member?.id ?? null;
  }
```

`getCharacters(actor)`:

```ts
  /**
   * Danh sách nhân vật cho màn điểm danh, lọc theo vai của người gọi.
   * Lọc ở đây chứ không ở giao diện: chỉ ẩn trên web thì mở DevTools là đọc được cả bảng.
   * @param actor - Payload JWT của người gọi
   * @returns Cả bang với cán bộ/quản trị; đúng nhân vật của mình với bang chúng
   */
  async getCharacters(actor: JwtPayload): Promise<Character[]> {
    if (canViewAllAttendance(actor.role)) return this.characters.list();

    const own = await this.ownCharacterId(actor);
    if (!own) return [];

    const row = await this.characters.findById(own);

    return row ? [toCharacter(row)] : [];
  }
```

`getRecords(actor)`: giữ nguyên truy vấn theo tuần đang mở, thêm điều kiện `characterId` khi `!canViewAllAttendance(actor.role)` (bang chúng chưa có nhân vật thì trả `[]`).

`getSummary()`:

```ts
  /**
   * Số lượt Có/Không của từng trận trong tuần đang mở.
   * @returns Mảng số đếm theo trận, không kèm danh tính ai
   */
  async getSummary(): Promise<AttendanceSummary[]> {
    const sessions = await this.battleSessions.listByWeek();
    const grouped = await this.prisma.attendanceRecord.groupBy({
      by: ['sessionId', 'status'],
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      _count: { _all: true },
    });

    return sessions.map((session) => {
      const rows = grouped.filter((row) => row.sessionId === session.id);
      const countOf = (status: AttendanceStatus) =>
        rows.find((row) => row.status === status)?._count._all ?? 0;

      return verifyResponse(attendanceSummarySchema, {
        sessionId: session.id,
        coCount: countOf(AttendanceStatus.PRESENT),
        khongCount: countOf(AttendanceStatus.ABSENT),
      } satisfies AttendanceSummary);
    });
  }
```

`mark(input, actor)` — `actor` nay **bắt buộc** (`JwtPayload`, không còn `null`). Chèn guard clause mới ngay sau khi kiểm nhân vật tồn tại:

```ts
    const isAdmin = canManageGuild(actor.role);
    const own = await this.ownCharacterId(actor);

    if (!isAdmin && characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_CHARACTER);
    }
```

và ghi thêm `markedByCharacterId: own` vào cả `create` lẫn `update` của `upsert`.

- [ ] **Step 5: Sửa controller**

```ts
@Controller('attendance')
@UseGuards(JwtAuthGuard)
```

- Bỏ `OptionalJwtAuthGuard` khỏi `mark`, đổi `@CurrentUser() user?: JwtPayload` thành `@CurrentUser() user: JwtPayload`.
- `getCharacters(@CurrentUser() user: JwtPayload)`, `getRecords(@CurrentUser() user: JwtPayload)`.
- Thêm:

```ts
  /**
   * Số lượt Có/Không của từng trận trong tuần đang mở.
   * @returns Mảng số đếm theo trận
   */
  @Get('summary')
  @ApiOperation({ summary: 'Số người đã điểm danh mỗi trận' })
  getSummary(): Promise<AttendanceSummary[]> {
    return this.attendance.getSummary();
  }
```

- [ ] **Step 6: Xoá `OptionalJwtAuthGuard`**

```bash
git rm apps/api/src/common/guards/optional-jwt-auth.guard.ts
```

Xoá dòng `export * from './guards/optional-jwt-auth.guard';` trong `apps/api/src/common/index.ts`.

Run: `grep -rn "OptionalJwtAuthGuard" apps/api/src` → phải không còn kết quả nào.

- [ ] **Step 7: Chạy test**

Run: `pnpm --filter @guild/shared build && pnpm --filter api test -- attendance`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src packages/shared/schemas/attendance.schema.ts
git commit -m "feat(api): scope attendance reads and writes to the signed-in member"
```

---

## Task 9: Siết guard cho các endpoint quản trị còn lại

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts`
- Test: `apps/api/src/modules/__tests__/admin-endpoints.spec.ts`

**Interfaces:**
- Consumes: `AdminGuard`, `JwtAuthGuard` (Task 4).

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/api/src/modules/__tests__/admin-endpoints.spec.ts
import { AdminGuard, JwtAuthGuard } from '../../common';
import { BattleSessionsController } from '../battle-sessions/battle-sessions.controller';
import { TeamBuilderController } from '../team-builder/team-builder.controller';
import { CharactersController } from '../characters/characters.controller';

/**
 * Đọc danh sách guard mà Nest gắn cho một method (hoặc cho cả class khi bỏ trống `method`).
 * @param target - Class controller
 * @param method - Tên method cần đọc; bỏ trống để đọc guard cấp class
 * @returns Mảng class guard
 */
function guardsOf(target: object, method?: string): unknown[] {
  const source = method
    ? (target as Record<string, object>).prototype
    : target;

  return (
    Reflect.getMetadata('__guards__', method ? (source as never)[method] : source) ?? []
  );
}

describe('endpoint quản trị', () => {
  it('team-builder và characters khoá ở cấp controller', () => {
    for (const controller of [TeamBuilderController, CharactersController]) {
      expect(guardsOf(controller)).toEqual([JwtAuthGuard, AdminGuard]);
    }
  });

  it('battle-sessions: đọc lịch chỉ cần đăng nhập, sửa lịch phải là quản trị', () => {
    expect(guardsOf(BattleSessionsController)).toEqual([JwtAuthGuard]);
    expect(guardsOf(BattleSessionsController, 'create')).toEqual([AdminGuard]);
    expect(guardsOf(BattleSessionsController, 'update')).toEqual([AdminGuard]);
    expect(guardsOf(BattleSessionsController, 'remove')).toEqual([AdminGuard]);
    expect(guardsOf(BattleSessionsController, 'weeks')).toEqual([AdminGuard]);
  });
});
```

> Nếu tên method của `BattleSessionsController` khác (`listWeeks`…), sửa test cho khớp mã thật — đọc file trước khi viết.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- admin-endpoints`
Expected: FAIL.

- [ ] **Step 3: Gắn guard**

- `battle-sessions.controller.ts`: `@UseGuards(JwtAuthGuard)` ở cấp class (mọi route đọc nay cần đăng nhập), thêm `@UseGuards(AdminGuard)` lên từng route ghi và route `weeks`.
- `team-builder.controller.ts`: đổi `@UseGuards(JwtAuthGuard)` thành `@UseGuards(JwtAuthGuard, AdminGuard)`.

- [ ] **Step 4: Chạy test**

Run: `pnpm --filter api test -- admin-endpoints`
Expected: PASS (2 test).

- [ ] **Step 5: Toàn bộ test + lint + typecheck của API**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: xanh hết. Đây là điểm dừng của toàn bộ phần backend.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): require admin role on guild management endpoints"
```

---

## Task 10: Web — lõi phiên đăng nhập mới

**Files:**
- Modify: `apps/web/features/auth/core/auth-api.ts`
- Modify: `apps/web/features/auth/core/jwt.ts`
- Modify: `apps/web/features/auth/core/index.ts`
- Create: `apps/web/features/auth/core/access.ts`
- Modify: `apps/web/features/auth/api/session.ts`
- Create: `apps/web/features/auth/api/me.ts`
- Create: `apps/web/features/auth/hooks/use-session.ts`
- Modify: `apps/web/features/auth/api/login-action.ts`
- Modify: `apps/web/features/auth/index.ts`
- Test: `apps/web/features/auth/core/__tests__/access.test.ts`

**Interfaces:**
- Consumes: `GuildRole`, `canManageGuild` (Task 1); `POST /auth/discord/exchange`, `GET /auth/me` (Task 7).
- Produces:
  - `exchangeRequest(code: string): Promise<AuthTokens>`
  - `decideAccess(input: { pathname: string; role: GuildRole | null }): AccessDecision` với `type AccessDecision = "allow" | "login" | "home"`
  - `SessionUser = { discordId: string; role: GuildRole }` (đọc từ JWT), `getSession()`
  - `fetchMe(): Promise<SessionUser>` (server action, gọi `/auth/me`)
  - `useSession()` — TanStack Query bọc `fetchMe`, key `["auth","me"]`

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/web/features/auth/core/__tests__/access.test.ts
import { describe, expect, it } from "vitest";
import { GuildRole } from "@guild/shared/enums";

import { decideAccess } from "../access";

describe("decideAccess", () => {
  it("khách chỉ vào được trang đăng nhập", () => {
    expect(decideAccess({ pathname: "/dang-nhap", role: null })).toBe("allow");
    expect(decideAccess({ pathname: "/dang-nhap/discord", role: null })).toBe("allow");
    expect(decideAccess({ pathname: "/", role: null })).toBe("login");
    expect(decideAccess({ pathname: "/xep-team", role: null })).toBe("login");
  });

  it("bang chúng và cán bộ không vào được route quản trị", () => {
    for (const role of [GuildRole.MEMBER, GuildRole.LEADER]) {
      expect(decideAccess({ pathname: "/xep-team", role })).toBe("home");
      expect(decideAccess({ pathname: "/thiet-lap", role })).toBe("home");
      expect(decideAccess({ pathname: "/", role })).toBe("allow");
    }
  });

  it("quản trị viên vào được mọi route", () => {
    expect(decideAccess({ pathname: "/xep-team", role: GuildRole.ADMIN })).toBe("allow");
    expect(decideAccess({ pathname: "/thiet-lap", role: GuildRole.ADMIN })).toBe("allow");
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- access`
Expected: FAIL — `Cannot find module '../access'`.

- [ ] **Step 3: Viết `access.ts`**

```ts
// apps/web/features/auth/core/access.ts
import { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

/** Các route công khai duy nhất — mọi trang khác đều cần phiên đăng nhập. */
const PUBLIC_PATH_PREFIXES = [ROUTES.login];

/** Các route chỉ dành cho quản trị viên. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

/** Kết luận cho một request trang. */
export type AccessDecision =
  /** Cho đi tiếp */
  | "allow"
  /** Đá về trang đăng nhập (kèm redirect quay lại) */
  | "login"
  /** Đã đăng nhập nhưng không đủ quyền — đá về trang điểm danh */
  | "home";

/**
 * Quyết định một request trang được đi tiếp hay bị đá đi đâu.
 *
 * Tách khỏi `proxy.ts` để test được mà không phải dựng NextRequest: proxy chỉ còn việc đọc cookie
 * và dịch kết luận này thành response.
 * @param input.pathname - Đường dẫn đang vào
 * @param input.role - Vai đọc từ access token, null khi chưa đăng nhập
 * @returns Kết luận cho request
 */
export function decideAccess({
  pathname,
  role,
}: {
  pathname: string;
  role: GuildRole | null;
}): AccessDecision {
  const isPublic = PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isPublic) return "allow";
  if (!role) return "login";

  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return isAdminPath && !canManageGuild(role) ? "home" : "allow";
}
```

Thêm route vào `apps/web/config/routes.ts`:

```ts
  login: "/dang-nhap",
  loginCallback: "/dang-nhap/discord",
```

- [ ] **Step 4: Chạy lại test**

Run: `pnpm --filter web test -- access`
Expected: PASS (3 test).

- [ ] **Step 5: Đổi `auth-api.ts`**

Xoá `loginRequest`, thêm:

```ts
/**
 * Đổi mã dùng-một-lần (API gắn vào URL sau khi xử lý xong OAuth callback) lấy cặp token.
 * @param code - Giá trị `?exchange=` trên URL callback
 * @returns Cặp token và thông tin phiên
 * @throws ApiError khi mã sai, đã dùng hoặc đã quá hạn
 */
export function exchangeRequest(code: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/discord/exchange", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
```

Sửa `core/index.ts`: `export { refreshRequest, exchangeRequest } from "./auth-api";` và thêm `export { decideAccess, type AccessDecision } from "./access";`.

- [ ] **Step 6: Đổi `jwt.ts` và `session.ts`**

`jwt.ts` — `JwtPayload.sub` nay là Discord ID, `role` là `GuildRole`:

```ts
import type { GuildRole } from "@guild/shared/enums";

export interface JwtPayload {
  /** Discord ID của người đăng nhập */
  sub: string;
  /** Vai trong bang */
  role: GuildRole;
  /** Token này là "access" hay "refresh" */
  type: string;
  /** Thời điểm hết hạn (epoch giây) */
  exp: number;
}
```

`session.ts` — `SessionUser` đổi shape:

```ts
/** Người đang đăng nhập, đọc từ access token. */
export interface SessionUser {
  /** Discord ID */
  discordId: string;
  /** Vai trong bang */
  role: GuildRole;
}
```

và `getSession()` trả `{ discordId: payload.sub, role: payload.role }`.

- [ ] **Step 7: Thêm `me.ts` và `use-session.ts`**

```ts
// apps/web/features/auth/api/me.ts
"use server";

import type { SessionUser } from "@guild/shared/schemas";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "./session";

/**
 * Đọc thông tin phiên đầy đủ từ backend (vai và nhân vật gắn với tài khoản).
 * Chạy ở server vì access token nằm trong cookie httpOnly — client không tự gắn header được.
 * @returns Discord ID, vai và nhân vật của người đang đăng nhập
 * @throws ApiError khi chưa đăng nhập hoặc phiên đã hết hạn
 */
export async function fetchMe(): Promise<SessionUser> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
  }

  return apiFetch<SessionUser>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
```

```ts
// apps/web/features/auth/hooks/use-session.ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/me";

/** Query key của phiên đăng nhập — dùng chung để invalidate sau khi đăng xuất. */
export const sessionKeys = { me: () => ["auth", "me"] as const };

/**
 * Query thông tin phiên đang đăng nhập (vai và nhân vật của mình).
 * @returns Kết quả query TanStack (data là SessionUser)
 */
export function useSession() {
  return useQuery({ queryKey: sessionKeys.me(), queryFn: fetchMe });
}
```

`login-action.ts`: xoá hàm `login` và interface `LoginResult`, giữ `logout`.
`features/auth/index.ts`: bỏ `LoginButton` cũ, export `getAccessToken`, `getSession`, `SessionUser`, `useSession`, `fetchMe`, `DiscordLoginButton` (Task 11).

- [ ] **Step 8: Chạy test và typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: test PASS. `typecheck` **còn đỏ** ở `login-dialog.tsx`, `login-button.tsx`, `proxy.ts`, `site-header.tsx`, `attendance-*` — Task 11–13 dọn nốt.

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/auth apps/web/config/routes.ts
git commit -m "feat(web): replace password session core with discord exchange"
```

---

## Task 11: Web — trang đăng nhập và route handler nhận mã

**Files:**
- Create: `apps/web/app/dang-nhap/page.tsx`
- Create: `apps/web/app/dang-nhap/discord/route.ts`
- Create: `apps/web/features/auth/components/discord-login-button.tsx`
- Create: `apps/web/features/auth/lib/login-error.ts`
- Modify: `apps/web/features/auth/components/login-button.tsx` (chỉ còn đăng xuất)
- Delete: `apps/web/features/auth/components/login-dialog.tsx`, `apps/web/features/auth/store/auth-store.ts`
- Modify: `apps/web/components/shared/site-header.tsx`
- Test: `apps/web/features/auth/lib/__tests__/login-error.test.ts`

**Interfaces:**
- Consumes: `exchangeRequest`, `createSession` (Task 10); `AUTH_ERROR` mã lỗi (Task 6).
- Produces: `loginErrorMessage(code: string | undefined): string | null`, `DiscordLoginButton({ redirect }: { redirect?: string })`.

**Vì sao là Route Handler, không phải Server Component:** Server Component **không ghi được cookie**. Trang callback phải set cookie phiên, nên nó là `route.ts` trả `NextResponse.redirect` — cùng lý do `proxy.ts` là chỗ duy nhất còn lại ghi được cookie.

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/web/features/auth/lib/__tests__/login-error.test.ts
import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "../login-error";

describe("loginErrorMessage", () => {
  it("dịch mã lỗi backend sang câu tiếng Việt", () => {
    expect(loginErrorMessage("khong-thuoc-bang")).toBe(
      "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên."
    );
    expect(loginErrorMessage("tu-choi")).toBe("Bạn đã huỷ đăng nhập bằng Discord.");
  });

  it("không có mã thì không hiện gì; mã lạ thì hiện câu chung", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("gi-do-la")).toBe(
      "Không đăng nhập được, vui lòng thử lại."
    );
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- login-error`
Expected: FAIL — `Cannot find module '../login-error'`.

- [ ] **Step 3: Viết bảng thông báo lỗi**

```ts
// apps/web/features/auth/lib/login-error.ts

/** Câu dùng khi backend gửi một mã lỗi không nằm trong bảng. */
const FALLBACK = "Không đăng nhập được, vui lòng thử lại.";

/**
 * Câu tiếng Việt cho từng mã lỗi backend gắn vào `?error=`.
 * Mã phải khớp `AUTH_ERROR` ở `apps/api/src/modules/auth/auth.constant.ts`.
 */
const MESSAGES: Record<string, string> = {
  "tu-choi": "Bạn đã huỷ đăng nhập bằng Discord.",
  "khong-thuoc-bang":
    "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên.",
  "phien-het-han": "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  "discord-loi": "Không kết nối được Discord, vui lòng thử lại sau.",
};

/**
 * Dịch mã lỗi trên query string thành câu hiển thị.
 * @param code - Giá trị `?error=`, undefined khi không có
 * @returns Câu tiếng Việt, hoặc null khi không có lỗi nào để hiện
 */
export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;

  return MESSAGES[code] ?? FALLBACK;
}
```

- [ ] **Step 4: Chạy lại test**

Run: `pnpm --filter web test -- login-error`
Expected: PASS (2 test).

- [ ] **Step 5: Nút đăng nhập và trang `/dang-nhap`**

```tsx
// apps/web/features/auth/components/discord-login-button.tsx
import { API_BASE_URL } from "@/config/api";
import { Button } from "@/components/ui/button";

interface DiscordLoginButtonProps {
  /** Đường dẫn muốn quay lại sau khi đăng nhập xong */
  redirect?: string;
}

/**
 * Nút mở luồng đăng nhập Discord.
 * Là thẻ `a` chứ không phải `fetch`: luồng OAuth là một chuỗi redirect của trình duyệt,
 * bắt đầu bằng một điều hướng thật sang API.
 * @param redirect - Đường dẫn quay lại sau khi đăng nhập
 * @returns Nút dẫn sang API để mở OAuth
 */
export function DiscordLoginButton({ redirect = "/" }: DiscordLoginButtonProps) {
  const href = `${API_BASE_URL}/auth/discord?redirect=${encodeURIComponent(redirect)}`;

  return (
    <Button render={<a href={href} />} size="lg">
      Đăng nhập bằng Discord
    </Button>
  );
}
```

```tsx
// apps/web/app/dang-nhap/page.tsx
import type { Metadata } from "next";

import { DiscordLoginButton } from "@/features/auth";
import { loginErrorMessage } from "@/features/auth/lib/login-error";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Đăng nhập — Mèo Mập Giang Hồ",
  description: "Đăng nhập bằng Discord để điểm danh",
};

/**
 * Route "/dang-nhap" — trang duy nhất khách chưa đăng nhập vào được.
 * @param props.searchParams - `error` (mã lỗi từ API) và `redirect` (trang định vào)
 * @returns Trang đăng nhập
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;
  const message = loginErrorMessage(error);

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-xl font-semibold">Mèo Mập Giang Hồ</h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập bằng Discord để xem và điểm danh lịch đánh trong tuần.
        </p>
        {message && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        )}
        <DiscordLoginButton redirect={redirect} />
      </CardContent>
    </Card>
  );
}
```

`features/auth/lib/login-error.ts` phải được export qua `features/auth/index.ts` nếu trang import qua `@/features/auth` (đúng luật "không với tay vào file nội bộ của feature khác") — thêm `export { loginErrorMessage } from "./lib/login-error";` và sửa import trong page thành `@/features/auth`.

- [ ] **Step 6: Route handler nhận mã đổi**

```ts
// apps/web/app/dang-nhap/discord/route.ts
import { NextResponse, type NextRequest } from "next/server";

import { createSession } from "@/features/auth/api/session";
import { exchangeRequest } from "@/features/auth/core";
import { ROUTES } from "@/config/routes";

/**
 * Route "/dang-nhap/discord" — nhận mã đổi API gắn vào URL, lấy cặp token và ghi cookie phiên.
 *
 * Là Route Handler chứ không phải trang: Server Component không ghi được cookie.
 * @param request - Request kèm `?exchange=` và `?redirect=`
 * @returns Redirect về trang người dùng định vào, hoặc về trang đăng nhập kèm mã lỗi
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("exchange");
  const redirect = request.nextUrl.searchParams.get("redirect") ?? ROUTES.attendance;

  if (!code) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=phien-het-han`, request.url)
    );
  }

  const tokens = await exchangeRequest(code).catch(() => null);
  if (!tokens) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=phien-het-han`, request.url)
    );
  }

  await createSession(tokens);

  // Chỉ nhận đường dẫn tương đối — cùng lý do `safeRedirect` ở API.
  const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : ROUTES.attendance;

  return NextResponse.redirect(new URL(target, request.url));
}
```

- [ ] **Step 7: Dọn nút đăng nhập cũ**

- `login-button.tsx`: bỏ nhánh chưa đăng nhập và `LoginDialog`; nhận prop `label: string | null` (tên nhân vật hoặc tên Discord) và chỉ render nút Đăng xuất. Sau `logout()` gọi `router.replace(ROUTES.login)`.
- Xoá `login-dialog.tsx` và `store/auth-store.ts` (`git rm`).
- `site-header.tsx`: `const session = await getSession();` → truyền `isAdmin={session ? canManageGuild(session.role) : false}` cho `MainNav`, và render `LoginButton` chỉ khi có phiên.

Run: `grep -rn "LoginDialog\|useAuthStore\|loginRequest\|login-action.*login\b" apps/web` → không còn kết quả.

- [ ] **Step 8: Chạy test**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): add discord login page and session callback handler"
```

---

## Task 12: Web — `proxy.ts` đảo mặc định

**Files:**
- Modify: `apps/web/proxy.ts`

**Interfaces:**
- Consumes: `decideAccess` (Task 10), `verifyJwt`, `refreshRequest`, cookie helpers.

- [ ] **Step 1: Viết lại phần quyết định của proxy**

Giữ nguyên `readAuthSecret`, `renewSession` và khối gia hạn token. Thay đoạn cuối (từ chỗ tính `isAdminPath`) bằng:

```ts
  // Đến đây nghĩa là không có access token dùng được và cũng không gia hạn được.
  const decision = decideAccess({ pathname: request.nextUrl.pathname, role: null });
  const response =
    decision === "allow"
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl(request));

  // Xóa cookie hỏng/hết hạn để tránh gửi lại ở các request sau.
  if (accessToken) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  if (refreshToken) response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
```

Và trong nhánh token còn hạn (`if (access) …`), thay `return NextResponse.next();` bằng:

```ts
    if (access) {
      const decision = decideAccess({
        pathname: request.nextUrl.pathname,
        role: access.role,
      });

      if (decision === "home") {
        return NextResponse.redirect(new URL(ROUTES.attendance, request.url));
      }

      return NextResponse.next();
    }
```

Thêm helper:

```ts
/**
 * URL trang đăng nhập, mang theo đường dẫn người dùng đang định vào.
 * @param request - Request đang xử lý
 * @returns URL tuyệt đối của trang đăng nhập
 */
function loginUrl(request: NextRequest): URL {
  const url = new URL(ROUTES.login, request.url);
  url.searchParams.set("redirect", request.nextUrl.pathname);

  return url;
}
```

Áp cùng cách xử lý `decision` cho nhánh vừa gia hạn token thành công (`renewSession`): kiểm `decideAccess` với `role` của token mới trước khi trả response.

- [ ] **Step 2: Kiểm bằng tay ba ca**

Run: `pnpm --filter web dev` (cần API chạy song song, `pnpm --filter api dev`)
Expected:
- Chưa đăng nhập, vào `/` → nhảy sang `/dang-nhap?redirect=%2F`.
- Đăng nhập bằng tài khoản MEMBER, vào `/xep-team` → nhảy về `/`.
- Đăng nhập bằng tài khoản ADMIN, vào `/xep-team` → vào được.

- [ ] **Step 3: Chạy test + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: test PASS; typecheck còn đỏ ở feature `attendance` (Task 13) và `members` (Task 14).

- [ ] **Step 4: Commit**

```bash
git add apps/web/proxy.ts
git commit -m "feat(web): require a session on every page and gate admin routes by role"
```

---

## Task 13: Web — màn điểm danh theo vai

**Files:**
- Modify: `apps/web/features/attendance/api/attendance-api.ts` (chuyển sang `"use server"`)
- Delete: `apps/web/features/attendance/api/mark-attendance-action.ts`
- Modify: `apps/web/features/attendance/api/attendance-keys.ts` (thêm key `summary`)
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts`
- Create: `apps/web/features/attendance/components/member-attendance-card.tsx`
- Modify: `apps/web/features/attendance/components/attendance-screen.tsx`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Modify: `apps/web/app/page.tsx`, `apps/web/app/lich-su-diem-danh/page.tsx`
- Modify: `apps/web/features/attendance/index.ts`
- Modify: `apps/web/features/attendance/api/__tests__/attendance-api.test.ts`

**Interfaces:**
- Consumes: `GET /attendance/characters|records|summary`, `POST /attendance` (Task 8); `useSession` (Task 10).
- Produces: `fetchAttendanceSummary(): Promise<AttendanceSummary[]>`, `useAttendanceSummary()`, `MemberAttendanceCard`.

**Vì sao phải đổi `attendance-api.ts`:** cookie phiên là httpOnly và nằm ở domain web, còn API ở domain khác — code chạy ở **client không gắn được `Authorization`**. Từ nay mọi endpoint điểm danh đều cần Bearer, nên các hàm request phải là Server Action đọc token từ cookie, đúng khuôn `features/members/api/members-api.ts` đang dùng.

- [ ] **Step 1: Chuyển `attendance-api.ts` sang Server Action**

- Thêm `"use server";` ở dòng đầu.
- **Xoá** dòng `export type { MarkAttendanceInput };` — file `"use server"` chỉ được export hàm async; component import type thẳng từ `@guild/shared/schemas`.
- Mọi hàm export phải là `async`.
- Thêm helper `authHeader()` giống `members-api.ts` (trùng lặp có chủ ý — file `"use server"` không export được hàm đồng bộ dùng chung).
- Gắn `headers: await authHeader()` cho **mọi** lời gọi trong file.
- Thêm:

```ts
/**
 * Lấy số lượt Có/Không của từng trận trong tuần đang mở.
 * @returns Mảng số đếm theo trận
 */
export async function fetchAttendanceSummary(): Promise<AttendanceSummary[]> {
  return apiFetch<AttendanceSummary[]>("/attendance/summary", {
    headers: await authHeader(),
  });
}
```

- [ ] **Step 2: Xoá đường điểm danh riêng của admin**

```bash
git rm apps/web/features/attendance/api/mark-attendance-action.ts
```

Trong `use-attendance.ts`: xoá `useMarkAttendanceAsAdmin` và import của nó; `useMarkAttendance` nay là đường duy nhất (đã mang token). Thêm:

```ts
/**
 * Query số người đã điểm danh mỗi trận — dùng cho màn của bang chúng,
 * nơi không thấy hàng của người khác.
 * @returns Kết quả query TanStack (data là mảng số đếm theo trận)
 */
export function useAttendanceSummary() {
  return useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: fetchAttendanceSummary,
  });
}
```

Trong `attendance-keys.ts` thêm `summary: () => [...attendanceKeys.all, "summary"] as const;`.

Trong `attendance-grid.tsx`: bỏ `useMarkAttendanceAsAdmin`, `adminError` và biểu thức `saveError = isAdmin ? … : …` → chỉ còn `markError`. Prop `isAdmin` giữ nguyên ý nghĩa "được bấm cả ô đã quá hạn".

- [ ] **Step 3: Component cho bang chúng**

```tsx
// apps/web/features/attendance/components/member-attendance-card.tsx
"use client";

import { AttendanceStatus } from "@guild/shared/enums";

import { ATTENDANCE_STATUS_LABEL, AttendanceStatus } from "@guild/shared/enums";

import { QueryBoundary } from "@/components/shared/query-boundary";
import { SessionLabel } from "@/components/shared/session-label";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/features/auth";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useAttendanceSummary,
  useBattleSessions,
  useMarkAttendance,
} from "../hooks/use-attendance";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { recordKey } from "../lib/record-key";

/** Hai lựa chọn của một lượt điểm danh, theo thứ tự hiển thị. */
const CHOICES = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT];

/**
 * Màn điểm danh của bang chúng: chỉ nhân vật của chính mình, mỗi trận một dòng,
 * kèm số người đã đăng ký để biết trận nào đang thiếu người.
 * @returns Card điểm danh cá nhân
 */
export function MemberAttendanceCard() {
  const { data: session } = useSession();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { data: summary } = useAttendanceSummary();
  const { mutateAsync: mark, error: markError } = useMarkAttendance();
  const board = useAttendanceBoard();

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};
  const character = session?.character ?? null;

  useDeadlineRefresh(battleSessions);

  if (!character) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Tài khoản chưa được gán nhân vật, liên hệ quản trị viên.
        </CardContent>
      </Card>
    );
  }

  return (
    <QueryBoundary state={board} skeleton={<TableSkeleton columns={2} />}>
      <Card>
        <CardHeader>
          <CardTitle>Điểm danh của {character.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {markError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {markError.message}
            </p>
          )}

          {battleSessions.map((battleSession) => {
            const current =
              recordMap[recordKey(character.id, battleSession.id)]?.status ?? null;
            const counts = summary?.find((row) => row.sessionId === battleSession.id);

            return (
              <div
                key={battleSession.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <SessionLabel session={battleSession} />
                  <p className="text-sm text-muted-foreground">
                    {getSessionSubtitle(battleSession)}
                    {counts && ` · Đã có ${counts.coCount} người`}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {battleSession.isDeadlinePassed ? (
                    <span className="text-sm text-muted-foreground">Đã khoá</span>
                  ) : (
                    CHOICES.map((status) => (
                      <Button
                        key={status}
                        variant={current === status ? "default" : "outline"}
                        onClick={() =>
                          mark({
                            characterId: character.id,
                            sessionId: battleSession.id,
                            status,
                          })
                        }
                      >
                        {ATTENDANCE_STATUS_LABEL[status]}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {battleSessions.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Tuần này chưa có trận nào.
            </p>
          )}
        </CardContent>
      </Card>
    </QueryBoundary>
  );
}
```

> Kiểm lại props thật của `SessionLabel`, `TableSkeleton` và `QueryBoundary` trong `components/shared/` trước khi dán — nếu chữ ký khác, sửa call site cho khớp chứ đừng đổi component dùng chung.

- [ ] **Step 4: Điều hướng theo vai**

```tsx
// apps/web/features/attendance/components/attendance-screen.tsx
"use client";

import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild, canViewAllAttendance } from "@guild/shared/lib";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";
import { MemberAttendanceCard } from "./member-attendance-card";

interface AttendanceScreenProps {
  /** Vai của người đang xem, quyết định thấy cả bang hay chỉ mình */
  role: GuildRole;
}

/**
 * Màn hình điểm danh. Bang chúng thấy đúng nhân vật của mình; cán bộ và quản trị thấy cả bang.
 * @param role - Vai của người đang xem
 * @returns Nội dung trang điểm danh
 */
export function AttendanceScreen({ role }: AttendanceScreenProps) {
  if (!canViewAllAttendance(role)) {
    return (
      <>
        <WeekTimeline />
        <MemberAttendanceCard />
      </>
    );
  }

  return (
    <>
      <WeekTimeline />
      <AttendanceFilters scope="attendance" />
      <AttendanceGrid isAdmin={canManageGuild(role)} />
    </>
  );
}
```

`app/page.tsx`:

```tsx
export default async function Home() {
  const session = await getSession();

  // proxy.ts đã chặn khách; đến đây chắc chắn có phiên.
  if (!session) redirect(ROUTES.login);

  return <AttendanceScreen role={session.role} />;
}
```

`app/lich-su-diem-danh/page.tsx`: đọc `getSession()` và chỉ render `AttendanceFilters` khi `canViewAllAttendance(session.role)` (bang chúng chỉ có một nhân vật nên bộ lọc vô nghĩa). `AttendanceLogTable` không cần đổi — backend đã lọc dữ liệu.

- [ ] **Step 5: Cập nhật test có sẵn**

`features/attendance/api/__tests__/attendance-api.test.ts` đang mock `apiFetch` cho các hàm client. Sau khi chuyển sang `"use server"`, thêm mock cho `getAccessToken` (`vi.mock("@/features/auth", …)` trả token giả) và kiểm rằng mọi lời gọi mang `Authorization: Bearer …`.

- [ ] **Step 6: Chạy test + typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): split attendance screen by guild role"
```

---

## Task 14: Web — màn Thành viên quản lý Discord ID và vai

**Files:**
- Modify: `apps/web/features/members/components/members-panel.tsx`
- Modify: `apps/web/features/members/components/member-row.tsx`
- Modify: `apps/web/features/members/components/member-form-dialog.tsx`
- Modify: `apps/web/features/members/api/members-api.ts`
- Modify: `apps/web/features/members/hooks/use-member-mutations.ts`
- Modify: `apps/web/features/settings/components/settings-tabs.tsx`

**Interfaces:**
- Consumes: `PATCH /characters/:id` với `{ discordId?, role? }` (Task 5); `GuildMember`, `GUILD_ROLE_LABEL`, `GUILD_ROLE_OPTIONS` (Task 1/5); `useSession` (Task 10).

- [ ] **Step 1: Đổi kiểu dữ liệu của feature**

Trong `members-api.ts` và các hook, đổi `Character` → `GuildMember` (danh sách quản trị nay trả thêm 4 trường).

- [ ] **Step 2: Thêm hai cột vào bảng**

`members-panel.tsx`: thêm `<TableHead>Discord</TableHead>` và `<TableHead>Quyền</TableHead>` trước cột "Thao tác".

`member-row.tsx`:
- Cột **Discord**: nếu `member.discordId` là null → chữ mờ "Chưa liên kết"; ngược lại hiện `member.discordUsername ?? member.discordId` kèm dòng phụ `lastLoginAt` đã format (dùng `formatDateTime` sẵn có trong `lib/format.ts`) hoặc "Chưa đăng nhập lần nào".
- Cột **Quyền**: `Select` với `GUILD_ROLE_OPTIONS` / `GUILD_ROLE_LABEL`, `disabled` khi `member.discordId === null` **hoặc** khi `member.discordId === session.discordId` (không tự hạ quyền chính mình), `onValueChange` gọi `updateMember(member.id, { role })`.

- [ ] **Step 3: Ô nhập Discord ID trong form sửa thành viên**

`member-form-dialog.tsx`: thêm field `discordId` (input text, placeholder "17–19 chữ số, để trống nếu chưa gán"), validate bằng `updateCharacterSchema` đã có. Lỗi 409 từ backend nổi lên dưới dạng `ApiError` → hiển thị `error.message` nguyên văn.

- [ ] **Step 4: Sửa mô tả tab**

`settings-tabs.tsx`: đổi câu mô tả "…xem và cấp lại mật khẩu điểm danh." (mật khẩu điểm danh đã bị bỏ từ lâu) thành "Thêm thành viên, sửa lưu phái, gán Discord ID và phân quyền."

- [ ] **Step 5: Kiểm bằng tay**

Run: `pnpm --filter web dev`
Expected: đăng nhập bằng tài khoản ADMIN → `/thiet-lap` → tab Thành viên hiện hai cột mới; gán một Discord ID đã thuộc người khác → hiện đúng câu "Discord ID này đã được gán cho thành viên khác."; dropdown quyền ở hàng của chính mình bị khoá.

- [ ] **Step 6: Chạy test + typecheck + lint**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: xanh hết.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features
git commit -m "feat(web): manage discord id and role in the members table"
```

---

## Task 15: Tài liệu và dọn dẹp

**Files:**
- Modify: `docs/architecture.md` (§3.3 bảng module + bảng endpoint, §4.3 phiên, §5 data model, §7 nếu cần)
- Modify: `docs/development.md` §3 (bảng env)
- Modify: `docs/production.md` §3 (bảng env) và §5 (grant Data API cho bảng `AuthExchange`)
- Modify: `docs/superpowers/specs/2026-08-24-discord-oauth-diem-danh-design.md` (đánh dấu đã triển khai)

- [ ] **Step 1: Cập nhật `architecture.md`**

- §3.3 bảng module: `auth` → "Đăng nhập Discord OAuth2, đổi mã, refresh, `me`"; `characters` → thêm "danh tính Discord và vai"; `attendance` → "Bearer bắt buộc, lọc theo vai".
- Bảng endpoint: thay `POST /auth/login` bằng ba endpoint Discord, thêm `GET /attendance/summary`, sửa cột Access theo Task 9.
- §4.3: mô tả proxy đảo mặc định và route `/dang-nhap`, `/dang-nhap/discord`.
- §5: thêm `discordId`/`role` trên `Character`, model `AuthExchange`, `markedByCharacterId`.

- [ ] **Step 2: Cập nhật bảng env ở `development.md` §3 và `production.md` §3**

Bỏ `ADMIN_USERNAMES`, `ADMIN_PASSWORD`; thêm 4 biến Discord kèm mô tả và cách lấy (Discord Developer Portal → New Application → OAuth2 → Redirects). Ghi rõ `DISCORD_REDIRECT_URI` production trỏ vào domain API thật.

- [ ] **Step 3: Ghi chú Data API cho bảng mới**

`production.md` §5: `AuthExchange` phải bị chặn ở Data API như các bảng khác — thêm vào danh sách grant cần thu hồi.

- [ ] **Step 4: Đánh dấu spec đã triển khai**

Thêm dòng ngay dưới tiêu đề spec: `**Đã triển khai xong <ngày>.**` và ghi lại những chỗ thực tế lệch thiết kế (nếu có) ở cuối file.

- [ ] **Step 5: Kiểm tra lần cuối toàn repo**

Run:
```bash
grep -rn "ADMIN_USERNAMES\|ADMIN_PASSWORD\|loginRequest\|OptionalJwtAuthGuard" apps packages docs --exclude-dir=node_modules --exclude-dir=dist
```
Expected: chỉ còn kết quả trong spec/plan (mô tả lịch sử), không còn trong mã nguồn.

Run: `pnpm --filter api test && pnpm --filter web test && pnpm --filter api typecheck && pnpm --filter web typecheck && pnpm --filter api lint && pnpm --filter web lint`
Expected: xanh hết.

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "docs: describe discord login and role-based attendance"
```

---

## Sau khi xong: thứ tự triển khai production

Không phải task code, nhưng là phần bắt buộc của lần thay đổi này (spec mục "Rollout"):

1. Tạo Discord Application, lấy Client ID/Secret, khai `DISCORD_REDIRECT_URI` production trong Developer Portal.
2. Chạy migration lên Supabase: `pnpm --filter api migrate:prod` (kiểm trước bằng `migrate:prod:status`).
3. Set 4 biến Discord trên project API ở Vercel, **xoá** `ADMIN_USERNAMES` và `ADMIN_PASSWORD`. Đặt `DISCORD_ADMIN_IDS` bằng Discord ID của chủ bang — nếu quên bước này thì **không ai đăng nhập được**.
4. Deploy API trước, deploy web sau.
5. Đăng nhập bằng tài khoản cứu hộ → `/thiet-lap` → gán Discord ID cho từng thành viên.
6. Mọi phiên cũ mất hiệu lực; báo cả bang đăng nhập lại bằng Discord.

---

# Nhật ký triển khai — 2026-08-24

**Trạng thái: đã triển khai xong Task 1 → 15.** Nhánh `feat/discord-oauth-attendance`, 12 commit
(xem `git log main..HEAD`). Phần chưa làm: `/code-review` (bị dừng giữa chừng vì context đầy) và
các bước rollout production ở cuối plan.

## Commit đã tạo

```
a42201e docs: describe discord login and role-based attendance
c081436 feat(web): manage discord id and role in the members table
bd28105 feat(web): replace password login with discord session and role-scoped attendance
a76170d feat(api): require admin role on guild management endpoints
191a367 feat(api): scope attendance reads and writes to the signed-in member
d21db25 feat(api): replace password login with discord oauth endpoints
2b99e4c feat(api): add discord oauth client and redirect helpers
19a00c2 feat(api): manage discord id and guild role on characters
7503fb4 feat(api): add admin guard and role-aware jwt payload
77de06a feat(api): replace admin credentials env with discord oauth config
207378b feat(api): add discord identity columns and auth exchange table
1debc4c feat(shared): add guild role enum and permission predicates
```

Task 10–13 của plan gộp vào một commit web (`bd28105`) vì chúng phá typecheck lẫn nhau, không tách
ra thành commit xanh riêng được.

## Trạng thái kiểm tra cuối

| Lệnh | Kết quả |
|---|---|
| `pnpm --filter api test` | ✅ 26 suite / 215 test |
| `pnpm --filter api typecheck` | ✅ |
| `pnpm --filter api lint` | ✅ |
| `pnpm --filter web test` | ⚠️ 296 pass / **2 fail** — xem "Lỗi có sẵn" bên dưới |
| `pnpm --filter web typecheck` | ✅ |
| `pnpm --filter web lint` | ✅ |

### Lỗi có sẵn, KHÔNG do lần thay đổi này

`apps/web/features/team-builder/lib/__tests__/mock-formation.test.ts` — 2 test đỏ:

- `gợi ý Tố Vấn ở vị trí 2 và 3 của mọi team` → `expected undefined to be 'TO_VAN'`
- `bốn vị trí còn lại không gợi ý lưu phái nào` → `expected 'TO_VAN' to be undefined`

Đã xác nhận bằng `git stash -u` + chạy lại trên cây sạch: **hai test này đã đỏ từ trước khi bắt đầu**
(nhiều khả năng từ commit `83cad50 feat(ui): update guild war formation builder`). Ngoài phạm vi
plan này nên cố ý không sửa.

## Những chỗ thực tế lệch plan (và lý do)

1. **`packages/shared/schemas/auth.schema.ts` phải viết lại ngay ở Task 1**, không đợi tới Task 7.
   Bỏ `ADMIN_ROLE` làm `pnpm --filter @guild/shared build` chết, mà `pretest` của cả hai app đều
   build package này trước → không có test nào chạy được. Plan có ghi chú "sẽ vỡ" nhưng chưa lường
   là vỡ ở khâu build chứ không chỉ typecheck.

2. **`prisma migrate dev` không chạy được trong môi trường non-interactive.** Cảnh báo về unique
   constraint trên `discordId` khiến Prisma đòi xác nhận, và `--create-only` cũng không thoát được.
   Cách đã dùng:
   ```bash
   DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_discord_login"
   mkdir -p "$DIR"
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o "$DIR/migration.sql"
   npx prisma migrate deploy
   npx prisma generate
   ```
   Lưu ý `--from-schema-datasource` đã bị bỏ ở Prisma 7, phải dùng `--from-config-datasource`.
   Migration sinh ra: `20260824013748_discord_login`. Đã đọc và xác nhận **chỉ có** `CREATE TYPE`,
   `ALTER TABLE … ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX` — không `DROP`.
   `pnpm prisma:status` → `Database schema is up to date!`

3. **Test guard endpoint quản trị KHÔNG gom vào `src/modules/__tests__/admin-endpoints.spec.ts`.**
   Plan sai chỗ này: luật `boundaries/dependencies` trong `apps/api/eslint.config.mjs` cấm file
   ngoài module import file nội bộ của module (`*.controller.ts` không phải `*.public.ts`). Đã tách:
   - `src/__tests__/guards-of.ts` — helper `guardsOf(target, method?)` dùng chung
   - `src/modules/characters/__tests__/characters.controller.spec.ts`
   - `src/modules/battle-sessions/__tests__/battle-sessions.controller.spec.ts`
   - thêm một `describe` vào `src/modules/team-builder/__tests__/team-builder.controller.spec.ts`

   Tên method thật là `getWeeks`, không phải `weeks` như plan viết.

4. **`GET /battle-sessions` nay cần đăng nhập.** `@UseGuards(JwtAuthGuard)` đặt ở cấp controller
   nên route đọc lịch không còn công khai. Đây là hệ quả bắt buộc của việc proxy đảo mặc định
   (không còn trang công khai nào ngoài `/dang-nhap`), nhưng plan không nói rõ. Đã cập nhật bảng
   endpoint trong `docs/architecture.md`.

5. **Nhãn tài khoản trên header lấy từ `/auth/me`, không lấy từ access token.** Token chỉ mang
   `sub` (Discord ID) và `role`. `site-header.tsx` gọi `fetchMe().catch(() => null)` (bọc catch vì
   trang `/dang-nhap` cũng dựng header này) rồi hiển thị `character.name ?? discordUsername`.

6. **`MemberAttendanceCard` không dùng `TableSkeleton`** như plan gợi ý — component đó render
   `<TableRow>` nên chỉ hợp lệ bên trong `<TableBody>`. Đã thay bằng ba `<Skeleton>` xếp dọc.
   `SessionLabel` nhận thêm prop `size="md"`.

7. **`AttendanceGrid`**: xoá `useMarkAttendanceAsAdmin`, `adminError` và biến `saveError` —
   giờ chỉ còn `markError` vì `useMarkAttendance` đã mang Bearer token.

8. **Đổi vai làm ngay tại hàng trong `MembersPanel`**, không qua dialog: `handleRoleChange` gọi
   `useUpdateMember`. Lỗi 409 hiện thành một dòng đỏ ngay trên bảng (`updateMutation.error.message`).
   Ô nhập Discord ID trong `MemberFormDialog` **chỉ hiện khi sửa**, không hiện khi thêm mới
   (`createCharacterSchema` không có field này).

## Việc dọn ngoài checklist của plan

Những chỗ plan không liệt kê nhưng buộc phải sửa để xanh:

- `apps/api/src/common/auth/__tests__/read-bearer-token.spec.ts` — `ADMIN_ROLE` → `GuildRole.ADMIN`
- `apps/web/features/auth/core/__tests__/sign-token.ts` — `DEFAULT_PAYLOAD` đổi sang Discord ID +
  `GuildRole.ADMIN`, thêm `MEMBER_PAYLOAD` cho test proxy
- `apps/web/__tests__/proxy.test.ts` — viết lại theo mặc định mới: thêm ca "đá bang chúng khỏi route
  quản trị", "cho bang chúng vào trang điểm danh", "vẫn cho khách vào trang đăng nhập"; ca cũ "vẫn
  cho vào trang công khai khi phiên đã chết" đảo thành "đá về đăng nhập"; kiểm cả
  `?redirect=` trên URL đăng nhập
- `apps/web/features/attendance/api/__tests__/attendance-api.test.ts` — phải
  `vi.mock("@/features/auth")` vì `attendance-api.ts` nay là `"use server"` và kéo theo
  `server-only`; thêm ca khẳng định mọi request mang `Authorization: Bearer`
- `apps/web/features/members/components/delete-member-dialog.tsx` — `Character` → `GuildMember`
- `apps/web/features/settings/components/settings-tabs.tsx` — bỏ câu "cấp lại mật khẩu điểm danh"
- `apps/api/docs/backend.md`, `apps/web/.env.example`, `apps/web/README.md` — thay
  `ADMIN_USERNAMES`/`ADMIN_PASSWORD` bằng biến Discord

Một số test hiện có đổi kỳ vọng vì hành vi đổi có chủ ý:
- `characters.service.spec.ts` — `list/create/update` nay trả `GuildMember` (7 trường), `ROW` thêm 4 cột
- `attendance.service.spec.ts` — `mark(input, actor)` nay bắt buộc `actor`; mọi `null` cũ thay bằng
  `MEMBER` (bang chúng gắn với `CHARACTER_ID`); `getCharacters`/`getRecords` nhận `actor`

## Lint: những lỗi phải sửa tay

`pnpm --filter api lint:fix` xử lý hết phần prettier, còn 6 lỗi phải sửa tay:
- `no-unused-vars` với `const { X: _omitted, ...rest }` → dùng `Partial<typeof base>` + `delete`
- `no-unsafe-member-access` với `mock.calls[0][0]` → destructure `const [args] = mock.calls[0] as [T]`
- `no-unsafe-enum-comparison` trong `getSummary` → `(row.status as AttendanceStatus) === status`

## Code review — 2026-08-25

Đã chạy `/code-review main` (fixed point `d5b7286`, diff 90 file / 3106 thêm / 855 xoá), hai trục
Standards và Spec chạy song song.

**Đã sửa:** trục Spec bắt được một lỗi thật — `app/xep-team/page.tsx` và `app/thiet-lap/page.tsx`
chỉ kiểm `if (!session)`, không kiểm vai, trong khi spec §5 đòi "`getSession()` trong từng trang
quản trị cũng phải kiểm `role`". Hai file tự nhận là lớp dự phòng cho proxy nhưng thực chất chỉ
xác thực chứ không phân quyền. Đã thêm `canManageGuild(session.role)` vào cả hai
(commit `fix(web): check guild role on admin pages`).

**Đã ghi nhận, cố ý chưa sửa** (ngoài phạm vi plan này, để lần sau):

1. **Không endpoint nào có rate limit** — `.claude/rules/common/security.md` đòi "Rate limit all
   endpoints"; `apps/api/src` không dùng `Throttler` ở đâu cả. Lỗ hổng có sẵn từ trước, nhưng chính
   lần thay đổi này biến `/auth/discord*` thành bề mặt OAuth công khai nên nó thành đáng kể.
2. **`route.ts` của web lặp lại logic `safeRedirect`** — `apps/web/app/dang-nhap/discord/route.ts`
   inline `startsWith("/") && !startsWith("//")` thay vì dùng chung helper với
   `apps/api/src/modules/auth/oauth-redirect.ts`. Hai app không chia sẻ được code trực tiếp; muốn
   gộp thì phải đưa vị ngữ này vào `packages/shared`.
3. **`DISCORD_ADMIN_IDS` là chuỗi thô** — `isRescueAdmin()` split/trim/filter lại mỗi request.
   Nên parse thành `string[]` ngay trong `env.validation.ts` cho khớp luật "defaults are explicit".
4. **Kiểm tra tư cách thành viên lặp** ở `handleCallback` và `describeSession` với hình dạng
   early-exit hơi khác nhau — gọn hơn nếu tách `resolveMembership(discordId)` riêng.

Trục Spec không tìm thấy yêu cầu nào bị thiếu và không có scope creep.

## Bug chặn đường, tìm ra khi chạy thật — 2026-08-25

Sau khi điền credential Discord vào `apps/api/.env` và boot API, `GET /api/auth/discord` trả
**302 với header `Location` rỗng** — toàn bộ luồng đăng nhập chết.

Nguyên nhân: `TransformInterceptor` (global, có từ trước lần thay đổi này) bọc **mọi** response vào
`{ data }`. Với route `@Redirect()`, giá trị `{ url }` không phải dữ liệu cho client mà là chỉ dẫn
cho Nest, và Nest đọc `url` ngay ở tầng đầu tiên — bọc vào `data` thì nó không thấy `url`, gọi
`res.redirect(undefined)`. Không exception, không log, chỉ là trình duyệt đứng im.

Lần thay đổi này là lần đầu repo có route `@Redirect()`, nên bug lộ ra ở đây dù interceptor không bị
sửa. Không unit test nào bắt được vì cả interceptor lẫn controller đều đúng khi xét riêng — chỉ vỡ
khi ghép.

Đã sửa (commit `8214f66 fix(api): keep redirect routes out of the data envelope`): interceptor đọc
`REDIRECT_METADATA` qua `Reflector` và trả nguyên giá trị với route redirect; `main.ts` truyền
`app.get(Reflector)` vào constructor. Thêm
`src/common/interceptors/__tests__/transform.interceptor.spec.ts` (2 test).

Đã kiểm bằng curl trên server thật:

| Ca | Kết quả |
|---|---|
| `GET /api/auth/discord?redirect=…` | 302 → `discord.com/oauth2/authorize` đủ `client_id`, `scope=identify`, `redirect_uri`, `state` |
| callback `?error=access_denied` | 302 → `/dang-nhap?error=tu-choi&redirect=%2F` |
| callback `?state=rac` | 302 → `/dang-nhap?error=phien-het-han&redirect=%2F` |
| `POST /api/auth/login` (đường cũ) | 410 |

Còn lại chưa kiểm: vòng OAuth đầy đủ qua trình duyệt (cần bấm "Cho phép" thật), đổi mã lấy token,
và ba ca ở Task 12 Step 2 / Task 14 Step 5.

## Phiên 2026-08-25 — chạy thật, ba bug và một tính năng UI

Điền credential Discord rồi chạy thật lần đầu. Ba bug lộ ra mà toàn bộ test, typecheck và lint đều
không thấy — cả ba đều thuộc loại chỉ vỡ khi ghép các mảnh lại.

1. **`GET /api/auth/discord` trả 302 với `Location` rỗng** (`8214f66`). `TransformInterceptor` bọc
   *mọi* response vào `{ data }`, kể cả object điều khiển `{ url }` của route `@Redirect()` — Nest
   đọc `url` ở tầng đầu tiên nên gọi `res.redirect(undefined)`. Không exception, không log. Đây là
   route `@Redirect()` đầu tiên của repo nên bug nằm im từ trước. Sửa: interceptor đọc
   `REDIRECT_METADATA` qua `Reflector` và bỏ qua route redirect.
2. **Mọi trang trả 500 ngay khi có phiên** (`f335e2a`). `members-panel.tsx` và
   `member-attendance-card.tsx` là `"use client"` nhưng import barrel `@/features/auth`, mà barrel
   re-export `getSession`/`getAccessToken` từ `api/session.ts` → kéo `next/headers` vào bundle
   client, vỡ cả module graph. Thông báo lỗi đổ cho "Pages Router", không liên quan gì. Sửa: tách
   `features/auth/index.ts` (client-safe) và `features/auth/server.ts` (`import "server-only"`), 12
   file import trỏ lại; quy ước ghi vào `apps/web/CLAUDE.md`.
3. **Nút đăng nhập Discord mất ngữ nghĩa nút** (`5008476`). `Button render={<a/>}` thiếu
   `nativeButton={false}` nên không có `role="button"`/`tabindex`. Repo đã có quy ước này ở
   `main-nav.tsx` và `pagination.tsx`; file mới sót.

**Tính năng UI thêm ngoài plan** (`df27f68`, `67ac48e`, `a83861b`): header đổi từ nút đăng xuất trần
sang avatar Discord, bấm mở dropdown chứa mục Đăng xuất. Kéo theo migration
`20260825063016_discord_avatar` (một `ADD COLUMN`, không `DROP`), `DiscordProfile.avatar`,
`touchLogin` nhận thêm tham số, `sessionUserSchema.discordAvatar`, và component `dropdown-menu` của
shadcn (Base UI). Chi tiết quyết định nằm trong spec.

**Test `mock-formation` sửa lại** (`12da1a5`): hai test đỏ có sẵn từ trước nhánh này là do
`SUGGESTED_CLASS_TEMPLATE` đã đổi (Tố Vấn chuyển từ vị trí 2–3 sang 1–2) mà test vẫn ghi số cứng.
Cho test đọc thẳng từ template thay vì sửa con số, vì comment trong code nói rõ mảng đó được sửa tự
do. Đã kiểm bằng cách phá offset: test đỏ đúng như mong đợi, không phải xanh rỗng.

**Đã chạy thật, xác nhận bằng curl và bằng đăng nhập Discord thật:** vòng OAuth đầy đủ, cookie
HttpOnly, MEMBER thấy đúng 1 nhân vật còn ADMIN thấy 79, `/characters` trả 403 cho MEMBER và 401 cho
khách, ba nhánh lỗi callback, avatar hiện đúng sau khi gán Discord ID.

## Việc còn lại cho lần sau

1. ~~**Điền `apps/api/.env` local.**~~ ✅ Xong 2026-08-25: cả bốn biến Discord đã có giá trị,
   `DISCORD_ADMIN_IDS` chứa 2 snowflake hợp lệ, API boot được và Swagger map đủ 6 route auth.
2. **`apps/api/.env.production` vẫn còn `ADMIN_USERNAMES`/`ADMIN_PASSWORD`** — cố ý không đụng vào
   file giá trị production của bạn. Cần thay bằng bốn biến Discord trước khi deploy.
3. ~~**Kiểm bằng tay.**~~ ✅ Xong 2026-08-25, xem phiên trên. Còn hai ca chưa bấm: lỗi 409 khi gán
   trùng Discord ID, và ô chọn vai bị khoá ở hàng của chính mình.
4. **Rollout production** theo mục "Sau khi xong" ở trên — đặc biệt bước 3: quên
   `DISCORD_ADMIN_IDS` là **không ai đăng nhập được**.

   **CI không chạy migration.** `.github/workflows/ci.yml` chỉ test/lint/build rồi
   `vercel deploy --prod`; `migrate:prod` là lệnh tay đọc `.env.production`. Nên thứ tự merge lên
   `main` là bắt buộc, không phải khuyến nghị:

   1. Tạo Discord Application production, khai redirect URI của domain API thật.
   2. Set 4 biến Discord trên **project API** ở Vercel, xoá `ADMIN_USERNAMES`/`ADMIN_PASSWORD`.
   3. Cập nhật `apps/api/.env.production` rồi chạy `pnpm --filter api migrate:prod`
      (kiểm trước bằng `migrate:prod:status`). Hai migration cần áp: `20260824013748_discord_login`
      và `20260825063016_discord_avatar`.
   4. Merge → CI deploy API rồi web.
   5. Đăng nhập bằng tài khoản cứu hộ, gán Discord ID cho từng người.
   6. `UPDATE "Character" SET role='ADMIN'` cho chính mình (xem "Lỗ hổng đã biết" trong spec).

   Đảo bước 2/3 xuống sau bước 4 là **API production chết hẳn**, không chỉ hỏng đăng nhập: thiếu
   `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` thì `env.validation.ts` fail-fast ngay lúc boot, và
   thiếu migration thì mọi truy vấn `Character` đều vỡ vì thiếu cột.
