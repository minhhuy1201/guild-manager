# A6 — Codec lưới đội hình, đưa xoá ra khỏi đường `GET` · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

> **Đã thực thi xong. Kế hoạch này là bản ghi lịch sử, code mới là nguồn sự thật.** Ba chỗ bản hiện
> thực đi khác kế hoạch — `isSessionLocked` nằm ở `session-schedule.ts` chứ không phải
> `formation-grid.ts`; `purgeExpiredFormations(now)` **có** nhận `now`; `listIds(client)` bắt buộc
> client và trả `Set<string>` — cùng hai phần bổ sung sau kế hoạch (`P2003` → 409 ở `ea8d0ed`, và
> purge chuyển từ controller sang `saveFormation` nên `GET` chỉ đọc) được ghi ở
> [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md#rà-soát-lại-a1a6-2026-08-23).

**Mục tiêu:** luật "một hàng FormationSlot tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ" được nói **một
lần**, ở doc comment của một module codec có test round-trip; `locked` tính bằng **một** hàm chứ
không phải ba biểu thức rời (một trong đó hard-code `false`); `deleteMany` không còn nằm trong đường
`GET`; và phép lọc nhân vật đọc trong cùng transaction để thu hẹp khoảng hở khoá ngoại. *(Khoảng hở
đó không đóng được bằng cách dời phép đọc — READ COMMITTED không khoá hàng đã đọc. Nó được đóng sau
kế hoạch này bằng nhánh `P2003` → 409, xem spec §4.)*

**Kiến trúc:** `team-builder` mọc thêm một file thuần — `formation-grid.ts` — sở hữu hai chiều của
lưới đội hình và luật khoá theo giờ đánh. Đây **không** phải luật tuần/deadline nên nó không thuộc
`session-schedule.ts`. Service giữ nguyên vai trò: điều phối, transaction, và `matchIndex`.

**Tech stack:** NestJS 11, Prisma 7, Jest.

**Spec:** [`docs/custom-spec/2026-08-21-a6-formation-grid-codec-design.md`](../custom-spec/2026-08-21-a6-formation-grid-codec-design.md)
· đi **sau** [A1](./2026-08-21-a1-schedule-read-seam-design.md) và
[A4](./2026-08-21-a4-week-start-plan.md), cả hai đã xong.

**Phạm vi:** `apps/api` — `modules/team-builder`, một method mới ở `modules/characters`, một dòng
comment ở `prisma/schema.prisma`. `packages/shared` **không đổi**. `apps/web` **không đổi** — shape
trên dây giữ nguyên tuyệt đối.

## Hai điểm kế hoạch chốt khác spec

1. **§4 đọc qua service của `characters`, không phải `tx.character.findMany`.** Spec viết
   `tx.character.findMany` ngay trong `team-builder`. `apps/api/docs/backend.md:120` là luật binding:
   *"A module that reads someone else's table calls that module's service"* — và chính comment ở
   `team-builder.service.ts:241` đang nói đúng câu đó. Nên: `CharactersService` mọc thêm
   `listIds(client?)` nhận một transaction client; `team-builder` truyền `tx` vào. Khoảng hở FK hẹp
   lại mà quyền sở hữu bảng `Character` không đi đâu cả. (Đã hỏi và người dùng chốt. Bản hiện thực
   chốt chặt hơn: `listIds(client)` — client bắt buộc — và trả `Set<string>`.)
   *(2026-08-23: hết "khác spec" — A6 §4 nay tự phát biểu quyết định này, trỏ chữ ký `listIds` về A3 §2
   và nêu cạnh module mà nó tạo ra. Số dòng đúng của luật binding là `backend.md:122-123`.)*
2. **`purgeExpiredFormations()` không nhận `now`.** Spec viết `purgeExpiredFormations(now: Date)`,
   nhưng caller mới là controller, và controller không có `Clock` — cho nó gọi `new Date()` là phá
   luật "chỉ `Clock` biết bây giờ là mấy giờ" (`common/clock/clock.ts`). Hàm tự đọc `this.clock.now()`
   như mọi entry point khác của service; `FixedClock` vẫn kiểm nó độc lập được.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/a6-formation-grid-codec`. Không
  `git push`, không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Refactor giữ nguyên hành vi trên dây.** Không endpoint nào đổi shape response. Một thay đổi hành
  vi duy nhất, có chủ ý và phải ghi vào commit message của Task 4: purge chạy ở controller nên gọi
  thẳng `TeamBuilderService.getWeeks()` (ví dụ từ một service khác trong tương lai) sẽ không còn dọn
  dữ liệu.
- **`apps/api` không có path alias** — import nội bộ là đường dẫn tương đối.
- **Module khác chỉ import qua `<domain>.public.ts`.** `formation-grid.ts` là file **nội bộ** của
  `team-builder` — không thêm nó vào `.public.ts` nào (module này không có, và không cần có).
- **Không `forwardRef()`.**
- **Doc comment cho mọi hàm mới**; comment hiện có trong repo đang là tiếng Việt — khi **chuyển chỗ**
  một comment thì bê nguyên văn, không dịch lại.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter api typecheck` · `pnpm --filter api lint` · `pnpm --filter api test`
  - chạy một file: `pnpm --filter api test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/modules/team-builder/formation-grid.ts` | `SlotRow`, `encodeMatch`, `decodeMatch`, `isSessionLocked` |
| `apps/api/src/modules/team-builder/__tests__/formation-grid.spec.ts` | round-trip + `isSessionLocked` |
| `apps/api/src/modules/team-builder/__tests__/team-builder.controller.spec.ts` | purge chạy trước `getWeeks` |

**Sửa**

| File | Việc |
|---|---|
| `apps/api/.../team-builder/team-builder.service.ts` | dùng codec; `purgeExpiredFormations` public trả `number`; bỏ purge khỏi `getWeeks`; `listIds(tx)` trong transaction |
| `apps/api/.../team-builder/team-builder.controller.ts` | `getWeeks` gọi purge rồi đọc, doc comment nói rõ |
| `apps/api/.../characters/characters.service.ts` | thêm `listIds(client?)` |
| `apps/api/.../team-builder/__tests__/team-builder.service.spec.ts` | bỏ mock `deleteMany` ở `getFormations`; tách describe cho purge |
| `apps/api/.../characters/__tests__/characters.service.spec.ts` | test `listIds` |
| `apps/api/prisma/schema.prisma:111` | thêm dòng trỏ sang `formation-grid.ts` |

---

### Task 0: Nhánh làm việc

- [ ] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree sạch (trừ file kế hoạch này). Nếu bẩn: dừng, hỏi người
dùng.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/a6-formation-grid-codec
git rev-parse --abbrev-ref HEAD
```

Kết quả mong đợi: `refactor/a6-formation-grid-codec`.

- [ ] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter api test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: `formation-grid.ts` — một codec, hai chiều, một luật

Task này **chỉ tạo file mới và test**. Service chưa đụng tới, nên test round-trip chạy được ngay và
chạy trên hành vi cũ (thân `encodeMatch` bê nguyên từ `buildSlotRows`) — đúng thứ tự spec yêu cầu ở
mục Rủi ro.

**Files:**
- Create: `apps/api/src/modules/team-builder/formation-grid.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/formation-grid.spec.ts`

**Interfaces:**
- Produces:
  - `interface SlotRow { slotId: string; characterId: string | null; note: string | null }`
  - `encodeMatch(match: MatchFormation): SlotRow[]`
  - `decodeMatch(rows: SlotRow[]): MatchFormation`
  - `isSessionLocked(dateTime: Date, now: Date): boolean`

- [ ] **Bước 1: Viết test đỏ**

`apps/api/src/modules/team-builder/__tests__/formation-grid.spec.ts`:

```ts
import type { MatchFormation } from '@guild/shared/schemas';

import { decodeMatch, encodeMatch, isSessionLocked } from '../formation-grid';

describe('encodeMatch/decodeMatch round-trip', () => {
  /**
   * Đóng gói phép kiểm nghịch đảo cho một đội hình.
   * @param match - Đội hình một trận
   * @returns Đội hình sau khi đi qua encode rồi decode
   */
  function roundTrip(match: MatchFormation): MatchFormation {
    return decodeMatch(encodeMatch(match));
  }

  it('ô chỉ có ghi chú, chưa xếp ai, không bị đánh rơi', () => {
    const match: MatchFormation = {
      slots: {},
      notes: { 'team-1-pos-4': 'chừa cho X' },
    };

    expect(roundTrip(match)).toEqual(match);
  });

  it('ô có người, không ghi chú', () => {
    const match: MatchFormation = {
      slots: { 'team-1-pos-1': 'char-1' },
      notes: {},
    };

    expect(roundTrip(match)).toEqual(match);
  });

  it('ô vừa có người vừa có ghi chú chỉ tạo một hàng', () => {
    const match: MatchFormation = {
      slots: { 'team-1-pos-1': 'char-1' },
      notes: { 'team-1-pos-1': 'giữ buồng' },
    };

    expect(encodeMatch(match)).toEqual([
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' },
    ]);
    expect(roundTrip(match)).toEqual(match);
  });

  it('trận có đủ ba dạng ô cùng lúc', () => {
    const match: MatchFormation = {
      slots: { 'team-1-pos-1': 'char-1', 'team-2-pos-3': 'char-2' },
      notes: { 'team-1-pos-1': 'giữ buồng', 'team-1-pos-4': 'chừa cho X' },
    };

    expect(roundTrip(match)).toEqual(match);
  });

  it('trận rỗng cho đội hình rỗng, không phải undefined', () => {
    expect(decodeMatch([])).toEqual({ slots: {}, notes: {} });
    expect(encodeMatch({ slots: {}, notes: {} })).toEqual([]);
  });

  it('ô trống trơn không sinh hàng nào', () => {
    // Luật của schema.prisma:111 — không có người, không có ghi chú thì không có hàng.
    expect(encodeMatch({ slots: {}, notes: {} })).toHaveLength(0);
  });
});

describe('isSessionLocked', () => {
  const dateTime = new Date('2026-07-23T13:30:00.000Z');

  it('trước giờ đánh thì chưa khoá', () => {
    expect(isSessionLocked(dateTime, new Date(dateTime.getTime() - 1))).toBe(
      false,
    );
  });

  it('đúng giờ đánh vẫn chưa khoá', () => {
    expect(isSessionLocked(dateTime, new Date(dateTime.getTime()))).toBe(false);
  });

  it('sau giờ đánh thì khoá', () => {
    expect(isSessionLocked(dateTime, new Date(dateTime.getTime() + 1))).toBe(
      true,
    );
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- formation-grid
```

Kết quả mong đợi: FAIL — `../formation-grid` không tồn tại.

- [ ] **Bước 3: Cài đặt**

`apps/api/src/modules/team-builder/formation-grid.ts`:

```ts
import type { MatchFormation } from '@guild/shared/schemas';

/**
 * Codec giữa đội hình một trận và các hàng `FormationSlot` dưới database.
 *
 * Luật của lưới, nói ở đây một lần cho cả hai chiều: **một hàng tồn tại khi ô CÓ
 * NGƯỜI hoặc CÓ GHI CHÚ**. Ô vừa trống vừa không ghi gì thì không có hàng — nên
 * chiều ghi phải lấy hợp của hai tập khoá, và chiều đọc phải tách một hàng ra
 * đúng hai tập con có thể chồng nhau.
 *
 * `decodeMatch` là nghịch đảo của `encodeMatch`: `decodeMatch(encodeMatch(x))`
 * sâu bằng `x`. `__tests__/formation-grid.spec.ts` khoá tính chất đó lại.
 */

/** Một hàng FormationSlot: hình dưới database của một ô trong lưới. */
export interface SlotRow {
  slotId: string;
  characterId: string | null;
  note: string | null;
}

/**
 * Đổi đội hình một trận thành các hàng FormationSlot.
 * @param match - Đội hình và ghi chú của một trận, characterId đã lọc sạch
 * @returns Mảng hàng để đưa vào nested create của Prisma
 */
export function encodeMatch(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([
    ...Object.keys(match.slots),
    ...Object.keys(match.notes),
  ]);

  return [...slotIds].map((slotId) => ({
    slotId,
    characterId: match.slots[slotId] ?? null,
    note: match.notes[slotId] ?? null,
  }));
}

/**
 * Dựng lại đội hình một trận từ các hàng FormationSlot.
 * @param rows - Các hàng của đúng một trận
 * @returns Đội hình và ghi chú; trận không có hàng nào cho hai map rỗng
 */
export function decodeMatch(rows: SlotRow[]): MatchFormation {
  return {
    slots: Object.fromEntries(
      rows.filter(hasCharacter).map((row) => [row.slotId, row.characterId]),
    ),
    notes: Object.fromEntries(
      rows.filter(hasNote).map((row) => [row.slotId, row.note]),
    ),
  };
}

/**
 * Trận đã qua giờ đánh thì khoá, không sửa đội hình được nữa.
 * Đúng giờ đánh vẫn mở — mốc khoá là "đã qua", không phải "đã tới".
 * @param dateTime - Giờ đánh của trận
 * @param now - Thời điểm hiện tại
 * @returns true nếu trận đã khoá
 */
export function isSessionLocked(dateTime: Date, now: Date): boolean {
  return dateTime.getTime() < now.getTime();
}

/**
 * Hàng này có xếp người không.
 * Type guard thay cho `as string` ở chỗ dựng response.
 * @param row - Một hàng FormationSlot
 * @returns true nếu `characterId` không null, và thu hẹp kiểu theo
 */
function hasCharacter(row: SlotRow): row is SlotRow & { characterId: string } {
  return row.characterId !== null;
}

/**
 * Hàng này có ghi chú không.
 * @param row - Một hàng FormationSlot
 * @returns true nếu `note` không null, và thu hẹp kiểu theo
 */
function hasNote(row: SlotRow): row is SlotRow & { note: string } {
  return row.note !== null;
}
```

- [ ] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- formation-grid
pnpm --filter api typecheck
```

Kết quả mong đợi: PASS toàn bộ file, typecheck sạch.

- [ ] **Bước 5: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/team-builder
git commit -m "feat(api): add a formation grid codec with a round-trip test"
```

---

### Task 2: Service dùng codec

Xoá hai bản sao của luật lưới và ba biểu thức `locked`. Hành vi không đổi một chút nào — test hiện có
của `getFormations` và `saveFormation` phải xanh **mà không sửa gì**.

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:29-54, 132, 154-166, 197, 222, 234`

**Interfaces:**
- Consumes: `encodeMatch`, `decodeMatch`, `isSessionLocked`, `SlotRow` (Task 1)

- [ ] **Bước 1: Bỏ `SlotRow` và `buildSlotRows` (`:29-54`), import từ codec**

Xoá cả khối `interface SlotRow` và `function buildSlotRows` — doc comment của `buildSlotRows` không bê
sang, vì câu luật đã nằm ở doc comment của module codec (đừng để nó tồn tại hai chỗ nữa). Thêm vào
khối import:

```ts
import {
  decodeMatch,
  encodeMatch,
  isSessionLocked,
} from './formation-grid';
```

- [ ] **Bước 2: `loadMatchesBySession` gọi `decodeMatch` (`:154-166`)**

```ts
    for (const match of matches) {
      grouped.set(match.sessionId, [
        ...(grouped.get(match.sessionId) ?? []),
        decodeMatch(match.slots),
      ]);
    }
```

Hai `as string` biến mất cùng khối cũ. `match.slots` từ Prisma có thêm `matchId` so với `SlotRow` —
TypeScript nhận vì đó là structural subtype.

- [ ] **Bước 3: `locked` dùng một hàm (`:132`, `:197`, `:234`)**

`getFormations` (`:132`):

```ts
          locked: isSessionLocked(session.dateTime, now),
```

`saveFormation` (`:197`):

```ts
    if (isSessionLocked(new Date(session.dateTime), now)) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }
```

Response của `saveFormation` (`:234`) — bỏ hằng `false`:

```ts
      // Luôn false vì đã chặn ở trên; tính lại thay vì hard-code để hai dòng
      // không còn phụ thuộc ngầm vào nhau.
      locked: isSessionLocked(new Date(session.dateTime), now),
```

- [ ] **Bước 4: `saveFormation` ghi bằng `encodeMatch` (`:222`)**

```ts
            slots: { create: encodeMatch(match) },
```

- [ ] **Bước 5: Chạy test, typecheck, lint**

```bash
pnpm --filter api test -- team-builder.service
pnpm --filter api typecheck
pnpm --filter api lint
```

Kết quả mong đợi: PASS **không sửa một dòng test nào**. Nếu phải sửa test để nó xanh thì hành vi đã
đổi — dừng lại, xem lại Bước 2/3.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/team-builder
git commit -m "refactor(api): route both grid directions through the codec

The rule 'a row exists when the cell has a character OR a note' was written
three times in three shapes, and locked was computed at three sites, one of
them a hard-coded false that was only correct because another line 37 lines
away had just thrown. Both now have exactly one home."
```

---

### Task 3: `purgeExpiredFormations` thành entry point riêng

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:65-103`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts:24-32`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`
- Create: `apps/api/src/modules/team-builder/__tests__/team-builder.controller.spec.ts`

**Interfaces:**
- Produces: `TeamBuilderService.purgeExpiredFormations(): Promise<number>` — **public**, không nhận
  `now` (xem "Hai điểm kế hoạch chốt khác spec" §2)

- [ ] **Bước 1: Viết test đỏ**

Trong `team-builder.service.spec.ts`, **thay** hai test purge đang nằm trong
`describe('TeamBuilderService.getWeeks')` (`:295-317`) bằng một describe riêng đặt ngay sau nó:

```ts
describe('TeamBuilderService.purgeExpiredFormations', () => {
  let service: TeamBuilderService;
  let prisma: { formationMatch: { deleteMany: jest.Mock } };

  beforeEach(() => {
    prisma = {
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      {} as unknown as BattleSessionsService,
      {} as unknown as CharactersService,
      new FixedClock(WEDNESDAY),
    );
  });

  it('xoá đội hình của tuần cũ hơn 56 ngày', async () => {
    await service.purgeExpiredFormations();

    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-05-27T12:00') } } },
    });
  });

  it('trả về số bản ghi đã xoá', async () => {
    await expect(service.purgeExpiredFormations()).resolves.toBe(2);
  });
});
```

Đồng thời trong `describe('TeamBuilderService.getWeeks')`: bỏ `deleteMany` khỏi mock `prisma` (còn
lại `prisma = { formationMatch: {} }` — giữ đối tượng để chữ ký constructor không đổi) và thêm:

```ts
  it('không dọn dữ liệu — đó là việc của controller', async () => {
    await service.getWeeks();

    expect(prisma.formationMatch.deleteMany).toBeUndefined();
  });
```

> Nếu thấy khẳng định `toBeUndefined()` quá gián tiếp, thay bằng: giữ mock `deleteMany` và
> `expect(prisma.formationMatch.deleteMany).not.toHaveBeenCalled()`. Chọn cách sau nếu file spec đọc
> mượt hơn — miễn là có **một** test nói "getWeeks không xoá gì".

Và trong `describe('TeamBuilderService.getFormations')`, bỏ dòng mock `deleteMany` (`:84`) — mock chỉ
tồn tại để `getWeeks` chạy được, nay không cần nữa.

`team-builder.controller.spec.ts` (mới):

```ts
import { TeamBuilderController } from '../team-builder.controller';
import { TeamBuilderService } from '../team-builder.service';

describe('TeamBuilderController.getWeeks', () => {
  it('dọn dữ liệu quá hạn trước khi liệt kê tuần', async () => {
    const order: string[] = [];
    const teamBuilder = {
      purgeExpiredFormations: jest.fn(() => {
        order.push('purge');
        return Promise.resolve(0);
      }),
      getWeeks: jest.fn(() => {
        order.push('read');
        return Promise.resolve([]);
      }),
    };

    const controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
    );

    await controller.getWeeks();

    expect(order).toEqual(['purge', 'read']);
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- team-builder
```

Kết quả mong đợi: FAIL — `purgeExpiredFormations` đang `private` (lỗi biên dịch), và controller chưa
gọi nó.

- [ ] **Bước 3: Đổi service**

`getWeeks` (`:65-72`) — bỏ lời gọi purge và bỏ câu comment về cron:

```ts
  /**
   * Liệt kê các tuần còn dữ liệu đội hình, mới nhất trước.
   * @returns Mảng tuần, mới nhất trước, tuần đang mở mang cờ isActive
   */
  async getWeeks(): Promise<FormationWeek[]> {
    const activeWeek = this.battleSessions.getActiveWeek();
```

`purgeExpiredFormations` (`:91-103`) — public, tự đọc đồng hồ, trả số hàng:

```ts
  /**
   * Xoá các đội hình cũ hơn RETENTION_DAYS.
   * Chỉ xoá đội hình — BattleSession và điểm danh là dữ liệu của module khác.
   *
   * Repo chưa có scheduler, nên caller (hiện là `TeamBuilderController.getWeeks`)
   * quyết định khi nào chạy. Đó là một lời gọi nhìn thấy được, không phải một bước
   * chôn trong hàm đọc.
   * @returns Số bản ghi FormationMatch đã xoá
   */
  async purgeExpiredFormations(): Promise<number> {
    const cutoff = new Date(this.clock.now().getTime() - RETENTION_DAYS * DAY_MS);

    const { count } = await this.prisma.formationMatch.deleteMany({
      where: { session: { weekStart: { lt: cutoff } } },
    });

    return count;
  }
```

- [ ] **Bước 4: Đổi controller (`:24-32`)**

```ts
  /**
   * Các tuần còn dữ liệu đội hình.
   *
   * Dọn dữ liệu quá hạn trước khi đọc: repo không có scheduler, và màn hình xếp
   * team luôn gọi endpoint này nên nó là nơi rẻ nhất để chạy retention. Quên gọi
   * ở một endpoint khác chỉ làm dữ liệu cũ sống lâu hơn, không làm sai response.
   * @returns Mảng tuần, mới nhất trước
   */
  @Get('weeks')
  @ApiOperation({ summary: 'Các tuần còn dữ liệu đội hình' })
  async getWeeks(): Promise<FormationWeek[]> {
    await this.teamBuilder.purgeExpiredFormations();

    return this.teamBuilder.getWeeks();
  }
```

- [ ] **Bước 5: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- team-builder
pnpm --filter api typecheck
```

Kết quả mong đợi: PASS.

- [ ] **Bước 6: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/team-builder
git commit -m "refactor(api): lift formation retention out of the read path

GET /team-builder/weeks ran deleteMany inside the service, so the retention
rule could only be reached — and only be tested — through a read. It is now a
public entry point the controller calls explicitly, returning the row count."
```

---

### Task 4: Lọc nhân vật đọc trong cùng transaction

**Files:**
- Modify: `apps/api/src/modules/characters/characters.service.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:201-226, 239-248`
- Test: `apps/api/src/modules/characters/__tests__/characters.service.spec.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Produces: `CharactersService.listIds(client?: Prisma.TransactionClient): Promise<string[]>`
- Xoá: `TeamBuilderService.loadCharacterIds` (private, gọi một chỗ)

- [ ] **Bước 1: Viết test đỏ cho `listIds`**

Thêm vào `characters.service.spec.ts`:

```ts
  describe('listIds', () => {
    it('trả về id của mọi thành viên', async () => {
      prisma.character.findMany.mockResolvedValue([
        { id: 'huy' },
        { id: 'lan' },
      ]);

      await expect(service.listIds()).resolves.toEqual(['huy', 'lan']);
    });

    it('đọc qua client được truyền vào, không phải PrismaService', async () => {
      const tx = { character: { findMany: jest.fn().mockResolvedValue([]) } };

      await service.listIds(tx as unknown as Prisma.TransactionClient);

      expect(tx.character.findMany).toHaveBeenCalled();
      expect(prisma.character.findMany).not.toHaveBeenCalled();
    });
  });
```

Điều chỉnh cho khớp cách file spec đó đang dựng `prisma`/`service` (đọc file trước khi thêm); import
`Prisma` từ `../../../generated/prisma/client`.

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- characters.service
```

Kết quả mong đợi: FAIL — `listIds` không tồn tại.

- [ ] **Bước 3: Thêm `listIds`**

Trong `characters.service.ts`, thêm import kiểu:

```ts
import type { Prisma } from '../../generated/prisma/client';
```

và đặt method ngay dưới `exists` (hai method này cùng một vai: cho module khác hỏi về roster mà không
chạm bảng):

```ts
  /**
   * Id của mọi thành viên còn trong bang.
   *
   * Nhận client để caller đọc **trong cùng transaction** với câu ghi của mình:
   * đọc ngoài transaction rồi ghi trong đó để hở một khoảng, và một thành viên bị
   * xoá đúng khoảng đó làm vỡ khoá ngoại bên trong transaction.
   * @param client - Transaction client của caller; bỏ trống thì đọc ngoài transaction
   * @returns Mảng id thành viên
   */
  async listIds(
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<string[]> {
    const rows = await client.character.findMany({ select: { id: true } });

    return rows.map((row) => row.id);
  }
```

- [ ] **Bước 4: `saveFormation` đọc trong transaction**

Trong `team-builder.service.ts`, bỏ hẳn method `loadCharacterIds` (`:239-248`) và chuyển khối lọc vào
trong `$transaction`:

```ts
    const cleaned = await this.prisma.$transaction(async (tx) => {
      // Lọc TRƯỚC khi ghi: một nhân vật vừa bị xoá khỏi bang mà còn trong nháp sẽ
      // làm cả câu insert vỡ vì khoá ngoại. Ghi chú của ô đó thì giữ nguyên —
      // ghi chú mô tả vị trí, không mô tả người.
      //
      // Đọc bằng client của transaction: đọc ngoài rồi ghi trong để hở một khoảng
      // đúng bằng thứ phép lọc này sinh ra để chặn.
      const knownIds = new Set(await this.characters.listIds(tx));
      const matchesToWrite: MatchFormation[] = matches.map((match) => ({
        slots: Object.fromEntries(
          Object.entries(match.slots).filter(([, characterId]) =>
            knownIds.has(characterId),
          ),
        ),
        notes: match.notes,
      }));

      await tx.formationMatch.deleteMany({ where: { sessionId } });

      for (const [index, match] of matchesToWrite.entries()) {
        await tx.formationMatch.create({
          data: {
            sessionId,
            matchIndex: index + 1,
            slots: { create: encodeMatch(match) },
          },
        });
      }

      return matchesToWrite;
    });
```

Phần `return { … matches: cleaned }` ở cuối hàm giữ nguyên.

- [ ] **Bước 5: Cập nhật mock trong `team-builder.service.spec.ts`**

Trong `describe('TeamBuilderService.saveFormation')`, `tx` phải có thêm `character.findMany`, và
`characters.list` không còn được gọi:

```ts
    tx = {
      character: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }]),
      },
      formationMatch: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest
          .fn<Promise<object>, [CreateMatchArgs]>()
          .mockResolvedValue({}),
      },
    };
```

`characters` vẫn là `CharactersService` thật hay mock? Ở spec này nó đang là mock (`{ list: jest.fn() }`).
Đổi thành mock của `listIds` **ủy quyền xuống client được truyền vào**, để test vẫn kiểm được đúng
hành vi "đọc qua tx":

```ts
    characters = {
      listIds: jest.fn(
        async (client: typeof tx) =>
          (await client.character.findMany()).map((row: { id: string }) => row.id),
      ),
    };
```

Thêm một test khoá hành vi mới:

```ts
  it('đọc roster bằng client của transaction, không phải ngoài transaction', async () => {
    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(characters.listIds).toHaveBeenCalledWith(tx);
  });
```

Các test `'bỏ characterId không còn trong bảng Character'` và `'characterId không còn trong bang bị
lọc nhưng ghi chú của ô đó vẫn giữ'` giữ nguyên kỳ vọng — chúng đang mô tả hành vi, và hành vi không
đổi.

- [ ] **Bước 6: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- characters.service
pnpm --filter api test -- team-builder
pnpm --filter api typecheck
```

Kết quả mong đợi: PASS.

- [ ] **Bước 7: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules
git commit -m "fix(api): read the roster inside the formation transaction

saveFormation filtered unknown characterIds using a roster read before the
transaction opened, so a member deleted in between broke the foreign key
inside it — a 500 instead of the Vietnamese message the filter exists to
produce. CharactersService.listIds now takes the caller's transaction client,
keeping the Character table owned by its own module."
```

---

### Task 5: Tài liệu và rà soát cuối

**Files:**
- Modify: `apps/api/prisma/schema.prisma:111`

- [ ] **Bước 1: Trỏ schema sang codec**

Giữ nguyên câu văn xuôi, thêm một dòng ngay dưới:

```prisma
/// Một ô có người HOẶC có ghi chú. Ô vừa trống vừa không ghi gì thì KHÔNG có hàng.
/// Luật này được cài đặt một chỗ: modules/team-builder/formation-grid.ts.
model FormationSlot {
```

Không chạy `prisma:migrate` — comment `///` không đổi schema.

- [ ] **Bước 2: Rà không còn bản sao nào của luật lưới**

```bash
grep -rn "buildSlotRows\|as string" apps/api/src/modules/team-builder --include="*.ts"
grep -rn "getTime() < now.getTime()" apps/api/src --include="*.ts"
grep -rn "loadCharacterIds" apps/api/src --include="*.ts"
```

Kết quả mong đợi: lệnh 1 và 3 không ra dòng nào. Lệnh 2 ra **đúng một** dòng — thân
`isSessionLocked` trong `formation-grid.ts`.

- [ ] **Bước 3: Kiểm tra toàn bộ**

```bash
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
```

Kết quả mong đợi: cả ba sạch. Dán số suite/số test vào phần báo cáo — không tuyên bố "xong" khi chưa
nhìn thấy output.

- [ ] **Bước 4: Kiểm tra tay hai endpoint**

```bash
pnpm --filter api dev   # ở một terminal khác
# lấy token như thường lệ rồi:
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/team-builder/weeks' -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/team-builder/formations' -H "Authorization: Bearer $TOKEN"
```

Kết quả mong đợi: `200`, `200`. (Cổng lấy theo `PORT` trong `apps/api/.env`.)

- [ ] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/prisma/schema.prisma
git commit -m "docs(api): point the slot row comment at the codec"
```

- [ ] **Bước 6: Review và báo cáo**

Chạy `/code-review` trên nhánh, sửa những gì đáng sửa, rồi tóm tắt cho người dùng: các commit đã tạo,
output của `pnpm --filter api test`, và hai chỗ kế hoạch chốt khác spec (§4 đi qua `CharactersService`,
`purgeExpiredFormations` không nhận `now`).

---

## Ngoài phạm vi (theo spec)

- Cron thật cho retention — repo không có scheduler, và `architecture.md` §8 ghi rõ những gì cố ý
  vắng mặt.
- Đổi cách lưu đội hình (một cột JSON thay bảng `FormationSlot`).
- Khoá chống chạy song song giữa purge và save — `deleteMany` lọc `weekStart < cutoff` (56 ngày
  trước), `saveFormation` chỉ ghi được cho trận chưa đánh; hai tập không giao nhau.
