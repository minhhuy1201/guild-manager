# Thiết lập lịch đánh trong tuần — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin có mục nav "Thiết lập" để tự thêm/sửa/xoá các trận scrim trong tuần (giờ đánh, tên bang đối thủ, hạn chót điểm danh), thay cho lịch hard-code trong `SESSION_TEMPLATES`.

**Architecture:** Lịch đánh chuyển từ code sang database. Module NestJS mới `battle-sessions` sở hữu bảng `BattleSession` (tự sinh Guild War cho tuần đang mở + tuần kế, CRUD scrim cho admin); `attendance` và `team-builder` trở thành consumer của nó. Frontend thêm feature `settings` với route `/thiet-lap`.

**Tech Stack:** NestJS 11 + Prisma 7 + PostgreSQL + Zod 4 + nestjs-zod (api) · Next.js 16 App Router + TanStack Query + Zustand + shadcn/Base UI (web) · Jest (api) · Vitest (web).

Spec: [`docs/superpowers/specs/2026-08-05-admin-schedule-settings-design.md`](../specs/2026-08-05-admin-schedule-settings-design.md)

## Global Constraints

- Mọi chữ hiển thị cho người dùng **phải là tiếng Việt**.
- JSDoc tiếng Việt cho mọi hàm/interface export ở `apps/api` và `packages/shared`; `apps/web` theo phong cách của file đang sửa (feature `team-builder` viết JSDoc tiếng Anh, `attendance` tiếng Việt — giữ nguyên từng file).
- Backend: Controller → Service → Prisma. Controller không đụng Prisma. Trả entity, không trả model Prisma.
- Không import file nội bộ của module khác — chỉ import qua `@/modules/<name>/<name>.module` (luật `no-restricted-imports` ở `apps/api/eslint.config.mjs`).
- Frontend: `app/` chỉ routing/layout; logic ở `features/`. Gọi API qua `apiFetch` từ `@/lib/api-client`. Không `useQuery`/`fetch` thẳng trong component.
- Dùng schema/enum chung từ `packages/shared`, không nhân bản type.
- Mọi mốc giờ tính theo giờ Việt Nam cố định (UTC+7), **không** phụ thuộc timezone của máy chạy server — dùng helper dịch offset thủ công như `attendance-schedule.ts` đang làm, không dùng `toLocaleString` cho logic.
- Commit message **tiếng Anh**, không có dòng `Co-Authored-By`. Commit thẳng lên `main`.
- Chạy test: `pnpm --filter api test` (Jest), `pnpm --filter web test` (Vitest).

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `packages/shared/lib/battle-session.ts` | `defaultDeadline()` — luật hạn chót gợi ý, dùng chung FE/BE |
| `packages/shared/schemas/battle-session.schema.ts` | Zod schema cho body create/update |
| `apps/api/src/modules/battle-sessions/session-schedule.ts` | Hàm thuần về mốc tuần, Guild War, nhãn hiển thị (chuyển từ `attendance/attendance-schedule.ts`) |
| `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` | `ensureGuildWar` + CRUD + validate |
| `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts` | GET công khai + POST/PATCH/DELETE admin |
| `apps/api/src/modules/battle-sessions/battle-sessions.module.ts` | Public API của module |
| `apps/api/src/modules/battle-sessions/dto/battle-session.dto.ts` | DTO bọc Zod schema |
| `apps/api/src/modules/battle-sessions/entities/battle-session.entity.ts` | `BattleSessionEntity`, `WeekEntity` |
| `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts` | Test hàm thuần |
| `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts` | Test CRUD + validate |
| `apps/web/features/settings/**` | Feature Thiết lập (api, hooks, components) |
| `apps/web/app/thiet-lap/page.tsx` | Route `/thiet-lap` |
| `apps/web/features/team-builder/lib/active-session.ts` | `resolveActiveSessionId()` — chọn tab hợp lệ khi trận bị xoá |

**Sửa**

| File | Thay đổi |
|---|---|
| `apps/api/prisma/schema.prisma` | `BattleSession`: `+opponent`, `−label`, `−@@unique` |
| `apps/api/src/modules/attendance/attendance.service.ts` | Bỏ `ensureWeekSessions`/`getSessions`/`getCurrentWeek`, dùng `BattleSessionsService` |
| `apps/api/src/modules/attendance/attendance.controller.ts` | Bỏ route `sessions` và `week` |
| `apps/api/src/modules/attendance/attendance.module.ts` | Import `BattleSessionsModule`, bỏ export `AttendanceService` |
| `apps/api/src/modules/attendance/entities/attendance.entity.ts` | Bỏ `BattleSessionEntity`, `WeekEntity` |
| `apps/api/src/modules/team-builder/**` | Đổi phụ thuộc sang `BattleSessionsService`, `label` suy ra, entity thêm `opponent` |
| `apps/api/src/app.module.ts` | Đăng ký `BattleSessionsModule` |
| `apps/web/features/attendance/**` | Endpoint mới, type `Week` mới, `BattleSession` thêm field |
| `apps/web/lib/battle-session.ts` | **Xoá** (bảng hard-code đối thủ) |
| `apps/web/config/routes.ts`, `components/shared/main-nav.tsx`, `proxy.ts` | Thêm route `/thiet-lap` |

**Xoá**

- `apps/api/src/modules/attendance/attendance-schedule.ts` (chuyển sang `battle-sessions/session-schedule.ts`)
- `apps/api/src/modules/attendance/__tests__/attendance-schedule.spec.ts` (chuyển sang module mới)
- `apps/web/lib/battle-session.ts`

---

## Task 1: Luật hạn chót và schema dùng chung

`defaultDeadline` phải chạy được ở cả hai phía: backend không dùng nó để ép giá trị, nhưng form phía web cần nó để điền sẵn — nên nó nằm ở `packages/shared`.

**Files:**
- Create: `packages/shared/lib/battle-session.ts`
- Create: `packages/shared/schemas/battle-session.schema.ts`
- Create: `apps/web/lib/__tests__/session-deadline.test.ts`
- Modify: `packages/shared/package.json` (thêm export `./lib`)
- Modify: `packages/shared/schemas/index.ts`

**Interfaces:**
- Produces:
  - `defaultDeadline(dateTime: Date): Date`
  - `createBattleSessionSchema` / `CreateBattleSessionInput` = `{ dateTime: string; deadline: string; opponent?: string | null }`
  - `updateBattleSessionSchema` / `UpdateBattleSessionInput` = mọi field optional

> **Ghi chú lệch spec:** spec ghi `defaultDeadline(dateTime, weekStart)`. Bỏ tham số `weekStart` vì thứ trong tuần suy ra được từ chính `dateTime` — ít tham số, ít chỗ sai.

- [ ] **Step 1: Viết test thất bại cho `defaultDeadline`**

Tạo `apps/web/lib/__tests__/session-deadline.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { defaultDeadline } from "@shared/lib/battle-session";

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-21T20:30' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe("defaultDeadline", () => {
  it("trận Thứ 2/3/4 có hạn 10:00 sáng chính ngày đánh", () => {
    expect(defaultDeadline(vn("2026-07-21T20:30")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-20T19:00")).toISOString()).toBe(
      vn("2026-07-20T10:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-22T21:00")).toISOString()).toBe(
      vn("2026-07-22T10:00").toISOString()
    );
  });

  it("trận Thứ 5 trở đi có hạn 17:00 Thứ 5 cùng tuần", () => {
    expect(defaultDeadline(vn("2026-07-23T20:30")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-25T20:00")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
  });

  it("trận Chủ nhật vẫn quy về Thứ 5 của tuần bắt đầu từ Thứ 2 trước đó", () => {
    expect(defaultDeadline(vn("2026-07-26T20:00")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- session-deadline`
Expected: FAIL — không resolve được `@shared/lib/battle-session`.

- [ ] **Step 3: Viết `defaultDeadline`**

Tạo `packages/shared/lib/battle-session.ts`:

```ts
/**
 * Luật hạn chót điểm danh gợi ý cho một trận.
 *
 * Đây chỉ là GIÁ TRỊ MẶC ĐỊNH điền sẵn vào form — quản trị viên sửa được và
 * backend lưu đúng giá trị cuối cùng, không kẹp lại theo luật này.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc timezone
 * của máy đang chạy.
 */

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Thứ 5 theo chuẩn ISO (Thứ 2 = 1 ... Chủ nhật = 7). */
const THURSDAY = 4;

/** Giờ chốt sổ cả tuần: 17:00 Thứ 5. */
const WEEK_CUTOFF_HOUR = 17;

/** Giờ chốt riêng của các trận diễn ra trước Thứ 5. */
const EARLY_SESSION_DEADLINE_HOUR = 10;

/**
 * Thứ trong tuần theo chuẩn ISO, tính theo giờ Việt Nam.
 * @param date - Thời điểm cần xét
 * @returns 1 = Thứ 2 ... 7 = Chủ nhật
 */
function vnIsoWeekday(date: Date): number {
  const day = new Date(date.getTime() + VN_OFFSET_MS).getUTCDay();

  return day === 0 ? 7 : day;
}

/**
 * Dịch một mốc thời gian đi `deltaDays` ngày rồi đặt về giờ/phút cụ thể theo giờ VN.
 * @param base - Mốc gốc (thời điểm UTC thật)
 * @param deltaDays - Số ngày cộng thêm (âm = lùi về trước)
 * @param hour - Giờ VN cần đặt (0-23)
 * @param minute - Phút cần đặt (0-59)
 * @returns Date UTC tương ứng với mốc giờ VN yêu cầu
 */
export function shiftVnDate(
  base: Date,
  deltaDays: number,
  hour: number,
  minute: number
): Date {
  const vn = new Date(base.getTime() + VN_OFFSET_MS);
  const shifted = Date.UTC(
    vn.getUTCFullYear(),
    vn.getUTCMonth(),
    vn.getUTCDate() + deltaDays,
    hour,
    minute
  );

  return new Date(shifted - VN_OFFSET_MS);
}

/**
 * Hạn chót gợi ý cho một trận: 10:00 sáng chính ngày đánh nếu trận diễn ra
 * trước Thứ 5, ngược lại là 17:00 Thứ 5 của tuần chứa trận đó.
 * @param dateTime - Thời điểm diễn ra trận đánh
 * @returns Hạn chót gợi ý
 */
export function defaultDeadline(dateTime: Date): Date {
  const weekday = vnIsoWeekday(dateTime);

  if (weekday < THURSDAY) {
    return shiftVnDate(dateTime, 0, EARLY_SESSION_DEADLINE_HOUR, 0);
  }

  return shiftVnDate(dateTime, THURSDAY - weekday, WEEK_CUTOFF_HOUR, 0);
}
```

- [ ] **Step 4: Mở export `./lib` của package**

Sửa `packages/shared/package.json`, thêm vào `exports`:

```json
  "exports": {
    "./enums": "./enums/index.ts",
    "./lib": "./lib/battle-session.ts",
    "./schemas": "./schemas/index.ts"
  },
```

Alias `@shared/*` của web trỏ thẳng vào thư mục nên test import theo đường dẫn `@shared/lib/battle-session`; backend import qua `@guild/shared/lib`.

- [ ] **Step 5: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter web test -- session-deadline`
Expected: PASS (3 test).

- [ ] **Step 6: Viết Zod schema dùng chung**

Tạo `packages/shared/schemas/battle-session.schema.ts`:

```ts
import { z } from "zod";

/** Chuỗi thời gian ISO — dùng cho mọi field giờ giấc đi trên dây. */
const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Thời gian không hợp lệ.",
  });

/**
 * Tên bang đối thủ. Để trống được (scrim chưa chốt đối thủ, và Guild War thì
 * không bao giờ có). Chuỗi rỗng được service quy về null.
 */
const opponent = z
  .string()
  .trim()
  .max(100, "Tên bang đối thủ tối đa 100 ký tự.")
  .nullable()
  .optional();

/**
 * Body của POST /battle-sessions.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 */
export const createBattleSessionSchema = z.object({
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: isoDateTime,
  /** Hạn chót điểm danh do quản trị viên đặt (ISO string) */
  deadline: isoDateTime,
  opponent,
});

/** Body của PATCH /battle-sessions/:id — sửa được từng phần. */
export const updateBattleSessionSchema = createBattleSessionSchema.partial();

/** Kiểu body tạo trận đã validate. */
export type CreateBattleSessionInput = z.infer<typeof createBattleSessionSchema>;

