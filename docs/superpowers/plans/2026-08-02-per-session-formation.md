# Per-Session Formation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi trận đánh trong tuần có một đội hình riêng, lưu ở server, xem lại được 4 tuần gần nhất.

**Architecture:** Đội hình khoá theo `sessionId` của `BattleSession` — khái niệm "ngày đánh" đã có sẵn trong domain điểm danh, không dựng mới. Backend lưu một hàng `Formation` mỗi trận với `assignment` dạng JSON và **không biết gì về lưới 10 team × 6 ô**; toàn bộ bố cục vẫn nằm ở frontend. Frontend tách đôi state: TanStack Query giữ bản đã lưu, Zustand chỉ giữ bản nháp đang sửa theo từng `sessionId`.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 (`packages/shared/schemas`) · Next.js 16 App Router · React 19.2 · TanStack Query 5 · Zustand 5 · `@dnd-kit/core` · shadcn/ui trên `@base-ui/react` (style `base-nova`) · Jest 30 (api) · Vitest 4 (web, `environment: "node"`)

**Spec:** [docs/superpowers/specs/2026-08-02-per-session-formation-design.md](../specs/2026-08-02-per-session-formation-design.md)

## Global Constraints

- **Branch:** dự án cá nhân, commit thẳng lên `main`. Không tạo branch mới.
- **Ngôn ngữ:** mọi text hiển thị cho người dùng là **tiếng Việt**. Code, comment và JSDoc viết **tiếng Anh** ở `apps/web/features/team-builder`, **tiếng Việt** ở `apps/api` và `features/attendance` (theo đúng file xung quanh đang có).
- **JSDoc bắt buộc** cho mọi hàm exported: mục đích, từng `@param`, `@returns`, `@throws` nếu có.
- **TypeScript strict, cấm `any`.**
- **Retention: 28 ngày.** Không phải 30, không phải 1 tháng lịch.
- **Khoá trận theo `dateTime`**, KHÔNG theo `deadline`. Sau 17:00 Thứ 5 vẫn xếp được đội hình Thứ 7.
- **Server state → TanStack Query. Client state → Zustand. Không bao giờ để response API trong Zustand** (`AGENTS.md:56`).
- **Mọi endpoint mới chỉ dành cho quản trị viên** → `JwtAuthGuard`. `JwtModule` đã đăng ký `global: true` ở `auth.module.ts`, không phải import lại.
- **Gọi API cần quyền admin phải đi qua Server Action.** Access token nằm trong cookie **httpOnly**, client không đọc được để gắn `Authorization`. Xem mẫu `features/attendance/api/mark-attendance-action.ts`.
- **`apiFetch` (`lib/api-client.ts`) là chỗ DUY NHẤT gọi fetch tới backend.**
- **Không import file nội bộ của feature khác** (web) — chỉ qua `index.ts`. **Không import nội bộ module khác** (api) — chỉ dùng service được `exports`.
- **API theo đúng mẫu attendance:** Controller → Service → `PrismaService`. KHÔNG dựng tầng repository (module attendance hiện không có, giữ nhất quán).
- **shadcn ở repo này chạy trên `@base-ui/react`** (style `base-nova`), KHÔNG phải Radix. Sinh component bằng CLI, không chép từ trang shadcn bản Radix.
- File: `kebab-case`. Component: `PascalCase`. Hook: `useCamelCase`. Hằng: `UPPER_SNAKE_CASE`.
- Chạy mọi lệnh từ **thư mục gốc repo** (`/home/huykirito1201/personal/guild-manager`).
- **Database:** kế hoạch này chạy trên Postgres local đang có. Việc host trên Supabase là chuyện riêng, đã tách sang [spec host database](../specs/2026-08-02-supabase-hosting-design.md) — không cần biết tới nó để thực hiện kế hoạch này.

---

## File Structure

### Backend

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/schema.prisma` | **Sửa** — thêm model `Formation` + back-relation trên `BattleSession` |
| `packages/shared/schemas/formation.schema.ts` | Hợp đồng `assignment` dùng chung FE/BE |
| `packages/shared/schemas/index.ts` | **Sửa** — export schema mới |
| `apps/api/src/modules/team-builder/entities/formation.entity.ts` | Kiểu response trả về client |
| `apps/api/src/modules/team-builder/team-builder.service.ts` | Đọc/ghi đội hình + 3 luật vòng đời |
| `apps/api/src/modules/team-builder/dto/save-formation.dto.ts` | Validate body của `PUT` |
| `apps/api/src/modules/team-builder/team-builder.controller.ts` | 3 endpoint, bọc `JwtAuthGuard` |
| `apps/api/src/modules/team-builder/team-builder.module.ts` | Wiring, import `AttendanceModule` |
| `apps/api/src/app.module.ts` | **Sửa** — đăng ký module mới |

### Frontend

| File | Trách nhiệm |
|---|---|
| `features/team-builder/types/session-formation.ts` | `SessionFormation`, `FormationWeek`, `WireAssignment` |
| `features/team-builder/lib/wire.ts` | `toWire` / `fromWire` — dịch giữa `null` của FE và khoá vắng mặt trên dây |
| `features/team-builder/lib/session-status.ts` | Trận này còn sửa được không |
| `features/team-builder/lib/formation-diff.ts` | Nháp có khác bản đã lưu không |
| `features/team-builder/lib/session-pool.ts` | Lọc ra người đã báo "Có" cho một trận |
| `features/team-builder/lib/prefill.ts` | Dựng đội hình từ trận trước |
| `features/team-builder/lib/class-shortage.ts` | Đếm người chưa xếp theo lưu phái |
| `features/team-builder/api/team-builder-api.ts` | 3 Server Action + query key factory |
| `features/team-builder/hooks/use-formations.ts` | Query đội hình theo tuần |
| `features/team-builder/hooks/use-formation-weeks.ts` | Query danh sách tuần |
| `features/team-builder/hooks/use-save-formation.ts` | Mutation lưu |
| `features/team-builder/hooks/use-session-pool.ts` | Pool theo trận |
| `features/team-builder/hooks/use-prefill.ts` | Điền sẵn dạng nháp |
| `features/team-builder/hooks/use-formation-screen.ts` | Điều phối toàn màn |
| `features/team-builder/store/formation-store.ts` | **Sửa** — nháp theo `sessionId` |
| `features/team-builder/components/week-picker.tsx` | Chọn tuần |
| `features/team-builder/components/session-tabs.tsx` | Chọn trận |
| `features/team-builder/components/formation-toolbar.tsx` | Lưu / Đặt lại / trạng thái |
| `features/team-builder/components/prefill-banner.tsx` | Băng thông báo điền sẵn |
| `features/team-builder/components/class-shortage.tsx` | Đếm thiếu theo lưu phái |
| `features/team-builder/components/team-builder-screen.tsx` | **Sửa** — chỉ dựng JSX |
| `features/team-builder/components/{formation-grid,team-column,slot-cell,member-pool}.tsx` | **Sửa** — thêm `readOnly` + cảnh báo báo nghỉ |
| `features/attendance/index.ts` | **Sửa** — export `useBattleSessions`, `useAttendanceRecords`, types |
| `apps/web/components/ui/tabs.tsx` | shadcn CLI sinh |

**Tại sao mọi quyết định nằm trong `lib/`:** vitest ở `apps/web` chạy `environment: "node"`, không render được component. Đẩy hết phép tính xuống hàm thuần cho phép test thật; hook và component chỉ là vỏ.

---

## PHA A — BACKEND

### Task 1: Model dữ liệu và hợp đồng dùng chung

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_formation/migration.sql` (do CLI sinh)
- Create: `packages/shared/schemas/formation.schema.ts`
- Modify: `packages/shared/schemas/index.ts`

**Interfaces:**
- Produces: model Prisma `Formation`; `assignmentSchema`, `saveFormationSchema`, type `AssignmentInput = Record<string, string>`, type `SaveFormationInput`

Task này không có unit test — nó chỉ khai báo kiểu và cấu trúc bảng. Cổng kiểm tra là `prisma validate` cộng `tsc`.

- [ ] **Step 1: Thêm model vào schema**

Sửa `apps/api/prisma/schema.prisma`. Thêm vào `model BattleSession` một back-relation (Prisma bắt buộc khai báo cả hai chiều):

```prisma
model BattleSession {
  // ... các field đang có, giữ nguyên ...

  attendanceRecords AttendanceRecord[]
  /// Đội hình bang chiến của trận này (có thể chưa xếp).
  formation         Formation?

  @@unique([weekStart, label])
  @@index([weekStart])
}
```

Rồi thêm model mới vào cuối file:

```prisma
/// Đội hình bang chiến của một trận đánh.
model Formation {
  id         String   @id @default(cuid())
  /// Một trận chỉ có đúng một đội hình.
  sessionId  String   @unique
  /// Copy từ session — để dọn dữ liệu cũ mà không phải join.
  weekStart  DateTime
  /// { "team-1-pos-1": "charId", ... }. Ô trống thì KHÔNG có khoá.
  assignment Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  session BattleSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([weekStart])
}
```

- [ ] **Step 2: Kiểm tra schema hợp lệ**

```bash
pnpm --filter api exec prisma validate
```

Kỳ vọng: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: Sinh migration**

```bash
pnpm --filter api exec prisma migrate dev --name add_formation
```

Kỳ vọng: tạo thư mục migration mới và in `Your database is now in sync with your schema.`

Lệnh này chạy với `DATABASE_URL` trong `.env` đang trỏ tới Postgres local. Nếu sau này database chuyển sang connection pooler thì cách chạy migrate khác đi — xem [spec host database](../specs/2026-08-02-supabase-hosting-design.md), nhưng không liên quan tới kế hoạch này.

- [ ] **Step 4: Viết schema dùng chung**

Tạo `packages/shared/schemas/formation.schema.ts`:

```ts
import { z } from "zod";

/**
 * Đội hình trên dây: slotId → characterId.
 * Ô trống KHÔNG có khoá (không dùng null) để payload không phình vì 60 khoá rỗng.
 * Dùng chung: FE gửi lên, BE validate request body (nestjs-zod).
 */
export const assignmentSchema = z.record(z.string().min(1), z.string().min(1));

/** Body của PUT /team-builder/formations/:sessionId */
export const saveFormationSchema = z.object({
  assignment: assignmentSchema,
});

/** Kiểu đội hình trên dây đã validate. */
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Kiểu body lưu đội hình đã validate. */
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
```

- [ ] **Step 5: Export ra barrel**

Sửa `packages/shared/schemas/index.ts`:

```ts
export * from "./attendance.schema";
export * from "./auth.schema";
export * from "./formation.schema";
```

- [ ] **Step 6: Kiểm tra biên dịch**

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
```

Kỳ vọng: cả hai không in gì.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma packages/shared/schemas
git commit -m "feat(api): add Formation model and shared assignment contract"
```

---

### Task 2: Service — đọc đội hình của một tuần

**Files:**
- Create: `apps/api/src/modules/team-builder/entities/formation.entity.ts`
- Create: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Create: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` từ `@/infrastructure/prisma/prisma.service`; `AttendanceService` từ `@/modules/attendance/attendance.service` (được `AttendanceModule` export)
- Produces:
  - `interface SessionFormationEntity { sessionId: string; label: string; dateTime: string; isGuildWar: boolean; locked: boolean; assignment: Record<string, string> }`
  - `interface FormationWeekEntity { weekStart: string }`
  - `TeamBuilderService.getFormations(weekStart?: string, now?: Date): Promise<SessionFormationEntity[]>`

Service **không** import `attendance-schedule.ts` (đó là file nội bộ của module khác). Tuần đang mở lấy qua `AttendanceService.getCurrentWeek()` và `AttendanceService.getSessions()` — hàm sau còn tự tạo `BattleSession` nếu tuần đó chưa có.

- [ ] **Step 1: Viết entity**

Tạo `apps/api/src/modules/team-builder/entities/formation.entity.ts`:

```ts
/** Một trận kèm đội hình đã lưu của nó, trả về cho client. */
export interface SessionFormationEntity {
  /** ID trận đánh */
  sessionId: string;
  /** Nhãn hiển thị của trận, ví dụ "Thứ 7 · Guild War" */
  label: string;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Trận Guild War Thứ 7 */
  isGuildWar: boolean;
  /** Trận đã đánh xong — không cho sửa đội hình nữa */
  locked: boolean;
  /** slotId → characterId. Ô trống không có khoá. Rỗng nghĩa là chưa xếp. */
  assignment: Record<string, string>;
}

/** Một tuần còn dữ liệu đội hình. */
export interface FormationWeekEntity {
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: string;
}
```

- [ ] **Step 2: Viết test cho getFormations (chưa có service — test phải fail)**

Tạo `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`:

```ts
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TeamBuilderService } from '../team-builder.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 — trận Thứ 3 đã đánh xong, Thứ 5 và Thứ 7 còn ở tương lai.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = vn('2026-07-20T00:00');

