# A + B — Bỏ lượt đọc thừa và lượt ghi thừa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một danh tính Discord đọc hết trong một lượt truy vấn (A), và một lần đọc lịch tuần không phát lệnh ghi khi không có gì lệch (B). Không endpoint nào, không schema nào, không luật nghiệp vụ nào đổi.

**Architecture:** Hai thay đổi độc lập về mặt logic nhưng chạm chung `apps/api/src/modules/discord-bot/attendance-board.ts`, nên làm nối tiếp: A trước để chữ ký `findByDiscordId` và `ResolvedActor` đứng yên khi B chạm cùng file. A lan từ `characters.service.ts` → `actor-resolver.ts` → bốn call site. B nằm gọn trong `battle-sessions.service.ts`, đổi thứ tự "ghi rồi đọc" thành "đọc, so, ghi khi lệch".

**Tech Stack:** pnpm workspace; NestJS 11 + Prisma 7 + PostgreSQL (`apps/api`, Jest). Không chạm `apps/web`, không chạm `packages/shared`.

**Spec:**
- [`docs/custom-spec/2026-09-06-a-identity-read-design.md`](../custom-spec/2026-09-06-a-identity-read-design.md)
- [`docs/custom-spec/2026-09-06-b-week-read-write-design.md`](../custom-spec/2026-09-06-b-week-read-write-design.md)
- Tổng quan: [`2026-09-06-architecture-review-3-overview.md`](../custom-spec/2026-09-06-architecture-review-3-overview.md)

## Global Constraints

- **Không đổi behaviour business.** Mọi refusal, mọi thứ tự guard, mọi câu tiếng Việt giữ nguyên từng chữ. Một test đang xanh mà phải sửa kỳ vọng là dấu hiệu đã đi quá phạm vi — dừng lại và đọc lại spec.
- **Không thêm dependency, không thêm module, không thêm file mới** ngoài các file đã liệt kê.
- Comment, JSDoc, tên biến: **tiếng Anh**. Chuỗi hiển thị: **tiếng Việt**. Tiếng Việt chỉ trong `docs/superpowers`, `docs/custom-plan`, `docs/custom-spec`.
- Mọi function mới hoặc đổi chữ ký phải có JSDoc nêu mục đích, từng param, giá trị trả về.
- Không mutate: luôn tạo đối tượng/mảng mới.
- Guard clause và early return; happy path ở một mức thụt lề.
- Nhánh git: `perf/trim-week-and-identity-reads` (đã tạo, spec đã commit ở `b587f4c`). Mỗi task một commit riêng.
- Lệnh kiểm mỗi task: `pnpm --filter api test`, `pnpm --filter api typecheck`, `pnpm --filter api lint`.
- **Không chạy `prisma:migrate`.** Không có thay đổi schema nào trong plan này.

---

### Task 1: `findByDiscordId` trả nguyên hàng

**Files:**
- Modify: `apps/api/src/modules/characters/characters.service.ts`
- Modify: `apps/api/src/modules/characters/__tests__/characters.service.spec.ts`

**Interfaces:**
- Đổi: `findByDiscordId(discordId: string): Promise<GuildMemberRow | null>` (trước: `Promise<{ id: string; role: GuildRole } | null>`).
- `findById` **không đổi** — vẫn có người gọi tra theo id.

- [ ] **Step 1: Đổi `findByDiscordId`**

```ts
/**
 * Look a member up by Discord ID — the entry point of the login flow.
 * Returns the whole row: `findUnique` on a unique column has already read it, and every caller that
 * only wanted the role was following up with a second read by id.
 * @param discordId - Discord ID read from the OAuth profile
 * @returns The member row, or null when nobody has this ID assigned
 */
async findByDiscordId(discordId: string): Promise<GuildMemberRow | null> {
  return this.prisma.character.findUnique({ where: { discordId } });
}
```

Bỏ `select`, bỏ phép cast `row.role as GuildRole` và phép dựng lại object.

- [ ] **Step 2: Sửa chỗ đọc `role` trong `apps/api/src/modules/attendance/attendance.service.ts`**

`ownCharacterId` (dòng ~227) chỉ đọc `member?.id ?? null` — **không đổi gì**, nó vẫn biên dịch và vẫn đúng.

Ghi nhận một đánh đổi có thật: `mark()` nay đọc thêm vài cột cho cùng một hàng. Cùng số round trip, nhiều byte hơn một chút. Chấp nhận — đó là cái giá của việc bỏ hẳn hàm nông thứ hai.