/** Kiểu body sửa trận đã validate. */
export type UpdateBattleSessionInput = z.infer<typeof updateBattleSessionSchema>;
```

Thêm vào `packages/shared/schemas/index.ts`:

```ts
export * from "./battle-session.schema";
```

- [ ] **Step 7: Chạy lại toàn bộ test web**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ.

- [ ] **Step 8: Commit**

```bash
git add packages/shared apps/web/lib/__tests__/session-deadline.test.ts
git commit -m "feat(shared): add battle session schema and default deadline rule"
```

---

## Task 2: Hàm thuần về lịch tuần trong module mới

Tạo `session-schedule.ts` với toàn bộ hàm thuần mà `BattleSessionsService` sẽ dùng. File cũ `attendance-schedule.ts` **tạm thời vẫn còn** (Task 3 mới xoá) để repo luôn build được.

**Files:**
- Create: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Create: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Consumes: `defaultDeadline`, `shiftVnDate` từ `@guild/shared/lib` (Task 1)
- Produces:
  - `interface ScheduledWeek { weekStart: Date; weekEnd: Date }`
  - `getActiveWeek(now?: Date): ScheduledWeek`
  - `getEditableWeeks(now?: Date): ScheduledWeek[]` — đúng 2 phần tử: tuần đang mở, tuần kế
  - `weekStartOf(dateTime: Date): Date`
  - `guildWarDateTime(weekStart: Date): Date`
  - `guildWarSessionId(weekStart: Date): string`
  - `formatSessionLabel(dateTime: Date, isGuildWar: boolean): string`
  - `isDeadlinePassed(deadline: Date, now?: Date): boolean`

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`:

```ts
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
  isDeadlinePassed,
  weekStartOf,
} from '../session-schedule';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe('session-schedule', () => {
  // Thứ 4 2026-07-22 12:00 VN → tuần điểm danh chứa Guild War Thứ 7 2026-07-25.
  const wednesday = vn('2026-07-22T12:00');

  describe('ranh giới tuần', () => {
    it('tuần chạy từ Thứ 2 00:00 đến Thứ 7 23:59 (giờ VN)', () => {
      const week = getActiveWeek(wednesday);

      expect(week.weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(week.weekEnd.toISOString()).toBe(
        vn('2026-07-25T23:59').toISOString(),
      );
    });

    it('trước 22:00 Thứ 7 vẫn là tuần hiện tại', () => {
      expect(getActiveWeek(vn('2026-07-25T21:59')).weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });

    it('sau 22:00 Thứ 7 thì mở sang tuần kế tiếp', () => {
      expect(getActiveWeek(vn('2026-07-25T22:00')).weekStart.toISOString()).toBe(
        vn('2026-07-27T00:00').toISOString(),
      );
    });
  });

  describe('getEditableWeeks', () => {
    it('trả về đúng tuần đang mở và tuần kế tiếp', () => {
      const weeks = getEditableWeeks(wednesday);

      expect(weeks).toHaveLength(2);
      expect(weeks[0].weekStart.toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weeks[1].weekStart.toISOString()).toBe(
        vn('2026-07-27T00:00').toISOString(),
      );
    });
  });

  describe('weekStartOf', () => {
    it('quy mọi ngày trong tuần về Thứ 2 00:00 giờ VN', () => {
      expect(weekStartOf(vn('2026-07-20T00:00')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weekStartOf(vn('2026-07-25T20:00')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
      expect(weekStartOf(vn('2026-07-26T23:59')).toISOString()).toBe(
        vn('2026-07-20T00:00').toISOString(),
      );
    });
  });

  describe('Guild War', () => {
    it('diễn ra 20:00 Thứ 7 của tuần', () => {
      expect(guildWarDateTime(vn('2026-07-20T00:00')).toISOString()).toBe(
        vn('2026-07-25T20:00').toISOString(),
      );
    });

    it('có id tất định theo ngày Thứ 2 của tuần', () => {
      expect(guildWarSessionId(vn('2026-07-20T00:00'))).toBe('gw-2026-07-20');
    });
  });

  describe('formatSessionLabel', () => {
    it('trận thường hiện thứ và giờ đánh', () => {
      expect(formatSessionLabel(vn('2026-07-21T20:30'), false)).toBe(
        'Thứ 3 · 20:30',
      );
      expect(formatSessionLabel(vn('2026-07-26T09:05'), false)).toBe(
        'Chủ nhật · 09:05',
      );
    });

    it('Guild War hiện thứ và chữ Guild War', () => {
      expect(formatSessionLabel(vn('2026-07-25T20:00'), true)).toBe(
        'Thứ 7 · Guild War',
      );
    });
  });

  describe('isDeadlinePassed', () => {
    it('đúng mốc deadline thì vẫn còn hạn, sau đó thì khóa', () => {
      const deadline = vn('2026-07-23T17:00');

      expect(isDeadlinePassed(deadline, deadline)).toBe(false);
      expect(isDeadlinePassed(deadline, vn('2026-07-23T17:01'))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- session-schedule`
Expected: FAIL — `Cannot find module '../session-schedule'`.

- [ ] **Step 3: Viết `session-schedule.ts`**

Tạo `apps/api/src/modules/battle-sessions/session-schedule.ts`:

```ts
/**
 * Luật thời gian của lịch đánh — xem apps/web/docs/attendance-time-rules.md.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc giờ máy
 * chạy server. Tuần điểm danh mở lúc 22:00 Thứ 7 cho tuần kế tiếp.
 *
 * Từ 2026-08 lịch đánh do quản trị viên nhập vào database; file này chỉ còn giữ
 * mốc tuần, trận Guild War cố định và cách dựng nhãn hiển thị.
 */
import { shiftVnDate } from '@guild/shared/lib';

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Thứ 7 theo `Date.getUTCDay()`: 0=CN, 1=T2, ..., 6=T7. */
const SATURDAY = 6;

/** Giờ mở tuần điểm danh mới (22:00 Thứ 7). */
const WEEK_OPEN_HOUR = 22;

/** Lệch ngày của Thứ 7 so với Thứ 2 đầu tuần. */
const SATURDAY_OFFSET_FROM_MONDAY = 5;

/** Giờ đánh cố định của Guild War. */
const GUILD_WAR_HOUR = 20;
const GUILD_WAR_MINUTE = 0;

/** Tên thứ trong tuần theo `Date.getUTCDay()` (0 = Chủ nhật). */
const WEEKDAY_NAMES = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

/** Một tuần điểm danh: mốc đầu và cuối. */
export interface ScheduledWeek {
  /** Thứ 2 00:00 — cũng là khóa gom trận theo tuần trong database. */
  weekStart: Date;
  /** Thứ 7 23:59 — mốc cuối để hiển thị timeline. */
  weekEnd: Date;
}

/**
 * Quy một thời điểm về Thứ 2 00:00 (giờ VN) của tuần chứa nó.
 * @param dateTime - Thời điểm bất kỳ
 * @returns Mốc Thứ 2 00:00 của tuần chứa `dateTime`
 */
export function weekStartOf(dateTime: Date): Date {
  const vnDay = new Date(dateTime.getTime() + VN_OFFSET_MS).getUTCDay();
  // Chủ nhật (0) thuộc về tuần bắt đầu từ Thứ 2 sáu ngày trước.
  const daysSinceMonday = (vnDay + 6) % 7;

  return shiftVnDate(dateTime, -daysSinceMonday, 0, 0);
}

/**
 * Dựng một tuần điểm danh từ mốc Thứ 2 của nó.
 * @param weekStart - Thứ 2 00:00 giờ VN
 * @returns Tuần kèm mốc cuối Thứ 7 23:59
 */
function toWeek(weekStart: Date): ScheduledWeek {
  return {
    weekStart,
    weekEnd: shiftVnDate(weekStart, SATURDAY_OFFSET_FROM_MONDAY, 23, 59),
  };
}

/**
 * Xác định tuần điểm danh đang mở tại thời điểm `now`.
 * Tuần mở lúc 22:00 Thứ 7 và mở cho tuần KẾ TIẾP.
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns Tuần đang mở
 */
export function getActiveWeek(now: Date = new Date()): ScheduledWeek {
  const vnDayOfWeek = new Date(now.getTime() + VN_OFFSET_MS).getUTCDay();
  const daysSinceSaturday = (vnDayOfWeek - SATURDAY + 7) % 7;

  let anchorOpen = shiftVnDate(now, -daysSinceSaturday, WEEK_OPEN_HOUR, 0);

  // Mốc mở 22:00 Thứ 7 còn ở tương lai → tuần đang mở được mở từ Thứ 7 tuần trước.
  if (anchorOpen.getTime() > now.getTime()) {
    anchorOpen = shiftVnDate(anchorOpen, -7, WEEK_OPEN_HOUR, 0);
  }

  // Thứ 7 mở tuần + 2 ngày = Thứ 2 đầu tuần mới.
  return toWeek(shiftVnDate(anchorOpen, 2, 0, 0));
}

/**
 * Các tuần quản trị viên được phép thiết lập lịch: tuần đang mở và tuần kế tiếp.
 * Tuần đã qua chỉ đọc.
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns Mảng 2 tuần, tuần đang mở đứng trước
 */
export function getEditableWeeks(now: Date = new Date()): ScheduledWeek[] {
  const active = getActiveWeek(now);

  return [active, toWeek(shiftVnDate(active.weekStart, 7, 0, 0))];
}

/**
 * Thời điểm diễn ra Guild War của một tuần: 20:00 Thứ 7.
 * @param weekStart - Thứ 2 00:00 của tuần
 * @returns Thời điểm đánh Guild War
 */
export function guildWarDateTime(weekStart: Date): Date {
  return shiftVnDate(
    weekStart,
    SATURDAY_OFFSET_FROM_MONDAY,
    GUILD_WAR_HOUR,
    GUILD_WAR_MINUTE,
  );
}

/**
 * Id tất định của trận Guild War một tuần.
 * Không còn ràng buộc unique theo nhãn nên id chính là khóa để upsert idempotent.
 * @param weekStart - Thứ 2 00:00 của tuần
 * @returns Id dạng `gw-YYYY-MM-DD` theo ngày Thứ 2 giờ VN
 */
export function guildWarSessionId(weekStart: Date): string {
  const vn = new Date(weekStart.getTime() + VN_OFFSET_MS);
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');

  return `gw-${vn.getUTCFullYear()}-${month}-${day}`;
}

/**
 * Dựng nhãn hiển thị của một trận từ giờ đánh — nhãn KHÔNG lưu trong database
 * nên đổi giờ đánh là nhãn tự đúng theo.
 * @param dateTime - Thời điểm đánh
 * @param isGuildWar - Có phải trận Guild War không
 * @returns Nhãn dạng "Thứ 3 · 20:30" hoặc "Thứ 7 · Guild War"
 */
export function formatSessionLabel(
  dateTime: Date,
  isGuildWar: boolean,
): string {
  const vn = new Date(dateTime.getTime() + VN_OFFSET_MS);
  const weekday = WEEKDAY_NAMES[vn.getUTCDay()];

  if (isGuildWar) return `${weekday} · Guild War`;

  const hour = String(vn.getUTCHours()).padStart(2, '0');
  const minute = String(vn.getUTCMinutes()).padStart(2, '0');

  return `${weekday} · ${hour}:${minute}`;
}

/**
 * Kiểm tra đã quá hạn điểm danh hay chưa.
 * @param deadline - Hạn chót của trận
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns true nếu đã quá hạn, không cho ghi nhận điểm danh nữa
 */
export function isDeadlinePassed(
  deadline: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() > deadline.getTime();
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter api test -- session-schedule`
Expected: PASS toàn bộ. Nếu `@guild/shared/lib` không resolve, kiểm tra lại `exports` ở Step 4 của Task 1.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/battle-sessions
git commit -m "feat(api): add pure week schedule helpers for battle sessions module"
```

---

## Task 3: Migration + module `battle-sessions` (đường đọc)

Đổi schema, dựng service/controller cho phần đọc, và chuyển `attendance` + `team-builder` sang dùng module mới. Kết thúc task này, lịch đánh đã do database quyết định.

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_lich_danh_do_admin_thiet_lap/migration.sql` (do Prisma sinh, sửa thêm 1 câu UPDATE)
- Create: `apps/api/src/modules/battle-sessions/entities/battle-session.entity.ts`
- Create: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`
- Create: `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts`
- Create: `apps/api/src/modules/battle-sessions/battle-sessions.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/attendance/{attendance.service.ts,attendance.controller.ts,attendance.module.ts,entities/attendance.entity.ts}`
- Modify: `apps/api/src/modules/team-builder/{team-builder.service.ts,team-builder.module.ts,entities/formation.entity.ts}`
- Modify: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`
- Modify: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`
- Delete: `apps/api/src/modules/attendance/attendance-schedule.ts`
- Delete: `apps/api/src/modules/attendance/__tests__/attendance-schedule.spec.ts`

**Interfaces:**
- Consumes: toàn bộ export của `session-schedule.ts` (Task 2)
- Produces:
  - `interface BattleSessionEntity { id: string; label: string; dateTime: string; deadline: string; isGuildWar: boolean; opponent: string | null; weekStart: string; attendanceCount: number; hasFormation: boolean }`
  - `interface WeekEntity { weekStart: string; weekEnd: string; isActive: boolean }`
  - `BattleSessionsService.listByWeek(weekStart?: string, now?: Date): Promise<BattleSessionEntity[]>`
  - `BattleSessionsService.getEditableWeeks(now?: Date): WeekEntity[]`
  - `BattleSessionsService.getActiveWeekStart(now?: Date): string`
  - `BattleSessionsService.findById(id: string): Promise<BattleSessionEntity | null>`
  - Module re-export: `BattleSessionsService`, `formatSessionLabel`, `BattleSessionEntity`, `WeekEntity`

- [ ] **Step 1: Sửa Prisma schema**

Trong `apps/api/prisma/schema.prisma`, thay toàn bộ model `BattleSession` bằng:

```prisma
/// Một trận đánh trong tuần. Guild War do hệ thống sinh, scrim do quản trị viên nhập.
model BattleSession {
  /// Guild War dùng id tất định `gw-<YYYY-MM-DD của weekStart>` để upsert idempotent;
  /// scrim do quản trị viên tạo dùng cuid() mặc định.
  id        String   @id @default(cuid())
  /// Thời điểm diễn ra trận đánh.
  dateTime  DateTime
  /// Hạn chót điểm danh do quản trị viên đặt (không bị kẹp lại theo luật nào).
  deadline  DateTime
  /// Tên bang đối thủ. null với Guild War và với scrim chưa chốt đối thủ.
  opponent  String?
  /// Trận Guild War — do hệ thống sinh, không xoá được.
  isGuildWar Boolean @default(false)
  /// Mốc Thứ 2 00:00 của tuần chứa trận này — dùng để gom trận theo tuần.
  weekStart DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  attendanceRecords AttendanceRecord[]
  /// Đội hình bang chiến của trận này (có thể chưa xếp).
  formation         Formation?

  @@index([weekStart])
}
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm --filter api exec prisma migrate dev --name lich_danh_do_admin_thiet_lap --create-only`

`--create-only` để sửa file SQL trước khi chạy. Prisma sẽ cảnh báo mất dữ liệu cột `label` — đúng như thiết kế.

- [ ] **Step 3: Thêm bước đổi id Guild War vào migration**

Mở file `migration.sql` vừa sinh. **Chèn câu lệnh sau lên ĐẦU file**, trước mọi `ALTER TABLE`:

```sql
-- Guild War chuyển sang id tất định `gw-<ngày Thứ 2 giờ VN>` để upsert idempotent.
-- Không làm bước này thì lần đầu chạy sẽ sinh thêm một trận Guild War thứ hai cho
-- tuần đang mở. Khóa ngoại của AttendanceRecord/Formation mặc định ON UPDATE CASCADE
-- nên điểm danh và đội hình đi theo id mới.
UPDATE "BattleSession"
SET "id" = 'gw-' || to_char("weekStart" + interval '7 hours', 'YYYY-MM-DD')
WHERE "isGuildWar" = true;
```

`weekStart` lưu dạng timestamp không timezone ở mốc UTC, cộng 7 giờ để ra ngày Thứ 2 theo giờ VN — khớp với `guildWarSessionId()`.

- [ ] **Step 4: Chạy migration**

Run: `pnpm --filter api exec prisma migrate dev`
Expected: migration applied, Prisma Client sinh lại. Sau bước này `apps/api` sẽ **không compile** vì `session.label` không còn — các step sau sửa nốt.

- [ ] **Step 5: Viết entity**

Tạo `apps/api/src/modules/battle-sessions/entities/battle-session.entity.ts`:

```ts
/** Một trận đánh trả về cho client, thời gian ở dạng ISO string. */
export interface BattleSessionEntity {
  id: string;
  /** Nhãn hiển thị suy ra từ giờ đánh, ví dụ "Thứ 3 · 20:30". Không lưu trong database. */
  label: string;
  dateTime: string;
  /** Hạn chót điểm danh do quản trị viên đặt. */
  deadline: string;
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ. */
  opponent: string | null;
  /** Mốc Thứ 2 00:00 của tuần chứa trận này. */
  weekStart: string;
  /** Số lượt điểm danh đã ghi — dialog xoá cần con số này. */
  attendanceCount: number;
  /** Trận này đã có đội hình xếp sẵn hay chưa. */
  hasFormation: boolean;
}