const SESSION_ROWS = [
  {
    id: 'session-tue',
    label: 'Thứ 3 · 20:30',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-thu',
    label: 'Thứ 5 · 20:30',
    dateTime: vn('2026-07-23T20:30'),
    deadline: vn('2026-07-23T17:00'),
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-sat',
    label: 'Thứ 7 · Guild War',
    dateTime: vn('2026-07-25T20:00'),
    deadline: vn('2026-07-23T17:00'),
    isGuildWar: true,
    weekStart: WEEK_START,
  },
];

describe('TeamBuilderService.getFormations', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formation: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let attendance: {
    getCurrentWeek: jest.Mock;
    getSessions: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }]),
      },
      battleSession: { findMany: jest.fn().mockResolvedValue(SESSION_ROWS) },
      formation: {
        findMany: jest.fn().mockResolvedValue([
          {
            sessionId: 'session-sat',
            weekStart: WEEK_START,
            assignment: {
              'team-1-pos-1': 'char-1',
              'team-1-pos-2': 'char-2',
              // char-99 đã bị xoá khỏi bang — phải bị loại khi đọc.
              'team-1-pos-3': 'char-99',
            },
          },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    attendance = {
      getCurrentWeek: jest.fn().mockReturnValue({
        fromDate: WEEK_START.toISOString(),
        toDate: vn('2026-07-26T00:00').toISOString(),
      }),
      getSessions: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('trả về đủ 3 trận của tuần, sắp theo thời gian đánh', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.map((item) => item.sessionId)).toEqual([
      'session-tue',
      'session-thu',
      'session-sat',
    ]);
  });

  it('trận chưa xếp thì assignment rỗng', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const tuesday = result.find((item) => item.sessionId === 'session-tue');

    expect(tuesday?.assignment).toEqual({});
  });

  it('khoá trận đã qua giờ đánh, mở trận còn ở tương lai', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.find((i) => i.sessionId === 'session-tue')?.locked).toBe(true);
    expect(result.find((i) => i.sessionId === 'session-thu')?.locked).toBe(false);
  });

  it('bỏ characterId không còn trong bảng Character', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.assignment).toEqual({
      'team-1-pos-1': 'char-1',
      'team-1-pos-2': 'char-2',
    });
  });

  it('đảm bảo trận của tuần đang mở tồn tại trước khi đọc', async () => {
    await service.getFormations(undefined, WEDNESDAY);

    expect(attendance.getSessions).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: FAIL — không resolve được module `../team-builder.service`.

- [ ] **Step 4: Viết service**

Tạo `apps/api/src/modules/team-builder/team-builder.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import type { SessionFormationEntity } from './entities/formation.entity';

@Injectable()
export class TeamBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
  ) {}

  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * Tuần đang mở thì gọi qua AttendanceService để chắc chắn các trận đã có trong
   * database; tuần cũ chỉ đọc những gì còn lưu.
   * @param weekStart - Mốc Thứ 2 của tuần cần xem (ISO string). Bỏ trống = tuần đang mở
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng trận sắp theo thời gian đánh, mỗi trận kèm assignment và cờ locked
   */
  async getFormations(
    weekStart?: string,
    now: Date = new Date(),
  ): Promise<SessionFormationEntity[]> {
    const activeWeekStart = this.attendance.getCurrentWeek(now).fromDate;
    const targetWeekStart = weekStart ?? activeWeekStart;

    // Tuần đang mở có thể chưa được sinh trận — để attendance lo việc đó.
    if (targetWeekStart === activeWeekStart) {
      await this.attendance.getSessions(now);
    }

    const sessions = await this.prisma.battleSession.findMany({
      where: { weekStart: new Date(targetWeekStart) },
      orderBy: { dateTime: 'asc' },
    });
    if (sessions.length === 0) return [];

    const formations = await this.prisma.formation.findMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
    });
    const assignmentBySession = new Map(
      formations.map((formation) => [formation.sessionId, formation.assignment]),
    );

    const knownIds = await this.loadCharacterIds();

    return sessions.map((session) => ({
      sessionId: session.id,
      label: session.label,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: session.dateTime.getTime() < now.getTime(),
      assignment: this.pruneMissingCharacters(
        assignmentBySession.get(session.id),
        knownIds,
      ),
    }));
  }

  /**
   * Lấy id của mọi nhân vật còn trong bang.
   * @returns Tập id nhân vật
   */
  private async loadCharacterIds(): Promise<Set<string>> {
    const characters = await this.prisma.character.findMany({
      select: { id: true },
    });

    return new Set(characters.map((character) => character.id));
  }

  /**
   * Loại các ô trỏ tới nhân vật đã rời bang.
   * JSON không có khoá ngoại nên đây là chỗ bù lại — UI không bao giờ thấy ô ma.
   * @param raw - Giá trị assignment đọc từ cột Json (có thể null khi chưa xếp)
   * @param knownIds - Tập id nhân vật còn tồn tại
   * @returns Assignment đã lọc, rỗng nếu chưa xếp
   */
  private pruneMissingCharacters(
    raw: unknown,
    knownIds: Set<string>,
  ): Record<string, string> {
    if (typeof raw !== 'object' || raw === null) return {};

    const entries = Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && knownIds.has(entry[1]),
    );

    return Object.fromEntries(entries);
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: PASS, 5 test.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/team-builder
git commit -m "feat(api): read saved formations for a week"
```

---

### Task 3: Service — danh sách tuần và dọn dữ liệu quá hạn

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Modify: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `FormationWeekEntity` (Task 2)
- Produces: `TeamBuilderService.getWeeks(now?: Date): Promise<FormationWeekEntity[]>`

Dọn dữ liệu chạy **trước** khi đọc, trong chính `getWeeks`. Không cần cron: màn hình xếp team luôn gọi endpoint này khi mở.

- [ ] **Step 1: Viết test**

Thêm vào cuối `team-builder.service.spec.ts` (dùng lại `vn`, `WEEK_START`, `SESSION_ROWS` đã khai báo ở đầu file):

```ts
describe('TeamBuilderService.getWeeks', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formation: { deleteMany: jest.Mock };
  };
  let attendance: { getCurrentWeek: jest.Mock; getSessions: jest.Mock };

  beforeEach(() => {
    prisma = {
      character: { findMany: jest.fn().mockResolvedValue([]) },
      battleSession: {
        findMany: jest.fn().mockResolvedValue([
          { weekStart: WEEK_START },
          { weekStart: vn('2026-07-13T00:00') },
        ]),
      },
      formation: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    attendance = {
      getCurrentWeek: jest.fn().mockReturnValue({
        fromDate: WEEK_START.toISOString(),
        toDate: vn('2026-07-26T00:00').toISOString(),
      }),
      getSessions: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('trả về các tuần có dữ liệu, mới nhất trước', async () => {
    const weeks = await service.getWeeks(WEDNESDAY);

    expect(weeks).toEqual([
      { weekStart: WEEK_START.toISOString() },
      { weekStart: vn('2026-07-13T00:00').toISOString() },
    ]);
  });

  it('xoá đội hình có weekStart cũ hơn 28 ngày trước khi đọc', async () => {
    await service.getWeeks(WEDNESDAY);

    expect(prisma.formation.deleteMany).toHaveBeenCalledWith({
      where: { weekStart: { lt: vn('2026-06-22T00:00') } },
    });
  });

  it('dọn dữ liệu chạy trước khi liệt kê tuần', async () => {
    const order: string[] = [];
    prisma.formation.deleteMany.mockImplementation(() => {
      order.push('delete');
      return Promise.resolve({ count: 0 });
    });
    prisma.battleSession.findMany.mockImplementation(() => {
      order.push('read');
      return Promise.resolve([]);
    });

    await service.getWeeks(WEDNESDAY);

    expect(order).toEqual(['delete', 'read']);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: FAIL — `service.getWeeks is not a function`.

- [ ] **Step 3: Viết getWeeks**

Thêm hằng ở đầu `team-builder.service.ts`, ngay dưới các import:

```ts
/** Số ngày giữ lại đội hình cũ. Quá mốc này thì dọn. */
const RETENTION_DAYS = 28;

/** Số mili giây trong một ngày. */
const DAY_MS = 24 * 60 * 60 * 1000;
```

Thêm hai method vào class (đặt `getWeeks` ngay trên `getFormations`):

```ts
  /**
   * Liệt kê các tuần còn dữ liệu đội hình, mới nhất trước.
   * Dọn dữ liệu quá hạn trước khi đọc — màn hình xếp team luôn gọi endpoint này
   * nên không cần cron riêng.
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Mảng tuần, mới nhất trước
   */
  async getWeeks(now: Date = new Date()): Promise<FormationWeekEntity[]> {
    await this.purgeExpiredFormations(now);
    await this.attendance.getSessions(now);

    const sessions = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return sessions.map((session) => ({
      weekStart: session.weekStart.toISOString(),
    }));
  }

  /**
   * Xoá các đội hình cũ hơn RETENTION_DAYS.
   * Chỉ xoá bảng Formation — BattleSession và điểm danh là dữ liệu của module khác.
   * @param now - Thời điểm hiện tại
   * @returns Promise hoàn tất khi đã dọn
   */
  private async purgeExpiredFormations(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    await this.prisma.formation.deleteMany({
      where: { weekStart: { lt: cutoff } },
    });
  }
```

Bổ sung import entity ở đầu file:

```ts
import type {
  FormationWeekEntity,
  SessionFormationEntity,
} from './entities/formation.entity';
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: PASS, 8 test.

Chú ý: test "xoá đội hình có weekStart cũ hơn 28 ngày" so mốc `2026-06-22T00:00` giờ VN. Nếu lệch, kiểm tra lại `RETENTION_DAYS * DAY_MS` chứ đừng sửa test cho khớp.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/team-builder
git commit -m "feat(api): list formation weeks and purge data past retention"
```

---

### Task 4: Service — lưu đội hình

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Modify: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `AssignmentInput` từ `@guild/shared/schemas` (Task 1); `SessionFormationEntity` (Task 2)
- Produces: `TeamBuilderService.saveFormation(sessionId: string, assignment: AssignmentInput, now?: Date): Promise<SessionFormationEntity>`

- [ ] **Step 1: Viết test**

Thêm vào cuối `team-builder.service.spec.ts`:

```ts
describe('TeamBuilderService.saveFormation', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findUnique: jest.Mock };
    formation: { upsert: jest.Mock };
  };
  let attendance: { getCurrentWeek: jest.Mock; getSessions: jest.Mock };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest.fn().mockResolvedValue([{ id: 'char-1' }]),
      },
      battleSession: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(SESSION_ROWS.find((row) => row.id === where.id) ?? null),
        ),
      },
      formation: {
        upsert: jest
          .fn()
          .mockImplementation(({ create }: { create: { assignment: unknown } }) =>
            Promise.resolve(create),
          ),
      },
    };
    attendance = {
      getCurrentWeek: jest.fn(),
      getSessions: jest.fn(),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('ghi đội hình cho trận chưa đánh', async () => {
    const result = await service.saveFormation(
      'session-sat',
      { 'team-1-pos-1': 'char-1' },
      WEDNESDAY,
    );

    expect(result.sessionId).toBe('session-sat');
    expect(result.assignment).toEqual({ 'team-1-pos-1': 'char-1' });
    expect(result.locked).toBe(false);
  });

  it('lưu hai lần cùng payload cho cùng kết quả', async () => {
    const payload = { 'team-1-pos-1': 'char-1' };

    const first = await service.saveFormation('session-sat', payload, WEDNESDAY);
    const second = await service.saveFormation('session-sat', payload, WEDNESDAY);

    expect(second).toEqual(first);
  });

  it('từ chối ghi vào trận đã đánh xong', async () => {
    await expect(
      service.saveFormation('session-tue', {}, WEDNESDAY),
    ).rejects.toThrow(ConflictException);
  });

  it('báo không tìm thấy khi sessionId không tồn tại', async () => {
    await expect(
      service.saveFormation('session-khong-co', {}, WEDNESDAY),
    ).rejects.toThrow(NotFoundException);
  });

  it('bỏ nhân vật đã rời bang ngay khi trả về', async () => {
    const result = await service.saveFormation(
      'session-sat',
      { 'team-1-pos-1': 'char-1', 'team-1-pos-2': 'char-99' },
      WEDNESDAY,
    );

    expect(result.assignment).toEqual({ 'team-1-pos-1': 'char-1' });
  });
});
```

Thêm import ở đầu file spec:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: FAIL — `service.saveFormation is not a function`.

- [ ] **Step 3: Viết saveFormation**

Thêm vào `team-builder.service.ts`. Import bổ sung:

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AssignmentInput } from '@guild/shared/schemas';
```

Method mới:

```ts
  /**
   * Ghi đè đội hình của một trận. Idempotent — gửi cùng payload nhiều lần cho
   * cùng kết quả.
   * @param sessionId - ID trận cần lưu đội hình
   * @param assignment - slotId → characterId, ô trống thì không có khoá
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Trận kèm đội hình vừa ghi
   * @throws NotFoundException khi không có trận nào mang sessionId đó
   * @throws ConflictException khi trận đã qua giờ đánh
   */
  async saveFormation(
    sessionId: string,
    assignment: AssignmentInput,
    now: Date = new Date(),
  ): Promise<SessionFormationEntity> {
    const session = await this.prisma.battleSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (session.dateTime.getTime() < now.getTime()) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }

    await this.prisma.formation.upsert({
      where: { sessionId },
      create: { sessionId, weekStart: session.weekStart, assignment },
      update: { assignment },
    });

    const knownIds = await this.loadCharacterIds();

    return {
      sessionId: session.id,
      label: session.label,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: false,
      assignment: this.pruneMissingCharacters(assignment, knownIds),
    };
  }
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter api test -- team-builder
```

Kỳ vọng: PASS, 13 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/team-builder
git commit -m "feat(api): save a formation, rejecting battles already fought"
```

---

### Task 5: Controller, DTO và wiring

**Files:**
- Create: `apps/api/src/modules/team-builder/dto/save-formation.dto.ts`
- Create: `apps/api/src/modules/team-builder/team-builder.controller.ts`
- Create: `apps/api/src/modules/team-builder/team-builder.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `TeamBuilderService` (Tasks 2–4); `saveFormationSchema` từ `@guild/shared/schemas` (Task 1); `JwtAuthGuard` từ `@/common`
- Produces: 3 endpoint HTTP dưới prefix `/team-builder`

`AttendanceModule` đã `exports: [AttendanceService]` nên chỉ cần `imports: [AttendanceModule]`. `JwtModule` đăng ký `global: true` ở `auth.module.ts` nên `JwtAuthGuard` inject được `JwtService` mà không phải import gì thêm.

- [ ] **Step 1: Viết DTO**

Tạo `apps/api/src/modules/team-builder/dto/save-formation.dto.ts`:

```ts
import { saveFormationSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request lưu đội hình.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class SaveFormationDto extends createZodDto(saveFormationSchema) {}
```

- [ ] **Step 2: Viết controller**

Tạo `apps/api/src/modules/team-builder/team-builder.controller.ts`:

```ts
import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common';
import { SaveFormationDto } from './dto/save-formation.dto';
import type {
  FormationWeekEntity,
  SessionFormationEntity,
} from './entities/formation.entity';
import { TeamBuilderService } from './team-builder.service';

@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard)
export class TeamBuilderController {
  constructor(private readonly teamBuilder: TeamBuilderService) {}

  /**
   * Các tuần còn dữ liệu đội hình.
   * @returns Mảng tuần, mới nhất trước
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Các tuần còn dữ liệu đội hình' })
  getWeeks(): Promise<FormationWeekEntity[]> {
    return this.teamBuilder.getWeeks();
  }

  /**
   * Các trận của một tuần kèm đội hình đã lưu.
   * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get('formations')
  @ApiOperation({ summary: 'Đội hình của các trận trong một tuần' })
  getFormations(
    @Query('weekStart') weekStart?: string,
  ): Promise<SessionFormationEntity[]> {
    return this.teamBuilder.getFormations(weekStart);
  }

  /**
   * Ghi đè đội hình của một trận.
   * @param sessionId - ID trận cần lưu
   * @param body - assignment dạng slotId → characterId
   * @returns Trận kèm đội hình vừa ghi
   */
  @Put('formations/:sessionId')
  @ApiOperation({ summary: 'Lưu đội hình của một trận' })
  saveFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveFormationDto,
  ): Promise<SessionFormationEntity> {
    return this.teamBuilder.saveFormation(sessionId, body.assignment);
  }
}
```

- [ ] **Step 3: Viết module**

Tạo `apps/api/src/modules/team-builder/team-builder.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { TeamBuilderController } from './team-builder.controller';
import { TeamBuilderService } from './team-builder.service';

/**
 * Module xếp đội hình bang chiến.
 * Dùng lại AttendanceService để biết tuần đang mở và đảm bảo các trận đã tồn tại —
 * lịch đánh là trách nhiệm của module điểm danh, không chép lại ở đây.
 */
@Module({
  imports: [AttendanceModule],
  controllers: [TeamBuilderController],
  providers: [TeamBuilderService],
})
export class TeamBuilderModule {}
```

- [ ] **Step 4: Đăng ký vào app**

Sửa `apps/api/src/app.module.ts` — thêm import và thêm vào mảng `imports`:

```ts
import { TeamBuilderModule } from '@/modules/team-builder/team-builder.module';
```

```ts
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AttendanceModule,
    TeamBuilderModule,
  ],
```

- [ ] **Step 5: Kiểm tra biên dịch và toàn bộ test backend**

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter api test
```

Kỳ vọng: `tsc` không in gì; toàn bộ test suite PASS.

- [ ] **Step 6: Kiểm tra endpoint chạy thật**

```bash
pnpm --filter api start:dev
```

Ở terminal khác, xác nhận guard chặn request không có token:

```bash
curl -i http://localhost:3001/api/team-builder/weeks
```

Kỳ vọng: `401` kèm message `"Bạn cần đăng nhập."`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): expose admin-only team builder endpoints"
```

---

## PHA B — FRONTEND

### Task 6: Dịch assignment giữa FE và dây

**Files:**
- Create: `apps/web/features/team-builder/types/session-formation.ts`
- Create: `apps/web/features/team-builder/lib/wire.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/wire.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `Slot` từ `../types/formation`
- Produces:
  - `interface SessionFormation { sessionId: string; label: string; dateTime: string; isGuildWar: boolean; locked: boolean; assignment: WireAssignment }`
  - `interface FormationWeek { weekStart: string }`
  - `type WireAssignment = Record<string, string>`
  - `toWire(assignment: Assignment): WireAssignment`
  - `fromWire(wire: WireAssignment, slots: Slot[]): Assignment`

`Assignment` phía FE là `Record<string, string | null>` — mọi ô đều có khoá, ô trống mang `null`. Trên dây thì ô trống bị bỏ hẳn khoá. **Không đổi kiểu `Assignment`**: `null` tường minh là thứ khiến `applyDrop` và `createEmptyAssignment` chạy đúng, và toàn bộ test hiện có dựa vào đó.

- [ ] **Step 1: Viết kiểu**

Tạo `apps/web/features/team-builder/types/session-formation.ts`:

```ts
/** Đội hình trên dây: slotId → characterId. Ô trống không có khoá. */
export type WireAssignment = Record<string, string>;

/** Một trận kèm đội hình đã lưu, đúng như backend trả về. */
export interface SessionFormation {
  /** ID trận đánh */
  sessionId: string;
  /** Nhãn hiển thị, ví dụ "Thứ 7 · Guild War" */
  label: string;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Trận Guild War Thứ 7 */
  isGuildWar: boolean;
  /** Trận đã đánh xong — không sửa được nữa */
  locked: boolean;
  /** Đội hình đã lưu. Rỗng nghĩa là chưa xếp. */
  assignment: WireAssignment;
}

/** Một tuần còn dữ liệu đội hình. */
export interface FormationWeek {
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: string;
}
```

- [ ] **Step 2: Viết test (chưa có hàm — test phải fail)**

Tạo `apps/web/features/team-builder/lib/__tests__/wire.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Assignment, Slot } from "../../types/formation";
import { fromWire, toWire } from "../wire";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

describe("toWire", () => {
  it("bỏ mọi ô trống", () => {
    const assignment: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(toWire(assignment)).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-3": "char-3",
    });
  });

  it("đội hình trống thành object rỗng", () => {
    expect(toWire({ "team-1-pos-1": null })).toEqual({});
  });
});

describe("fromWire", () => {
  it("dựng lại đủ khoá cho mọi ô, ô thiếu thành null", () => {
    expect(fromWire({ "team-1-pos-2": "char-2" }, SLOTS)).toEqual({
      "team-1-pos-1": null,
      "team-1-pos-2": "char-2",
      "team-1-pos-3": null,
    });
  });

  it("bỏ qua khoá không khớp ô nào của bố cục hiện tại", () => {
    const result = fromWire({ "team-99-pos-9": "char-1" }, SLOTS);

    expect(result).not.toHaveProperty("team-99-pos-9");
    expect(Object.keys(result)).toHaveLength(SLOTS.length);
  });

  it("đi vòng toWire → fromWire giữ nguyên nội dung", () => {
    const original: Assignment = {
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    };

    expect(fromWire(toWire(original), SLOTS)).toEqual(original);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/wire.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../wire`.

- [ ] **Step 4: Viết hàm dịch**

Tạo `apps/web/features/team-builder/lib/wire.ts`:

```ts
import type { Assignment, Slot } from "../types/formation";
import type { WireAssignment } from "../types/session-formation";

/**
 * Strip empty slots before sending an assignment to the server.
 * The wire format omits empty slots entirely, so a payload never carries
 * sixty null entries.
 * @param assignment - Assignment as the UI holds it, empty slots being null
 * @returns Assignment with only the filled slots
 */
export function toWire(assignment: Assignment): WireAssignment {
  const filled = Object.entries(assignment).filter(
    (entry): entry is [string, string] => entry[1] !== null
  );

  return Object.fromEntries(filled);
}

/**
 * Rebuild the UI-side assignment from what the server stored. Every slot of the
 * current layout gets a key; anything the server does not mention is empty.
 * Keys that match no current slot are dropped, so an old saved formation
 * survives a layout change instead of poisoning the grid.
 * @param wire - Assignment as stored, only filled slots present
 * @param slots - Slots of the current layout
 * @returns Assignment with one key per slot
 */
export function fromWire(wire: WireAssignment, slots: Slot[]): Assignment {
  const assignment: Assignment = {};

  for (const slot of slots) {
    assignment[slot.id] = wire[slot.id] ?? null;
  }

  return assignment;
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/wire.test.ts
```

Kỳ vọng: PASS, 5 test.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/types apps/web/features/team-builder/lib
git commit -m "feat(ui): translate assignments between UI nulls and the wire format"
```

---

### Task 7: Server Action và query hook

**Files:**
- Create: `apps/web/features/team-builder/api/team-builder-api.ts`
- Create: `apps/web/features/team-builder/hooks/use-formations.ts`
- Create: `apps/web/features/team-builder/hooks/use-formation-weeks.ts`
- Create: `apps/web/features/team-builder/hooks/use-save-formation.ts`

**Interfaces:**
- Consumes: `SessionFormation`, `FormationWeek`, `WireAssignment` (Task 6); `getAccessToken` từ `@/features/auth`; `ApiError`, `apiFetch` từ `@/lib/api-client`
- Produces:
  - `teamBuilderKeys.weeks()`, `teamBuilderKeys.formations(weekStart?: string)`
  - `fetchFormationWeeks(): Promise<FormationWeek[]>`
  - `fetchFormations(weekStart?: string): Promise<SessionFormation[]>`
  - `saveFormation(input: { sessionId: string; assignment: WireAssignment }): Promise<SessionFormation>`
  - `useFormationWeeks()`, `useFormations(weekStart?: string)`, `useSaveFormation()`

**Cả ba hàm phải là Server Action.** Endpoint bọc `JwtAuthGuard` đọc header `Authorization`, mà access token nằm trong cookie **httpOnly** — client không đọc được. Đây đúng là lý do `markAttendanceAsAdmin` tồn tại; làm theo mẫu đó.

- [ ] **Step 1: Viết Server Action**

Tạo `apps/web/features/team-builder/api/team-builder-api.ts`:

```ts
"use server";

import { getAccessToken } from "@/features/auth";
import { ApiError, apiFetch } from "@/lib/api-client";
import type {
  FormationWeek,
  SessionFormation,
  WireAssignment,
} from "../types/session-formation";

/** Payload lưu đội hình của một trận. */
export interface SaveFormationInput {
  /** ID trận cần lưu */
  sessionId: string;
  /** Đội hình dạng slotId → characterId, ô trống đã bị bỏ khoá */
  assignment: WireAssignment;
}

/**
 * Lấy access token của quản trị viên đang đăng nhập.
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
 * Lấy các tuần còn dữ liệu đội hình.
 * Chạy ở server vì endpoint chỉ dành cho quản trị viên và token nằm trong cookie
 * httpOnly, client không tự gắn header được.
 * @returns Mảng tuần, mới nhất trước
 * @throws ApiError khi chưa đăng nhập hoặc backend từ chối
 */
export async function fetchFormationWeeks(): Promise<FormationWeek[]> {
  return apiFetch<FormationWeek[]>("/team-builder/weeks", {
    headers: await authHeader(),
  });
}

/**
 * Lấy đội hình của các trận trong một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
 * @returns Mảng trận sắp theo thời gian đánh
 * @throws ApiError khi chưa đăng nhập hoặc backend từ chối
 */
export async function fetchFormations(
  weekStart?: string
): Promise<SessionFormation[]> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";

  return apiFetch<SessionFormation[]>(`/team-builder/formations${query}`, {
    headers: await authHeader(),
  });
}

/**
 * Ghi đè đội hình của một trận.
 * @param input - sessionId và assignment cần lưu
 * @returns Trận kèm đội hình vừa ghi
 * @throws ApiError khi chưa đăng nhập, trận đã khoá (409), hoặc backend từ chối
 */
export async function saveFormation(
  input: SaveFormationInput
): Promise<SessionFormation> {
  return apiFetch<SessionFormation>(
    `/team-builder/formations/${encodeURIComponent(input.sessionId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ assignment: input.assignment }),
      headers: await authHeader(),
    }
  );
}
```

- [ ] **Step 2: Viết query key factory**

Query key **không** đặt cùng file Server Action: file `"use server"` chỉ được export hàm async. Tạo `apps/web/features/team-builder/api/team-builder-keys.ts`:

```ts
/**
 * Query key factory cho domain xếp đội hình.
 * Dùng chung cho mọi useQuery/invalidateQueries của feature này.
 */
export const teamBuilderKeys = {
  all: ["team-builder"] as const,
  weeks: () => [...teamBuilderKeys.all, "weeks"] as const,
  formations: (weekStart?: string) =>
    [...teamBuilderKeys.all, "formations", weekStart ?? "current"] as const,
};
```

- [ ] **Step 3: Viết hook đọc**

Tạo `apps/web/features/team-builder/hooks/use-formation-weeks.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFormationWeeks } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Weeks that still hold formation data, newest first.
 * @returns TanStack query holding the week list
 */
export function useFormationWeeks() {
  return useQuery({
    queryKey: teamBuilderKeys.weeks(),
    queryFn: () => fetchFormationWeeks(),
  });
}
```

Tạo `apps/web/features/team-builder/hooks/use-formations.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFormations } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Saved formations for every battle of one week.
 * This is the server copy — user edits live as drafts in the Zustand store.
 * @param weekStart - Monday of the week to read; omit for the open week
 * @returns TanStack query holding the week's sessions and their formations
 */