- [ ] **Step 3: Cập nhật `characters.service.spec.ts`**

Test nào đang khẳng định `findByDiscordId` trả đúng `{ id, role }` thì đổi sang khẳng định nó trả cả hàng. Thêm một test: gọi `findByDiscordId` **không** kèm `select`, tức là hàng trả về có `discordUsername`.

- [ ] **Step 4: Kiểm và commit**

```bash
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api lint
git commit -am "refactor(api): return the whole character row from findByDiscordId"
```

Typecheck ở bước này **sẽ báo lỗi** ở `auth.service.ts` và `diem-danh-ho.command.ts` nếu chúng đọc field không còn tồn tại — chúng chỉ đọc `.id` và `.role`, cả hai vẫn có, nên dự kiến là **xanh**. Nếu đỏ, đọc lỗi trước khi sửa: nó đang chỉ ra một call site spec chưa liệt kê.

---

### Task 2: `ResolvedActor` mang hàng thay vì mang id

**Files:**
- Modify: `apps/api/src/modules/discord-bot/actor-resolver.ts`
- Modify: `apps/api/src/modules/discord-bot/attendance-board.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/diem-danh-ho.command.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/actor-resolver.spec.ts`
- Modify: `apps/api/src/modules/auth/__tests__/auth.service.spec.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/diem-danh.command.spec.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/diem-danh-ho.command.spec.ts`

**Interfaces:**
- Đổi: `ResolvedActor.characterId: string | null` → `ResolvedActor.character: GuildMemberRow | null`.

- [ ] **Step 1: Đổi `ResolvedActor` và `resolve`**

```ts
/** An identity the bot may act as, plus the character it belongs to. */
export interface ResolvedActor {
  actor: JwtPayload;
  /** The caller's own character row, null for a rescue admin who was never assigned one. */
  character: GuildMemberRow | null;
}
```

Trong `resolve`, `characterId: member?.id ?? null` thành `character: member`. Phần `resolveGuildRole({ isRescue, memberRole: member?.role ?? null })` **không đổi**.

- [ ] **Step 2: `buildOwnBoard` bỏ lượt `findById`**

`attendance-board.ts:335`. Trước:

```ts
if (!resolved.characterId) return { content: NO_OWN_CHARACTER };
const row = await deps.characters.findById(resolved.characterId);
if (!row) return { content: NOT_LINKED };
```

Sau:

```ts
const row = resolved.character;
if (!row) return { content: NO_OWN_CHARACTER };
```

**Đọc kỹ nhánh refusal:** hôm nay `characterId === null` trả `NO_OWN_CHARACTER`, còn `findById` trả `null` (hàng vừa bị xoá) trả `NOT_LINKED`. Sau thay đổi, hai nhánh gộp làm một và câu trả lời là `NO_OWN_CHARACTER`. Nhánh `NOT_LINKED` thứ hai đó **không còn tới được**: hàng vừa đọc xong trong cùng lượt `resolve`, không có khoảng trống để nó biến mất.

Đây là **thay đổi duy nhất có thể nhìn thấy được** trong Task 2, và nó chỉ xảy ra trong một cửa sổ đua mà hôm nay cũng không xử lý đúng. Nếu người review thấy không chấp nhận được thì dừng lại và hỏi, đừng tự chọn.

- [ ] **Step 3: `handleAttendanceButton` giữ nguyên `Promise.all`**

`attendance-board.ts:296`. **Không đụng vào.** `pressed.characterId` là nhân vật *được điểm danh hộ*, không phải người bấm — nó không nằm trong `ResolvedActor`. Spec A §"Behaviour giữ nguyên" nói rõ điểm này.

- [ ] **Step 4: `diem-danh-ho.command.ts` bỏ cặp `await` nối đuôi**

Dòng 59–60. Trước:

```ts
const target = await deps.characters.findByDiscordId(targetDiscordId);
const row = target ? await deps.characters.findById(target.id) : null;
```

Sau:

```ts
const row = await deps.characters.findByDiscordId(targetDiscordId);
```

Nhánh `if (!row)` và câu tiếng Việt của nó giữ nguyên từng chữ.

- [ ] **Step 5: `describeSession` bỏ lượt `findById`**

`auth.service.ts:245`. Trước:

```ts
const member = await this.characters.findByDiscordId(discordId);
...
const row = member ? await this.characters.findById(member.id) : null;
```

Sau: `row` chính là `member`. Object `verifyResponse(sessionUserSchema, { ... })` **không đổi một chữ** — nó vốn đã đọc `row?.discordUsername`, `row?.discordAvatar`, `toCharacter(row)`.

Giữ nguyên `resolveGuildRole({ isRescue, memberRole: member?.role ?? null })` và nhánh ném `UnauthorizedException(SESSION_EXPIRED)`.

- [ ] **Step 6: Cập nhật test**

Mọi stub `actors.resolve` trả `{ actor, characterId }` đổi sang `{ actor, character }` với một hàng đầy đủ. Mọi stub `characters.findById` chỉ tồn tại để phục vụ lượt đọc thứ hai thì bỏ đi — **trừ** stub trong `attendance-button.spec.ts`, chỗ đó vẫn cần (Step 3).

Thêm hai test khẳng định điều plan này hứa:

1. `auth.service.spec.ts`: `describeSession` chạy đúng **một** lượt đọc `Character` — đếm bằng số lần gọi stub.
2. `diem-danh-ho.command.spec.ts`: như trên cho đường lệnh.

- [ ] **Step 7: Kiểm và commit**

```bash
pnpm --filter api typecheck && pnpm --filter api test && pnpm --filter api lint
git commit -am "perf(api): read a discord identity in one round trip"
```

---

### Task 3: `listByWeek` đọc trước, chỉ ghi khi lệch

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`
- Modify: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Interfaces:**
- `listByWeek`, `ensureWeekMaterialized`, `readWeekSessions`: **chữ ký không đổi**. Chỉ đổi bên trong.
- Thêm private: `isGuildWarCurrent(row, week)`.

- [ ] **Step 1: Thêm phép so sánh "đã đúng chưa"**

```ts
/**
 * Whether the stored Guild War row already matches what the system owns.
 * `dateTime` is deliberately not compared: an admin may move the battle time, and `ensureGuildWar`
 * has never rewritten it.
 * @param row - The stored Guild War row of the week, undefined when there is none
 * @param week - Monday 00:00 marker of the week
 * @returns true when nothing needs writing
 */
private isGuildWarCurrent(
  row: { deadline: Date; matchCount: number } | undefined,
  week: WeekAnchor,
): boolean {
  if (!row) return false;

  // `.getTime()`: `guildWarDeadline` builds a new Date on every call, so comparing references
  // would always report a mismatch and the write would never actually disappear.
  return (
    row.deadline.getTime() === guildWarDeadline(week).getTime() &&
    row.matchCount === guildWarMatchCount(week)
  );
}
```

- [ ] **Step 2: Đảo thứ tự trong `listByWeek`**

```ts
async listByWeek(weekStart?: string): Promise<BattleSession[]> {
  const now = this.clock.now();
  const target = parseWeekStart(weekStart, now);

  const rows = await this.prisma.battleSession.findMany({
    ...weekSessionQuery(target),
    include: SESSION_INCLUDE,
  });

  const fresh = await this.reconcileGuildWar(target, now, rows);

  return fresh.map((row) => toBattleSession(row, now));
}
```

`reconcileGuildWar` trả `rows` nguyên vẹn ở nhánh phổ biến, và chỉ đọc lại khi vừa ghi:

```ts
/**
 * Bring the week's Guild War row in line with the rules the system owns, writing only when it is
 * actually missing or stale. Reads the week again after a write: `SESSION_INCLUDE` carries counts
 * that only the database can produce.
 * @param week - Monday 00:00 marker of the week
 * @param now - Current moment
 * @param rows - Sessions of the week as just read
 * @returns The rows to build the response from
 */