/** Một tuần điểm danh trả về cho client. */
export interface WeekEntity {
  /** Thứ 2 00:00 (ISO string) */
  weekStart: string;
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: string;
  /** Có phải tuần đang mở không (phần tử còn lại là tuần kế tiếp) */
  isActive: boolean;
}
```

- [ ] **Step 6: Viết `BattleSessionsService` phần đọc**

Tạo `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { defaultDeadline } from '@guild/shared/lib';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type {
  BattleSessionEntity,
  WeekEntity,
} from './entities/battle-session.entity';
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
} from './session-schedule';

/** Hàng BattleSession đọc kèm số liệu phụ cho entity. */
type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  weekStart: Date;
  _count: { attendanceRecords: number };
  formation: { id: string } | null;
};

/** Những gì cần đọc thêm cùng mỗi trận để dựng entity. */
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true } },
  formation: { select: { id: true } },
} as const;

/**
 * Sở hữu vòng đời của lịch đánh: tự sinh Guild War cho tuần đang mở và tuần kế,
 * đồng thời phục vụ CRUD scrim cho quản trị viên.
 * Module khác (điểm danh, xếp team) đọc lịch qua service này, không tự truy vấn bảng.
 */
@Injectable()
export class BattleSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mốc Thứ 2 của tuần điểm danh đang mở.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mốc Thứ 2 00:00 dạng ISO string
   */
  getActiveWeekStart(now: Date = new Date()): string {
    return getActiveWeek(now).weekStart.toISOString();
  }

  /**
   * Các tuần quản trị viên được phép thiết lập: tuần đang mở và tuần kế tiếp.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng 2 tuần, tuần đang mở đứng trước
   */
  getEditableWeeks(now: Date = new Date()): WeekEntity[] {
    return getEditableWeeks(now).map((week, index) => ({
      weekStart: week.weekStart.toISOString(),
      weekEnd: week.weekEnd.toISOString(),
      isActive: index === 0,
    }));
  }

  /**
   * Các trận của một tuần, sắp theo thời gian đánh.
   * Tuần đang mở và tuần kế được đảm bảo đã có trận Guild War; tuần đã qua chỉ
   * đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận đã sắp theo thời gian đánh
   */
  async listByWeek(
    weekStart?: string,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity[]> {
    const target = weekStart
      ? new Date(weekStart)
      : getActiveWeek(now).weekStart;

    if (this.isEditableWeek(target, now)) {
      await this.ensureGuildWar(target);
    }

    const rows = await this.prisma.battleSession.findMany({
      where: { weekStart: target },
      orderBy: { dateTime: 'asc' },
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => this.toEntity(row));
  }

  /**
   * Đọc một trận theo id.
   * @param id - Id trận cần đọc
   * @returns Trận tương ứng, null nếu không có
   */
  async findById(id: string): Promise<BattleSessionEntity | null> {
    const row = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });

    return row ? this.toEntity(row) : null;
  }

  /**
   * Đảm bảo tuần đã có trận Guild War. Idempotent nhờ id tất định.
   * @param weekStart - Mốc Thứ 2 00:00 của tuần
   * @returns Promise hoàn tất khi trận đã tồn tại
   */
  private async ensureGuildWar(weekStart: Date): Promise<void> {
    const dateTime = guildWarDateTime(weekStart);

    await this.prisma.battleSession.upsert({
      where: { id: guildWarSessionId(weekStart) },
      create: {
        id: guildWarSessionId(weekStart),
        weekStart,
        dateTime,
        deadline: defaultDeadline(dateTime),
        isGuildWar: true,
      },
      // Đã có thì không đụng vào — quản trị viên có thể đã dời giờ đánh.
      update: {},
    });
  }

  /**
   * Tuần này có thuộc phạm vi quản trị viên được thiết lập không.
   * @param weekStart - Mốc Thứ 2 00:00 của tuần cần xét
   * @param now - Thời điểm hiện tại
   * @returns true nếu là tuần đang mở hoặc tuần kế tiếp
   */
  private isEditableWeek(weekStart: Date, now: Date): boolean {
    return getEditableWeeks(now).some(
      (week) => week.weekStart.getTime() === weekStart.getTime(),
    );
  }

  /**
   * Đổi một hàng BattleSession thành entity trả về cho client.
   * @param row - Hàng đọc từ Prisma kèm `_count` và `formation`
   * @returns Entity đã dựng nhãn và đổi thời gian sang ISO string
   */
  private toEntity(row: SessionRow): BattleSessionEntity {
    return {
      id: row.id,
      label: formatSessionLabel(row.dateTime, row.isGuildWar),
      dateTime: row.dateTime.toISOString(),
      deadline: row.deadline.toISOString(),
      isGuildWar: row.isGuildWar,
      opponent: row.opponent,
      weekStart: row.weekStart.toISOString(),
      attendanceCount: row._count.attendanceRecords,
      hasFormation: row.formation !== null,
    };
  }
}
```

Thêm import `defaultDeadline` ở đầu file:

```ts
import { defaultDeadline } from '@guild/shared/lib';
```

- [ ] **Step 7: Viết controller và module**

Tạo `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts`:

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BattleSessionsService } from './battle-sessions.service';
import type {
  BattleSessionEntity,
  WeekEntity,
} from './entities/battle-session.entity';

@ApiTags('battle-sessions')
@Controller('battle-sessions')
export class BattleSessionsController {
  constructor(private readonly battleSessions: BattleSessionsService) {}

  /**
   * Các tuần quản trị viên được phép thiết lập lịch.
   * @returns Tuần đang mở và tuần kế tiếp
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Tuần đang mở và tuần kế tiếp' })
  getWeeks(): WeekEntity[] {
    return this.battleSessions.getEditableWeeks();
  }

  /**
   * Các trận của một tuần.
   * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get()
  @ApiOperation({ summary: 'Các trận đánh của một tuần' })
  list(@Query('weekStart') weekStart?: string): Promise<BattleSessionEntity[]> {
    return this.battleSessions.listByWeek(weekStart);
  }
}
```

Tạo `apps/api/src/modules/battle-sessions/battle-sessions.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { BattleSessionsController } from './battle-sessions.controller';
import { BattleSessionsService } from './battle-sessions.service';

/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export { BattleSessionsService } from './battle-sessions.service';
export { formatSessionLabel, isDeadlinePassed } from './session-schedule';
export type {
  BattleSessionEntity,
  WeekEntity,
} from './entities/battle-session.entity';

/** Module lịch đánh: sở hữu bảng BattleSession, tự sinh Guild War và CRUD scrim. */
@Module({
  controllers: [BattleSessionsController],
  providers: [BattleSessionsService],
  exports: [BattleSessionsService],
})
export class BattleSessionsModule {}
```

- [ ] **Step 8: Đăng ký module vào app**

Sửa `apps/api/src/app.module.ts` — thêm import và đưa vào mảng `imports` (đặt trước `AttendanceModule`):

```ts
import { BattleSessionsModule } from '@/modules/battle-sessions/battle-sessions.module';
```

```ts
    PrismaModule,
    HealthModule,
    AuthModule,
    BattleSessionsModule,
    AttendanceModule,
    TeamBuilderModule,
```

- [ ] **Step 9: Rút gọn module `attendance`**

Trong `apps/api/src/modules/attendance/entities/attendance.entity.ts`, **xoá** hai interface `BattleSessionEntity` và `WeekEntity` (đã chuyển sang module mới).