export function useFormations(weekStart?: string) {
  return useQuery({
    queryKey: teamBuilderKeys.formations(weekStart),
    queryFn: () => fetchFormations(weekStart),
  });
}
```

- [ ] **Step 4: Viết hook lưu**

Tạo `apps/web/features/team-builder/hooks/use-save-formation.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveFormation } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Persist one session's formation.
 * No optimistic update on purpose: a failed save must leave the draft intact,
 * since losing the arrangement is far worse than waiting a beat for the server.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveFormation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
    },
  });
}
```

- [ ] **Step 5: Kiểm tra biên dịch và lint**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
```

Kỳ vọng: cả hai không báo lỗi.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/api apps/web/features/team-builder/hooks
git commit -m "feat(ui): fetch and save formations through admin server actions"
```

---

### Task 8: Pool theo từng trận

**Files:**
- Modify: `apps/web/features/attendance/index.ts`
- Create: `apps/web/features/team-builder/lib/session-pool.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/session-pool.test.ts`
- Create: `apps/web/features/team-builder/hooks/use-session-pool.ts`

**Interfaces:**
- Consumes: `selectPoolCharacters`, `PoolCandidate`, `PoolFilter` từ `../lib/pool`; `AttendanceRecord`, `useAttendanceRecords` từ `@/features/attendance`
- Produces:
  - `presentCharacterIds(records: AttendanceRecordLike[], sessionId: string): Set<string>`
  - `selectPresentCharacters<T extends PoolCandidate>(characters: T[], presentIds: Set<string>): T[]`
  - `useSessionPool<T extends PoolCandidate>(characters: T[], records: AttendanceRecordLike[], sessionId: string, assignment: Assignment): T[]`

Pool = người đã báo **"Có"** cho đúng trận đang chọn, trừ người đã được xếp. Phần lọc theo tìm kiếm/lưu phái vẫn dùng `selectPoolCharacters` đang có — không viết lại.

- [ ] **Step 1: Mở barrel của attendance**

Sửa `apps/web/features/attendance/index.ts`:

```ts
export { AttendanceScreen } from "./components/attendance-screen";
export { AttendanceFilters } from "./components/attendance-filters";
export { AttendanceLogTable } from "./components/attendance-log-table";
export {
  useCharacters,
  useBattleSessions,
  useAttendanceRecords,
} from "./hooks/use-attendance";
export type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "./types/attendance";
```

- [ ] **Step 2: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/session-pool.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AttendanceStatus, GuildClass } from "@shared/enums";

import type { PoolCandidate } from "../pool";
import {
  presentCharacterIds,
  selectPresentCharacters,
  type AttendanceRecordLike,
} from "../session-pool";

const CHARACTERS: PoolCandidate[] = [
  { id: "MeoMap01", name: "Mèo Mập", guildClass: GuildClass.THIET_Y },
  { id: "LongNho02", name: "Long Nhỏ", guildClass: GuildClass.LONG_NGAM },
  { id: "ToVan03", name: "Tố Vân", guildClass: GuildClass.TO_VAN },
];

const RECORDS: AttendanceRecordLike[] = [
  { characterId: "MeoMap01", sessionId: "sat", status: AttendanceStatus.PRESENT },
  { characterId: "LongNho02", sessionId: "sat", status: AttendanceStatus.ABSENT },
  { characterId: "ToVan03", sessionId: "thu", status: AttendanceStatus.PRESENT },
];

describe("presentCharacterIds", () => {
  it("chỉ lấy người báo Có cho đúng trận", () => {
    expect(presentCharacterIds(RECORDS, "sat")).toEqual(new Set(["MeoMap01"]));
  });

  it("trả tập rỗng khi chưa ai điểm danh trận đó", () => {
    expect(presentCharacterIds(RECORDS, "tue")).toEqual(new Set());
  });

  it("không tính người báo Không", () => {
    expect(presentCharacterIds(RECORDS, "sat").has("LongNho02")).toBe(false);
  });
});

describe("selectPresentCharacters", () => {
  it("giữ đúng người có mặt, theo thứ tự danh sách gốc", () => {
    const present = new Set(["ToVan03", "MeoMap01"]);

    expect(
      selectPresentCharacters(CHARACTERS, present).map((c) => c.id)
    ).toEqual(["MeoMap01", "ToVan03"]);
  });

  it("trả mảng rỗng khi không ai có mặt", () => {
    expect(selectPresentCharacters(CHARACTERS, new Set())).toEqual([]);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/session-pool.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../session-pool`.

- [ ] **Step 4: Viết hàm thuần**

Tạo `apps/web/features/team-builder/lib/session-pool.ts`:

```ts
import { AttendanceStatus } from "@shared/enums";

import type { PoolCandidate } from "./pool";

/** The bit of an attendance record this module needs. */
export interface AttendanceRecordLike {
  /** Character who marked attendance */
  characterId: string;
  /** Battle the record belongs to */
  sessionId: string;
  /** Whether they are showing up */
  status: AttendanceStatus;
}

/**
 * Everyone who said they are coming to one specific battle.
 * @param records - Attendance records of the open week
 * @param sessionId - Battle being arranged
 * @returns Ids of characters marked present for that battle
 */
export function presentCharacterIds(
  records: AttendanceRecordLike[],
  sessionId: string
): Set<string> {
  const present = records
    .filter(
      (record) =>
        record.sessionId === sessionId &&
        record.status === AttendanceStatus.PRESENT
    )
    .map((record) => record.characterId);

  return new Set(present);
}

/**
 * Narrow the roster to the people attending, keeping roster order.
 * @param characters - Full guild roster
 * @param presentIds - Ids of characters attending the battle
 * @returns Characters attending, in roster order
 */
export function selectPresentCharacters<T extends PoolCandidate>(
  characters: T[],
  presentIds: Set<string>
): T[] {
  return characters.filter((character) => presentIds.has(character.id));
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/session-pool.test.ts
```

Kỳ vọng: PASS, 5 test.

- [ ] **Step 6: Viết hook**

Tạo `apps/web/features/team-builder/hooks/use-session-pool.ts`:

```ts
"use client";

import { useMemo } from "react";

import { selectPoolCharacters, type PoolCandidate } from "../lib/pool";
import { presentCharacterIds, selectPresentCharacters } from "../lib/session-pool";
import type { AttendanceRecordLike } from "../lib/session-pool";
import { usePoolFilterStore } from "../store/pool-filter-store";
import type { Assignment } from "../types/formation";

/**
 * Pool for one battle: whoever marked present for it, minus whoever is already
 * placed, then narrowed by the search and class filters.
 * Nothing is stored — this recomputes on render, so the pool cannot drift.
 * @param characters - Full guild roster from the server
 * @param records - Attendance records of the open week
 * @param sessionId - Battle being arranged
 * @param assignment - Assignment currently shown for that battle
 * @returns Characters still available to place, already filtered
 */
export function useSessionPool<T extends PoolCandidate>(
  characters: T[],
  records: AttendanceRecordLike[],
  sessionId: string,
  assignment: Assignment
): T[] {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);

  return useMemo(() => {
    const present = selectPresentCharacters(
      characters,
      presentCharacterIds(records, sessionId)
    );

    return selectPoolCharacters(present, assignment, { search, guildClasses });
  }, [characters, records, sessionId, assignment, search, guildClasses]);
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/attendance/index.ts apps/web/features/team-builder/lib apps/web/features/team-builder/hooks
git commit -m "feat(ui): build the member pool from attendance for one battle"
```

---

### Task 9: Trận nào còn sửa được

**Files:**
- Create: `apps/web/features/team-builder/lib/session-status.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/session-status.test.ts`

**Interfaces:**
- Consumes: `SessionFormation` (Task 6)
- Produces: `isSessionEditable(session: Pick<SessionFormation, "locked">, isCurrentWeek: boolean): boolean`

Cờ `locked` do server tính (trận đã qua giờ đánh) — không tính lại ở FE, vì server mới là nơi chặn thật. FE chỉ cộng thêm một điều kiện: tuần cũ luôn chỉ đọc.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/session-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isSessionEditable } from "../session-status";