private async reconcileGuildWar<T extends { id: string; deadline: Date; matchCount: number }>(
  week: WeekAnchor,
  now: Date,
  rows: T[],
): Promise<T[]> {
  if (!this.isEditableWeek(week, now)) return rows;

  const stored = rows.find((row) => row.id === guildWarSessionId(week));
  if (this.isGuildWarCurrent(stored, week)) return rows;

  await this.ensureGuildWar(week);

  return this.prisma.battleSession.findMany({
    ...weekSessionQuery(week),
    include: SESSION_INCLUDE,
  }) as Promise<T[]>;
}
```

Nếu generic + cast khiến kiểu khó đọc, bỏ generic và khai báo kiểu hàng tường minh — **ưu tiên đọc được hơn ngắn**. Không được để `as any` lọt vào.

- [ ] **Step 3: `ensureWeekMaterialized` cũng đọc trước khi ghi**

```ts
async ensureWeekMaterialized(week: WeekAnchor): Promise<void> {
  const now = this.clock.now();
  if (!this.isEditableWeek(week, now)) return;

  const stored = await this.prisma.battleSession.findUnique({
    where: { id: guildWarSessionId(week) },
    select: { deadline: true, matchCount: true },
  });

  if (this.isGuildWarCurrent(stored ?? undefined, week)) return;

  await this.ensureGuildWar(week);
}
```

Giữ tính đối xứng với `listByWeek`: cùng một câu hỏi, cùng một hàm trả lời. `materializeWeek` private cũ không còn ai gọi thì xoá đi — nếu còn, đừng để lại một hàm chết.

- [ ] **Step 4: `ensureGuildWar` không đổi**

Vẫn `upsert` vô điều kiện. Nó nay chỉ được gọi khi đã biết là cần. Giữ nguyên comment giải thích vì sao `dateTime` không bị ghi đè.

- [ ] **Step 5: Test — đây là phần quan trọng nhất của task**

Trong `battle-sessions.service.spec.ts`, bốn test bám đúng bốn nhánh spec B nêu:

1. **Tuần chưa có Bang Chiến** → sinh ra, nằm đúng thứ tự `dateTime`, và `upsert` được gọi đúng 1 lần.
2. **`deadline` sai luật** → hàng trả về là bản **đã sửa**, không phải bản đọc lần đầu.
3. **`matchCount` sai luật** → như trên.
4. **Mọi thứ đã đúng** → `upsert` **không** được gọi lần nào. Đây là test khẳng định chính điều plan này hứa; thiếu nó thì task coi như chưa xong.

Thêm một test cho tuần ngoài phạm vi xếp lịch: không đọc thừa, không ghi.

- [ ] **Step 6: Kiểm và commit**

```bash
pnpm --filter api typecheck && pnpm --filter api test && pnpm --filter api lint
git commit -am "perf(api): stop writing on every read of a battle week"
```

---

### Task 4: Chốt lại

**Files:**
- Modify (chỉ khi cần): `docs/custom-spec/2026-09-06-a-identity-read-design.md`, `docs/custom-spec/2026-09-06-b-week-read-write-design.md`

- [ ] **Step 1: Chạy full**

```bash
pnpm --filter api test && pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api build
```

- [ ] **Step 2: Đối chiếu spec với code đã viết**

Ba câu hỏi, trả lời bằng code chứ không bằng trí nhớ:

1. `describeSession` còn đọc `Character` mấy lần?
2. `listByWeek` ở trạng thái ổn định phát ra mấy câu lệnh SQL?
3. Nhánh `NOT_LINKED` thứ hai của `buildOwnBoard` đã biến mất chưa, và spec A đã ghi điều đó chưa?

Chỗ nào code khác spec thì **sửa spec trước rồi mới đi tiếp** — CLAUDE.md yêu cầu spec, plan, code và test khớp nhau trước khi gọi là xong.

- [ ] **Step 3: Không đụng `docs/architecture.md`**

Đã cân nhắc và kết luận là không: §6 mô tả *kết quả* ("một hàng cũ tự sửa"), và kết quả đó không đổi. Nếu ai đó thấy cần sửa, đó là dấu hiệu behaviour đã bị đổi ở đâu đó — quay lại Task 3.

- [ ] **Step 4: Commit phần còn lại nếu có**

```bash
git commit -am "docs(spec): reconcile the A/B specs with what shipped"
```

## Những gì plan này cố ý KHÔNG làm

- **Không** chuyển bảng điểm danh sang deferred reply. Đó là một thay đổi kiến trúc của lớp Discord, cần spec riêng — `docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9.3 đã mô tả sẵn hình hài của nó.
- **Không** bỏ lượt `findById` trong `handleAttendanceButton` (Task 2 Step 3).
- **Không** thu hẹp phạm vi đọc bản ghi trong `ReminderService` — đó là mục [F](../custom-spec/2026-09-06-f-reminder-lookup-design.md), spec riêng, PR riêng.
- **Không** chạm `apps/web`. C, D, E là ba mục riêng.