Trong `apps/api/src/modules/attendance/attendance.module.ts`, thay toàn bộ nội dung:

```ts
import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '@/modules/battle-sessions/battle-sessions.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

/** Module điểm danh: nhân vật và các lượt điểm danh. Lịch đánh do BattleSessionsModule lo. */
@Module({
  imports: [BattleSessionsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
```

Trong `apps/api/src/modules/attendance/attendance.controller.ts`, **xoá** hai handler `getCurrentWeek` và `getSessions` cùng import `BattleSessionEntity`, `WeekEntity`.

- [ ] **Step 10: Chuyển `AttendanceService` sang dùng `BattleSessionsService`**

Trong `apps/api/src/modules/attendance/attendance.service.ts`:

Đổi phần import và constructor:

```ts
import {
  BattleSessionsService,
  isDeadlinePassed,
} from '@/modules/battle-sessions/battle-sessions.module';
```

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
  ) {}
```

**Xoá** các method `getCurrentWeek`, `getSessions`, `ensureWeekSessions` và import từ `./attendance-schedule`.

Sửa `getRecords`:

```ts
  /**
   * Lấy toàn bộ lượt điểm danh của tuần đang mở.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng record của các trận trong tuần
   */
  async getRecords(now: Date = new Date()): Promise<AttendanceRecordEntity[]> {
    const sessions = await this.battleSessions.listByWeek(undefined, now);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      orderBy: { markedAt: 'desc' },
    });

    return records.map((record) => ({
      characterId: record.characterId,
      sessionId: record.sessionId,
      status: record.status as AttendanceStatus,
      markedAt: record.markedAt.toISOString(),
    }));
  }
```

Sửa phần tra trận trong `mark` (thay đoạn `const sessions = await this.ensureWeekSessions(now); const session = sessions.find(...)`):

```ts
    const session = await this.battleSessions.findById(sessionId);
    // Người thường chỉ điểm danh được cho tuần đang mở; quản trị viên sửa được
    // cả tuần khác để bù sai sót.
    const inActiveWeek =
      session?.weekStart === this.battleSessions.getActiveWeekStart(now);
    if (!session || (!isAdmin && !inActiveWeek)) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (!isAdmin && isDeadlinePassed(new Date(session.deadline), now)) {
      throw new ConflictException('Đã quá hạn điểm danh ngày này.');
    }
```

- [ ] **Step 11: Chuyển `TeamBuilderService` sang module mới**

Trong `apps/api/src/modules/team-builder/team-builder.module.ts`, đổi `AttendanceModule` → `BattleSessionsModule`:

```ts
import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '@/modules/battle-sessions/battle-sessions.module';
import { TeamBuilderController } from './team-builder.controller';
import { TeamBuilderService } from './team-builder.service';

/**
 * Module xếp đội hình bang chiến.
 * Dùng BattleSessionsService để biết tuần đang mở và đảm bảo các trận đã tồn tại —
 * lịch đánh là trách nhiệm của module lịch đánh, không chép lại ở đây.
 */
@Module({
  imports: [BattleSessionsModule],
  controllers: [TeamBuilderController],
  providers: [TeamBuilderService],
})
export class TeamBuilderModule {}
```

Trong `apps/api/src/modules/team-builder/team-builder.service.ts`:

- Đổi import `AttendanceService` → `BattleSessionsService`, thêm `formatSessionLabel`:

```ts
import {
  BattleSessionsService,
  formatSessionLabel,
} from '@/modules/battle-sessions/battle-sessions.module';
```

- Đổi constructor: `private readonly attendance: AttendanceService` → `private readonly battleSessions: BattleSessionsService`.
- Trong `getWeeks`: `await this.attendance.getSessions(now);` → `await this.battleSessions.listByWeek(undefined, now);`
- Trong `getFormations`: `const activeWeekStart = this.attendance.getCurrentWeek(now).fromDate;` → `const activeWeekStart = this.battleSessions.getActiveWeekStart(now);`
- Trong `getFormations`: `await this.attendance.getSessions(now);` → `await this.battleSessions.listByWeek(undefined, now);`
- Hai chỗ dựng `SessionFormationEntity` (trong `getFormations` và `saveFormation`): thay `label: session.label` bằng

```ts
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
```

Trong `apps/api/src/modules/team-builder/entities/formation.entity.ts`, thêm field vào `SessionFormationEntity` (ngay sau `isGuildWar`):

```ts
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
```

- [ ] **Step 12: Xoá file lịch cũ**

```bash
git rm apps/api/src/modules/attendance/attendance-schedule.ts \
       apps/api/src/modules/attendance/__tests__/attendance-schedule.spec.ts
```

- [ ] **Step 13: Cập nhật `attendance.service.spec.ts`**

Trong `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`:

- Bỏ `battleSession` khỏi mock `prisma` và bỏ toàn bộ biến `sessionRows` cùng mock `upsert`/`findMany` của nó.
- Thêm mock service mới ngay trước khi khởi tạo `service`:

```ts
    const SESSIONS = [
      {
        id: 'session-tue',
        label: 'Thứ 3 · 20:30',
        dateTime: vn('2026-07-21T20:30').toISOString(),
        deadline: vn('2026-07-21T10:00').toISOString(),
        isGuildWar: false,
        opponent: 'Hắc Long Đường',
        weekStart: vn('2026-07-20T00:00').toISOString(),
        attendanceCount: 0,
        hasFormation: false,
      },
      {
        id: 'session-sat',
        label: 'Thứ 7 · Guild War',
        dateTime: vn('2026-07-25T20:00').toISOString(),
        deadline: vn('2026-07-23T17:00').toISOString(),
        isGuildWar: true,
        opponent: null,
        weekStart: vn('2026-07-20T00:00').toISOString(),
        attendanceCount: 0,
        hasFormation: false,
      },
    ];

    battleSessions = {
      listByWeek: jest.fn().mockResolvedValue(SESSIONS),
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(SESSIONS.find((item) => item.id === id) ?? null),
        ),
      getActiveWeekStart: jest
        .fn()
        .mockReturnValue(vn('2026-07-20T00:00').toISOString()),
    };

    service = new AttendanceService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
    );
```

- Khai báo biến ở đầu `describe`:

```ts
  let battleSessions: {
    listByWeek: jest.Mock;
    findById: jest.Mock;
    getActiveWeekStart: jest.Mock;
  };
```

- Thêm import: `import { BattleSessionsService } from '@/modules/battle-sessions/battle-sessions.module';`
- Đổi hằng `SESSION_IDS` thành `{ 'Thứ 3 · 20:30': 'session-tue', 'Thứ 7 · Guild War': 'session-sat' }` và **xoá mọi test/assertion nhắc tới `'Thứ 5 · 20:30'`** (trận đó không còn tồn tại mặc định). Test "quá hạn thì chặn" dùng `session-tue`; test "còn hạn thì ghi nhận" dùng `session-sat`.

- [ ] **Step 14: Cập nhật `team-builder.service.spec.ts`**

Trong `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`:

- Đổi import `AttendanceService` → `BattleSessionsService` từ `@/modules/battle-sessions/battle-sessions.module`.
- Bỏ field `label` khỏi mọi phần tử `SESSION_ROWS`, thêm `opponent`:

```ts
const SESSION_ROWS = [
  {
    id: 'session-tue',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-thu',
    dateTime: vn('2026-07-23T20:30'),
    deadline: vn('2026-07-23T17:00'),
    opponent: 'Thiên Nhẫn Giáo',
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-sat',
    dateTime: vn('2026-07-25T20:00'),
    deadline: vn('2026-07-23T17:00'),
    opponent: null,
    isGuildWar: true,
    weekStart: WEEK_START,
  },
];
```

- Đổi mock `attendance` thành:

```ts
    battleSessions = {
      getActiveWeekStart: jest.fn().mockReturnValue(WEEK_START.toISOString()),
      listByWeek: jest.fn().mockResolvedValue([]),
    };
```

kèm khai báo `let battleSessions: { getActiveWeekStart: jest.Mock; listByWeek: jest.Mock };` và truyền vào constructor thay cho `attendance`. Áp dụng cho **cả ba** `describe` trong file (`getFormations`, `getWeeks`, `saveFormation`) — mỗi describe có `beforeEach` riêng.

- Thêm một test mới vào `describe('TeamBuilderService.getFormations')`:

```ts
  it('nhãn trận suy ra từ giờ đánh, không đọc từ database', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.map((item) => item.label)).toEqual([
      'Thứ 3 · 20:30',
      'Thứ 5 · 20:30',
      'Thứ 7 · Guild War',
    ]);
  });
```

- [ ] **Step 15: Chạy toàn bộ test API**

Run: `pnpm --filter api test`
Expected: PASS toàn bộ. Nếu còn lỗi TypeScript về `label`, tìm nốt: `grep -rn "\.label" apps/api/src --include=*.ts | grep -v generated`.

- [ ] **Step 16: Lint**

Run: `pnpm --filter api lint`
Expected: không lỗi. Đặc biệt chú ý luật `no-restricted-imports` — mọi import xuyên module phải qua `*.module`.

- [ ] **Step 17: Commit**

```bash
git add apps/api packages/shared
git commit -m "refactor(api): move battle schedule ownership into battle-sessions module

The weekly schedule now lives in the database instead of SESSION_TEMPLATES.
BattleSession drops its label column, gains an opponent, and only the Saturday
Guild War is auto-generated for the open and next week."
```

---

## Task 4: Web đọc lịch từ endpoint mới

Trang điểm danh và trang xếp team chuyển sang `/battle-sessions`, và tên bang đối thủ đọc từ dữ liệu thật thay vì bảng hard-code.

**Files:**
- Modify: `apps/web/features/attendance/types/attendance.ts`
- Modify: `apps/web/features/attendance/api/attendance-api.ts`
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts`
- Modify: `apps/web/features/attendance/components/week-timeline.tsx`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Modify: `apps/web/features/attendance/index.ts`
- Modify: `apps/web/features/team-builder/types/session-formation.ts`
- Modify: `apps/web/features/team-builder/components/session-tabs.tsx`
- Create: `apps/web/features/attendance/lib/session-subtitle.ts`
- Create: `apps/web/features/attendance/lib/__tests__/session-subtitle.test.ts`
- Delete: `apps/web/lib/battle-session.ts`

**Interfaces:**
- Consumes: entity từ Task 3 (`opponent`, `weekStart`, `attendanceCount`, `hasFormation`, `label`)
- Produces:
  - `interface BattleSession` (đầy đủ field của entity) — export qua `@/features/attendance`
  - `interface Week { weekStart: string; weekEnd: string; isActive: boolean }`
  - `getSessionSubtitle(session: { isGuildWar: boolean; dateTime: string; opponent: string | null }): string`
  - `fetchEditableWeeks(): Promise<Week[]>`

- [ ] **Step 1: Viết test thất bại cho `getSessionSubtitle`**

Tạo `apps/web/features/attendance/lib/__tests__/session-subtitle.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getSessionSubtitle } from "../session-subtitle";

describe("getSessionSubtitle", () => {
  it("trận thường có đối thủ thì hiện tên bang", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: false,
        dateTime: "2026-07-21T13:30:00.000Z",
        opponent: "Hắc Long Đường",
      })
    ).toBe("VS: Hắc Long Đường");
  });

  it("trận thường chưa chốt đối thủ thì báo còn thiếu", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: false,
        dateTime: "2026-07-21T13:30:00.000Z",
        opponent: null,
      })
    ).toBe("Chưa có đối thủ");
  });

  it("Guild War hiện giờ đánh, không có đối thủ", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: true,
        dateTime: "2026-07-25T13:00:00.000Z",
        opponent: null,
      })
    ).toBe("20:00");
  });
});
```

> Test chạy ở môi trường node với `TZ` của máy. Để mốc `20:00` luôn đúng, thêm `TZ: "Asia/Ho_Chi_Minh"` vào `test.env` trong `apps/web/vitest.config.ts`:
> ```ts
>   test: {
>     environment: "node",
>     env: { TZ: "Asia/Ho_Chi_Minh" },
> ```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- session-subtitle`
Expected: FAIL — không tìm thấy `../session-subtitle`.

- [ ] **Step 3: Viết `session-subtitle.ts` và xoá file cũ**

Tạo `apps/web/features/attendance/lib/session-subtitle.ts`:

```ts
import { formatTime } from "@/lib/format";

