# Đua mèo - Implementation Plan

> **Cho agent thực thi:** chạy inline theo `superpowers:executing-plans` (CLAUDE.md project: "Execute
> plans inline"). Model: Sonnet 5.5, medium effort. Bước dùng checkbox `- [ ]`.

**Mục tiêu:** Màn quay thưởng "Đua mèo" chỉ cho ADMIN: đợt quay nhiều hạng mục, chế độ Thường / Vé,
server rút người thắng, client diễn cuộc đua loại dần trên canvas, bot post tổng kết vào kênh
`GENERAL_NOTI`.

**Kiến trúc:** Module API mới `cat-race` (controller → service → Prisma, logic thuần trong
`cat-race.rules.ts`), 5 bảng mới + 2 enum. Post Discord nằm trong `discord-bot` (cùng mẫu
`formation-announce`), đọc dữ liệu qua `cat-race.public.ts`. Web: feature `features/cat-race`, kịch
bản đua là hàm thuần, renderer canvas 2D thuần với sprite cache.

**Stack:** NestJS + Prisma + Jest, Next.js 16 + TanStack Query + Zustand + Vitest, Zod
(`@guild/shared`), `canvas-confetti`.

**Spec:** [`docs/specs/2026-10-12-cat-race-design.md`](../specs/2026-10-12-cat-race-design.md)
(gọi tắt "spec"; mã D1-D22 là bảng quyết định của spec).

## Ràng buộc chung

- Chỉ ADMIN: `@UseGuards(JwtAuthGuard, AdminGuard)` trên mọi endpoint; route `/dua-meo` trong
  `ADMIN_PATH_PREFIXES` **và** page re-check `getSession()` + `canManageGuild` (`.claude/rules/web/routing.md`).
- Vé: số nguyên 1-3, mặc định 1; ở `STANDARD` luôn 1 (D6).
- Tốc độ: `FAST` 6s / `NORMAL` 12s / `SLOW` 20s (D18).
- Nước rút 8 mèo; mốc loại 40% và 70% thời lượng (D19).
- Danh sách đua ≥ 2 người mới quay được (D11).
- Lỗi API tiếng Việt, hằng số cấp module (mẫu `formation-announcer.service.ts:38`).
- Response build bằng `verifyResponse(schema, {...} satisfies T)`; không trả model Prisma
  (`.claude/rules/api/module.md`).
- Thời điểm lấy từ `Clock` (`apps/api/src/common/clock/clock.ts`), test dùng `FixedClock`.
- Mỗi bảng mới có `ENABLE ROW LEVEL SECURITY` trong migration (`src/__tests__/migration-rls.spec.ts`).
- Enum Prisma có bản sao trong `packages/shared/enums` (`src/__tests__/prisma-enum-sync.spec.ts`).
- Web: chuyển cảnh chỉ `transform`/`opacity` với `--duration-*`; không thêm `motion`
  (`.claude/rules/web/interaction.md`). Toast qua `components/shared/toast.ts`, dialog ghi qua
  `MutationForm` / `MutationDialog`, empty state qua `EmptyState`.
- Ngưỡng có tên, không số trần; không mutate; lồng tối đa 4 cấp; `switch` trên tag kết thúc bằng
  `assertNever`.
- Sau mỗi lần sửa `packages/shared`: `pnpm --filter @guild/shared build`.
- Nhánh `feat/cat-race`; trước mỗi commit chạy `git rev-parse --abbrev-ref HEAD` và soạn message bằng
  `caveman:caveman-commit`.

## Review Focus

Năm tình huống spec ngụ ý mà dễ lọt nhất; mỗi dòng có test ở task ghi kèm.

1. **Hai lần bấm Đua gần như cùng lúc** cho hạng mục còn 1 suất: chỉ một vòng được tạo, lần sau 409
   (Task 5, test khoá dòng + kiểm tra lại số lượng sau khoá).
2. **Gỡ rồi thêm lại một người đã thắng** hạng mục X: không được tự vào lại danh sách đua X, nhưng vào
   lại các hạng mục khác chưa đủ (Task 3, `reconcileParticipants`).
3. **Huỷ vòng của người đã bị gỡ khỏi đợt / đã bị xoá khỏi bang**: suất trả về, không thêm entrant
   mồ côi, không lỗi FK (Task 5).
4. **Đổi đợt `TICKET` → `STANDARD` khi chưa quay**: mọi `tickets` về 1; và gửi `tickets: 2` ở
   `STANDARD` bị 400 (Task 4).
5. **Đàn ≤ 8 mèo và đàn 240 mèo**: kịch bản bỏ pha loại khi ≤ 8; với 240 mèo vé thắng luôn về nhất và
   mọi mèo bị loại ở mốc 2 đều đứng sau mọi finalist (Task 8).

---

## Cấu trúc file

**API** (`apps/api/`)
- `prisma/schema.prisma` - 5 model + 2 enum.
- `prisma/migrations/<timestamp>_add_cat_race/migration.sql`
- `src/modules/cat-race/` - `cat-race.module.ts`, `cat-race.controller.ts`, `cat-race.service.ts`,
  `cat-race.rules.ts` (thuần), `cat-race.codec.ts` (Prisma row → shape shared), `cat-race.public.ts`,
  `dto/cat-race.dto.ts`, `__tests__/`.
- `src/modules/discord-bot/` - `cat-race-announcement.ts` (thuần, dựng embed),
  `cat-race-announcer.service.ts`, `cat-race-announce.controller.ts`; sửa `bot-channel.service.ts`,
  `commands/cau-hinh-kenh.command.ts`, `discord-bot.module.ts`.
- `src/app.module.ts` - đăng ký `CatRaceModule`.

**Shared** (`packages/shared/`)
- `enums/cat-race-mode.enum.ts`, `enums/prize-tier.enum.ts`, `enums/index.ts`.
- `schemas/cat-race.schema.ts`, `schemas/index.ts`.

**Web** (`apps/web/`)
- `app/dua-meo/page.tsx`, `app/dua-meo/[id]/page.tsx`.
- `config/routes.ts`, `features/auth/core/access.ts`, `features/auth/components/user-menu.tsx`,
  `components/shared/site-header.tsx`, `lib/cache-graph.ts`.
- `features/cat-race/`:
  - `api/cat-race-api.ts`, `api/cat-race-keys.ts`
  - `hooks/use-cat-races.ts`, `hooks/use-cat-race-mutations.ts`
  - `store/race-store.ts`
  - `lib/race-script.ts`, `lib/race-layout.ts`, `lib/race-sprites.ts`, `lib/prize-lock.ts`
  - `components/` (mục Task 10)
  - `index.ts`

**Docs** - `docs/architecture.md` §3.3, §5; `docs/production.md`; `README.md`.

---

### Task 1: Hợp đồng chung (enum + schema Zod)

**Files:**
- Create: `packages/shared/enums/cat-race-mode.enum.ts`, `packages/shared/enums/prize-tier.enum.ts`,
  `packages/shared/schemas/cat-race.schema.ts`
- Modify: `packages/shared/enums/index.ts`, `packages/shared/schemas/index.ts`
- Test: `apps/api/src/modules/cat-race/__tests__/cat-race.schema.spec.ts` (shared không có test
  runner; theo mẫu `tactics/__tests__/tactic.schema.spec.ts`)

**Interfaces - Produces:** mọi type dưới đây, dùng ở Task 3-10.

- [ ] **Bước 1: Enum** (mẫu `guild-class.enum.ts`)

```ts
// cat-race-mode.enum.ts
export enum CatRaceMode { STANDARD = "STANDARD", TICKET = "TICKET" }
export const CAT_RACE_MODE_LABEL: Record<CatRaceMode, string> = {
  [CatRaceMode.STANDARD]: "Thường",
  [CatRaceMode.TICKET]: "Vé",
};

// prize-tier.enum.ts
export enum PrizeTier { HIGH = "HIGH", MEDIUM = "MEDIUM", LOW = "LOW" }
export const PRIZE_TIER_LABEL: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "Cao", [PrizeTier.MEDIUM]: "Vừa", [PrizeTier.LOW]: "Thấp",
};
```

- [ ] **Bước 2: Schema** - `cat-race.schema.ts`

```ts
export const CAT_RACE_TICKETS_MIN = 1;
export const CAT_RACE_TICKETS_MAX = 3;
export const CAT_RACE_NAME_MAX = 80;
export const CAT_RACE_PRIZE_NAME_MAX = 60;
export const CAT_RACE_PRIZE_QUANTITY_MAX = 999;
export const CAT_RACE_VOID_REASON_MAX = 255;
export const CAT_RACE_MIN_ENTRANTS = 2;

const ticketsSchema = z.number().int().min(CAT_RACE_TICKETS_MIN).max(CAT_RACE_TICKETS_MAX);

export const catRaceParticipantInputSchema = z.object({ characterId: z.string().min(1), tickets: ticketsSchema });
export const catRacePrizeInputSchema = z.object({
  name: z.string().trim().min(1).max(CAT_RACE_PRIZE_NAME_MAX),
  quantity: z.number().int().min(1).max(CAT_RACE_PRIZE_QUANTITY_MAX),
  tier: z.nativeEnum(PrizeTier),
});
export const createCatRaceEventSchema = z.object({
  name: z.string().trim().max(CAT_RACE_NAME_MAX).optional(),
  mode: z.nativeEnum(CatRaceMode),
  participants: z.array(catRaceParticipantInputSchema).min(1),
  prizes: z.array(catRacePrizeInputSchema).min(1),
}).superRefine(rejectExtraTicketsInStandard);
export const updateCatRaceEventSchema = z.object({
  name: z.string().trim().min(1).max(CAT_RACE_NAME_MAX).optional(),
  mode: z.nativeEnum(CatRaceMode).optional(),
});
export const setCatRaceParticipantsSchema = z.object({ participants: z.array(catRaceParticipantInputSchema) });
export const updateCatRacePrizeSchema = catRacePrizeInputSchema.partial().extend({ sortOrder: z.number().int().min(0).optional() });
export const setCatRaceEntrantsSchema = z.object({ characterIds: z.array(z.string().min(1)) });
export const drawCatRaceRoundSchema = z.object({ prizeId: z.string().min(1) });
export const voidCatRaceRoundSchema = z.object({ reason: z.string().trim().min(1).max(CAT_RACE_VOID_REASON_MAX) });

export type CatRaceEventStatus = "OPEN" | "ENDED";
export const catRaceEventSummarySchema = z.object({
  id: z.string(), name: z.string(), mode: z.nativeEnum(CatRaceMode),
  status: z.enum(["OPEN", "ENDED"]), createdAt: z.string(), discordPostedAt: z.string().nullable(),
  awardedCount: z.number().int(),
});
export const catRaceParticipantSchema = z.object({
  characterId: z.string(), name: z.string(), guildClass: z.nativeEnum(GuildClass),
  discordId: z.string().nullable(), discordAvatar: z.string().nullable(), tickets: ticketsSchema,
});
export const catRacePrizeSchema = z.object({
  id: z.string(), name: z.string(), quantity: z.number().int(), tier: z.nativeEnum(PrizeTier),
  sortOrder: z.number().int(), awardedCount: z.number().int(), entrantIds: z.array(z.string()),
});
export const catRaceRoundSchema = z.object({
  id: z.string(), prizeId: z.string(), winnerCharacterId: z.string().nullable(),
  winnerName: z.string(), winnerGuildClass: z.nativeEnum(GuildClass), winnerTickets: z.number().int(),
  entrantCount: z.number().int(), totalTickets: z.number().int(), drawnAt: z.string(),
  voidedAt: z.string().nullable(), voidReason: z.string().nullable(),
});
export const catRaceEventDetailSchema = catRaceEventSummarySchema.extend({
  participants: z.array(catRaceParticipantSchema),
  prizes: z.array(catRacePrizeSchema),
  rounds: z.array(catRaceRoundSchema),
});
export const catRaceDrawResultSchema = z.object({
  round: catRaceRoundSchema,
  /** Who ran, with their tickets, as it stood before the winner left the list. */
  entrants: z.array(z.object({ characterId: z.string(), tickets: ticketsSchema })),
  /** 1-based number of the winning ticket among the winner's own tickets. */
  winningTicket: z.number().int().min(1),
});
export const catRacePrizeTemplateSchema = catRacePrizeInputSchema;
```

`rejectExtraTicketsInStandard` là hàm private cạnh schema: `mode === STANDARD` và có
`tickets !== 1` thì `ctx.addIssue` với message "Chế độ Thường chỉ có 1 vé mỗi người.". Xuất type
`z.infer` cho mỗi schema theo cách `tactic.schema.ts` đang làm. Định dạng ngày (`z.string()` hay
helper ISO riêng) theo đúng mẫu schema hiện có - kiểm `tactic.schema.ts` trước khi viết.

- [ ] **Bước 3: Test schema đỏ → xanh.** Các case: `tickets` 0 và 4 bị từ chối; `STANDARD` + tickets 2
  bị từ chối; `TICKET` + tickets 3 nhận; tên giải rỗng sau trim bị từ chối; `quantity` 0 bị từ chối;
  lý do huỷ 256 ký tự bị từ chối.
  Run: `pnpm --filter @guild/shared build && pnpm --filter api test -- cat-race.schema`
- [ ] **Bước 4: Commit** - `feat(core): add cat race shared contract`

---

### Task 2: Schema Prisma + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_cat_race/migration.sql` (do `prisma:migrate` sinh)

- [ ] **Bước 1: Model** (comment lý do theo phong cách file; tên enum có dòng "Values must match ...
  packages/shared/enums")

```prisma
enum CatRaceMode { STANDARD TICKET }
enum PrizeTier { HIGH MEDIUM LOW }

model CatRaceEvent {
  id              String    @id @default(cuid())
  name            String    @db.VarChar(80)
  mode            CatRaceMode
  createdById     String
  createdAt       DateTime
  endedAt         DateTime?
  discordPostedAt DateTime?
  participants    CatRaceParticipant[]
  prizes          CatRacePrize[]
}

model CatRaceParticipant {
  eventId     String
  characterId String
  tickets     Int          @default(1)
  event       CatRaceEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  character   Character    @relation(fields: [characterId], references: [id], onDelete: Cascade)
  @@id([eventId, characterId])
}

model CatRacePrize {
  id        String       @id @default(cuid())
  eventId   String
  name      String       @db.VarChar(60)
  quantity  Int
  tier      PrizeTier
  sortOrder Int
  event     CatRaceEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  entrants  CatRaceEntrant[]
  rounds    CatRaceRound[]
  @@index([eventId])
}

model CatRaceEntrant {
  prizeId     String
  characterId String
  prize       CatRacePrize @relation(fields: [prizeId], references: [id], onDelete: Cascade)
  character   Character    @relation(fields: [characterId], references: [id], onDelete: Cascade)
  @@id([prizeId, characterId])
}

model CatRaceRound {
  id                String     @id @default(cuid())
  prizeId           String
  winnerCharacterId String?
  winnerName        String
  winnerGuildClass  GuildClass
  winnerTickets     Int
  entrantCount      Int
  totalTickets      Int
  drawnById         String
  drawnAt           DateTime
  voidedAt          DateTime?
  voidReason        String?    @db.VarChar(255)
  prize             CatRacePrize @relation(fields: [prizeId], references: [id], onDelete: Cascade)
  winner            Character?   @relation(fields: [winnerCharacterId], references: [id], onDelete: SetNull)
  @@index([prizeId])
}
```

Thêm 3 relation field ngược trên `Character` (`catRaceParticipants`, `catRaceEntrants`,
`catRaceWins`). `createdAt` / `drawnAt` không có `@default(now())` - service ghi từ `Clock`.

- [ ] **Bước 2:** `pnpm --filter api prisma:migrate --name add_cat_race` (DB local, `apps/api/.env`).
- [ ] **Bước 3:** Thêm cuối `migration.sql` (mẫu `20260925004158_enable_rls_on_tactics`):

```sql
-- The app connects as `postgres` (rolbypassrls = true), so runtime is unaffected. No policy is
-- created: RLS without a policy denies everything.
ALTER TABLE "CatRaceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRacePrize" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceEntrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceRound" ENABLE ROW LEVEL SECURITY;
```

Reset DB local để migration sửa tay được áp lại (`prisma migrate reset`, chỉ DB local).
- [ ] **Bước 4:** `pnpm --filter api test -- migration-rls prisma-enum-sync` → PASS.
- [ ] **Bước 5: Commit** - `feat(db): add cat race tables`

---

### Task 3: Luật thuần (`cat-race.rules.ts`)

**Files:**
- Create: `apps/api/src/modules/cat-race/cat-race.rules.ts`
- Test: `apps/api/src/modules/cat-race/__tests__/cat-race.rules.spec.ts`

**Interfaces - Produces:**

```ts
export interface TicketHolder { readonly characterId: string; readonly tickets: number }
export interface DrawnTicket { readonly characterId: string; readonly ticketNo: number }
export type RandomInt = (maxExclusive: number) => number;

/** Flatten holders into tickets, holder order kept: [a#1, a#2, b#1, ...]. */
export function expandTickets(holders: readonly TicketHolder[]): DrawnTicket[];
/** Throws Error when fewer than CAT_RACE_MIN_ENTRANTS holders - the caller checks first. */
export function drawTicket(holders: readonly TicketHolder[], randomInt: RandomInt): DrawnTicket;

export interface PrizeStanding { readonly prizeId: string; readonly quantity: number; readonly activeWinnerIds: ReadonlySet<string> }
export interface ParticipantChange {
  readonly removed: string[];
  readonly added: string[];
  readonly entrantsToAdd: { prizeId: string; characterId: string }[];
}
/** Spec §4: add → every prize not yet full where they hold no active win; remove → leave every prize. */
export function reconcileParticipants(currentIds: readonly string[], nextIds: readonly string[], prizes: readonly PrizeStanding[]): ParticipantChange;

/** "Đợt quay dd/MM/yyyy", Vietnam calendar day of `now` (vnParts from @guild/shared/lib). */
export function defaultEventName(now: Date): string;
```

- [ ] **Bước 1: Test đỏ.**
  - `drawTicket` với `randomInt` giả trả 0, 2, 4 trên `[a:2, b:1, c:2]` → `a#1`, `b#1`, `c#2`.
  - `drawTicket` với một holder ném lỗi.
  - Chạy 30 000 lần với `crypto.randomInt` trên `[a:3, b:1]`, tỉ lệ a ∈ [0.72, 0.78].
  - `reconcileParticipants`: thêm `x` khi prize P1 còn suất, P2 đã đủ → chỉ `{P1, x}`; thêm lại `y`
    đang có vòng thắng còn hiệu lực ở P1 → không vào P1 nhưng vào P3 chưa đủ (Review Focus 2); gỡ `z`
    → `removed: ['z']`.
  - `defaultEventName(new Date('2026-10-11T18:30:00Z'))` → `"Đợt quay 12/10/2026"` (đã sang ngày VN).
- [ ] **Bước 2:** Viết hàm, chạy `pnpm --filter api test -- cat-race.rules` → PASS.

```ts
export function drawTicket(holders: readonly TicketHolder[], randomInt: RandomInt): DrawnTicket {
  if (holders.length < CAT_RACE_MIN_ENTRANTS) {
    throw new Error(`drawTicket needs at least ${CAT_RACE_MIN_ENTRANTS} holders, got ${holders.length}`);
  }
  const tickets = expandTickets(holders);
  return tickets[randomInt(tickets.length)];
}
```

- [ ] **Bước 3: Commit** - `feat(api): add cat race draw and roster rules`

---

### Task 4: Module `cat-race` - đợt, người tham gia, hạng mục, danh sách đua

**Files:**
- Create: `cat-race.module.ts`, `cat-race.controller.ts`, `cat-race.service.ts`, `cat-race.codec.ts`,
  `dto/cat-race.dto.ts` (trong `apps/api/src/modules/cat-race/`)
- Modify: `apps/api/src/app.module.ts` (import + `CatRaceModule` cạnh `TacticsModule`, `:13`, `:31`)
- Test: `__tests__/cat-race.service.spec.ts`, `__tests__/cat-race.controller.spec.ts`

**Interfaces:**
- Consumes: Task 1 schema/DTO, Task 3 `reconcileParticipants`, `defaultEventName`.
- Produces: `CatRaceService` với `list()`, `prefill()`, `create(input, actorId)`, `detail(id)`,
  `update(id, input)`, `remove(id)`, `setParticipants(id, input)`, `addPrize(id, input)`,
  `updatePrize(id, prizeId, input)`, `removePrize(id, prizeId)`, `setEntrants(id, prizeId, input)`.
  Mọi hàm ghi trả `CatRaceEventDetail` (trừ `remove`), để web chỉ cần một shape.
- Produces (cho Task 5): `private lockOpenEvent(tx, id): Promise<EventRow>` - khoá dòng đợt rồi ném
  409 nếu đã kết thúc.

- [ ] **Bước 1: Test service đỏ** với Prisma double (mẫu `tactics.service.spec.ts`: object `jest.fn()`
  + `$transaction: jest.fn((fn) => fn(tx))`), `new FixedClock(NOW)`. Case:
  - `create` không tên → tên `defaultEventName(NOW)`; mọi prize nhận entrants = toàn bộ participant.
  - `update` đổi `mode` khi đã có vòng → 409 "Không đổi chế độ khi đợt đã quay."; đổi `TICKET` →
    `STANDARD` khi chưa quay → `updateMany tickets = 1` (Review Focus 4).
  - `setParticipants` ở `STANDARD` với `tickets: 2` → 400.
  - `updatePrize` giảm `quantity` dưới số vòng còn hiệu lực → 409 "Số lượng không được thấp hơn số giải
    đã trao (N)."
  - `removePrize` / `remove` khi đã có vòng (kể cả vòng huỷ) → 409.
  - `setEntrants` với id không phải participant → 400.
  - Mọi hàm ghi trên đợt đã kết thúc → 409 "Đợt quay đã kết thúc."
- [ ] **Bước 2: Cài đặt.**
  - Mọi hàm ghi chạy trong `prisma.$transaction(async (tx) => ...)` và **bắt đầu bằng khoá dòng
    đợt**, theo mẫu `team-builder.service.ts:340`:

```ts
await tx.$queryRaw`SELECT 1 FROM "CatRaceEvent" WHERE "id" = ${eventId} FOR NO KEY UPDATE`;
```

    Khoá theo đợt (không theo hạng mục) vì đổi người tham gia chạm mọi hạng mục của đợt; hai admin là
    tải tối đa nên tuần tự hoá cả đợt không tốn gì.
  - `cat-race.codec.ts`: `toEventDetail(rows): CatRaceEventDetail`, `toEventSummary(row)`; tính
    `awardedCount` từ vòng `voidedAt === null`; mọi response qua
    `verifyResponse(catRaceEventDetailSchema, {...} satisfies CatRaceEventDetail)`.
  - `prefill()`: hạng mục của đợt có `createdAt` mới nhất, sắp theo `sortOrder`; không có thì `[]`.
  - Controller: `@ApiTags('cat-races') @ApiBearerAuth() @Controller('cat-races') @UseGuards(JwtAuthGuard, AdminGuard)`,
    các route theo bảng spec §6 (trừ `rounds`, `end`, `announce` - Task 5, 6). Actor id lấy như
    controller hiện có lấy người gọi (xem `formation-announce.controller.ts`).
- [ ] **Bước 3:** Test controller: một case mỗi route gọi đúng hàm service (mẫu
  `tactics.controller.spec.ts`). `pnpm --filter api test -- cat-race` → PASS; `pnpm --filter api test
  -- module-boundary module-graph` → PASS (cập nhật đồ thị nếu spec yêu cầu khai báo module mới).
- [ ] **Bước 4: Commit** - `feat(api): add cat race event management`

---

### Task 5: Quay, huỷ vòng, kết thúc đợt

**Files:**
- Modify: `cat-race.service.ts`, `cat-race.controller.ts`
- Test: `__tests__/cat-race.draw.spec.ts`

**Interfaces - Produces:** `draw(id, { prizeId }, actorId): Promise<CatRaceDrawResult>`,
`voidRound(id, roundId, { reason }): Promise<CatRaceEventDetail>`, `end(id): Promise<CatRaceEventDetail>`.
`CatRaceService` nhận thêm `RandomInt` qua provider token `CAT_RACE_RANDOM_INT` (prod:
`crypto.randomInt`), để test cố định được kết quả.

- [ ] **Bước 1: Test đỏ.**
  - Quay: rút đúng người theo `randomInt` giả; ghi `winnerName`, `winnerGuildClass`, `winnerTickets`,
    `entrantCount`, `totalTickets`, `drawnAt = NOW`; xoá entrant người thắng; `entrants` trong
    response là danh sách **trước** khi xoá; `winningTicket` = `ticketNo`.
  - 409 khi hạng mục đủ (`Hạng mục đã đủ giải.`), khi < 2 người (`Cần ít nhất 2 người để đua.`), khi
    prize không thuộc đợt (404).
  - **Review Focus 1:** `$queryRaw` khoá được gọi **trước** `count` vòng còn hiệu lực (kiểm thứ tự
    `mock.invocationCallOrder`); count đọc trong `tx`, không phải `prisma`.
  - Huỷ: ghi `voidedAt`, `voidReason`; người thắng còn là participant → `create` entrant; người đã bị
    gỡ hoặc `winnerCharacterId = null` → không tạo entrant (Review Focus 3); vòng đã huỷ → 409; đợt
    đã kết thúc → 409.
  - Kết thúc: ghi `endedAt = NOW`; gọi lại trên đợt đã kết thúc trả nguyên trạng, không ghi lại.
- [ ] **Bước 2: Cài đặt** - thứ tự trong `draw`, toàn bộ trong một `tx`:
  1. `lockOpenEvent(tx, id)`
  2. đọc prize (thuộc đợt), đếm vòng còn hiệu lực, so `quantity`
  3. đọc entrants + `tickets` từ participant
  4. `drawTicket(holders, this.randomInt)`
  5. đọc `Character` người thắng (tên, phái) → tạo `CatRaceRound` → xoá entrant
  6. trả `verifyResponse(catRaceDrawResultSchema, ...)`
- [ ] **Bước 3:** Route `POST :id/rounds`, `POST :id/rounds/:roundId/void`, `POST :id/end`.
  `pnpm --filter api test -- cat-race` → PASS.
- [ ] **Bước 4: Commit** - `feat(api): draw and void cat race rounds`

---

### Task 6: Discord - kênh `GENERAL_NOTI` và bài tổng kết

**Files:**
- Modify: `discord-bot/bot-channel.service.ts:9`, `discord-bot/commands/cau-hinh-kenh.command.ts:21-45`,
  `discord-bot/discord-bot.module.ts` (import `CatRaceModule`, thêm controller + service)
- Create: `cat-race/cat-race.public.ts`, `discord-bot/cat-race-announcement.ts`,
  `discord-bot/cat-race-announcer.service.ts`, `discord-bot/cat-race-announce.controller.ts`
- Modify: `cat-race/cat-race.module.ts` (`exports: [CatRaceService]`), `cat-race.service.ts`
- Test: `discord-bot/__tests__/cat-race-announcement.spec.ts`,
  `discord-bot/__tests__/cat-race-announcer.service.spec.ts`, spec hiện có của `cau-hinh-kenh`

**Interfaces:**
- `CatRaceService.announcement(id): Promise<CatRaceAnnouncement>` - 409 nếu đợt chưa kết thúc
  (`Kết thúc đợt trước khi đăng tổng kết.`) hoặc đã post (`Đợt này đã đăng lên Discord.`).
- `CatRaceService.markAnnounced(id): Promise<void>` - ghi `discordPostedAt = clock.now()`.
- Type nội bộ module, xuất qua `cat-race.public.ts`:

```ts
export interface CatRaceAnnouncement {
  readonly eventName: string;
  readonly prizes: readonly { readonly name: string; readonly winners: readonly { readonly discordId: string | null; readonly name: string }[] }[];
}
```

- `buildCatRaceAnnouncement(a: CatRaceAnnouncement): MessagePayload` - một embed, tiêu đề tên đợt,
  mỗi hạng mục có người thắng một field (`<@id>` hoặc tên), bỏ hạng mục trống,
  `allowed_mentions.users` = đúng các `discordId` được tag. Giới hạn ký tự lấy từ `message-limits.ts`.

- [ ] **Bước 1: Test đỏ.**
  - Builder: tag vs tên; bỏ hạng mục trống; không có chữ "vé"; `allowed_mentions` chỉ chứa id được tag.
  - Announcer: `channels.get('GENERAL_NOTI')` trả `null` → 409 `Chưa đặt kênh thông báo chung. Chạy /cau-hinh-kenh muc-dich:Thông báo chung trong kênh muốn nhận rồi thử lại.`,
    không gọi `postMessage`, không gọi `markAnnounced`; Discord 403 → `ForbiddenException` (câu chữ
    mẫu `MISSING_PERMISSIONS`, đổi "bang chiến" thành "thông báo chung", bỏ "Attach Files"); lỗi khác
    → ném lại, **không** `markAnnounced`; thành công → `markAnnounced` sau `postMessage`.
  - `cau-hinh-kenh`: chọn `GENERAL_NOTI` lưu đúng purpose và gửi câu xác nhận
    `✅ Channel này đã được đặt làm nơi bot gửi thông báo chung.`
- [ ] **Bước 2: Cài đặt.** `BotChannelPurpose` thêm `'GENERAL_NOTI'`; `PURPOSE_CHOICES` thêm
  `{ name: 'Thông báo chung', value: 'GENERAL_NOTI' }`; `PURPOSE_COPY` thêm `confirmation` (như trên) và
  `saved: 'Đã lưu. Từ giờ bot sẽ gửi thông báo chung trong channel này.'`. Controller
  `@Controller('cat-races') @UseGuards(JwtAuthGuard, AdminGuard)` + `@Post(':id/announce')`, mẫu
  `formation-announce.controller.ts:23-41`, trả `CatRaceEventDetail` mới (gọi `catRace.detail(id)`).
- [ ] **Bước 3:** `pnpm --filter api test -- discord-bot cat-race module-boundary module-graph` → PASS;
  `pnpm --filter api lint` (rule boundaries: `discord-bot` chỉ import `cat-race.public.ts` /
  `cat-race.module.ts`).
- [ ] **Bước 4: Commit** - `feat(api): announce cat race results on discord`

---

### Task 7: Web - route, menu, lớp dữ liệu

**Files:**
- Modify: `apps/web/package.json` (`canvas-confetti`, `@types/canvas-confetti` dev),
  `config/routes.ts`, `features/auth/core/access.ts:13`, `features/auth/components/user-menu.tsx`,
  `components/shared/site-header.tsx:104-108`, `lib/cache-graph.ts:14-37`
- Create: `app/dua-meo/page.tsx`, `app/dua-meo/[id]/page.tsx`, `features/cat-race/api/cat-race-api.ts`,
  `features/cat-race/api/cat-race-keys.ts`, `features/cat-race/hooks/use-cat-races.ts`,
  `features/cat-race/hooks/use-cat-race-mutations.ts`, `features/cat-race/index.ts`
- Test: `features/auth/components/__tests__/user-menu.test.tsx`,
  `features/cat-race/api/__tests__/cat-race-api.test.ts`, test hiện có của `access.ts`

**Interfaces - Produces:**
- `ROUTES.catRace = "/dua-meo"`, `catRaceEventPath(id: string): string` (mẫu `tacticEditorPath`).
- `catRaceKeys = { all: ["cat-race"], list(), prefill(), detail(id) }`.
- Hook: `useCatRaces()`, `useCatRacePrefill()`, `useCatRaceEvent(id)`, và một hook mutation cho mỗi
  endpoint ghi (`useCreateCatRace`, `useUpdateCatRace`, `useDeleteCatRace`, `useSetCatRaceParticipants`,
  `useAddCatRacePrize`, `useUpdateCatRacePrize`, `useDeleteCatRacePrize`, `useSetCatRaceEntrants`,
  `useDrawCatRaceRound`, `useVoidCatRaceRound`, `useEndCatRace`, `useAnnounceCatRace`), tất cả
  `useInvalidate("cat-race")` trừ `useDrawCatRaceRound`: kết quả quay được trả về cho màn đua trước,
  cache chỉ invalidate khi overlay đóng (để danh sách người thắng không lộ kết quả trước khi mèo về).

- [ ] **Bước 1: Test đỏ.**
  - `user-menu`: `isAdmin` true → có item "Đua mèo" trước nhóm "Đăng xuất"; false → không có. Cập nhật
    hai lời gọi render ở `:73`, `:95`.
  - `access`: `/dua-meo` và `/dua-meo/abc` là admin path.
  - `cat-race-api`: `drawCatRaceRound` gọi `POST /cat-races/:id/rounds` với `authHeader` (mẫu
    `tactics-api.test.ts`).
- [ ] **Bước 2: Cài đặt.**
  - `UserMenu` thêm prop `isAdmin: boolean`; `site-header.tsx` truyền `isAdmin` đã có ở `:65`. Item:
    `DropdownMenuGroup` chứa `DropdownMenuItem` icon `Cat` (lucide-react), `onClick={() => router.push(ROUTES.catRace)}`,
    đặt sau separator của `ThemeRadioItems`, trước nhóm "Đăng xuất", kèm `DropdownMenuSeparator`.
  - Page (mẫu `app/thiet-lap/page.tsx:21-29`): `getSession` + `canManageGuild`, redirect
    `${ROUTES.attendance}?error=${WEB_AUTH_ERROR.adminOnly}`; render `CatRaceListScreen` /
    `CatRaceEventScreen` (Task 10 tạo; tạm export component rỗng để build xanh).
  - `cat-race-api.ts` là `"use server"`, mỗi hàm `apiFetch<T>(path, { headers: await authHeader(), ... })`.
  - `cache-graph.ts`: thêm topic `"cat-race"`; thêm `"cat-race"` vào dependents của topic thành viên
    (sửa / xoá thành viên làm đổi danh sách tham gia).
- [ ] **Bước 3:** `pnpm --filter web test -- user-menu access cat-race` → PASS; `pnpm --filter web typecheck`.
- [ ] **Bước 4: Commit** - `feat(ui): add cat race route, menu entry and data hooks`

---

### Task 8: Kịch bản đua (thuần)

**Files:**
- Create: `apps/web/features/cat-race/lib/race-script.ts`
- Test: `apps/web/features/cat-race/lib/__tests__/race-script.test.ts`

**Interfaces - Produces:**

```ts
export type RaceSpeed = "FAST" | "NORMAL" | "SLOW";
export const RACE_DURATION_SECONDS: Record<RaceSpeed, number> = { FAST: 6, NORMAL: 12, SLOW: 20 };
export const FINALIST_COUNT = 8;
export const FIRST_CHECKPOINT = 0.4;
export const SECOND_CHECKPOINT = 0.7;

export interface RaceCat { readonly key: string; readonly characterId: string; readonly ticketNo: number }
export interface CatMotion { readonly finishAt: number; readonly wobble: number; readonly cycles: number; readonly phase: number }
export interface RaceScript {
  readonly durationSeconds: number;
  readonly cats: readonly RaceCat[];
  readonly motions: ReadonlyMap<string, CatMotion>;
  readonly winnerKey: string;
  readonly finalistKeys: ReadonlySet<string>;
  /** False when the field is FINALIST_COUNT or smaller: straight to the sprint. */
  readonly eliminates: boolean;
}

export function catKey(characterId: string, ticketNo: number): string; // `${characterId}#${ticketNo}`
export function buildRaceScript(input: {
  entrants: readonly { characterId: string; tickets: number }[];
  winner: { characterId: string; ticketNo: number };
  speed: RaceSpeed;
  random: () => number;
}): RaceScript;
/** Progress 0..1 at `seconds` since the start. Monotonic, exactly 1 from finishAt on. */
export function progressAt(motion: CatMotion, seconds: number): number;
/** Keys cut at the first checkpoint: non-finalists in the back half of the field at that moment. */
export function cutAtFirstCheckpoint(script: RaceScript): ReadonlySet<string>;
```

Công thức (đã chứng minh đơn điệu khi `wobble ≤ 0.04`, `cycles ≤ 2`, vì
`1 - wobble·(2π·cycles + 4) > 0`):

```ts
const s = Math.min(1, seconds / motion.finishAt);
return s + motion.wobble * Math.sin(2 * Math.PI * motion.cycles * s + motion.phase) * 4 * s * (1 - s);
```

`finishAt`: người thắng = `D`; finalist thứ hai `D·[1.004, 1.012]`; finalist còn lại `D·[1.015, 1.07]`;
mèo không vào nước rút `D·[1.25, 1.9]`. Finalist = mèo thắng + 7 mèo chọn ngẫu nhiên. Với các khoảng
này, ở mốc 70% mọi finalist ≥ 0.614 còn mọi mèo bị loại ≤ 0.60.

- [ ] **Bước 1: Test đỏ** (`random` là PRNG có seed trong test).
  - Mèo `winnerKey` đạt 1 đúng tại `D`; mọi mèo khác < 1 tại `D`.
  - `progressAt` không giảm (lấy mẫu 0.01s) cho mọi mèo, cả ba tốc độ.
  - Đàn 240 (80 người × 3 vé): `finalistKeys.size === 8` và chứa `winnerKey`; tại `SECOND_CHECKPOINT·D`
    mọi mèo ngoài finalist có progress < min progress finalist (Review Focus 5).
  - `cutAtFirstCheckpoint`: không chứa finalist; mọi phần tử có hạng > nửa đàn tại `FIRST_CHECKPOINT·D`.
  - Đàn 8 (và 2): `eliminates === false`, `finalistKeys` = cả đàn.
  - Chế độ Thường (mọi `tickets = 1`): số mèo = số người.
- [ ] **Bước 2:** Cài đặt; `pnpm --filter web test -- race-script` → PASS.
- [ ] **Bước 3: Commit** - `feat(ui): add cat race script`

---

### Task 9: Renderer canvas

**Files:**
- Create: `features/cat-race/lib/race-layout.ts`, `features/cat-race/lib/race-sprites.ts`,
  `features/cat-race/components/race-canvas.tsx`
- Test: `features/cat-race/lib/__tests__/race-layout.test.ts`

**Interfaces:**
- `race-layout.ts` (thuần): `type RaceOrientation = "horizontal" | "vertical"`;
  `packSlots(keys, area): Map<string, Slot>` (lưới dày, tối đa 24 hàng), `laneSlots(keys, area)`;
  `projectProgress(progress, view, area, orientation): Point`; `catSize(count, area)`.
- `race-sprites.ts`: `catSprite(color: string, sizePx: number, frame: 0 | 1): HTMLCanvasElement`,
  cache theo `color|size|frame`, scale theo `devicePixelRatio`. Màu theo phái lấy từ hằng màu hiện có
  của `GuildClass` trên web nếu có; không có thì thêm `GUILD_CLASS_COLOR` vào `features/cat-race/lib`.
  Sprite CC0: thử tìm trước khi code (OpenGameArt, lọc CC0); có thì đặt ở `public/cat-race/` kèm
  `LICENSE.txt` ghi nguồn; không có thì giữ sprite pixel vẽ bằng mảng như prototype (D20).
- `race-canvas.tsx` (`"use client"`): props `{ script: RaceScript; participants: CatRaceParticipant[]; onFinish(): void; skipSignal: number }`;
  một vòng `requestAnimationFrame`, đọc màu token qua `getComputedStyle` khi mount và khi đổi theme;
  hướng `vertical` khi `matchMedia("(max-width: 640px)")`. Pha: đếm ngược 1.5s → đàn → mốc 1 (mèo
  bị loại mờ 0.6s) → mốc 2 (lerp 0.8s từ `packSlots` sang `laneSlots`, camera zoom vào 40% cuối
  đường) → về đích + 0.8s → `onFinish`. Nhãn: top 3 trước mốc 2, cả 8 sau mốc 2; ≤ 20 mèo luôn có
  nhãn. Bảng top 5 cập nhật tối đa mỗi 150ms qua callback `onLeaders(keys)`.

- [ ] **Bước 1: Test đỏ** `race-layout`: 240 khoá → ≤ 24 hàng, mọi slot nằm trong `area`; `laneSlots`
  8 khoá chia đều; `projectProgress` hướng dọc: progress 0 ở trên, 1 ở dưới; không slot nào ra ngoài
  ở 360px rộng.
- [ ] **Bước 2:** Cài đặt layout + sprites + canvas.
- [ ] **Bước 3: Đo hiệu năng (D21).** Trang dev tạm hoặc story trong `race-canvas` sau cờ
  `?fps=1`: chạy 240 mèo tốc độ Nhanh, ghi FPS trung bình bằng `performance.now()` qua 3 lần. Đạt ≥ 55
  thì giữ canvas 2D; không đạt thì báo người dùng trước khi đổi sang `konva`. Ghi kết quả đo vào
  phần "Kết quả" cuối plan.
- [ ] **Bước 4:** `pnpm --filter web test -- race-layout` → PASS. Commit -
  `feat(ui): render cat race on canvas`

---

### Task 10: Màn hình

**Files** (`apps/web/features/cat-race/`):
- `store/race-store.ts` - Zustand: `selectedPrizeId`, `speed` (đọc / ghi `localStorage` key
  `cat-race-speed`, bọc `try/catch`, mặc định `NORMAL`), `stage: RaceStage`, `pendingResult`.
  `type RaceStage = "idle" | "drawing" | "racing" | "result"`.
- `lib/prize-lock.ts` - `prizeLockReason(prize, eventStatus): PrizeLockReason | null`,
  `type PrizeLockReason = "ended" | "full" | "too-few"`; nhãn tiếng Việt ở component.
- `components/`:
  - `cat-race-list-screen.tsx` - danh sách đợt + `EmptyState` + nút tạo.
  - `create-cat-race-dialog.tsx` - `MutationForm`: tên, chế độ, hạng mục (điền từ prefill), người
    tham gia (tick, tìm, ô vé khi `TICKET`).
  - `cat-race-event-screen.tsx` - ghép các phần dưới; `QueryBoundary` / `combineQueries`.
  - `prize-chips.tsx`, `prize-edit-popover.tsx`
  - `participants-dialog.tsx`, `entrants-dialog.tsx`
  - `winners-panel.tsx`, `void-round-dialog.tsx` (`MutationDialog`)
  - `race-stage.tsx` - nút Đua, Bỏ qua, chọn tốc độ, `RaceCanvas`, bảng top 5.
  - `race-result-overlay.tsx` - thẻ người thắng + `canvas-confetti` (bỏ confetti khi reduced motion).
  - `announce-button.tsx`, `end-event-button.tsx`
- Test: `lib/__tests__/prize-lock.test.ts`, `store/__tests__/race-store.test.ts`,
  `components/__tests__/race-stage.test.tsx` (jsdom)

**Luồng một vòng** (spec §8.4):

```
idle --Đua--> drawing (mutation) --ok--> racing --onFinish / Bỏ qua--> result --Đua tiếp--> idle
                         \--lỗi--> idle + toast (ApiError.message nguyên văn; lỗi ghi qua recoverSession)
reduced motion: drawing --ok--> result
```

`useInvalidate("cat-race")` chạy khi rời `result`, không phải khi mutation xong.

- [ ] **Bước 1: Test đỏ.**
  - `prizeLockReason`: đợt kết thúc → `ended`; `awardedCount === quantity` → `full`; `entrantIds.length < 2` → `too-few`.
  - `race-store`: `localStorage` ném lỗi → `speed` vẫn `NORMAL`, không crash.
  - `race-stage`: bấm Đua khi khoá → không gọi mutation; reduced motion (mock `matchMedia`) → nhảy
    thẳng `result`; lỗi mutation → về `idle`.
- [ ] **Bước 2:** Cài đặt các component theo layout spec §8.2-8.5; panel phải khi đua chỉ
  `opacity` + `translate` với `duration-[var(--duration-slow)]`.
- [ ] **Bước 3:** `pnpm --filter web test -- cat-race` → PASS; `pnpm --filter web lint && pnpm --filter web typecheck`.
- [ ] **Bước 4: Chạy thử thật** (skill `run`): `pnpm dev`, đăng nhập admin, tạo đợt Vé 80 người
  (seed), quay xen kẽ 3 hạng mục, tăng số lượng giữa chừng, huỷ một vòng, kết thúc, đăng Discord vào
  kênh test (cấu hình `/cau-hinh-kenh` trên server Discord dev). Kiểm tra cả màn 400px.
- [ ] **Bước 5: Commit** - `feat(ui): add cat race screens`

---

### Task 11: Tài liệu + cổng cuối

**Files:** `docs/architecture.md` (§3.3 module `cat-race`; §5 sơ đồ + bảng 5 model, ngoại lệ
`discordAvatar`, dòng `BotChannel` thành ba purpose), `docs/production.md` và `README.md` (mục
"Thông báo chung" của `/cau-hinh-kenh`, bước `pnpm --filter api discord:register` sau deploy), spec
(trạng thái → "đã triển khai", link plan).

- [ ] **Bước 1:** Sửa docs.
- [ ] **Bước 2:** Cổng đầy đủ:
  `pnpm --filter @guild/shared build && pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test && pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web build`
  (log dài → chạy qua subagent, chỉ lấy tóm tắt).
- [ ] **Bước 3: Commit** - `docs(config): document cat race`
- [ ] **Bước 4:** Review bằng skill `review-loop` (vòng cuối `pr-review` trong agent `reviewer` riêng),
  rồi mở PR theo `.github/pull_request_template.md`. Sau merge: chạy `discord:register` và
  `/cau-hinh-kenh muc-dich:Thông báo chung` trên server thật.

---

## Kết quả

- **FPS (Task 9, D21):** chưa đo trên trình duyệt thật (phiên chạy ban đêm, không có GPU/trình duyệt điều khiển được). Canvas 2D thuần được giữ; mở `/dua-meo/<id>?fps=1` rồi chạy đợt 240 mèo tốc độ Nhanh, FPS trung bình in ra console và vẽ ở góc canvas. Dưới 55 thì cân nhắc `konva`.
- **Sprite:** không tìm sprite CC0; mèo pixel vẽ bằng mảng ký tự trong `race-sprites.ts` (D20 phương án dự phòng).
- **Lệch so với plan:**
  - Migration sinh bằng `prisma migrate diff` + RLS viết tay, vì DB local lệch checksum migration cũ (`migrate dev` đòi reset DB); đã áp bằng `migrate deploy`, không reset.
  - Sửa hạng mục là dialog (`prize-form-dialog.tsx`), không phải popover.
  - Embed Discord dùng `description` chia đoạn theo hạng mục (kiểu `EmbedPayload` không có `fields`); tag nằm thêm trong `content` để có ping.
  - `PageHeader` dùng banner `teamBuilder` có sẵn, chưa có ảnh riêng cho trang Đua mèo.
  - `projectProgress` nhận thêm tham số `across`; thêm `race-frame.ts` (kịch bản → khung hình, thuần, có test) để canvas chỉ còn vẽ.
  - `useReducedMotion` chuyển sang `apps/web/hooks/`, `discordAvatarUrl` export từ index của `features/auth` (cần cho feature mới, tránh import chéo nội bộ).
  - Checkbox native trong `roster-checklist.tsx` (chưa có `components/ui/checkbox`).
  - `cat-race.service.ts` dài hơn ngưỡng ~300 dòng của `module.md`; chưa tách (ghi nhận ở review).
- **Chưa chạy thật (Task 10 bước 4):** không đăng nhập Discord OAuth được trong phiên tự động nên chưa thao tác qua UI thật, chưa đăng Discord thật; kiểm bằng test + `next build`.