describe("isSessionEditable", () => {
  it("cho sửa trận chưa đánh của tuần đang mở", () => {
    expect(isSessionEditable({ locked: false }, true)).toBe(true);
  });

  it("khoá trận đã đánh dù đang ở tuần hiện tại", () => {
    expect(isSessionEditable({ locked: true }, true)).toBe(false);
  });

  it("khoá mọi trận của tuần cũ", () => {
    expect(isSessionEditable({ locked: false }, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/session-status.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../session-status`.

- [ ] **Step 3: Viết hàm**

Tạo `apps/web/features/team-builder/lib/session-status.ts`:

```ts
import type { SessionFormation } from "../types/session-formation";

/**
 * Whether the user may still rearrange a battle's formation.
 * `locked` comes from the server, which decides it from the battle time and is
 * the real gate — this only adds the read-only rule for past weeks.
 * @param session - The battle, carrying the server's locked flag
 * @param isCurrentWeek - Whether the week on screen is the open one
 * @returns true when the formation may be edited
 */
export function isSessionEditable(
  session: Pick<SessionFormation, "locked">,
  isCurrentWeek: boolean
): boolean {
  return isCurrentWeek && !session.locked;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/session-status.test.ts
```

Kỳ vọng: PASS, 3 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): decide which battles still accept formation edits"
```

---

### Task 10: Phát hiện nháp chưa lưu

**Files:**
- Create: `apps/web/features/team-builder/lib/formation-diff.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/formation-diff.test.ts`

**Interfaces:**
- Consumes: `Assignment` từ `../types/formation`
- Produces: `isDirty(draft: Assignment | undefined, saved: Assignment): boolean`

Nháp chưa động tới thì `undefined` — không dirty. Nháp tồn tại nhưng nội dung trùng bản đã lưu (kéo đi rồi kéo về) cũng không dirty; so nội dung chứ không dựa vào cờ.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/formation-diff.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import { isDirty } from "../formation-diff";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

describe("isDirty", () => {
  it("chưa có nháp thì không coi là chưa lưu", () => {
    expect(isDirty(undefined, SAVED)).toBe(false);
  });

  it("nháp trùng bản đã lưu thì không coi là chưa lưu", () => {
    expect(isDirty({ ...SAVED }, SAVED)).toBe(false);
  });

  it("đổi người ở một ô thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-1": "char-2" }, SAVED)).toBe(true);
  });

  it("xếp thêm người vào ô trống thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-2": "char-9" }, SAVED)).toBe(true);
  });

  it("gỡ người khỏi ô thì báo chưa lưu", () => {
    expect(isDirty({ ...SAVED, "team-1-pos-1": null }, SAVED)).toBe(true);
  });

  it("nháp thiếu ô so với bản đã lưu thì báo chưa lưu", () => {
    expect(isDirty({ "team-1-pos-1": "char-1" }, SAVED)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/formation-diff.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../formation-diff`.

- [ ] **Step 3: Viết hàm**

Tạo `apps/web/features/team-builder/lib/formation-diff.ts`:

```ts
import type { Assignment } from "../types/formation";

/**
 * Whether a draft differs from what the server has stored.
 * Compares contents rather than tracking a flag, so dragging someone away and
 * back counts as no change. Sixty keys per comparison is cheap enough to run
 * on every render.
 * @param draft - Draft for this battle, undefined when it was never touched
 * @param saved - Assignment as last read from the server
 * @returns true when the draft holds unsaved changes
 */
export function isDirty(
  draft: Assignment | undefined,
  saved: Assignment
): boolean {
  if (!draft) return false;

  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);

  for (const key of keys) {
    if ((draft[key] ?? null) !== (saved[key] ?? null)) return true;
  }

  return false;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/formation-diff.test.ts
```

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): detect unsaved formation drafts by comparing contents"
```

---

### Task 11: Store giữ nháp theo từng trận

**Files:**
- Modify: `apps/web/features/team-builder/store/formation-store.ts`
- Create: `apps/web/features/team-builder/store/__tests__/formation-store.test.ts`

**Interfaces:**
- Consumes: `applyDrop` từ `../lib/assignment`; `Assignment`, `DragSource`, `DropTarget` từ `../types/formation`
- Produces:
  - `useFormationStore` với state `{ drafts: Record<string, Assignment>; activeSessionId: string | null; selectedWeekStart: string | null }`
  - actions `setActiveSession(sessionId)`, `setWeek(weekStart)`, `setDraft(sessionId, assignment)`, `clearDraft(sessionId)`, `drop(sessionId, base, source, characterId, target)`

Store **chỉ giữ nháp**, không giữ dữ liệu server (`AGENTS.md:56`). `formation` (bố cục) chuyển sang export hằng từ `lib/mock-formation.ts` cho component dùng trực tiếp — nó là dữ liệu tĩnh, không phải state.

`drop` nhận thêm `base`: khi trận chưa có nháp thì điểm xuất phát là bản đã lưu, mà bản đã lưu nằm ở TanStack Query nên store không tự đọc được.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/store/__tests__/formation-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      activeSessionId: null,
      selectedWeekStart: null,
    });
  });

  it("kéo thả lần đầu thì dựng nháp từ bản đã lưu", () => {
    useFormationStore
      .getState()
      .drop("sat", SAVED, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    expect(useFormationStore.getState().drafts.sat).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": "char-9",
    });
  });

  it("giữ nháp của từng trận tách biệt nhau", () => {
    const { drop } = useFormationStore.getState();
    drop("sat", SAVED, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    drop("thu", SAVED, { kind: "pool" }, "char-8", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const { drafts } = useFormationStore.getState();
    expect(drafts.sat["team-1-pos-2"]).toBe("char-9");
    expect(drafts.thu["team-1-pos-2"]).toBe("char-8");
  });

  it("thả ra ngoài mọi vùng thì không tạo nháp", () => {
    useFormationStore
      .getState()
      .drop("sat", SAVED, { kind: "pool" }, "char-9", null);

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("clearDraft bỏ nháp để quay về bản đã lưu", () => {
    const { drop, clearDraft } = useFormationStore.getState();
    drop("sat", SAVED, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    clearDraft("sat");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("setDraft ghi thẳng một nháp (dùng cho điền sẵn)", () => {
    useFormationStore.getState().setDraft("thu", SAVED);

    expect(useFormationStore.getState().drafts.thu).toEqual(SAVED);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/store
```

Kỳ vọng: FAIL — `drop` nhận sai số tham số, `drafts` không tồn tại.

- [ ] **Step 3: Viết lại store**

Thay toàn bộ nội dung `apps/web/features/team-builder/store/formation-store.ts`:

```ts
import { create } from "zustand";

import { applyDrop } from "../lib/assignment";
import type { Assignment, DragSource, DropTarget } from "../types/formation";

interface FormationState {
  /** Unsaved edits per battle, keyed by session id. Missing key = untouched. */
  drafts: Record<string, Assignment>;
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Monday of the week on screen; null means the open week */
  selectedWeekStart: string | null;
  /** Switch to another battle's tab */
  setActiveSession: (sessionId: string) => void;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /** Replace a battle's draft outright — used by the prefill */
  setDraft: (sessionId: string, assignment: Assignment) => void;
  /** Discard a battle's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into the battle's draft */
  drop: (
    sessionId: string,
    base: Assignment,
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
}

/**
 * Draft state of the formation builder (Zustand).
 * Holds ONLY unsaved edits — the saved formations are server data and stay in
 * TanStack Query. Every rule about what a drop means lives in
 * `lib/assignment.ts`; this store adds none of its own.
 */
export const useFormationStore = create<FormationState>((set) => ({
  drafts: {},
  activeSessionId: null,
  selectedWeekStart: null,
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  setWeek: (weekStart) =>
    set({ selectedWeekStart: weekStart, drafts: {}, activeSessionId: null }),
  setDraft: (sessionId, assignment) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: assignment } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.drafts;
      return { drafts: rest };
    }),
  drop: (sessionId, base, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const next = applyDrop(current, source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === current) return state;

      return { drafts: { ...state.drafts, [sessionId]: next } };
    }),
}));
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/store
```

Kỳ vọng: PASS, 5 test.

- [ ] **Step 5: Kiểm tra biên dịch (sẽ còn lỗi ở component — bình thường)**

```bash
pnpm --filter web exec tsc --noEmit
```

Kỳ vọng: báo lỗi ở `team-builder-screen.tsx`, `formation-grid.tsx`, `use-pool.ts` vì chúng còn dùng API cũ của store. Task 15 và 17 sẽ sửa. Ghi lại danh sách file lỗi để đối chiếu.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/store
git commit -m "feat(ui): keep one formation draft per battle in the store"
```

---

### Task 12: Điền sẵn đội hình từ trận trước

**Files:**
- Create: `apps/web/features/team-builder/lib/prefill.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/prefill.test.ts`
- Create: `apps/web/features/team-builder/hooks/use-prefill.ts`

**Interfaces:**
- Consumes: `Assignment`, `Slot` từ `../types/formation`; `SessionFormation` (Task 6); `fromWire` (Task 6); `presentCharacterIds` (Task 8); `useFormationStore` (Task 11)
- Produces:
  - `interface PrefillResult { assignment: Assignment; sourceLabel: string; droppedCount: number }`
  - `buildPrefill(sessions: SessionFormation[], targetSessionId: string, presentIds: Set<string>, slots: Slot[]): PrefillResult | null`
  - `usePrefill(sessions: SessionFormation[], activeSessionId: string | null, presentIds: Set<string>, slots: Slot[], editable: boolean): PrefillResult | null`

Nguồn điền sẵn là **trận gần nhất trước đó trong cùng tuần mà có đội hình đã lưu**. Không có trận nào như vậy → trả `null`, không điền, không hiện băng thông báo.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/prefill.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Slot } from "../../types/formation";
import type { SessionFormation } from "../../types/session-formation";
import { buildPrefill } from "../prefill";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

/**
 * Dựng một trận cho test.
 * @param overrides - Các field cần đổi so với mặc định
 * @returns Trận đầy đủ field
 */
function session(overrides: Partial<SessionFormation>): SessionFormation {
  return {
    sessionId: "s",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    isGuildWar: false,
    locked: false,
    assignment: {},
    ...overrides,
  };
}

const TUESDAY = session({
  sessionId: "tue",
  label: "Thứ 3 · 20:30",
  dateTime: "2026-07-21T13:30:00.000Z",
  locked: true,
  assignment: {
    "team-1-pos-1": "char-1",
    "team-1-pos-2": "char-2",
    "team-1-pos-3": "char-3",
  },
});

const THURSDAY = session({
  sessionId: "thu",
  label: "Thứ 5 · 20:30",
  dateTime: "2026-07-23T13:30:00.000Z",
});

const SATURDAY = session({
  sessionId: "sat",
  label: "Thứ 7 · Guild War",
  dateTime: "2026-07-25T13:00:00.000Z",
});

describe("buildPrefill", () => {
  it("giữ đúng vị trí của người vẫn đánh trận này", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1", "char-3"]),
      SLOTS
    );

    expect(result?.assignment).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": null,
      "team-1-pos-3": "char-3",
    });
  });

  it("đếm đúng số người bị bỏ vì không đánh trận này", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.droppedCount).toBe(2);
  });

  it("nêu tên trận được lấy làm nguồn", () => {
    const result = buildPrefill(
      [TUESDAY, THURSDAY, SATURDAY],
      "thu",
      new Set(["char-1"]),
      SLOTS
    );

    expect(result?.sourceLabel).toBe("Thứ 3 · 20:30");
  });

  it("lấy trận GẦN NHẤT trước đó, không phải trận đầu tuần", () => {
    const thursdayWithFormation = session({
      ...THURSDAY,
      assignment: { "team-1-pos-1": "char-9" },
    });

    const result = buildPrefill(
      [TUESDAY, thursdayWithFormation, SATURDAY],
      "sat",
      new Set(["char-9"]),
      SLOTS
    );

    expect(result?.sourceLabel).toBe("Thứ 5 · 20:30");
    expect(result?.assignment["team-1-pos-1"]).toBe("char-9");
  });

  it("trả null khi không có trận nào trước đó", () => {
    expect(
      buildPrefill([TUESDAY, THURSDAY, SATURDAY], "tue", new Set(), SLOTS)
    ).toBeNull();
  });

  it("trả null khi các trận trước đó đều chưa xếp đội hình", () => {
    const emptyTuesday = session({ ...TUESDAY, assignment: {} });

    expect(
      buildPrefill([emptyTuesday, THURSDAY, SATURDAY], "thu", new Set(), SLOTS)
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/prefill.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../prefill`.

- [ ] **Step 3: Viết hàm thuần**

Tạo `apps/web/features/team-builder/lib/prefill.ts`:

```ts
import type { Assignment, Slot } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";
import { fromWire } from "./wire";

/** A formation proposed for a battle that has none yet. */
export interface PrefillResult {
  /** The proposed assignment, already stripped of absentees */
  assignment: Assignment;
  /** Label of the battle it was copied from */
  sourceLabel: string;
  /** How many people were dropped for not attending this battle */
  droppedCount: number;
}

/**
 * Propose a formation for a battle by copying the most recent earlier battle of
 * the same week that has one, keeping only people attending this battle.
 * @param sessions - Every battle of the week, ordered by battle time
 * @param targetSessionId - Battle needing a formation
 * @param presentIds - Ids of characters attending the target battle
 * @param slots - Slots of the current layout
 * @returns The proposal, or null when there is nothing to copy from
 */
export function buildPrefill(
  sessions: SessionFormation[],
  targetSessionId: string,
  presentIds: Set<string>,
  slots: Slot[]
): PrefillResult | null {
  const targetIndex = sessions.findIndex(
    (session) => session.sessionId === targetSessionId
  );
  if (targetIndex < 0) return null;

  const source = sessions
    .slice(0, targetIndex)
    .reverse()
    .find((session) => Object.keys(session.assignment).length > 0);
  if (!source) return null;

  const previous = fromWire(source.assignment, slots);
  const assignment: Assignment = {};
  let droppedCount = 0;

  for (const slot of slots) {
    const characterId = previous[slot.id];

    if (characterId === null || characterId === undefined) {
      assignment[slot.id] = null;
      continue;
    }

    if (presentIds.has(characterId)) {
      assignment[slot.id] = characterId;
    } else {
      assignment[slot.id] = null;
      droppedCount += 1;
    }
  }

  return { assignment, sourceLabel: source.label, droppedCount };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/prefill.test.ts
```

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Viết hook**

Tạo `apps/web/features/team-builder/hooks/use-prefill.ts`:

```ts
"use client";

import { useEffect, useMemo } from "react";

import { buildPrefill, type PrefillResult } from "../lib/prefill";
import { useFormationStore } from "../store/formation-store";
import type { Slot } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";

/**
 * Fill an untouched battle with the previous battle's line-up, as a draft.
 * Runs only when the battle has no saved formation AND no draft yet, which
 * makes it self-limiting: clearing the proposal leaves an empty draft that
 * still exists, so nothing refills it.
 * @param sessions - Every battle of the week, ordered by battle time
 * @param activeSessionId - Battle whose tab is open, null while loading
 * @param presentIds - Ids of characters attending the active battle
 * @param slots - Slots of the current layout
 * @param editable - Whether this battle still accepts edits
 * @returns The proposal shown in the banner, or null when nothing was filled
 */
export function usePrefill(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  presentIds: Set<string>,
  slots: Slot[],
  editable: boolean
): PrefillResult | null {
  const drafts = useFormationStore((state) => state.drafts);
  const setDraft = useFormationStore((state) => state.setDraft);

  const active = sessions.find(
    (session) => session.sessionId === activeSessionId
  );
  const hasSaved = Boolean(active && Object.keys(active.assignment).length > 0);
  const hasDraft = Boolean(activeSessionId && drafts[activeSessionId]);

  const proposal = useMemo(() => {
    if (!activeSessionId || !editable || hasSaved || hasDraft) return null;

    return buildPrefill(sessions, activeSessionId, presentIds, slots);
  }, [sessions, activeSessionId, presentIds, slots, editable, hasSaved, hasDraft]);

  useEffect(() => {
    if (!activeSessionId || !proposal) return;
    setDraft(activeSessionId, proposal.assignment);
  }, [activeSessionId, proposal, setDraft]);

  return proposal;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/lib apps/web/features/team-builder/hooks
git commit -m "feat(ui): prefill a battle from the previous one as a draft"
```

---

### Task 13: Đếm người chưa xếp theo lưu phái

**Files:**
- Create: `apps/web/features/team-builder/lib/class-shortage.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/class-shortage.test.ts`
- Create: `apps/web/features/team-builder/components/class-shortage.tsx`

**Interfaces:**
- Consumes: `PoolCandidate` từ `../lib/pool`; `GUILD_CLASS_LABEL`, `GUILD_CLASS_OPTIONS`, `GuildClass` từ `@shared/enums`
- Produces:
  - `interface ClassCount { guildClass: GuildClass; count: number }`
  - `countByGuildClass(pool: PoolCandidate[]): ClassCount[]`
  - `<ClassShortage pool={…} />`

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/class-shortage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import type { PoolCandidate } from "../pool";
import { countByGuildClass } from "../class-shortage";

const POOL: PoolCandidate[] = [
  { id: "a", name: "A", guildClass: GuildClass.TO_VAN },
  { id: "b", name: "B", guildClass: GuildClass.TO_VAN },
  { id: "c", name: "C", guildClass: GuildClass.THIET_Y },
];

describe("countByGuildClass", () => {
  it("đếm đúng số người còn lại của từng lưu phái", () => {
    const counts = countByGuildClass(POOL);

    expect(counts).toContainEqual({
      guildClass: GuildClass.TO_VAN,
      count: 2,
    });
    expect(counts).toContainEqual({
      guildClass: GuildClass.THIET_Y,
      count: 1,
    });
  });

  it("bỏ qua lưu phái không còn ai", () => {
    const counts = countByGuildClass(POOL);

    expect(
      counts.some((item) => item.guildClass === GuildClass.LONG_NGAM)
    ).toBe(false);
  });

  it("pool rỗng thì không có dòng nào", () => {
    expect(countByGuildClass([])).toEqual([]);
  });

  it("giữ thứ tự theo GUILD_CLASS_OPTIONS để UI không nhảy", () => {
    const counts = countByGuildClass(POOL);

    expect(counts.map((item) => item.guildClass)).toEqual([
      GuildClass.THIET_Y,
      GuildClass.TO_VAN,
    ]);
  });
});
```

Chú ý: test cuối phụ thuộc thứ tự trong `GUILD_CLASS_OPTIONS` (`Object.values(GuildClass)`), tức thứ tự khai báo enum: `CUU_LINH, HUYET_HA, LONG_NGAM, THAN_TUONG, THIET_Y, TOAI_MONG, TO_VAN`. `THIET_Y` đứng trước `TO_VAN`.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/class-shortage.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../class-shortage`.

- [ ] **Step 3: Viết hàm thuần**

Tạo `apps/web/features/team-builder/lib/class-shortage.ts`:

```ts
import { GUILD_CLASS_OPTIONS, type GuildClass } from "@shared/enums";

import type { PoolCandidate } from "./pool";

/** How many unplaced members one guild class still has. */
export interface ClassCount {
  /** The guild class */
  guildClass: GuildClass;
  /** How many of them are still in the pool */
  count: number;
}

/**
 * Count the unplaced members of each guild class, so the arranger can see what
 * is left to spread across teams. Classes with nobody left are omitted, and the
 * rest keep the declaration order of the enum so the row never reshuffles.
 * @param pool - Members still available to place
 * @returns One entry per class that still has someone, in enum order
 */
export function countByGuildClass(pool: PoolCandidate[]): ClassCount[] {
  const counts = new Map<GuildClass, number>();

  for (const member of pool) {
    counts.set(member.guildClass, (counts.get(member.guildClass) ?? 0) + 1);
  }

  return GUILD_CLASS_OPTIONS.filter((guildClass) => counts.has(guildClass)).map(
    (guildClass) => ({ guildClass, count: counts.get(guildClass) ?? 0 })
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/class-shortage.test.ts
```

Kỳ vọng: PASS, 4 test.

- [ ] **Step 5: Viết component**

Tạo `apps/web/features/team-builder/components/class-shortage.tsx`:

```tsx
import Image from "next/image";
import { GUILD_CLASS_LABEL } from "@shared/enums";

import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { countByGuildClass } from "../lib/class-shortage";
import type { PoolCandidate } from "../lib/pool";

interface ClassShortageProps {
  /** Members still available to place */
  pool: PoolCandidate[];
}

/**
 * A row of "class × how many are still unplaced", so the arranger can tell at a
 * glance what is left to spread across teams.
 * @param pool - Members still available to place
 * @returns The counter row, or nothing when everybody is placed
 */
export function ClassShortage({ pool }: ClassShortageProps) {
  const counts = countByGuildClass(pool);
  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">Chưa xếp:</span>
      {counts.map(({ guildClass, count }) => (
        <span
          key={guildClass}
          className="flex items-center gap-1.5 text-xs"
          title={GUILD_CLASS_LABEL[guildClass]}
        >
          <Image
            src={GUILD_CLASS_IMAGE[guildClass]}
            alt={GUILD_CLASS_LABEL[guildClass]}
            width={16}
            height={16}
            className="size-4 rounded-sm object-cover"
          />
          <span className="font-medium">{count}</span>
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/lib apps/web/features/team-builder/components/class-shortage.tsx
git commit -m "feat(ui): show how many members of each class are still unplaced"
```

---

### Task 14: Chọn tuần và chọn trận

**Files:**
- Create: `apps/web/components/ui/tabs.tsx` (shadcn CLI sinh)
- Create: `apps/web/features/team-builder/components/session-tabs.tsx`
- Create: `apps/web/features/team-builder/components/week-picker.tsx`

**Interfaces:**
- Consumes: `SessionFormation`, `FormationWeek` (Task 6); `Assignment` từ `../types/formation`; `Select*` từ `@/components/ui/select`
- Produces:
  - `<SessionTabs sessions activeSessionId onSelect assignments dirtySessionIds />`
  - `<WeekPicker weeks value onChange />`

- [ ] **Step 1: Sinh component Tabs bằng CLI**

```bash
cd apps/web && npx shadcn@latest add tabs
```

Kỳ vọng: tạo `apps/web/components/ui/tabs.tsx` import từ `@base-ui/react/tabs`. **Nếu file sinh ra import `@radix-ui/*` thì dừng lại** — `components.json` chưa đúng `style: "base-nova"`, không được sửa tay file này.

- [ ] **Step 2: Viết tabs chọn trận**

Tạo `apps/web/features/team-builder/components/session-tabs.tsx`:

```tsx
"use client";

import { Lock, Swords } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Assignment } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";

interface SessionTabsProps {
  /** Battles of the week, ordered by battle time */
  sessions: SessionFormation[];
  /** Battle whose tab is open */
  activeSessionId: string | null;
  /** Assignment currently shown for each battle, keyed by session id */
  assignments: Record<string, Assignment>;
  /** Battles holding unsaved changes */
  dirtySessionIds: Set<string>;
  /** Total number of slots in the layout */
  slotCount: number;
  /** Called with the battle the user switched to */
  onSelect: (sessionId: string) => void;
}

/**
 * One tab per battle of the week. Shows each battle's fill count so all three
 * are visible without opening anything, marks the Guild War, and flags a locked
 * battle and unsaved edits.
 * @param sessions - Battles of the week
 * @param activeSessionId - Battle whose tab is open
 * @param assignments - Assignment shown for each battle
 * @param dirtySessionIds - Battles holding unsaved changes
 * @param slotCount - Total number of slots in the layout
 * @param onSelect - Called with the battle the user switched to
 * @returns The battle tab bar
 */
export function SessionTabs({
  sessions,
  activeSessionId,
  assignments,
  dirtySessionIds,
  slotCount,
  onSelect,
}: SessionTabsProps) {
  return (
    <Tabs
      value={activeSessionId ?? undefined}
      onValueChange={(value) => onSelect(String(value))}
    >
      <TabsList className="w-full">
        {sessions.map((session) => {
          const assignment = assignments[session.sessionId] ?? {};
          const filled = Object.values(assignment).filter(Boolean).length;

          return (
            <TabsTrigger
              key={session.sessionId}
              value={session.sessionId}
              className="flex-1 flex-col items-start gap-0.5 py-2"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {session.isGuildWar ? <Swords className="size-3.5" /> : null}
                {session.label}
                {session.locked ? (
                  <Lock className="size-3 text-muted-foreground" />
                ) : null}
                {dirtySessionIds.has(session.sessionId) ? (
                  <span
                    className="size-1.5 rounded-full bg-primary"
                    aria-label="Còn thay đổi chưa lưu"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-xs",
                  filled === 0 ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {filled}/{slotCount}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 3: Viết bộ chọn tuần**

Tạo `apps/web/features/team-builder/components/week-picker.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormationWeek } from "../types/session-formation";

interface WeekPickerProps {
  /** Weeks that still hold data, newest first */
  weeks: FormationWeek[];
  /** Monday of the week on screen */
  value: string;
  /** Called with the week the user switched to */
  onChange: (weekStart: string) => void;
}

/**
 * Render a week as "20/07 – 26/07".
 * @param weekStart - Monday of the week (ISO string)
 * @returns Vietnamese date range covering Monday to Sunday
 */
function formatWeek(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const format = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${format.format(start)} – ${format.format(end)}`;
}

/**
 * Week selector. Older weeks are read-only, which the screen enforces — this
 * component only reports which week the user wants to look at.
 * @param weeks - Weeks that still hold data
 * @param value - Monday of the week on screen
 * @param onChange - Called with the week the user switched to
 * @returns The week selector
 */
export function WeekPicker({ weeks, value, onChange }: WeekPickerProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(String(next))}>
      <SelectTrigger id="formation-week" className="w-52">
        <SelectValue>{() => `Tuần ${formatWeek(value)}`}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {weeks.map((week, index) => (
          <SelectItem key={week.weekStart} value={week.weekStart}>
            Tuần {formatWeek(week.weekStart)}
            {index === 0 ? " (hiện tại)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Kiểm tra biên dịch của hai component mới**

```bash
pnpm --filter web exec tsc --noEmit
```

Kỳ vọng: không có lỗi nào trong `session-tabs.tsx` và `week-picker.tsx`. Lỗi còn lại ở các file Task 15/17 sẽ sửa là bình thường.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ui/tabs.tsx apps/web/features/team-builder/components
git commit -m "feat(ui): add week picker and per-battle tabs"
```

---

### Task 15: Chế độ chỉ đọc và cảnh báo người báo nghỉ

**Files:**
- Modify: `apps/web/features/team-builder/components/slot-cell.tsx`
- Modify: `apps/web/features/team-builder/components/team-column.tsx`
- Modify: `apps/web/features/team-builder/components/formation-grid.tsx`
- Modify: `apps/web/features/team-builder/components/member-pool.tsx`
- Modify: `apps/web/features/team-builder/components/member-card.tsx`

**Interfaces:**
- Consumes: `Assignment`, `Slot` từ `../types/formation`; `Character` từ `@/features/attendance`
- Produces:
  - `<SlotCell slot character readOnly absentReason />`
  - `<TeamColumn team slots occupants readOnly absentIds />`
  - `<FormationGrid assignment charactersById readOnly absentIds />`
  - `<MemberPool characters readOnly />`
  - `<MemberCard character className warning />`

Hai đổi thay:

1. **Chỉ đọc** — render `MemberCard` thẳng thay vì `DraggableMember`. Đây đúng là lý do hai component được tách đôi: `useDraggable` là hook, không gọi có điều kiện được.
2. **Cảnh báo báo nghỉ** — người đã xếp nhưng sau đó đổi điểm danh sang "Không" thì **giữ nguyên trong ô**, tô cảnh báo. Không bao giờ tự gỡ người sau lưng người dùng.

`FormationGrid` nhận `assignment` qua prop thay vì đọc store, vì đội hình hiển thị là `nháp ?? bản đã lưu` — phép hợp nhất đó nằm ở `use-formation-screen.ts` (Task 17).

- [ ] **Step 1: Thêm trạng thái cảnh báo cho MemberCard**

Sửa `apps/web/features/team-builder/components/member-card.tsx`. Thêm prop vào interface:

```tsx
interface MemberCardProps {
  /** Character to display */
  character: Character;
  /** Why this placement needs attention, e.g. the member dropped out */
  warning?: string;
  /** Extra classes for the outer element */
  className?: string;
}
```

Đổi chữ ký và phần render (giữ nguyên phần còn lại của file):

```tsx
export function MemberCard({ character, warning, className }: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex w-full items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-left shadow-sm",
              warning && "border-destructive",
              className
            )}
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarImage
                src={GUILD_CLASS_IMAGE[character.guildClass]}
                alt={classLabel}
              />
              <AvatarFallback>{classLabel[0]}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {character.name}
            </span>
          </div>
        }
      />
      <TooltipContent>{warning ?? character.name}</TooltipContent>
    </Tooltip>
  );
}
```

Cập nhật JSDoc của component cho khớp: thêm `@param warning - Why this placement needs attention, if any`.

- [ ] **Step 2: Thêm readOnly và absentReason cho SlotCell**

Sửa `apps/web/features/team-builder/components/slot-cell.tsx`:

```tsx
interface SlotCellProps {
  /** Slot this cell renders */
  slot: Slot;
  /** Character currently standing here, if any */
  character?: Character;
  /** Render without drag handles — a past week or a battle already fought */
  readOnly?: boolean;
  /** Why the occupant needs attention, e.g. they dropped out of this battle */
  absentReason?: string;
}
```

```tsx
export function SlotCell({
  slot,
  character,
  readOnly = false,
  absentReason,
}: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, data });

  return (
    <div
      ref={readOnly ? undefined : setNodeRef}
      className={cn(
        "flex h-11 items-center rounded-md transition-colors",
        !character && "border border-dashed border-border bg-muted/30",
        !readOnly && isOver && "ring-2 ring-primary"
      )}
    >
      {character ? (
        readOnly ? (
          <MemberCard character={character} warning={absentReason} />
        ) : (
          <DraggableMember
            character={character}
            from={slot.id}
            warning={absentReason}
          />
        )
      ) : (
        <SlotPlaceholder slot={slot} />
      )}
    </div>
  );
}
```

Thêm import `MemberCard` và cập nhật JSDoc với hai `@param` mới.

- [ ] **Step 3: Chuyển warning qua DraggableMember**

Sửa `apps/web/features/team-builder/components/draggable-member.tsx` — thêm prop `warning?: string` vào interface, vào chữ ký, vào JSDoc, và truyền xuống:

```tsx
      <MemberCard character={character} warning={warning} />
```

- [ ] **Step 4: Chuyển tiếp qua TeamColumn và FormationGrid**

Sửa `team-column.tsx`: thêm `readOnly?: boolean` và `absentIds: Set<string>` vào props, truyền xuống mỗi `SlotCell`:

```tsx
        {slots.map((slot) => {
          const character = occupants.get(slot.id);

          return (
            <SlotCell
              key={slot.id}
              slot={slot}
              character={character}
              readOnly={readOnly}
              absentReason={
                character && absentIds.has(character.id)
                  ? "Đã báo nghỉ trận này"
                  : undefined
              }
            />
          );
        })}
```

Thay toàn bộ `formation-grid.tsx`. Nó không còn đọc store: đội hình hiển thị là `nháp ?? bản đã lưu`, phép hợp nhất đó nằm ở `use-formation-screen.ts` (Task 17). Bố cục lấy từ hằng module vì nó là dữ liệu tĩnh, không phải state.

```tsx
"use client";

import { useMemo } from "react";

import type { Character } from "@/features/attendance";
import { createMockFormation } from "../lib/mock-formation";
import type { Assignment } from "../types/formation";
import { TeamColumn } from "./team-column";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

interface FormationGridProps {
  /** Assignment currently shown — a draft, or the saved copy */
  assignment: Assignment;
  /** Roster keyed by character id, for resolving occupants */
  charactersById: Map<string, Character>;
  /** Render without drag handles */
  readOnly?: boolean;
  /** Ids of members who are placed but marked absent for this battle */
  absentIds: Set<string>;
}

/**
 * The ten team blocks. Groups the flat slot list by team at render time, so
 * changing the team count only touches the layout builder.
 * @param assignment - Assignment currently shown
 * @param charactersById - Roster keyed by character id
 * @param readOnly - Render without drag handles
 * @param absentIds - Ids of placed members who dropped out
 * @returns The formation grid
 */
export function FormationGrid({
  assignment,
  charactersById,
  readOnly = false,
  absentIds,
}: FormationGridProps) {
  const teams = useMemo(() => {
    const byTeam = new Map<number, typeof FORMATION.slots>();

    for (const slot of FORMATION.slots) {
      const slots = byTeam.get(slot.team) ?? [];
      slots.push(slot);
      byTeam.set(slot.team, slots);
    }

    return [...byTeam.entries()].sort(([a], [b]) => a - b);
  }, []);

  const occupants = useMemo(() => {
    const map = new Map<string, Character>();

    for (const [slotId, characterId] of Object.entries(assignment)) {
      const character = characterId ? charactersById.get(characterId) : undefined;
      if (character) map.set(slotId, character);
    }

    return map;
  }, [assignment, charactersById]);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {teams.map(([team, slots]) => (
        <TeamColumn
          key={team}
          team={team}
          slots={slots}
          occupants={occupants}
          readOnly={readOnly}
          absentIds={absentIds}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Thêm readOnly cho MemberPool**

Sửa `member-pool.tsx` — thêm prop và thoát sớm. Tuần cũ và trận đã đánh không cần danh sách chờ.

Thêm vào interface:

```tsx
  /** Hide the pool entirely — a past week or a battle already fought */
  readOnly?: boolean;
```

Đổi chữ ký và chèn dòng thoát sớm ngay đầu hàm, trước mọi hook khác:

```tsx
export function MemberPool({ characters, readOnly = false }: MemberPoolProps) {
  const data: PoolDropData = { type: "pool" };
  const { setNodeRef, isOver } = useDroppable({
    id: POOL_DROPPABLE_ID,
    data,
    disabled: readOnly,
  });

  if (readOnly) return null;
```

Dùng `disabled: readOnly` của `useDroppable` chứ **không** đặt `return null` trước lời gọi hook — gọi hook có điều kiện là lỗi React. Cập nhật JSDoc thêm `@param readOnly`.

- [ ] **Step 6: Kiểm tra biên dịch**

```bash
pnpm --filter web exec tsc --noEmit
```

Kỳ vọng: chỉ còn lỗi ở `team-builder-screen.tsx` và `use-pool.ts` (Task 17 xử lý).

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(ui): add read-only mode and flag members who dropped out"
```

---

### Task 16: Thanh công cụ và băng thông báo điền sẵn

**Files:**
- Create: `apps/web/features/team-builder/components/formation-toolbar.tsx`
- Create: `apps/web/features/team-builder/components/prefill-banner.tsx`

**Interfaces:**
- Consumes: `Button` từ `@/components/ui/button`; `PrefillResult` (Task 12)
- Produces:
  - `<FormationToolbar dirty saving errorMessage editable onSave onReset />`
  - `<PrefillBanner result onClear />`

- [ ] **Step 1: Viết thanh công cụ**

Tạo `apps/web/features/team-builder/components/formation-toolbar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface FormationToolbarProps {
  /** Whether this battle holds unsaved changes */
  dirty: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Message from a failed save, if any */
  errorMessage?: string;
  /** Whether this battle still accepts edits */
  editable: boolean;
  /** Persist the current draft */
  onSave: () => void;
  /** Discard the draft, returning to the saved copy */
  onReset: () => void;
}

/**
 * Save and reset controls for the battle on screen, plus the save status.
 * A failed save leaves the draft untouched on purpose — losing the arrangement
 * is far worse than retrying.
 * @param dirty - Whether this battle holds unsaved changes
 * @param saving - Whether a save is in flight
 * @param errorMessage - Message from a failed save, if any
 * @param editable - Whether this battle still accepts edits
 * @param onSave - Persist the current draft
 * @param onReset - Discard the draft
 * @returns The toolbar row
 */
export function FormationToolbar({
  dirty,
  saving,
  errorMessage,
  editable,
  onSave,
  onReset,
}: FormationToolbarProps) {
  if (!editable) {
    return (
      <p className="text-sm text-muted-foreground">
        Trận này đã đánh xong, chỉ xem lại được.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {errorMessage ? (
        <span className="text-sm text-destructive">{errorMessage}</span>
      ) : null}
      {dirty && !errorMessage ? (
        <span className="text-sm text-muted-foreground">Chưa lưu</span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={!dirty || saving}
      >
        Đặt lại
      </Button>
      <Button type="button" size="sm" onClick={onSave} disabled={!dirty || saving}>
        {saving ? "Đang lưu..." : "Lưu đội hình"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Viết băng thông báo**

Tạo `apps/web/features/team-builder/components/prefill-banner.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import type { PrefillResult } from "../lib/prefill";

interface PrefillBannerProps {
  /** The proposal that was filled in, null when nothing was */
  result: PrefillResult | null;
  /** Empty the proposed formation */
  onClear: () => void;
}

/**
 * Tell the user their formation was copied from an earlier battle and how many
 * people were dropped for not attending this one. Nothing is saved until they
 * press the save button.
 * @param result - The proposal that was filled in
 * @param onClear - Empty the proposed formation
 * @returns The banner, or nothing when no prefill happened
 */
export function PrefillBanner({ result, onClear }: PrefillBannerProps) {
  if (!result) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2">
      <p className="text-sm">
        Đã điền sẵn từ <span className="font-medium">{result.sourceLabel}</span>
        {result.droppedCount > 0
          ? ` · bỏ ${result.droppedCount} người không đánh trận này`
          : ""}
        . Chưa lưu.
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Xoá hết
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Kiểm tra biên dịch và lint**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
```

Kỳ vọng: hai file mới không có lỗi.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(ui): add the save toolbar and the prefill notice"
```

---

### Task 17: Ghép màn hình

**Files:**
- Create: `apps/web/features/team-builder/hooks/use-formation-screen.ts`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx`
- Delete: `apps/web/features/team-builder/hooks/use-pool.ts` — vỏ React cũ, đã bị `use-session-pool.ts` thay

**Giữ nguyên, đừng xoá:** `lib/pool.ts` và `lib/__tests__/pool.test.ts`. `use-session-pool.ts` vẫn gọi vào `selectPoolCharacters`; chỉ vỏ React `use-pool.ts` là thừa.

**Interfaces:**
- Consumes: mọi thứ từ Task 6–16
- Produces: `useFormationScreen()` trả về toàn bộ state màn hình cần

Màn hình phình to vì phải ghép tuần + tab + query + nháp + dnd, nên toàn bộ điều phối nằm ở hook; component chỉ dựng JSX.

- [ ] **Step 1: Viết hook điều phối**

Tạo `apps/web/features/team-builder/hooks/use-formation-screen.ts`:

```ts
"use client";

import { useMemo, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

import {
  useAttendanceRecords,
  useCharacters,
  type Character,
} from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
import { isMemberDragData, toDragSource, toDropTarget } from "../lib/dnd-data";
import { isDirty } from "../lib/formation-diff";
import { createMockFormation } from "../lib/mock-formation";
import { presentCharacterIds } from "../lib/session-pool";
import { isSessionEditable } from "../lib/session-status";
import { fromWire, toWire } from "../lib/wire";
import { useFormationStore } from "../store/formation-store";
import type { Assignment } from "../types/formation";
import { useFormationWeeks } from "./use-formation-weeks";
import { useFormations } from "./use-formations";
import { usePrefill } from "./use-prefill";
import { useSaveFormation } from "./use-save-formation";
import { useSessionPool } from "./use-session-pool";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

/** HTTP status the backend returns when a battle is already locked. */
const CONFLICT_STATUS = 409;

/**
 * Everything the formation screen needs, assembled in one place so the
 * component stays a JSX tree. Merges the saved formations from TanStack Query
 * with the per-battle drafts held in Zustand.
 * @returns Screen state plus the handlers it binds to
 */
export function useFormationScreen() {
  const weeksQuery = useFormationWeeks();
  const selectedWeekStart = useFormationStore((s) => s.selectedWeekStart);
  const setWeek = useFormationStore((s) => s.setWeek);

  const currentWeekStart = weeksQuery.data?.[0]?.weekStart ?? null;
  const weekStart = selectedWeekStart ?? currentWeekStart ?? undefined;
  const isCurrentWeek = !selectedWeekStart || selectedWeekStart === currentWeekStart;

  const formationsQuery = useFormations(weekStart);
  const charactersQuery = useCharacters();
  const recordsQuery = useAttendanceRecords();
  const saveMutation = useSaveFormation();

  const drafts = useFormationStore((s) => s.drafts);
  const setActiveSession = useFormationStore((s) => s.setActiveSession);
  const clearDraft = useFormationStore((s) => s.clearDraft);
  const setDraft = useFormationStore((s) => s.setDraft);
  const drop = useFormationStore((s) => s.drop);
  const storedActiveId = useFormationStore((s) => s.activeSessionId);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  const sessions = useMemo(() => formationsQuery.data ?? [], [formationsQuery.data]);
  const characters = useMemo(() => charactersQuery.data ?? [], [charactersQuery.data]);
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);

  // Default to the Guild War tab: it is the battle that matters most.
  const activeSessionId =
    storedActiveId ??
    sessions.find((session) => session.isGuildWar)?.sessionId ??
    sessions[0]?.sessionId ??
    null;

  const savedBySession = useMemo(() => {
    const map: Record<string, Assignment> = {};
    for (const session of sessions) {
      map[session.sessionId] = fromWire(session.assignment, FORMATION.slots);
    }
    return map;
  }, [sessions]);

  const assignments = useMemo(() => {
    const map: Record<string, Assignment> = {};
    for (const session of sessions) {
      map[session.sessionId] =
        drafts[session.sessionId] ?? savedBySession[session.sessionId];
    }
    return map;
  }, [sessions, drafts, savedBySession]);

  const dirtySessionIds = useMemo(() => {
    const dirty = new Set<string>();
    for (const session of sessions) {
      if (isDirty(drafts[session.sessionId], savedBySession[session.sessionId])) {
        dirty.add(session.sessionId);
      }
    }
    return dirty;
  }, [sessions, drafts, savedBySession]);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);
  const editable = activeSession
    ? isSessionEditable(activeSession, isCurrentWeek)
    : false;

  const presentIds = useMemo(
    () => (activeSessionId ? presentCharacterIds(records, activeSessionId) : new Set<string>()),
    [records, activeSessionId]
  );

  const assignment = activeSessionId
    ? (assignments[activeSessionId] ?? {})
    : {};

  const prefill = usePrefill(
    sessions,
    activeSessionId,
    presentIds,
    FORMATION.slots,
    editable
  );

  const pool = useSessionPool(characters, records, activeSessionId ?? "", assignment);

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );

  // Placed members who have since said they are not coming.
  const absentIds = useMemo(() => {
    const absent = new Set<string>();
    for (const characterId of Object.values(assignment)) {
      if (characterId && !presentIds.has(characterId)) absent.add(characterId);
    }
    return absent;
  }, [assignment, presentIds]);

  /**
   * Remember which character is moving so DragOverlay can preview it.
   * @param event - dnd-kit drag start event
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (!isMemberDragData(data)) return;
    setActiveCharacter(charactersById.get(data.characterId) ?? null);
  }

  /**
   * Hand the finished gesture to the store as a draft edit.
   * @param event - dnd-kit drag end event
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null);

    const dragData = event.active.data.current;
    if (!isMemberDragData(dragData) || !activeSessionId) return;

    drop(
      activeSessionId,
      assignment,
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
  }

  /**
   * Persist the open battle's draft.
   * A failed save keeps the draft: the toolbar shows the message and the user
   * can retry. A 409 means the battle just crossed its start time, so refetch
   * to flip the screen into read-only.
   */
  async function handleSave() {
    if (!activeSessionId) return;

    try {
      await saveMutation.mutateAsync({
        sessionId: activeSessionId,
        assignment: toWire(assignment),
      });
      clearDraft(activeSessionId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === CONFLICT_STATUS) {
        void formationsQuery.refetch();
      }
    }
  }

  return {
    weeks: weeksQuery.data ?? [],
    weekStart: weekStart ?? "",
    isCurrentWeek,
    sessions,
    activeSessionId,
    assignments,
    assignment,
    dirtySessionIds,
    dirty: activeSessionId ? dirtySessionIds.has(activeSessionId) : false,
    editable,
    pool,
    charactersById,
    absentIds,
    prefill,
    activeCharacter,
    slotCount: FORMATION.slots.length,
    isPending:
      weeksQuery.isPending || formationsQuery.isPending || charactersQuery.isPending,
    isError: weeksQuery.isError || formationsQuery.isError || charactersQuery.isError,
    errorMessage:
      formationsQuery.error?.message ?? "Không tải được dữ liệu đội hình.",
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError
        ? saveMutation.error.message
        : undefined,
    refetch: () => {
      void weeksQuery.refetch();
      void formationsQuery.refetch();
    },
    setWeek,
    setActiveSession,
    clearActiveDraft: () => {
      if (!activeSessionId) return;
      setDraft(activeSessionId, fromWire({}, FORMATION.slots));
    },
    resetActive: () => activeSessionId && clearDraft(activeSessionId),
    handleDragStart,
    handleDragEnd,
    cancelDrag: () => setActiveCharacter(null),
    handleSave,
  };
}
```

- [ ] **Step 2: Viết lại màn hình**

Thay toàn bộ nội dung `apps/web/features/team-builder/components/team-builder-screen.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationScreen } from "../hooks/use-formation-screen";
import { ClassShortage } from "./class-shortage";
import { FormationGrid } from "./formation-grid";
import { FormationToolbar } from "./formation-toolbar";
import { MemberCard } from "./member-card";
import { MemberPool } from "./member-pool";
import { PrefillBanner } from "./prefill-banner";
import { SessionTabs } from "./session-tabs";
import { WeekPicker } from "./week-picker";

/**
 * Guild war formation builder (admin only). One formation per battle of the
 * week; all the coordination lives in `useFormationScreen`, so this component
 * only builds the tree.
 * @returns The formation builder screen
 */
export function TeamBuilderScreen() {
  const screen = useFormationScreen();

  // A short distance threshold keeps a plain click on a card from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Drafts live in memory, so leaving the page would silently drop them.
  useEffect(() => {
    if (screen.dirtySessionIds.size === 0) return;

    /**
     * Ask the browser to confirm before discarding unsaved drafts.
     * @param event - The beforeunload event
     */
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [screen.dirtySessionIds.size]);

  if (screen.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState message={screen.errorMessage} onRetry={screen.refetch} />
        </CardContent>
      </Card>
    );
  }

  if (screen.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // A week with no battles is empty, not broken — say so instead of rendering
  // an empty tab bar over an empty grid.
  if (screen.sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Tuần này chưa có trận đánh nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={screen.handleDragStart}
      onDragEnd={screen.handleDragEnd}
      onDragCancel={screen.cancelDrag}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Xếp đội hình bang chiến</h1>
          <WeekPicker
            weeks={screen.weeks}
            value={screen.weekStart}
            onChange={screen.setWeek}
          />
        </div>

        <SessionTabs
          sessions={screen.sessions}
          activeSessionId={screen.activeSessionId}
          assignments={screen.assignments}
          dirtySessionIds={screen.dirtySessionIds}
          slotCount={screen.slotCount}
          onSelect={screen.setActiveSession}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ClassShortage pool={screen.pool} />
          <FormationToolbar
            dirty={screen.dirty}
            saving={screen.saving}
            errorMessage={screen.saveErrorMessage}
            editable={screen.editable}
            onSave={screen.handleSave}
            onReset={screen.resetActive}
          />
        </div>

        <PrefillBanner result={screen.prefill} onClear={screen.clearActiveDraft} />

        <FormationGrid
          assignment={screen.assignment}
          charactersById={screen.charactersById}
          readOnly={!screen.editable}
          absentIds={screen.absentIds}
        />
        <MemberPool characters={screen.pool} readOnly={!screen.editable} />
      </div>

      <DragOverlay>
        {screen.activeCharacter ? (
          <MemberCard
            character={screen.activeCharacter}
            className="cursor-grabbing"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 3: Xoá vỏ hook cũ**

`use-pool.ts` đã bị `use-session-pool.ts` thay thế. `lib/pool.ts` và test của nó **giữ nguyên** — `use-session-pool` vẫn gọi vào.

```bash
rm -f apps/web/features/team-builder/hooks/use-pool.ts
```

- [ ] **Step 4: Kiểm tra biên dịch, lint và toàn bộ test**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter web test
```

Kỳ vọng: `tsc` và `lint` không báo gì; toàn bộ test PASS (39 test cũ + test mới của Task 6, 8, 9, 10, 11, 12, 13).

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder
git commit -m "feat(ui): wire the per-session formation screen together"
```

---

### Task 18: Kiểm chứng thủ công đầu-cuối

**Files:** không sửa file nào — đây là cổng kiểm tra cuối.

- [ ] **Step 1: Chạy cả hai app**

```bash
pnpm --filter api start:dev
```

Ở terminal khác:

```bash
pnpm --filter web dev
```

- [ ] **Step 2: Đăng nhập và mở màn hình**

Đăng nhập bằng tài khoản quản trị viên, mở `http://localhost:3000/xep-team`.

- [ ] **Step 3: Xác nhận đủ 10 điều**

1. Có bộ chọn tuần, mặc định là tuần đang mở.
2. Có đúng 3 tab trận: Thứ 3, Thứ 5, Thứ 7 · Guild War. Tab Guild War được chọn sẵn và có biểu tượng riêng.
3. Mỗi tab hiện số ô đã xếp dạng `0/60`.
4. Pool chỉ chứa người **đã điểm danh "Có"** cho trận đang chọn. Đổi tab → pool đổi theo.
5. Kéo một người vào ô → tab hiện chấm "chưa lưu", nút **Lưu đội hình** bật lên, dòng "Chưa lưu" xuất hiện.
6. Bấm **Lưu đội hình** → chấm biến mất, nút xám lại. Tải lại trang (F5) → đội hình vẫn còn.
7. Đổi sang tab khác rồi quay lại → nháp chưa lưu **không mất** (đây là lý do không cần hộp thoại cảnh báo khi đổi tab).
8. Mở một tab chưa xếp mà tuần đã có đội hình ở trận trước → hiện băng "Đã điền sẵn từ … · bỏ N người không đánh trận này". Bấm **Xoá hết** → lưới trống và **không** bị điền lại.
9. Vào trang điểm danh, đổi một người đang đứng trong đội hình sang "Không", quay lại màn xếp team → người đó **vẫn ở trong ô**, viền đỏ, tooltip ghi "Đã báo nghỉ trận này".
10. Chọn một tuần cũ → không kéo thả được, không có pool, không có nút Lưu, thay bằng dòng "Trận này đã đánh xong, chỉ xem lại được."

- [ ] **Step 4: Xác nhận backend chặn thật**

Với trận Thứ 3 đã đánh xong, gửi thẳng request lưu (thay `<token>` bằng access token trong cookie và `<sessionId>` bằng id trận đó):

```bash
curl -i -X PUT http://localhost:3001/api/team-builder/formations/<sessionId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"assignment":{}}'
```

Kỳ vọng: `409` kèm message `"Trận này đã đánh xong, không sửa được nữa."` — chứng minh việc khoá nằm ở server chứ không chỉ ở UI.

- [ ] **Step 5: Commit (nếu có sửa gì lúc kiểm chứng)**

```bash
git add -A
git commit -m "fix(ui): address issues found during manual verification"
```

---

## Ghi chú bàn giao

**Điều gì chưa làm, và tại sao:**

- **Xếp trước cho tuần chưa mở.** Tuần sau chưa có `BattleSession` trong database; muốn làm phải sinh trước hoặc khoá đội hình theo `(weekStart + label)` thay vì `sessionId`.
- **Thống kê theo nhân vật** ("tháng qua ai hay đứng team mấy"). Đây là lý do duy nhất để chuyển sang bảng chuẩn hoá mỗi ô một hàng; chuyển được bằng một script đọc JSON ghi ra bảng, không mất dữ liệu.
- **Sửa đội hình tuần cũ.** Xem được, không sửa được.
- **Test component.** vitest ở `apps/web` chạy `environment: "node"`, chưa có jsdom hay testing-library. Mọi quyết định đã được đẩy xuống hàm thuần trong `lib/` nên phần chưa test được chỉ còn là JSX.

**Chỗ dễ vỡ khi vận hành:**

- Dọn dữ liệu quá 28 ngày chạy trong `GET /team-builder/weeks`. Nếu sau này màn hình không còn gọi endpoint đó, việc dọn sẽ im lặng ngừng chạy.
- Việc host database ở đâu nằm ngoài kế hoạch này. Khi chuyển sang Supabase, đọc [spec host database](../specs/2026-08-02-supabase-hosting-design.md) trước — quy trình migrate đổi khác.