/** Các trường của một trận cần để dựng dòng phụ. */
interface SessionSubtitleInput {
  /** Trận Guild War — không có đối thủ */
  isGuildWar: boolean;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Tên bang đối thủ, null nếu chưa chốt */
  opponent: string | null;
}

/**
 * Dòng phụ hiển thị dưới nhãn ngày đánh.
 * Guild War chỉ hiện giờ đánh; trận thường hiện tên bang đối thủ, và nếu chưa có
 * thì nói thẳng là chưa có để quản trị viên biết còn thiếu thông tin.
 * @param session - Trận cần hiển thị
 * @returns Dòng phụ đã dựng
 */
export function getSessionSubtitle(session: SessionSubtitleInput): string {
  if (session.isGuildWar) return formatTime(session.dateTime);

  return session.opponent ? `VS: ${session.opponent}` : "Chưa có đối thủ";
}
```

Xoá file cũ:

```bash
rm apps/web/lib/battle-session.ts
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter web test -- session-subtitle`
Expected: PASS (3 test).

- [ ] **Step 5: Cập nhật type của feature attendance**

Trong `apps/web/features/attendance/types/attendance.ts`, thay hai interface:

```ts
/**
 * Một ngày đánh trong tuần — đúng shape backend trả về.
 * Nhãn do server suy ra từ giờ đánh, client không tự dựng.
 */
export interface BattleSession {
  /** ID ngày đánh */
  id: string;
  /** Nhãn hiển thị, ví dụ "Thứ 3 · 20:30" */
  label: string;
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: string;
  /** Hạn chót điểm danh (ISO string) — quá hạn thì khóa cột */
  deadline: string;
  /** Ngày guild war — được làm nổi bật, không xoá được */
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
  /** Mốc Thứ 2 00:00 của tuần chứa trận này (ISO string) */
  weekStart: string;
  /** Số lượt điểm danh đã ghi cho trận này */
  attendanceCount: number;
  /** Trận đã có đội hình xếp sẵn hay chưa */
  hasFormation: boolean;
}

/** Một tuần điểm danh. */
export interface Week {
  /** Thứ 2 00:00 (ISO string) */
  weekStart: string;
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: string;
  /** Có phải tuần đang mở không */
  isActive: boolean;
}
```

- [ ] **Step 6: Trỏ API sang endpoint mới**

Trong `apps/web/features/attendance/api/attendance-api.ts`, thay hai hàm `fetchBattleSessions` và `fetchCurrentWeek`:

```ts
/**
 * Lấy danh sách buổi đánh của tuần đang mở.
 * @returns Promise trả về mảng buổi đánh
 */
export function fetchBattleSessions(): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>("/battle-sessions");
}

/**
 * Lấy các tuần được phép thiết lập: tuần đang mở và tuần kế tiếp.
 * @returns Promise trả về mảng tuần, tuần đang mở đứng trước
 */
export function fetchEditableWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks");
}

/**
 * Lấy tuần điểm danh đang mở.
 * @returns Promise trả về tuần đang mở
 * @throws Error khi backend không trả về tuần nào đang mở
 */
