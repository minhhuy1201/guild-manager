# A3 — Codec response thành module · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** mỗi shape chiều ra có **một** phép dựng, đặt cạnh module sở hữu bảng. Cast enum chỉ còn
tồn tại trong codec. Không module nào tự truy vấn bảng của module khác.

**Spec:** [`docs/custom-spec/2026-08-21-a3-response-codec-design.md`](../custom-spec/2026-08-21-a3-response-codec-design.md)
· tiếp nối [C1](./2026-08-18-c1-response-contract-plan.md).

**Phạm vi:** chỉ `apps/api`. `packages/shared` và `apps/web` **không đổi một dòng nào** — shape trên
dây giữ nguyên tuyệt đối. Task 1→5 là refactor thuần; Task 6 thêm đúng một hành vi mới, và chỉ ở
ngoài production: response sai contract thì ném thay vì chảy ra client.

## Hai quyết định đã chốt với người dùng

1. **Hoãn §4 của spec** (chạy `characterSchema.parse()` ở chiều ra + hằng số
   `SHOULD_VERIFY_RESPONSES` ở `config/`) — Task 1→5 làm §1–§3 trước, đúng như spec ghi *"§1–§3
   đứng độc lập"*.

   **Cập nhật 2026-08-23:** quyết định đảo lại, §4 **được làm** ở [Task 6](#task-6-4--chạy-schema-zod-ở-chiều-ra-ngoài-production).
   Lý do: bỏ hẳn thì lỗ hổng §Bối cảnh chẩn đoán (*"enum lệch trong database chảy thẳng ra client,
   fail lặng"*) không có mục nào vá, và điều kiện hoàn thành của A3 không đạt — xem
   [tổng quan đợt 2 §Điều kiện hoàn thành cần sửa lại](../custom-spec/2026-08-21-architecture-review-2-overview.md#điều-kiện-hoàn-thành-cần-sửa-lại).
   Ngoại lệ cho luật *"Nothing reads `process.env`"* được chấp nhận và ghi vào `backend.md` +
   `apps/api/CLAUDE.md`.
2. **Mở rộng §2 sang `team-builder`.** Spec chỉ liệt kê `attendance`, nhưng
   `team-builder.service.ts:241` cũng truy vấn thẳng `prisma.character`. Đổi luôn, để câu *"module
   khác không tự truy vấn bảng `Character`"* đúng không có ngoại lệ nào phải nhớ.

## Global Constraints

- **Refactor giữ nguyên hành vi.** Không thêm/bớt/đổi field nào của response, không đổi thứ tự sắp
  xếp, không đổi thông báo lỗi.
- **Task 1→5: không parse response lúc chạy.** `satisfies <Shape>` là cơ chế duy nhất — kể cả trong
  codec. Task 6 thêm `verifyResponse` **bọc ngoài** `satisfies`, không thay nó, và không bao giờ
  parse ở production.
- **Không commit lên GitHub.** Commit local trên nhánh `refactor/a3-response-codec`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không có dòng attribution ở cuối.
- **`apps/api` không có path alias** — import nội bộ là đường dẫn tương đối, shared là
  `@guild/shared/enums` · `@guild/shared/schemas`.
- **Module khác chỉ import qua `<domain>.public.ts`.** Không `forwardRef()`: `characters` không import
  ngược `attendance`/`team-builder` nên không có cycle.
- **Doc comment tiếng Anh cho mọi hàm mới** theo `~/.claude/CLAUDE.md`; phần văn xuôi hiện có trong
  repo đang là tiếng Việt — khi **chuyển chỗ** một hàm thì bê nguyên văn comment cũ, không dịch lại.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter api typecheck` · `pnpm --filter api lint` · `pnpm --filter api test`
  - chạy một file: `pnpm --filter api test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/modules/characters/characters.codec.ts` | `CharacterRow`, `toCharacter` — chỗ duy nhất cast `as GuildClass` |
| `apps/api/src/modules/characters/characters.public.ts` | seam của module `characters` |
| `apps/api/src/modules/attendance/attendance.codec.ts` | `AttendanceRecordRow`, `toAttendanceRecord` — chỗ duy nhất cast `as AttendanceStatus` |
| `apps/api/src/modules/battle-sessions/battle-sessions.codec.ts` | `SessionRow`, `toBattleSession` |
| `apps/api/src/modules/characters/__tests__/characters.codec.spec.ts` | test round-trip |
| `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts` | test round-trip |
| `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.codec.spec.ts` | test round-trip |
| `apps/api/src/config/response-verification.ts` (Task 6) | `SHOULD_VERIFY_RESPONSES`, `verifyResponse` |
| `apps/api/src/config/response-verification.spec.ts` (Task 6) | hai nhánh của cờ |

**Sửa**

| File | Việc |
|---|---|
| `modules/characters/characters.service.ts` | bỏ `function toEntity`, dùng codec; thêm public `exists()` |
| `modules/characters/characters.module.ts` | `exports: [CharactersService]` |
| `modules/attendance/attendance.service.ts` | inject `CharactersService`, bỏ mọi `this.prisma.character`, dùng codec ở hai chỗ |
| `modules/attendance/attendance.module.ts` | thêm `CharactersModule` vào `imports` |
| `modules/attendance/__tests__/attendance.service.spec.ts` | mock `CharactersService` thay mock `prisma.character`; thêm test cho `getCharacters` và `getRecords` |
| `modules/battle-sessions/battle-sessions.service.ts` | bỏ `SessionRow` + `private toEntity`, gọi codec ở 4 chỗ |
| `modules/team-builder/team-builder.service.ts` | `satisfies SessionFormation`; `loadCharacterIds` dùng `CharactersService` |
| `modules/team-builder/team-builder.module.ts` | thêm `CharactersModule` vào `imports` |
| `modules/team-builder/__tests__/team-builder.service.spec.ts` | 3 chỗ mock `prisma.character.findMany` → mock `CharactersService.list` |
| `apps/api/docs/backend.md` §3 | thêm `<domain>.codec.ts` vào sơ đồ thư mục; sửa câu "battle-sessions is the only module with a `.public.ts`"; (Task 6) luật `verifyResponse` + ngoại lệ `process.env` |
| `apps/api/src/config/index.ts` (Task 6) | re-export `response-verification` |
| `apps/api/CLAUDE.md` (Task 6) | ngoại lệ `process.env`, luật `verifyResponse` |

---

### Task 0: Nhánh làm việc

- [ ] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kỳ vọng: `main`, working tree sạch (ngoài file kế hoạch này). Nếu bẩn ngoài dự kiến, dừng và hỏi.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/a3-response-codec
git rev-parse --abbrev-ref HEAD
```

Kỳ vọng: in ra `refactor/a3-response-codec`.

---

### Task 1: `characters` — codec, seam, `exists()`

**Files:**
- Create: `apps/api/src/modules/characters/characters.codec.ts`
- Create: `apps/api/src/modules/characters/characters.public.ts`
- Create: `apps/api/src/modules/characters/__tests__/characters.codec.spec.ts`
- Modify: `apps/api/src/modules/characters/characters.service.ts`
- Modify: `apps/api/src/modules/characters/characters.module.ts`

**Interfaces:**
- Produces (Task 2 và Task 4 đều dùng): `CharactersService` (với `list()` và `exists()`) và
  `toCharacter` / `CharacterRow`, đều qua `./characters.public`.

- [ ] **Bước 1: Tạo `characters.codec.ts`**

```ts
import type { GuildClass } from '@guild/shared/enums';
import type { Character } from '@guild/shared/schemas';

/** Những cột của bảng Character mà codec cần để dựng response. */
export type CharacterRow = {
  id: string;
  name: string;
  guildClass: string;
};

/**
 * Đổi một hàng Character thành object trả cho client.
 * @param row - Hàng đọc từ Prisma
 * @returns Nhân vật đúng shape contract
 */
export function toCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
    guildClass: row.guildClass as GuildClass,
  } satisfies Character;
}
```

> `CharacterRow` nhận `guildClass: string` chứ không phải `GuildClass`: đây đúng là chỗ tiếp nhận giá
> trị thô từ Prisma, và là lý do codec tồn tại.

- [ ] **Bước 2: Viết test round-trip và chạy**

`apps/api/src/modules/characters/__tests__/characters.codec.spec.ts`:

```ts
import { GuildClass } from '@guild/shared/enums';

import { toCharacter } from '../characters.codec';

describe('toCharacter', () => {
  it('giữ nguyên id, tên và lưu phái', () => {
    expect(
      toCharacter({ id: 'huy-a1', name: 'Huy', guildClass: GuildClass.KIEM }),
    ).toEqual({ id: 'huy-a1', name: 'Huy', guildClass: GuildClass.KIEM });
  });

  it('không mang theo cột thừa của hàng Prisma', () => {
    const entity = toCharacter({
      id: 'huy-a1',
      name: 'Huy',
      guildClass: GuildClass.KIEM,
      // @ts-expect-error — hàng thật có thêm cột; codec phải chọn field, không trải hàng
      createdAt: new Date(),
    });

    expect(Object.keys(entity)).toEqual(['id', 'name', 'guildClass']);
  });
});
```

> Tên hằng enum: mở `packages/shared/enums/guild-class.enum.ts` lấy đúng một giá trị có thật thay cho
> `GuildClass.KIEM` nếu tên khác.

```bash
pnpm --filter api test -- characters.codec
```

Kỳ vọng: PASS. Bài thứ hai là bài có giá trị nhất — nó khoá việc codec **chọn field** thay vì
`...row`, tức là `password`-kiểu rò rỉ không xảy ra được.

- [ ] **Bước 3: `characters.service.ts` — dùng codec, thêm `exists()`**

Đổi import ở đầu file: bỏ `import type { GuildClass } from '@guild/shared/enums';`, thêm

```ts
import { toCharacter } from './characters.codec';
```

cạnh `import { generateId } from './characters.lib';`.

Đổi 4 chỗ gọi `toEntity(...)` → `toCharacter(...)` (`list` :32, `update` :66, `insert` :95) và **xoá
toàn bộ `function toEntity`** (:113-126).

Thêm method public `exists`, đặt ngay sau `remove()`, và cho `ensureExists` dùng lại nó:

```ts
  /**
   * Thành viên này có còn trong bang không.
   * Module khác dùng để kiểm tồn tại mà không phải chạm vào bảng Character.
   * @param id - Id thành viên
   * @returns true nếu thành viên tồn tại
   */
  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.character.findUnique({
      where: { id },
      select: { id: true },
    });

    return found !== null;
  }

  /**
   * Kiểm tra thành viên có tồn tại không.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi thành viên tồn tại
   * @throws NotFoundException khi không có thành viên đó
   */
  private async ensureExists(id: string): Promise<void> {
    if (!(await this.exists(id))) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
```

> `ensureExists` cũ đọc cả hàng (`findUnique({ where: { id } })`); bản mới `select: { id: true }`. Đọc
> ít hơn, hành vi giống hệt — cả hai chỉ dùng kết quả để kiểm null.

- [ ] **Bước 4: Tạo `characters.public.ts`**

Theo đúng khuôn `battle-sessions.public.ts`:

```ts
/**
 * Public API của module characters.
 *
 * Đây là file duy nhất module khác được import code từ đó; mọi file khác trong thư mục này là nội
 * bộ (luật ranh giới module trong `eslint.config.mjs`). File `.module.ts` bên cạnh chỉ còn giữ vai
 * khai báo DI cho Nest.
 *
 * Chỉ re-export, không import ngược từ module khác — nếu hai file `.public.ts` cần nhau thì đó là
 * một cycle nghiệp vụ thật và cách xử lý là tách module thứ ba, không phải `forwardRef()`.
 */
export { CharactersService } from './characters.service';
export { toCharacter } from './characters.codec';
export type { CharacterRow } from './characters.codec';
```

- [ ] **Bước 5: `characters.module.ts` — export service cho DI**

```ts
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
```

- [ ] **Bước 6: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test -- characters
```

Kỳ vọng: xanh. `characters.service.spec.ts` **không sửa gì** mà vẫn pass — nếu phải sửa nghĩa là đã
đổi hành vi ngoài ý muốn, dừng lại.

- [ ] **Bước 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/characters
git commit -m "refactor(api): extract the character codec behind a module seam"
```

---

### Task 2: `attendance` — codec riêng, thôi truy vấn bảng `Character`

**Files:**
- Create: `apps/api/src/modules/attendance/attendance.codec.ts`
- Create: `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`
- Modify: `apps/api/src/modules/attendance/attendance.module.ts`
- Modify: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`

**Interfaces:**
- Consumes: `CharactersService` từ `../characters/characters.public` (Task 1).
- Produces: `AttendanceService` không còn field `prisma.character` nào; constructor có tham số thứ tư.

- [ ] **Bước 1: Tạo `attendance.codec.ts`**

```ts
import type { AttendanceStatus } from '@guild/shared/enums';
import type { AttendanceRecord } from '@guild/shared/schemas';

/** Những cột của bảng AttendanceRecord mà codec cần để dựng response. */
export type AttendanceRecordRow = {
  characterId: string;
  sessionId: string;
  status: string;
  markedAt: Date;
};

/**
 * Đổi một hàng AttendanceRecord thành object trả cho client.
 * @param row - Hàng đọc từ Prisma
 * @returns Lượt điểm danh đúng shape contract, thời điểm ở dạng ISO string
 */
export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    characterId: row.characterId,
    sessionId: row.sessionId,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
    status: row.status as AttendanceStatus,
    markedAt: row.markedAt.toISOString(),
  } satisfies AttendanceRecord;
}
```

- [ ] **Bước 2: Test round-trip**

`apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`:

```ts
import { AttendanceStatus } from '@guild/shared/enums';

import { toAttendanceRecord } from '../attendance.codec';

const MARKED_AT = new Date('2026-07-22T05:00:00.000Z');

describe('toAttendanceRecord', () => {
  it('đổi markedAt sang ISO string và giữ nguyên trạng thái', () => {
    expect(
      toAttendanceRecord({
        characterId: 'char-1',
        sessionId: 'session-sat',
        status: AttendanceStatus.PRESENT,
        markedAt: MARKED_AT,
      }),
    ).toEqual({
      characterId: 'char-1',
      sessionId: 'session-sat',
      status: AttendanceStatus.PRESENT,
      markedAt: '2026-07-22T05:00:00.000Z',
    });
  });
});
```

```bash
pnpm --filter api test -- attendance.codec
```

Kỳ vọng: PASS.

- [ ] **Bước 3: `attendance.service.ts` — inject `CharactersService`, bỏ `prisma.character`**

Import: bỏ `AttendanceStatus, GuildClass` khỏi `@guild/shared/enums` (không còn cast ở file này) và
bỏ `Character` khỏi import type nếu chữ ký vẫn cần thì giữ. Thêm:

```ts
import { CharactersService } from '../characters/characters.public';
import { toAttendanceRecord } from './attendance.codec';
```

Constructor thêm tham số:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}
```

`getCharacters` (:29-44) rút gọn còn:

```ts
  /**
   * Lấy danh sách nhân vật trong bang, sắp xếp theo tên.
   * Bảng Character do module characters sở hữu — đọc qua service của nó, không tự truy vấn.
   * @returns Mảng nhân vật
   */
  async getCharacters(): Promise<Character[]> {
    return this.characters.list();
  }
```

`getRecords` (:57-65) đổi phần map:

```ts
    return records.map(toAttendanceRecord);
```

`mark` (:87-93) đổi phần kiểm tồn tại:

```ts
    if (!(await this.characters.exists(characterId))) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }
```

`mark` (:116-121) đổi câu return cuối:

```ts
    return toAttendanceRecord(record);
```

- [ ] **Bước 4: `attendance.module.ts`**

```ts
import { CharactersModule } from '../characters/characters.module';
...
@Module({
  imports: [BattleSessionsModule, CharactersModule],
  ...
})
```

> Import `.module.ts` là đúng seam cho **đăng ký DI**; code (`CharactersService` trong service) đi qua
> `.public.ts`. Cả hai cửa đều hợp lệ theo `backend.md` §4.

- [ ] **Bước 5: Sửa `attendance.service.spec.ts`**

1. `prisma` mock bỏ hẳn nhánh `character`, còn lại `attendanceRecord: { upsert, findMany }`.
2. Thêm mock mới:

```ts
  let characters: { list: jest.Mock; exists: jest.Mock };
```

```ts
    characters = {
      list: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue(true),
    };
```

3. `makeService` truyền thêm `characters as unknown as CharactersService` **đúng vị trí thứ ba**
   (trước `Clock`).
4. Test *"từ chối khi không có nhân vật"*: `prisma.character.findUnique.mockResolvedValue(null)` →
   `characters.exists.mockResolvedValue(false)`.

- [ ] **Bước 6: Thêm test cho `getCharacters` và `getRecords`**

Spec §Kiểm thử nêu rõ hai hàm này chưa có test nào. Bọc phần `mark` hiện tại và hai `describe` mới
trong cùng file (giữ nguyên `beforeEach` dùng chung):

```ts
describe('AttendanceService.getCharacters', () => {
  it('trả thẳng danh sách của CharactersService, không tự truy vấn bảng', async () => {
    const roster = [{ id: 'char-1', name: 'Huy', guildClass: GuildClass.KIEM }];
    characters.list.mockResolvedValue(roster);

    await expect(service.getCharacters()).resolves.toEqual(roster);
  });
});

describe('AttendanceService.getRecords', () => {
  it('chỉ đọc record của các trận trong tuần đang mở', async () => {
    prisma.attendanceRecord.findMany.mockResolvedValue([]);

    await service.getRecords();

    expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: { in: ['session-tue', 'session-sat'] } },
      }),
    );
  });

  it('dựng record qua codec — markedAt ra ISO string', async () => {
    prisma.attendanceRecord.findMany.mockResolvedValue([
      {
        characterId: 'char-1',
        sessionId: 'session-sat',
        status: AttendanceStatus.PRESENT,
        markedAt: WEDNESDAY,
      },
    ]);

    await expect(service.getRecords()).resolves.toEqual([
      {
        characterId: 'char-1',
        sessionId: 'session-sat',
        status: AttendanceStatus.PRESENT,
        markedAt: WEDNESDAY.toISOString(),
      },
    ]);
  });
});
```

> Nếu ba `describe` dùng chung `beforeEach` thì gom chúng vào một `describe('AttendanceService')` bọc
> ngoài, giữ nguyên tên ba `describe` con.

- [ ] **Bước 7: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test -- attendance
grep -n "prisma.character" apps/api/src/modules/attendance/attendance.service.ts
```

Kỳ vọng: test xanh; `grep` **không in gì**.

- [ ] **Bước 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/attendance
git commit -m "refactor(api): read characters through their owning module in attendance"
```

---

### Task 3: `battle-sessions` — chuyển `toEntity` ra codec

**Files:**
- Create: `apps/api/src/modules/battle-sessions/battle-sessions.codec.ts`
- Create: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.codec.spec.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`

**Interfaces:**
- `SessionRow` và `toBattleSession` **không** re-export qua `battle-sessions.public.ts`: `_count` chỉ
  codec đó biết, không module nào ngoài cần dựng `BattleSession`.

- [ ] **Bước 1: Tạo `battle-sessions.codec.ts`**

Chuyển nguyên văn `SessionRow` (`battle-sessions.service.ts:27-36`) và thân `private toEntity`
(:380-399), đổi thành hàm module-level:

```ts
import type { BattleSession } from '@guild/shared/schemas';

import { formatSessionLabel, isDeadlinePassed } from './session-schedule';

/** Hàng BattleSession đọc kèm số liệu phụ cho entity. */
export type SessionRow = {
  id: string;
  dateTime: Date;
  deadline: Date;
  opponent: string | null;
  isGuildWar: boolean;
  weekStart: Date;
  _count: { attendanceRecords: number; formationMatches: number };
};

/**
 * Đổi một hàng BattleSession thành object trả về cho client.
 * @param row - Hàng đọc từ Prisma kèm `_count`
 * @param now - Thời điểm dựng response, dùng để chốt cờ quá hạn
 * @returns Trận đánh đã dựng nhãn và đổi thời gian sang ISO string
 */
export function toBattleSession(row: SessionRow, now: Date): BattleSession {
  return {
    id: row.id,
    label: formatSessionLabel(row.dateTime, row.isGuildWar),
    dateTime: row.dateTime.toISOString(),
    deadline: row.deadline.toISOString(),
    isDeadlinePassed: isDeadlinePassed(row.deadline, now),
    isGuildWar: row.isGuildWar,
    opponent: row.opponent,
    weekStart: row.weekStart.toISOString(),
    attendanceCount: row._count.attendanceRecords,
    hasFormation: row._count.formationMatches > 0,
  } satisfies BattleSession;
}
```

- [ ] **Bước 2: `battle-sessions.service.ts`**

Xoá `type SessionRow` (:27-36) và `private toEntity` (:380-399). Bỏ `formatSessionLabel` /
`isDeadlinePassed` khỏi import `./session-schedule` **chỉ khi** không còn chỗ nào khác dùng —
`readWeekSessions` (:164) vẫn dùng `formatSessionLabel`, nên giữ nó lại; `isDeadlinePassed` thì bỏ
được.

Thêm:

```ts
import { toBattleSession, type SessionRow } from './battle-sessions.codec';
```

Đổi 4 call site: `this.toEntity(row, now)` → `toBattleSession(row, now)` (`listByWeek` :119,
`findById` :197, `create` :225, `update` :290).

- [ ] **Bước 3: Test round-trip**

`apps/api/src/modules/battle-sessions/__tests__/battle-sessions.codec.spec.ts` — khoá đúng những gì
codec làm mà `satisfies` không bắt được:

```ts
import { toBattleSession, type SessionRow } from '../battle-sessions.codec';

const ROW: SessionRow = {
  id: 'session-sat',
  dateTime: new Date('2026-07-25T13:00:00.000Z'),
  deadline: new Date('2026-07-23T10:00:00.000Z'),
  opponent: null,
  isGuildWar: true,
  weekStart: new Date('2026-07-19T17:00:00.000Z'),
  _count: { attendanceRecords: 3, formationMatches: 0 },
};

describe('toBattleSession', () => {
  it('đổi mọi mốc thời gian sang ISO string', () => {
    const entity = toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'));

    expect(entity.dateTime).toBe('2026-07-25T13:00:00.000Z');
    expect(entity.deadline).toBe('2026-07-23T10:00:00.000Z');
    expect(entity.weekStart).toBe('2026-07-19T17:00:00.000Z');
  });

  it('chốt cờ quá hạn theo mốc `now` được truyền vào', () => {
    expect(
      toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'))
        .isDeadlinePassed,
    ).toBe(false);
    expect(
      toBattleSession(ROW, new Date('2026-07-24T05:00:00.000Z'))
        .isDeadlinePassed,
    ).toBe(true);
  });

  it('rút số liệu phụ ra khỏi `_count`', () => {
    const entity = toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'));

    expect(entity.attendanceCount).toBe(3);
    expect(entity.hasFormation).toBe(false);
  });
});
```

- [ ] **Bước 4: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test -- battle-sessions
```

Kỳ vọng: xanh, `battle-sessions.service.spec.ts` **không sửa gì**.

- [ ] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/battle-sessions
git commit -m "refactor(api): move the battle session codec out of the service"
```

---

### Task 4: `team-builder` — vá chỗ hụt `satisfies`, thôi truy vấn bảng `Character`

**Files:**
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.module.ts`
- Modify: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

- [ ] **Bước 1: Thêm `satisfies SessionFormation` vào `saveFormation`**

`team-builder.service.ts:225-233` — đây là chỗ duy nhất trong repo dựng object response mà thiếu
`satisfies`:

```ts
    return {
      sessionId: session.id,
      label: session.label,
      opponent: session.opponent,
      dateTime: session.dateTime,
      isGuildWar: session.isGuildWar,
      locked: false,
      matches: cleaned,
    } satisfies SessionFormation;
```

- [ ] **Bước 2: `loadCharacterIds` gọi `CharactersService`**

```ts
  /**
   * Lấy id của mọi nhân vật còn trong bang.
   * Bảng Character do module characters sở hữu — đọc qua service của nó, không tự truy vấn.
   * @returns Tập id nhân vật
   */
  private async loadCharacterIds(): Promise<Set<string>> {
    const characters = await this.characters.list();

    return new Set(characters.map((character) => character.id));
  }
```

Constructor thêm `private readonly characters: CharactersService,` (đặt sau `battleSessions`, trước
`clock`), và import `import { CharactersService } from '../characters/characters.public';`.

> `list()` đọc cả hàng thay vì `select: { id: true }`. Đọc thừa vài cột trên vài chục hàng — đổi lại
> là bảng `Character` chỉ còn đúng một chủ. Đây là cùng đánh đổi spec đã chấp nhận cho `attendance`.

> **Cập nhật 2026-08-23 — bản đang chạy khác bước này.** A6 §4 đưa phép đọc vào `$transaction` của
> `saveFormation`, nên seam thành `CharactersService.listIds(client): Promise<Set<string>>` (client
> **bắt buộc**, để không có đường đọc ngoài transaction), và `loadCharacterIds` bị bỏ hẳn thay vì
> viết lại. Spec A3 §2 đã chép đúng chữ ký đó; đọc §2 chứ không đọc đoạn `list()` ở trên.

- [ ] **Bước 3: `team-builder.module.ts`**

```ts
  imports: [BattleSessionsModule, CharactersModule],
```

- [ ] **Bước 4: Sửa `team-builder.service.spec.ts`**

Ba `describe` đang mock `prisma.character.findMany` (dòng ~65/76, ~179/190, ~306/321). Ở mỗi chỗ:

- bỏ `character: { findMany: ... }` khỏi mock `prisma`;
- thêm `const characters = { list: jest.fn().mockResolvedValue([]) };`
- truyền vào constructor `new TeamBuilderService(prisma, battleSessions, characters, clock)`.

Test *"bỏ characterId không còn trong bảng Character"* (:377) và *"characterId không còn trong bang bị
lọc nhưng ghi chú của ô đó vẫn giữ"* (:416): chỗ nào đang cho `findMany` trả
`[{ id: 'char-1' }]` thì đổi thành `characters.list` trả về **`Character` đầy đủ**
(`{ id, name, guildClass }`) — `loadCharacterIds` chỉ đọc `.id`, nhưng mock phải khớp kiểu.

- [ ] **Bước 5: Kiểm tra**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test -- team-builder
grep -rn "prisma.character" apps/api/src/modules --include='*.ts' | grep -v "modules/characters/"
```

Kỳ vọng: test xanh; `grep` **không in gì** — bảng `Character` chỉ còn một chủ.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/team-builder
git commit -m "refactor(api): assert the formation response shape and drop its character query"
```

---

### Task 5: Tài liệu + kiểm tra toàn bộ

**Files:**
- Modify: `apps/api/docs/backend.md` §3

- [ ] **Bước 1: Cập nhật sơ đồ thư mục module ở `backend.md` §3**

Thêm `characters.codec.ts` vào sơ đồ (dòng ~105), ngay dưới `characters.lib.ts`:

```
├── characters.codec.ts             # dựng response shape từ hàng Prisma — chỗ duy nhất cast enum
```

và đổi câu ngay dưới sơ đồ (dòng ~116-117):

> The response shape is **not** declared here: it is a Zod schema in `packages/shared/schemas`, and the
> object the service builds ends in `satisfies <Shape>`.

thành

```markdown
The response shape is **not** declared here: it is a Zod schema in `packages/shared/schemas`. The
object is built in `<domain>.codec.ts` — one pure function per shape, ending in `satisfies <Shape>`,
living in the module that **owns the table**. A module that reads someone else's table calls that
module's service and reuses its codec; it never writes the cast itself.
```

- [ ] **Bước 2: Sửa câu về `.public.ts` (dòng ~126-128)**

> `battle-sessions` is the only module with one today, because it is the only one with an outside
> caller.

thành

```markdown
`battle-sessions` and `characters` have one today, because they are the modules with outside callers:
`attendance` and `team-builder` read the schedule and the roster through them.
```

Thêm `<domain>.codec.ts` vào danh sách "Optional pieces" (dòng ~133):

```markdown
- `<domain>.codec.ts` — the moment this module's rows are turned into a response shape.
```

- [ ] **Bước 3: Chạy toàn bộ suite**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

Kỳ vọng: tất cả xanh, kể cả `module-boundary.spec.ts` (quan hệ mới `attendance → characters` và
`team-builder → characters` đi qua `characters.public.ts`).

- [ ] **Bước 4: Khẳng định các bất biến của spec**

```bash
# Cast enum chỉ còn trong codec
grep -rn "as GuildClass\|as AttendanceStatus" apps/api/src --include='*.ts'
# Không module nào ngoài characters đụng bảng Character
grep -rn "prisma.character" apps/api/src --include='*.ts' | grep -v "modules/characters/"
# Không có forwardRef
grep -rn "forwardRef" apps/api/src --include='*.ts'
```

Kỳ vọng: lệnh 1 chỉ in `characters.codec.ts` và `attendance.codec.ts`; lệnh 2 và 3 không in gì.

- [ ] **Bước 5: Commit tài liệu**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/docs/backend.md
git commit -m "docs(api): document the codec file and the second module seam"
```

- [ ] **Bước 6: Review và xem lại diff, KHÔNG push**

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

Kỳ vọng: 5 commit (characters / attendance / battle-sessions / team-builder / docs).
Chạy `/code-review` một lượt ở đây. **Không `git push`, không mở PR.**

---

### Task 6: §4 — chạy schema Zod ở chiều ra, ngoài production

> **Thêm ngày 2026-08-23**, sau khi rà soát thấy điều kiện hoàn thành của A3 chưa đạt. Code đã
> hiện thực; các bước dưới đây là bản ghi của thay đổi đó.

**Files:**
- Create: `apps/api/src/config/response-verification.ts`
- Create: `apps/api/src/config/response-verification.spec.ts`
- Modify: `apps/api/src/config/index.ts`
- Modify: ba file `<domain>.codec.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` (`getEditableWeeks`)
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts` (`getWeeks`, `readFormations`,
  `saveFormation`)
- Modify: `apps/api/src/modules/characters/__tests__/characters.codec.spec.ts`,
  `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`
- Modify: `apps/api/docs/backend.md`, `apps/api/CLAUDE.md`

- [ ] **Bước 1: `config/response-verification.ts`**

```ts
export const SHOULD_VERIFY_RESPONSES = process.env.NODE_ENV !== 'production';

export function verifyResponse<T>(schema: ZodType<T>, value: T): T {
  return SHOULD_VERIFY_RESPONSES ? schema.parse(value) : value;
}
```

Doc comment phải nói **vì sao** đây là chỗ duy nhất đọc `process.env`: người dùng cờ là các codec —
hàm mức module, ngoài cây DI nên không nhận được `ConfigService`. Re-export ở `config/index.ts`.

- [ ] **Bước 2: Bọc mọi chỗ dựng response**

Sáu shape, không phải ba: `verifyResponse(<shape>Schema, { … } satisfies <Shape>)` ở ba codec, ở
`getEditableWeeks` (`Week`), và ở ba chỗ của `team-builder` (`FormationWeek`, `SessionFormation` ×2).
`satisfies` **giữ nguyên** — nó vẫn là thứ bắt lỗi lúc biên dịch, `verifyResponse` chỉ thêm lớp kiểm
lúc chạy cho những gì `as` che mất.

Khẳng định không sót:

```bash
grep -rn "satisfies " apps/api/src --include='*.ts' | grep -v generated | grep -v __tests__
```

Kỳ vọng: mọi dòng shape chiều ra đều nằm trong một lời gọi `verifyResponse`. Các shape của `auth`
(`JwtPayload`, `AuthTokens`, `AuthUser`) **không** thuộc phạm vi: chúng không dựng từ hàng database,
không có `as` nào che.

- [ ] **Bước 3: Test**

`config/response-verification.spec.ts` khoá cả hai nhánh — nhánh production phải nạp lại module
trong `jest.isolateModules` với `NODE_ENV=production` (`import()` động không chạy được vì Jest ở đây
là CommonJS; `require` kèm một dòng `eslint-disable` có ghi lý do). Thêm ở hai codec spec mỗi file
một bài "giá trị enum lạ trong database làm codec ném".

- [ ] **Bước 4: Tài liệu**

`apps/api/docs/backend.md`: luật `verifyResponse` ngay dưới sơ đồ module, ngoại lệ `process.env` ở
mục config và ở bảng anti-pattern. `apps/api/CLAUDE.md`: cùng hai ý, mỗi ý một dòng.

- [ ] **Bước 5: Kiểm tra và commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
git rev-parse --abbrev-ref HEAD
git commit -m "feat(api): verify every response against its contract outside production"
```

---

## Edge case đã xét (đối chiếu spec §"Edge case")

| Edge case | Xử lý trong kế hoạch |
|---|---|
| `CharactersModule` ↔ `AttendanceModule` | `attendance` import `characters`, không có chiều ngược → không cycle, **không** `forwardRef()`. Task 5 bước 4 khẳng định bằng grep |
| `getCharacters` sắp `name asc`, `characters.list()` có sắp khác không | Đã kiểm: cả hai đều `orderBy: { name: 'asc' }` (`characters.service.ts:29`, `attendance.service.ts:32`). Thay được, không cần thêm tham số sắp xếp |
| `select` khác nhau — attendance chỉ đọc 3 cột, `list()` đọc cả hàng | Chấp nhận đọc thừa: cùng shape `Character` nên **không rò field** (codec chọn field, không `...row` — Task 1 bước 2 có test khoá việc này). Vài chục hàng |
| `_count` của `battle-sessions` | `SessionRow` giữ riêng trong `battle-sessions.codec.ts`, không gộp với `CharacterRow`, không re-export qua `.public.ts` |
| `mark` chỉ cần kiểm tồn tại, gọi `list()` là đọc thừa cả bảng | Nên thêm `exists(id)` với `select: { id: true }` thay vì dùng `list()` — Task 1 bước 3 |
| `team-builder` cũng truy vấn `prisma.character` (spec không liệt kê) | Đưa vào phạm vi — Task 4. Nếu bỏ qua thì câu "một bảng một chủ" có ngoại lệ phải nhớ |
| §4 (parse Zod ở chiều ra) | **Hoãn** khỏi Task 1→5 (§1–§3 đứng độc lập), rồi làm ở Task 6 ngày 2026-08-23 |
| `db:seed` phải chạy lại (rủi ro của §4) | Áp dụng từ Task 6: dữ liệu seed lệch enum sẽ ném ở dev/test — đúng mục đích. Suite hiện tại xanh nên dữ liệu mẫu đang sạch |
| Test hiện có phải pass **không sửa gì** | Đúng với `characters.service.spec.ts` và `battle-sessions.service.spec.ts` (Task 1 bước 6, Task 3 bước 4). `attendance.service.spec.ts` và `team-builder.service.spec.ts` **phải** sửa — vì constructor đổi, đó là thay đổi hình dạng phụ thuộc chứ không phải đổi hành vi |

## Ngoài phạm vi

- Parse response **trong production** — spec §4 đã loại từ đầu, Task 6 giữ nguyên quyết định đó.
- Interceptor validate mọi response tập trung — spec §"Ngoài phạm vi" đã bác.
- Thêm/bớt field của bất kỳ response nào.
- Đụng vào `packages/shared` hoặc `apps/web`.