export async function fetchCurrentWeek(): Promise<Week> {
  const weeks = await fetchEditableWeeks();
  const active = weeks.find((week) => week.isActive);

  if (!active) throw new Error("Không xác định được tuần điểm danh.");

  return active;
}
```

Thêm `weeks: () => [...attendanceKeys.all, "weeks"] as const` vào `attendanceKeys` (giữ `week()` cho tuần đang mở).

- [ ] **Step 7: Cập nhật component dùng field cũ**

Trong `apps/web/features/attendance/components/week-timeline.tsx`:
- Đổi import `getSessionSubtitle` từ `@/lib/battle-session` → `../lib/session-subtitle`.
- Đổi `formatDate(week.fromDate)` → `formatDate(week.weekStart)` và `formatDate(week.toDate)` → `formatDate(week.weekEnd)`.
- `subtitle` giờ luôn là chuỗi, đổi `{subtitle && (` thành render thẳng:

```tsx
                <div className="text-xs font-medium text-muted-foreground">
                  {subtitle}
                </div>
```

- Lưới trận đang cứng `sm:grid-cols-3`; số trận nay thay đổi được nên đổi thành `sm:grid-cols-2 lg:grid-cols-3` để 1, 2 hay 4 trận đều không vỡ.

Trong `apps/web/features/attendance/components/attendance-grid.tsx`:
- Đổi import `getSessionSubtitle` sang `../lib/session-subtitle`.
- Đổi `{subtitle && (` thành render thẳng (subtitle luôn có giá trị).

Trong `apps/web/features/attendance/index.ts`, thêm export:

```ts
export { getSessionSubtitle } from "./lib/session-subtitle";
export type { Week } from "./types/attendance";
```

- [ ] **Step 8: Cập nhật feature team-builder**

Trong `apps/web/features/team-builder/types/session-formation.ts`, thêm vào `SessionFormation` (sau `isGuildWar`):

```ts
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
```

Trong `apps/web/features/team-builder/components/session-tabs.tsx`:
- Đổi import `getSessionSubtitle` từ `@/lib/battle-session` → `@/features/attendance`.
- Đổi `{subtitle ? (...) : null}` thành render thẳng:

```tsx
              <span className="text-xs font-normal opacity-80">{subtitle}</span>
```

- Đổi `sm:grid-cols-3` của `TabsList` thành `sm:grid-cols-2 lg:grid-cols-3`.

- [ ] **Step 9: Kiểm tra không còn tham chiếu cũ**

Run: `grep -rn "lib/battle-session\|fromDate\|toDate" apps/web --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: không có kết quả nào trỏ tới file đã xoá hoặc field cũ.

- [ ] **Step 10: Chạy test và typecheck**

Run: `pnpm --filter web test && pnpm --filter web exec tsc --noEmit`
Expected: PASS, không lỗi type.

- [ ] **Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(web): read battle schedule and opponent from the API

Replaces the hard-coded opponent lookup table with the opponent field the
backend now stores, and points the attendance screens at /battle-sessions."
```

---

## Task 5: CRUD lịch đánh cho quản trị viên (backend)

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts`
- Create: `apps/api/src/modules/battle-sessions/dto/battle-session.dto.ts`
- Create: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Interfaces:**
- Consumes: `createBattleSessionSchema`, `updateBattleSessionSchema` (Task 1); `weekStartOf`, `getEditableWeeks` (Task 2)
- Produces:
  - `BattleSessionsService.create(input: CreateBattleSessionInput, now?: Date): Promise<BattleSessionEntity>`
  - `BattleSessionsService.update(id: string, input: UpdateBattleSessionInput, now?: Date): Promise<BattleSessionEntity>`
  - `BattleSessionsService.remove(id: string, now?: Date): Promise<void>`

- [ ] **Step 1: Viết test thất bại cho CRUD**

Tạo `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../battle-sessions.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 2026-07-22 → tuần đang mở bắt đầu Thứ 2 2026-07-20, tuần kế 2026-07-27.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = vn('2026-07-20T00:00');
const NEXT_WEEK_START = vn('2026-07-27T00:00');
const LAST_WEEK_START = vn('2026-07-13T00:00');

/**
 * Dựng một hàng BattleSession như Prisma trả về (kèm `_count` và `formation`).
 * @param overrides - Các field muốn ghi đè
 * @returns Hàng BattleSession giả lập
 */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-tue',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    weekStart: WEEK_START,
    _count: { attendanceRecords: 0 },
    formation: null,
    ...overrides,
  };
}

describe('BattleSessionsService', () => {
  let service: BattleSessionsService;
  let prisma: {
    battleSession: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    formation: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      battleSession: {
        upsert: jest.fn().mockResolvedValue(row()),
        findMany: jest.fn().mockResolvedValue([row()]),
        findUnique: jest.fn().mockResolvedValue(row()),
        create: jest.fn().mockImplementation(() => Promise.resolve(row())),
        update: jest.fn().mockImplementation(() => Promise.resolve(row())),
        delete: jest.fn().mockResolvedValue(row()),
      },
      formation: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    service = new BattleSessionsService(prisma as unknown as PrismaService);
  });

  describe('ensureGuildWar qua listByWeek', () => {
    it('upsert theo id tất định nên gọi nhiều lần vẫn một trận', async () => {
      await service.listByWeek(undefined, WEDNESDAY);
      await service.listByWeek(undefined, WEDNESDAY);

      expect(prisma.battleSession.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.battleSession.upsert.mock.calls[0][0]).toMatchObject({
        where: { id: 'gw-2026-07-20' },
        update: {},
      });
    });

    it('không tự sinh trận cho tuần đã qua', async () => {
      await service.listByWeek(LAST_WEEK_START.toISOString(), WEDNESDAY);

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('tạo được trận cho tuần đang mở và tuần kế tiếp', async () => {
      await service.create(
        {
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T10:00').toISOString(),
          opponent: 'Hắc Long Đường',
        },
        WEDNESDAY,
      );

      expect(prisma.battleSession.create.mock.calls[0][0]).toMatchObject({
        data: { weekStart: WEEK_START, opponent: 'Hắc Long Đường' },
      });

      await service.create(
        {
          dateTime: vn('2026-07-28T20:30').toISOString(),
          deadline: vn('2026-07-28T10:00').toISOString(),
        },
        WEDNESDAY,
      );

      expect(prisma.battleSession.create.mock.calls[1][0]).toMatchObject({
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('từ chối trận thuộc tuần đã qua', async () => {
      await expect(
        service.create(
          {
            dateTime: vn('2026-07-14T20:30').toISOString(),
            deadline: vn('2026-07-14T10:00').toISOString(),
          },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối hạn chót muộn hơn giờ đánh', async () => {
      await expect(
        service.create(
          {
            dateTime: vn('2026-07-21T20:30').toISOString(),
            deadline: vn('2026-07-21T21:00').toISOString(),
          },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('quy tên bang rỗng về null', async () => {
      await service.create(
        {
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T10:00').toISOString(),
          opponent: '',
        },
        WEDNESDAY,
      );

      expect(prisma.battleSession.create.mock.calls[0][0]).toMatchObject({
        data: { opponent: null },
      });
    });
  });

  describe('update', () => {
    it('báo 404 khi trận không còn tồn tại', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(null);

      await expect(
        service.update('mat-roi', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối đặt đối thủ cho Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(
        service.update('gw-2026-07-20', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(BadRequestException);
    });

    it('dời trận sang tuần khác thì cập nhật cả weekStart của đội hình', async () => {
      await service.update(
        'session-tue',
        { dateTime: vn('2026-07-28T20:30').toISOString() },
        WEDNESDAY,
      );

      expect(prisma.battleSession.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'session-tue' },
        data: { weekStart: NEXT_WEEK_START },
      });
      expect(prisma.formation.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-tue' },
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('từ chối sửa trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START, dateTime: vn('2026-07-14T20:30') }),
      );

      await expect(
        service.update('session-tue', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('xoá được scrim của tuần đang mở', async () => {
      await service.remove('session-tue', WEDNESDAY);

      expect(prisma.battleSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-tue' },
      });
    });

    it('không cho xoá Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true }),
      );

      await expect(
        service.remove('gw-2026-07-20', WEDNESDAY),
      ).rejects.toThrow(BadRequestException);
    });

    it('không cho xoá trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START }),
      );

      await expect(service.remove('session-tue', WEDNESDAY)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test -- battle-sessions.service`
Expected: FAIL — `service.create is not a function`.

- [ ] **Step 3: Viết CRUD trong service**

Thêm vào đầu `battle-sessions.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from '@guild/shared/schemas';
```

và `weekStartOf` vào danh sách import từ `./session-schedule`.

Thêm các method sau vào class (đặt trước nhóm method `private`):

```ts
  /**
   * Tạo một trận scrim mới. Không tạo được Guild War — trận đó do hệ thống sinh.
   * @param input - Giờ đánh, hạn chót và tên bang đối thủ
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận vừa tạo
   * @throws BadRequestException khi trận không thuộc tuần được thiết lập hoặc hạn chót muộn hơn giờ đánh
   */
  async create(
    input: CreateBattleSessionInput,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity> {
    const dateTime = new Date(input.dateTime);
    const deadline = new Date(input.deadline);

    this.assertEditableWeek(weekStartOf(dateTime), now);
    this.assertDeadlineBeforeBattle(deadline, dateTime);

    const created = await this.prisma.battleSession.create({
      data: {
        dateTime,
        deadline,
        opponent: normalizeOpponent(input.opponent),
        isGuildWar: false,
        weekStart: weekStartOf(dateTime),
      },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(created);
  }

  /**
   * Sửa một trận. Dời giờ đánh sang tuần khác thì `weekStart` của trận và của
   * đội hình đi kèm được cập nhật trong cùng một transaction.
   * @param id - Id trận cần sửa
   * @param input - Các field cần đổi
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận sau khi sửa
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi tuần không được thiết lập, hạn chót muộn hơn giờ đánh, hoặc đặt đối thủ cho Guild War
   */
  async update(
    id: string,
    input: UpdateBattleSessionInput,
    now: Date = new Date(),
  ): Promise<BattleSessionEntity> {
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    this.assertEditableWeek(current.weekStart, now);

    const opponent =
      input.opponent === undefined
        ? current.opponent
        : normalizeOpponent(input.opponent);
    if (current.isGuildWar && opponent !== null) {
      throw new BadRequestException('Trận Guild War không có đối thủ.');
    }

    const dateTime = input.dateTime ? new Date(input.dateTime) : current.dateTime;
    const deadline = input.deadline ? new Date(input.deadline) : current.deadline;
    const weekStart = weekStartOf(dateTime);

    this.assertEditableWeek(weekStart, now);
    this.assertDeadlineBeforeBattle(deadline, dateTime);

    const updated = await this.prisma.$transaction(async (tx) => {
      const session = await tx.battleSession.update({
        where: { id },
        data: { dateTime, deadline, opponent, weekStart },
        include: SESSION_INCLUDE,
      });

      // Formation giữ bản copy weekStart để dọn dữ liệu cũ không phải join —
      // dời trận sang tuần khác mà quên chỗ này thì đội hình biến mất khỏi tuần của nó.
      await tx.formation.updateMany({
        where: { sessionId: id },
        data: { weekStart },
      });

      return session;
    });

    return this.toEntity(updated);
  }

  /**
   * Xoá một trận scrim. Điểm danh và đội hình của trận bị xoá theo (cascade).
   * @param id - Id trận cần xoá
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Promise hoàn tất khi đã xoá
   * @throws NotFoundException khi trận không còn tồn tại
   * @throws BadRequestException khi là Guild War hoặc thuộc tuần đã qua
   */
  async remove(id: string, now: Date = new Date()): Promise<void> {
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }
    if (current.isGuildWar) {
      throw new BadRequestException('Không thể xoá trận Guild War.');
    }

    this.assertEditableWeek(current.weekStart, now);

    await this.prisma.battleSession.delete({ where: { id } });
  }

  /**
   * Chặn thao tác lên tuần ngoài phạm vi thiết lập.
   * @param weekStart - Mốc Thứ 2 của tuần cần xét
   * @param now - Thời điểm hiện tại
   * @returns Không trả về gì khi hợp lệ
   * @throws BadRequestException khi tuần đã qua hoặc quá xa ở tương lai
   */
  private assertEditableWeek(weekStart: Date, now: Date): void {
    if (!this.isEditableWeek(weekStart, now)) {
      throw new BadRequestException(
        'Chỉ thiết lập được lịch của tuần này và tuần sau.',
      );
    }
  }

  /**
   * Chặn hạn chót muộn hơn giờ đánh.
   * @param deadline - Hạn chót điểm danh
   * @param dateTime - Giờ đánh
   * @returns Không trả về gì khi hợp lệ
   * @throws BadRequestException khi hạn chót muộn hơn giờ đánh
   */
  private assertDeadlineBeforeBattle(deadline: Date, dateTime: Date): void {
    if (deadline.getTime() > dateTime.getTime()) {
      throw new BadRequestException('Hạn chót phải trước hoặc bằng giờ đánh.');
    }
  }
```

Thêm hàm thuần ở cuối file (ngoài class):

```ts
/**
 * Chuẩn hoá tên bang đối thủ: bỏ trắng hai đầu, chuỗi rỗng coi như chưa có.
 * @param value - Giá trị người dùng gửi lên (undefined = không đổi)
 * @returns Tên bang đã chuẩn hoá hoặc null
 */
function normalizeOpponent(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter api test -- battle-sessions.service`
Expected: PASS toàn bộ.

- [ ] **Step 5: Viết DTO**

Tạo `apps/api/src/modules/battle-sessions/dto/battle-session.dto.ts`:

```ts
import {
  createBattleSessionSchema,
  updateBattleSessionSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request tạo trận.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class CreateBattleSessionDto extends createZodDto(
  createBattleSessionSchema,
) {}

/** Body của request sửa trận — mọi field đều không bắt buộc. */
export class UpdateBattleSessionDto extends createZodDto(
  updateBattleSessionSchema,
) {}
```

- [ ] **Step 6: Thêm route admin vào controller**

Trong `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts`, bổ sung import và ba handler:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common';
import {
  CreateBattleSessionDto,
  UpdateBattleSessionDto,
} from './dto/battle-session.dto';
```

```ts
  /**
   * Thêm một trận scrim.
   * @param body - Giờ đánh, hạn chót và tên bang đối thủ
   * @returns Trận vừa tạo
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Thêm một trận scrim' })
  create(@Body() body: CreateBattleSessionDto): Promise<BattleSessionEntity> {
    return this.battleSessions.create(body);
  }

  /**
   * Sửa một trận.
   * @param id - Id trận cần sửa
   * @param body - Các field cần đổi
   * @returns Trận sau khi sửa
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sửa một trận' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateBattleSessionDto,
  ): Promise<BattleSessionEntity> {
    return this.battleSessions.update(id, body);
  }

  /**
   * Xoá một trận scrim cùng toàn bộ điểm danh và đội hình của nó.
   * @param id - Id trận cần xoá
   * @returns Promise hoàn tất khi đã xoá
   */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xoá một trận scrim' })
  remove(@Param('id') id: string): Promise<void> {
    return this.battleSessions.remove(id);
  }
```

> `@Get('weeks')` phải khai báo **trước** `@Get()` và không đụng `@Get(':id')` (không có route đó) nên thứ tự hiện tại là an toàn.

- [ ] **Step 7: Chạy toàn bộ test và lint**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: PASS, không lỗi lint.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add admin CRUD for weekly scrim battle sessions"
```

---

## Task 6: Tầng dữ liệu của feature Thiết lập (web)

**Files:**
- Create: `apps/web/features/settings/api/battle-sessions-keys.ts`
- Create: `apps/web/features/settings/api/battle-sessions-api.ts`
- Create: `apps/web/features/settings/hooks/use-week-sessions.ts`
- Create: `apps/web/features/settings/hooks/use-session-mutations.ts`
- Create: `apps/web/features/settings/lib/datetime-input.ts`
- Create: `apps/web/features/settings/lib/__tests__/datetime-input.test.ts`

**Interfaces:**
- Consumes: `BattleSession`, `Week` từ `@/features/attendance`; `CreateBattleSessionInput`, `UpdateBattleSessionInput` từ `@shared/schemas`
- Produces:
  - `settingsKeys.{all, weeks, sessions(weekStart)}`
  - `fetchSettingsWeeks(): Promise<Week[]>`
  - `fetchWeekSessions(weekStart: string): Promise<BattleSession[]>`
  - `createBattleSession(input: CreateBattleSessionInput): Promise<BattleSession>`
  - `updateBattleSession(id: string, input: UpdateBattleSessionInput): Promise<BattleSession>`
  - `deleteBattleSession(id: string): Promise<void>`
  - `useSettingsWeeks()`, `useWeekSessions(weekStart)`, `useCreateSession()`, `useUpdateSession()`, `useDeleteSession()`
  - `toInputValue(iso: string): string`, `fromInputValue(value: string): string`

- [ ] **Step 1: Viết test thất bại cho helper `datetime-local`**

`<input type="datetime-local">` làm việc với chuỗi `"YYYY-MM-DDTHH:mm"` theo giờ **máy người dùng**, còn API dùng ISO UTC — cần hai hàm đổi qua lại.

Tạo `apps/web/features/settings/lib/__tests__/datetime-input.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { fromInputValue, toInputValue } from "../datetime-input";

describe("datetime-input", () => {
  it("đổi ISO sang chuỗi datetime-local theo giờ máy", () => {
    expect(toInputValue("2026-07-21T13:30:00.000Z")).toBe("2026-07-21T20:30");
  });

  it("đổi chuỗi datetime-local ngược lại thành ISO", () => {
    expect(fromInputValue("2026-07-21T20:30")).toBe("2026-07-21T13:30:00.000Z");
  });

  it("đi vòng tròn không đổi giá trị", () => {
    const iso = "2026-07-25T13:00:00.000Z";

    expect(fromInputValue(toInputValue(iso))).toBe(iso);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- datetime-input`
Expected: FAIL — không tìm thấy `../datetime-input`.

- [ ] **Step 3: Viết helper**

Tạo `apps/web/features/settings/lib/datetime-input.ts`:

```ts
/**
 * `<input type="datetime-local">` nhận và trả chuỗi "YYYY-MM-DDTHH:mm" theo giờ
 * máy người dùng, còn API dùng ISO UTC. Hai hàm này là chỗ duy nhất đổi qua lại.
 */

/**
 * Đổi ISO string sang giá trị cho input datetime-local.
 * @param iso - Thời điểm dạng ISO string
 * @returns Chuỗi "YYYY-MM-DDTHH:mm" theo giờ máy
 */
export function toInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

/**
 * Đổi giá trị của input datetime-local thành ISO string gửi lên API.
 * @param value - Chuỗi "YYYY-MM-DDTHH:mm" theo giờ máy
 * @returns Thời điểm dạng ISO string
 */
export function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter web test -- datetime-input`
Expected: PASS (3 test).

- [ ] **Step 5: Viết query keys**

Tạo `apps/web/features/settings/api/battle-sessions-keys.ts`:

```ts
/**
 * Query key factory cho màn Thiết lập lịch đánh.
 * Tách khỏi `battle-sessions-api.ts` vì file `"use server"` chỉ được export hàm async.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  weeks: () => [...settingsKeys.all, "weeks"] as const,
  sessions: (weekStart: string) =>
    [...settingsKeys.all, "sessions", weekStart] as const,
};
```

- [ ] **Step 6: Viết server action gọi API**

Tạo `apps/web/features/settings/api/battle-sessions-api.ts`:

```ts
"use server";

import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@shared/schemas";

import { getAccessToken } from "@/features/auth";
import type { BattleSession, Week } from "@/features/attendance";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Lấy access token của quản trị viên đang đăng nhập.
 * Chạy ở server vì token nằm trong cookie httpOnly, client không đọc được.
 * @returns Header Authorization đã dựng sẵn
 * @throws ApiError khi phiên đăng nhập đã hết hạn
 */
async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Lấy các tuần thiết lập được: tuần đang mở và tuần kế tiếp.
 * @returns Mảng 2 tuần, tuần đang mở đứng trước
 */
export async function fetchSettingsWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks");
}

/**
 * Lấy các trận của một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần (ISO string)
 * @returns Mảng trận sắp theo thời gian đánh
 */
export async function fetchWeekSessions(
  weekStart: string
): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>(
    `/battle-sessions?weekStart=${encodeURIComponent(weekStart)}`
  );
}

/**
 * Thêm một trận scrim.
 * @param input - Giờ đánh, hạn chót và tên bang đối thủ
 * @returns Trận vừa tạo
 * @throws ApiError với message tiếng Việt của backend khi bị từ chối
 */
export async function createBattleSession(
  input: CreateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>("/battle-sessions", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Sửa một trận.
 * @param id - Id trận cần sửa
 * @param input - Các field cần đổi
 * @returns Trận sau khi sửa
 * @throws ApiError khi trận đã bị xoá (404) hoặc backend từ chối
 */
export async function updateBattleSession(
  id: string,
  input: UpdateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Xoá một trận scrim cùng điểm danh và đội hình của nó.
 * @param id - Id trận cần xoá
 * @returns Promise hoàn tất khi đã xoá
 * @throws ApiError khi là Guild War, tuần đã qua, hoặc trận đã bị xoá
 */
export async function deleteBattleSession(id: string): Promise<void> {
  await apiFetch<null>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
```

> `apiFetch` bóc `body.data` của response; endpoint DELETE trả 204 không có body nên `response.json()` fail và trả `null` — `apiFetch` đã `.catch(() => null)` nên không ném lỗi. Nếu `(body as {data}).data` gây lỗi runtime, sửa `apiFetch` để trả `undefined` khi `response.status === 204`.

- [ ] **Step 7: Viết hook query**

Tạo `apps/web/features/settings/hooks/use-week-sessions.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSettingsWeeks, fetchWeekSessions } from "../api/battle-sessions-api";
import { settingsKeys } from "../api/battle-sessions-keys";

/**
 * Query các tuần thiết lập được (tuần đang mở + tuần kế tiếp).
 * @returns Kết quả query TanStack (data là mảng 2 tuần)
 */
export function useSettingsWeeks() {
  return useQuery({
    queryKey: settingsKeys.weeks(),
    queryFn: fetchSettingsWeeks,
  });
}

/**
 * Query các trận của một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần; bỏ trống thì query không chạy
 * @returns Kết quả query TanStack (data là mảng trận)
 */
export function useWeekSessions(weekStart: string | null) {
  return useQuery({
    queryKey: settingsKeys.sessions(weekStart ?? ""),
    queryFn: () => fetchWeekSessions(weekStart as string),
    enabled: weekStart !== null,
  });
}
```

- [ ] **Step 8: Viết hook mutation**

Tạo `apps/web/features/settings/hooks/use-session-mutations.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@shared/schemas";

import { attendanceKeys } from "@/features/attendance";
import { teamBuilderKeys } from "@/features/team-builder";
import {
  createBattleSession,
  deleteBattleSession,
  updateBattleSession,
} from "../api/battle-sessions-api";
import { settingsKeys } from "../api/battle-sessions-keys";

/** Payload sửa một trận. */
export interface UpdateSessionVariables {
  /** Id trận cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateBattleSessionInput;
}

/**
 * Làm mới mọi màn phụ thuộc lịch đánh sau khi thêm/sửa/xoá.
 * Bảng điểm danh đổi số cột và trang Xếp team đổi số tab, nên thiếu chỗ nào là
 * hai màn lệch nhau cho tới lần tải lại trang.
 * @returns Hàm invalidate dùng trong onSuccess của mutation
 */
function useInvalidateSchedule() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.sessions() });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}

/**
 * Mutation thêm trận scrim.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useCreateSession() {
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (input: CreateBattleSessionInput) => createBattleSession(input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation sửa trận.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useUpdateSession() {
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: ({ id, input }: UpdateSessionVariables) =>
      updateBattleSession(id, input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation xoá trận scrim.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useDeleteSession() {
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (id: string) => deleteBattleSession(id),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 9: Mở export cần thiết ở hai feature kia**

Trong `apps/web/features/attendance/index.ts`, thêm:

```ts
export { attendanceKeys } from "./api/attendance-api";
```

Trong `apps/web/features/team-builder/index.ts`, thêm:

```ts
export { teamBuilderKeys } from "./api/team-builder-keys";
```

- [ ] **Step 10: Typecheck và test**

Run: `pnpm --filter web test && pnpm --filter web exec tsc --noEmit`
Expected: PASS, không lỗi type.

> **Vì sao không có unit test cho `battle-sessions-api.ts`:** spec liệt kê test "shape request/response" cho file này, nhưng nó là file `"use server"` — Vitest ở môi trường node không biên dịch được directive đó, và nội dung file chỉ là lớp mỏng gọi `apiFetch` (đã có test riêng ở `lib/__tests__/api-client.test.ts`). Phần đáng test là hai helper thời gian, đã làm ở Step 1–4. Ba đường CRUD được kiểm bằng tay ở Task 7 Step 9.

- [ ] **Step 11: Commit**

```bash
git add apps/web/features
git commit -m "feat(web): add data layer for the schedule settings screen"
```

---

## Task 7: Màn hình Thiết lập (web)

**Files:**
- Create: `apps/web/features/settings/components/settings-screen.tsx`
- Create: `apps/web/features/settings/components/week-selector.tsx`
- Create: `apps/web/features/settings/components/session-list.tsx`
- Create: `apps/web/features/settings/components/session-row.tsx`
- Create: `apps/web/features/settings/components/session-form-dialog.tsx`
- Create: `apps/web/features/settings/components/delete-session-dialog.tsx`
- Create: `apps/web/features/settings/index.ts`
- Create: `apps/web/app/thiet-lap/page.tsx`
- Modify: `apps/web/config/routes.ts`
- Modify: `apps/web/components/shared/main-nav.tsx`
- Modify: `apps/web/proxy.ts`

**Interfaces:**
- Consumes: hook và helper của Task 6; `getSessionSubtitle`, `BattleSession`, `Week` từ `@/features/attendance`; `defaultDeadline` từ `@shared/lib/battle-session`
- Produces: `SettingsScreen` (export qua `features/settings/index.ts`), `ROUTES.settings`

- [ ] **Step 1: Mở route cho quản trị viên**

Trong `apps/web/config/routes.ts`:

```ts
export const ROUTES = {
  attendance: "/",
  attendanceHistory: "/lich-su-diem-danh",
  teamBuilder: "/xep-team",
  settings: "/thiet-lap",
} as const;
```

Trong `apps/web/components/shared/main-nav.tsx`, đổi import icon thành `import { ClipboardCheck, History, Settings, Users } from "lucide-react";` và thêm mục cuối vào `NAV_ITEMS`:

```ts
  {
    href: ROUTES.settings,
    label: "Thiết lập",
    icon: Settings,
    adminOnly: true,
  },
```

Trong `apps/web/proxy.ts`, đổi hằng và chỗ dùng:

```ts
/** Các route chỉ dành cho quản trị viên. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];
```

```ts
  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const response = isAdminPath
    ? NextResponse.redirect(new URL(ROUTES.attendance, request.url))
    : NextResponse.next();
```

- [ ] **Step 2: Viết week selector**

Tạo `apps/web/features/settings/components/week-selector.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import type { Week } from "@/features/attendance";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  /** Hai tuần thiết lập được: tuần đang mở và tuần kế tiếp */
  weeks: Week[];
  /** Mốc Thứ 2 của tuần đang xem */
  value: string;
  /** Gọi khi người dùng đổi tuần */
  onChange: (weekStart: string) => void;
}

/**
 * Hiển thị một tuần dạng "20/07 – 25/07".
 * @param week - Tuần cần hiển thị
 * @returns Khoảng ngày tiếng Việt
 */
function formatRange(week: Week): string {
  const format = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${format.format(new Date(week.weekStart))} – ${format.format(
    new Date(week.weekEnd)
  )}`;
}

/**
 * Chọn tuần cần thiết lập. Chỉ có đúng hai lựa chọn nên dùng hai nút thay vì
 * select — nhanh hơn một thao tác và nhìn thấy ngay cả hai.
 * @param weeks - Hai tuần thiết lập được
 * @param value - Mốc Thứ 2 của tuần đang xem
 * @param onChange - Gọi khi người dùng đổi tuần
 * @returns Thanh chọn tuần
 */
export function WeekSelector({ weeks, value, onChange }: WeekSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {weeks.map((week) => (
        <Button
          key={week.weekStart}
          variant={week.weekStart === value ? "secondary" : "ghost"}
          size="sm"
          aria-current={week.weekStart === value ? "true" : undefined}
          className={cn(week.weekStart !== value && "text-muted-foreground")}
          onClick={() => onChange(week.weekStart)}
        >
          {week.isActive ? "Tuần này" : "Tuần sau"}
          <span className="opacity-70">{formatRange(week)}</span>
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Viết hàng một trận**

Tạo `apps/web/features/settings/components/session-row.tsx`:

```tsx
"use client";

import { Pencil, Swords, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionSubtitle, type BattleSession } from "@/features/attendance";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SessionRowProps {
  /** Trận cần hiển thị */
  session: BattleSession;
  /** Gọi khi bấm Sửa */
  onEdit: (session: BattleSession) => void;
  /** Gọi khi bấm Xoá */
  onDelete: (session: BattleSession) => void;
}

/**
 * Một trận trong danh sách thiết lập: nhãn, đối thủ, hạn chót và hai nút thao tác.
 * Guild War do hệ thống sinh nên chỉ sửa được giờ, không có nút xoá.
 * @param session - Trận cần hiển thị
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @returns Một hàng trong danh sách trận
 */
export function SessionRow({ session, onEdit, onDelete }: SessionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
        session.isGuildWar && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className={cn(
            "flex items-center gap-1.5 font-medium",
            session.isGuildWar && "text-primary"
          )}
        >
          {session.isGuildWar && <Swords className="size-4" />}
          {session.label}
          {session.isGuildWar && <Badge variant="secondary">Guild War</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {getSessionSubtitle(session)}
        </div>
        <div className="text-xs text-muted-foreground">
          Hạn chót: {formatDateTime(session.deadline)}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(session)}>
          <Pencil className="size-4" />
          Sửa
        </Button>
        {!session.isGuildWar && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onDelete(session)}
          >
            <Trash2 className="size-4" />
            Xoá
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Viết dialog form**

Tạo `apps/web/features/settings/components/session-form-dialog.tsx`:

```tsx
"use client";

import { AlertCircle } from "lucide-react";
import { useState, type SubmitEvent } from "react";

import { defaultDeadline } from "@shared/lib/battle-session";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BattleSession } from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
import { fromInputValue, toInputValue } from "../lib/datetime-input";
import { useCreateSession, useUpdateSession } from "../hooks/use-session-mutations";

interface SessionFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Trận đang sửa; null nghĩa là đang thêm mới */
  session: BattleSession | null;
  /** Gọi khi dialog đóng lại */
  onOpenChange: (open: boolean) => void;
}

/**
 * Form thêm/sửa một trận. Chọn giờ đánh xong thì hạn chót tự điền theo luật gợi ý,
 * nhưng chỉ khi người dùng chưa tự sửa ô đó — đang gõ tay mà bị ghi đè là khó chịu nhất.
 * @param open - Dialog đang mở hay không
 * @param session - Trận đang sửa; null nghĩa là thêm mới
 * @param onOpenChange - Gọi khi dialog đóng lại
 * @returns Dialog form
 */
export function SessionFormDialog({
  open,
  session,
  onOpenChange,
}: SessionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form nằm ở component con nên state tự reset mỗi lần mở lại. */}
        <SessionForm session={session} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface SessionFormProps {
  /** Trận đang sửa; null nghĩa là thêm mới */
  session: BattleSession | null;
  /** Gọi khi lưu thành công */
  onDone: () => void;
}

/**
 * Ba ô nhập của một trận: giờ đánh, tên bang đối thủ, hạn chót.
 * @param session - Trận đang sửa; null nghĩa là thêm mới
 * @param onDone - Gọi khi lưu thành công
 * @returns Form thêm/sửa trận
 */
function SessionForm({ session, onDone }: SessionFormProps) {
  const isGuildWar = session?.isGuildWar ?? false;

  const [dateTime, setDateTime] = useState(
    session ? toInputValue(session.dateTime) : ""
  );
  const [deadline, setDeadline] = useState(
    session ? toInputValue(session.deadline) : ""
  );
  const [opponent, setOpponent] = useState(session?.opponent ?? "");
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSession();
  const updateMutation = useUpdateSession();
  const saving = createMutation.isPending || updateMutation.isPending;

  /**
   * Đổi giờ đánh, đồng thời điền sẵn hạn chót nếu người dùng chưa tự sửa ô đó.
   * @param value - Giá trị mới của ô giờ đánh
   */
  function handleDateTimeChange(value: string) {
    setDateTime(value);

    if (deadlineTouched || value === "") return;

    const suggested = defaultDeadline(new Date(value));
    setDeadline(toInputValue(suggested.toISOString()));
  }

  /**
   * Gửi form: tạo mới hoặc cập nhật tuỳ theo đang sửa trận nào.
   * @param event - Sự kiện submit form
   */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = {
      dateTime: fromInputValue(dateTime),
      deadline: fromInputValue(deadline),
      opponent: isGuildWar ? null : opponent.trim() || null,
    };

    try {
      if (session) {
        await updateMutation.mutateAsync({ id: session.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không lưu được thay đổi."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="text-base font-semibold">
        {session ? "Sửa ngày đánh" : "Thêm trận scrim"}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-date-time">Ngày giờ đánh</Label>
        <Input
          id="session-date-time"
          type="datetime-local"
          required
          value={dateTime}
          onChange={(event) => handleDateTimeChange(event.target.value)}
        />
      </div>

      {!isGuildWar && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-opponent">Tên bang đối thủ</Label>
          <Input
            id="session-opponent"
            maxLength={100}
            placeholder="Để trống nếu chưa chốt"
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-deadline">Hạn chót điểm danh</Label>
        <Input
          id="session-deadline"
          type="datetime-local"
          required
          value={deadline}
          onChange={(event) => {
            setDeadlineTouched(true);
            setDeadline(event.target.value);
          }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

- [ ] **Step 5: Viết dialog xoá**

Tạo `apps/web/features/settings/components/delete-session-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { getSessionSubtitle, type BattleSession } from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
import { useDeleteSession } from "../hooks/use-session-mutations";

interface DeleteSessionDialogProps {
  /** Trận sắp xoá; null thì dialog đóng */
  session: BattleSession | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Câu cảnh báo trước khi xoá, nói thẳng sẽ mất những gì.
 * @param session - Trận sắp xoá
 * @returns Câu mô tả hậu quả
 */
function describeLoss(session: BattleSession): string {
  const losses: string[] = [];

  if (session.attendanceCount > 0) {
    losses.push(`${session.attendanceCount} lượt điểm danh`);
  }
  if (session.hasFormation) losses.push("1 đội hình đã xếp");

  if (losses.length === 0) return "Trận này chưa có dữ liệu gì.";

  return `Trận này đã có ${losses.join(" và ")} — xoá là mất hết, không khôi phục được.`;
}

/**
 * Xác nhận xoá một trận scrim.
 * @param session - Trận sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
 */
export function DeleteSessionDialog({
  session,
  onClose,
}: DeleteSessionDialogProps) {
  const deleteMutation = useDeleteSession();
  const [error, setError] = useState<string | null>(null);

  /**
   * Xoá trận rồi đóng dialog; thất bại thì giữ dialog và hiện lỗi.
   */
  async function handleDelete() {
    if (!session) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(session.id);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không xoá được trận này."
      );
    }
  }

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        {session && (
          <div className="grid gap-3">
            <div className="text-base font-semibold">
              Xoá trận {session.label}?
            </div>
            <div className="text-sm text-muted-foreground">
              {getSessionSubtitle(session)}
            </div>
            <div className="text-sm">{describeLoss(session)}</div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? "Đang xoá…" : "Xoá trận"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Viết danh sách và màn hình**

Tạo `apps/web/features/settings/components/session-list.tsx`:

```tsx
"use client";

import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BattleSession } from "@/features/attendance";
import { SessionRow } from "./session-row";

interface SessionListProps {
  /** Các trận của tuần đang xem, đã sắp theo giờ đánh */
  sessions: BattleSession[];
  /** Gọi khi bấm Sửa một trận */
  onEdit: (session: BattleSession) => void;
  /** Gọi khi bấm Xoá một trận */
  onDelete: (session: BattleSession) => void;
  /** Gọi khi bấm thêm trận scrim */
  onAdd: () => void;
}

/**
 * Danh sách trận của một tuần. Tuần chỉ có Guild War là trạng thái bình thường
 * của mọi tuần mới, nên phần rỗng nói rõ điều đó thay vì trông như lỗi.
 * @param sessions - Các trận của tuần đang xem
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @param onAdd - Gọi khi bấm thêm trận scrim
 * @returns Danh sách trận kèm nút thêm
 */
export function SessionList({
  sessions,
  onEdit,
  onDelete,
  onAdd,
}: SessionListProps) {
  const hasScrim = sessions.some((session) => !session.isGuildWar);

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {!hasScrim && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Tuần này chưa có trận scrim nào.
        </div>
      )}

      <Button variant="outline" className="self-start" onClick={onAdd}>
        <CalendarPlus className="size-4" />
        Thêm trận scrim
      </Button>
    </div>
  );
}
```

Tạo `apps/web/features/settings/components/settings-screen.tsx`:

```tsx
"use client";

import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BattleSession } from "@/features/attendance";
import { useSettingsWeeks, useWeekSessions } from "../hooks/use-week-sessions";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { SessionFormDialog } from "./session-form-dialog";
import { SessionList } from "./session-list";
import { WeekSelector } from "./week-selector";

/**
 * Màn Thiết lập lịch đánh: chọn tuần rồi thêm/sửa/xoá các trận của tuần đó.
 * Chỉ tuần đang mở và tuần kế tiếp sửa được — backend cũng chặn lại lần nữa.
 * @returns Màn hình thiết lập
 */
export function SettingsScreen() {
  const weeksQuery = useSettingsWeeks();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const weeks = weeksQuery.data ?? [];
  const weekStart = selectedWeek ?? weeks[0]?.weekStart ?? null;
  const sessionsQuery = useWeekSessions(weekStart);

  const [editing, setEditing] = useState<BattleSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<BattleSession | null>(null);

  if (weeksQuery.isError || sessionsQuery.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            message="Không tải được lịch đánh."
            onRetry={() => {
              void weeksQuery.refetch();
              void sessionsQuery.refetch();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (weeksQuery.isPending || sessionsQuery.isPending || weekStart === null) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Thiết lập lịch đánh</h1>
          <p className="text-sm text-muted-foreground">
            Sửa được lịch của tuần này và tuần sau. Trận Guild War do hệ thống
            tạo sẵn, chỉ đổi được giờ đánh.
          </p>
        </div>

        <WeekSelector
          weeks={weeks}
          value={weekStart}
          onChange={setSelectedWeek}
        />

        <SessionList
          sessions={sessionsQuery.data}
          onEdit={(session) => {
            setEditing(session);
            setFormOpen(true);
          }}
          onDelete={setDeleting}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      </CardContent>

      <SessionFormDialog
        open={formOpen}
        session={editing}
        onOpenChange={setFormOpen}
      />
      <DeleteSessionDialog
        session={deleting}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}
```

Tạo `apps/web/features/settings/index.ts`:

```ts
export { SettingsScreen } from "./components/settings-screen";
```

- [ ] **Step 7: Viết route**

Tạo `apps/web/app/thiet-lap/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth";
import { SettingsScreen } from "@/features/settings";

export const metadata: Metadata = {
  title: "Thiết lập — Mèo Mập Giang Hồ",
  description: "Thiết lập lịch đánh trong tuần (chỉ quản trị viên)",
};

/**
 * Route "/thiet-lap" — trang thiết lập lịch đánh, chỉ quản trị viên truy cập được.
 * Proxy đã chặn từ trước; kiểm tra lại ở đây để phòng trường hợp proxy bị bỏ qua.
 * @returns Nội dung trang thiết lập
 */
export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.attendance);

  return <SettingsScreen />;
}
```

- [ ] **Step 8: Typecheck, lint, test**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && pnpm --filter web test`
Expected: PASS. Nếu `ErrorState` có prop khác, mở `apps/web/components/shared/error-state.tsx` và chỉnh cho khớp.

- [ ] **Step 9: Kiểm tra thủ công**

Chạy `pnpm --filter api dev` và `pnpm --filter web dev`, rồi kiểm:
1. Chưa đăng nhập → gõ `/thiet-lap` bị đẩy về trang chủ, nav không có mục "Thiết lập".
2. Đăng nhập admin → có mục "Thiết lập"; tuần này chỉ có Guild War, phần rỗng hiện "Tuần này chưa có trận scrim nào."
3. Thêm một trận Thứ 3 20:30 → hạn chót tự điền 10:00 Thứ 3; đổi giờ đánh thì hạn chót đổi theo; tự sửa hạn chót rồi đổi giờ đánh thì hạn chót **không** bị ghi đè.
4. Về trang điểm danh → có thêm cột mới kèm dòng "VS: …".
5. Sang trang Xếp team → có thêm tab tương ứng.
6. Bấm Xoá trận vừa tạo → dialog báo đúng số lượt điểm danh; xoá xong cột và tab biến mất.
7. Guild War không có nút Xoá và không có ô đối thủ.
8. Bấm "Tuần sau" → hiện Guild War tuần sau, thêm được scrim cho tuần đó.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the admin schedule settings screen

Adds the /thiet-lap route with per-week scrim CRUD, guarded in the proxy and
again in the page itself."
```

---

## Task 8: Trang Xếp team không vỡ khi trận bị xoá

`use-formation-screen.ts` lấy tab đang mở từ Zustand (`storedActiveId`) mà không kiểm tra trận đó còn tồn tại không. Trước đây lịch cố định nên không bao giờ sai; giờ admin xoá được trận thì id lưu trong store thành mồ côi và màn hình hiện tab trống.

**Files:**
- Create: `apps/web/features/team-builder/lib/active-session.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/active-session.test.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-screen.ts`

**Interfaces:**
- Produces: `resolveActiveSessionId(sessions: Pick<SessionFormation, "sessionId" | "isGuildWar">[], storedId: string | null): string | null`

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/web/features/team-builder/lib/__tests__/active-session.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { resolveActiveSessionId } from "../active-session";

const SESSIONS = [
  { sessionId: "session-tue", isGuildWar: false },
  { sessionId: "session-sat", isGuildWar: true },
];

describe("resolveActiveSessionId", () => {
  it("giữ nguyên tab đang mở khi trận vẫn còn", () => {
    expect(resolveActiveSessionId(SESSIONS, "session-tue")).toBe("session-tue");
  });

  it("rơi về Guild War khi trận đang mở đã bị xoá", () => {
    expect(resolveActiveSessionId(SESSIONS, "session-da-xoa")).toBe(
      "session-sat"
    );
  });

  it("chưa chọn gì thì mặc định mở Guild War", () => {
    expect(resolveActiveSessionId(SESSIONS, null)).toBe("session-sat");
  });

  it("không có Guild War thì lấy trận đầu tiên", () => {
    expect(
      resolveActiveSessionId([{ sessionId: "session-tue", isGuildWar: false }], null)
    ).toBe("session-tue");
  });

  it("tuần không còn trận nào thì trả null", () => {
    expect(resolveActiveSessionId([], "session-tue")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter web test -- active-session`
Expected: FAIL — không tìm thấy `../active-session`.

- [ ] **Step 3: Viết helper**

Tạo `apps/web/features/team-builder/lib/active-session.ts`:

```ts
import type { SessionFormation } from "../types/session-formation";

/** The fields needed to pick a tab. */
type SelectableSession = Pick<SessionFormation, "sessionId" | "isGuildWar">;

/**
 * Pick the battle tab to open. The stored id can point at a battle an admin has
 * since deleted, so it only wins when it is still on screen.
 * @param sessions - Battles of the week on screen
 * @param storedId - Battle the user last opened, from the store
 * @returns The battle to open, or null when the week holds no battle
 */
export function resolveActiveSessionId(
  sessions: SelectableSession[],
  storedId: string | null
): string | null {
  const stored = sessions.find((session) => session.sessionId === storedId);
  if (stored) return stored.sessionId;

  // Default to the Guild War tab: it is the battle that matters most.
  return (
    sessions.find((session) => session.isGuildWar)?.sessionId ??
    sessions[0]?.sessionId ??
    null
  );
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Run: `pnpm --filter web test -- active-session`
Expected: PASS (5 test).

- [ ] **Step 5: Dùng helper trong hook**

Trong `apps/web/features/team-builder/hooks/use-formation-screen.ts`, thêm import:

```ts
import { resolveActiveSessionId } from "../lib/active-session";
```

và thay khối chọn tab:

```ts
  const activeSessionId = resolveActiveSessionId(sessions, storedActiveId);
```

(xoá luôn comment "Default to the Guild War tab" ở chỗ cũ — nó đã chuyển vào helper).

- [ ] **Step 6: Chạy toàn bộ test và typecheck**

Run: `pnpm --filter web test && pnpm --filter web exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder
git commit -m "fix(web): fall back to a valid tab when the open battle is deleted"
```

---

## Kiểm tra cuối

- [ ] **Chạy toàn bộ test hai app**

Run: `pnpm --filter api test && pnpm --filter web test`
Expected: PASS toàn bộ.

- [ ] **Lint hai app**

Run: `pnpm --filter api lint && pnpm --filter web lint`

- [ ] **Build web**

Run: `pnpm --filter web build`
Expected: build thành công (bắt lỗi Server Component / `"use client"` mà typecheck bỏ sót).

- [ ] **Đọc lại spec, xác nhận không sót**

Mở `docs/superpowers/specs/2026-08-05-admin-schedule-settings-design.md` và đối chiếu mục "Edge case" với hành vi thật.
