# A1 — Gấp việc đọc lịch vào một interface của `battle-sessions`

> **Đã hiện thực** (`54372f9`, `b4be826`, `d23bb23`). Rà soát lại 2026-08-23 tìm thấy hai chỗ đọc
> spec này phải cẩn thận: (1) spec thêm **ba** hàm public chứ không phải hai như tổng quan ghi;
> (2) §Edge case gọi "bỏ nhánh `if` ở `:119`" là no-op — chỉ đúng với tuần quá khứ, tuần **kế tiếp**
> cũng editable nên bị sinh Guild War qua đường `GET`. Chi tiết:
> [§ Rà soát lại A1–A6](./2026-08-21-architecture-review-2-overview.md#rà-soát-lại-a1a6-2026-08-23).

Ngày: 2026-08-21 · Phạm vi: `apps/api`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **sau** [A2](./2026-08-21-a2-clock-module-design.md) và
[A4](./2026-08-21-a4-week-start-design.md) — hai hàm public mới sinh ra với chữ ký đã sạch `now` và
đã có kiểu cho mốc tuần, thay vì đặt xong rồi sửa lại hai lần.

Thay một lời gọi lấy side effect và ba truy vấn xuyên bảng bằng hai hàm nói đúng việc chúng làm.

## Bối cảnh

`BattleSessionsService` tuyên bố invariant của mình ngay trong doc comment của class:

```ts
// battle-sessions.service.ts:42-46
/**
 * Sở hữu vòng đời của lịch đánh: tự sinh Guild War cho tuần đang mở và tuần kế,
 * đồng thời phục vụ CRUD scrim cho quản trị viên.
 * Module khác (điểm danh, xếp team) đọc lịch qua service này, không tự truy vấn bảng.
 */
```

`team-builder` vi phạm câu cuối ba lần, và tuân thủ câu đó theo một cách còn tệ hơn vi phạm:

```ts
// team-builder.service.ts:67-76
async getWeeks(now: Date = new Date()): Promise<FormationWeek[]> {
  await this.purgeExpiredFormations(now);
  await this.battleSessions.listByWeek(undefined, now);   // ← kết quả bị vứt đi

  const activeWeekStart = this.battleSessions.getActiveWeekStart(now);
  const sessions = await this.prisma.battleSession.findMany({   // ← :72, truy vấn thẳng
    distinct: ['weekStart'], select: { weekStart: true }, orderBy: { weekStart: 'desc' },
  });
```

```ts
// team-builder.service.ts:118-132
// Tuần đang mở có thể chưa được sinh trận — để module lịch đánh lo việc đó.
if (targetWeekStart === activeWeekStart) {
  await this.battleSessions.listByWeek(undefined, now);   // ← kết quả bị vứt đi lần hai
}

const sessions = await this.prisma.battleSession.findMany({   // ← :123, truy vấn thẳng
  where: { weekStart: new Date(targetWeekStart) },
  …
});
```

Lần thứ ba ở `:176-178` (`findUnique` trong `saveFormation`). Và ở `:139`, `team-builder` gọi lại
`formatSessionLabel(session.dateTime, session.isGuildWar)` — đúng phép dựng nhãn mà
`battle-sessions.service.ts:316` đã làm trong `toEntity`.

**Interface thật của `listByWeek` không phải "trả về các trận của tuần".** Nó là *"đảm bảo tuần đã
có hàng Guild War, rồi trả về các trận"*:

```ts
// battle-sessions.service.ts:92-94
if (this.isEditableWeek(target, now)) {
  await this.ensureGuildWar(target);
}
```

Ràng buộc thứ tự đó không nằm trong tên hàm, không nằm trong chữ ký, không nằm trong kiểu trả về.
Nó nằm trong **một comment ở phía caller** (`:118`). Người viết endpoint tiếp theo của `team-builder`
mà quên dòng `:120` sẽ nhận về một tuần thiếu trận Guild War — im lặng, không lỗi, không cảnh báo.

Cái giá trong test hiện tại nhìn thấy được:

```ts
// team-builder.service.spec.ts
battleSessions.listByWeek.mockResolvedValue([]);   // mock trả [] cho một hàm gọi vì side effect
```

Test phải mock một hàm mà nó không quan tâm giá trị trả về, bằng một giá trị không đúng thực tế.

## Quyết định thiết kế

### 1. Tách side effect ra thành hàm có tên

```ts
/**
 * Đảm bảo tuần đã có đủ các trận hệ thống sinh (hiện là Guild War).
 * Không làm gì với tuần ngoài phạm vi thiết lập.
 * @param week - Mốc Thứ 2 của tuần cần dựng
 * @returns Promise hoàn tất khi tuần đã sẵn sàng để đọc
 */
async ensureWeekMaterialized(week: WeekAnchor): Promise<void>;
```

Đây chính là phần `:92-94` được nâng lên thành interface. `listByWeek` gọi nó rồi mới đọc; caller nào
chỉ cần side effect thì gọi thẳng nó và **không nhận về giá trị để vứt đi**.

### 2. Một hàm đọc trả về hàng đã dựng nhãn

`team-builder` không cần `BattleSession` entity đầy đủ (nó không dùng `attendanceCount`,
`hasFormation`, `isDeadlinePassed`) nhưng cần `formationMatches` — thứ `battle-sessions` không biết
tới. Nên không gộp hai include lại; thay vào đó `battle-sessions` phơi ra phần nó sở hữu:

```ts
/** Một trận trong tuần, nhãn đã dựng, không kèm số liệu điểm danh/đội hình. */
export interface ScheduledSession {
  id: string;
  label: string;
  dateTime: Date;
  isGuildWar: boolean;
  opponent: string | null;
}

/**
 * Các trận của một tuần, sắp theo thời gian đánh, nhãn đã dựng.
 * Không tự sinh trận — gọi ensureWeekMaterialized trước nếu cần.
 * @param week - Mốc Thứ 2 của tuần cần đọc
 * @returns Mảng trận đã sắp theo giờ đánh
 */
async readWeekSessions(week: WeekAnchor): Promise<ScheduledSession[]>;

/** Các tuần còn dữ liệu lịch, mới nhất trước. */
async listWeekAnchors(): Promise<WeekAnchor[]>;
```

`listWeekAnchors` thay cho `findMany({ distinct: ['weekStart'] })` ở `team-builder.service.ts:72`.

`team-builder` sau đó chỉ còn đọc **bảng của chính nó** (`formationMatch`, `formationSlot`) và ghép
đội hình vào các `ScheduledSession` nhận được.

### 3. `saveFormation` đọc trận qua `findById`, không `findUnique`

`:176-178` đổi thành `this.battleSessions.findById(sessionId)`. Sau đó `:216` không cần gọi
`formatSessionLabel` nữa — nhãn đã có trong entity. `team-builder.service.ts` bỏ luôn import
`formatSessionLabel` và `weekEndOf` (`weekEndOf` chuyển vào `listWeekAnchors`/`getWeeks` phía
`battle-sessions`, hoặc giữ nếu vẫn cần dựng `FormationWeek` — xem bảng dưới).

### 4. Không gộp hai module

`team-builder` vẫn là module riêng: nó sở hữu `formationMatch`, `formationSlot`, luật retention và
luật ô đội hình ([A6](./2026-08-21-a6-formation-grid-codec-design.md)). Spec này chỉ bịt chỗ rò —
đưa phần "đọc lịch" về đúng chủ, không kéo phần "đội hình" đi theo.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `battle-sessions.service.ts` | thêm `ensureWeekMaterialized`, `readWeekSessions`, `listWeekAnchors`; `listByWeek` gọi `ensureWeekMaterialized` thay cho khối `:92-94` |
| `battle-sessions.public.ts` | re-export ba hàm + `ScheduledSession` |
| `team-builder.service.ts:69` | `listByWeek(undefined, now)` → `ensureWeekMaterialized(activeWeek)` |
| `team-builder.service.ts:72-76` | `prisma.battleSession.findMany` → `listWeekAnchors()` |
| `team-builder.service.ts:118-132` | comment `:118` xoá (interface đã nói); `findMany` → `readWeekSessions(week)` + truy vấn `formationMatch` của riêng nó |
| `team-builder.service.ts:139,216` | bỏ `formatSessionLabel`, dùng `label` từ `ScheduledSession` |
| `team-builder.service.ts:176-178` | `prisma.battleSession.findUnique` → `battleSessions.findById` |
| `team-builder.service.spec.ts` | bỏ mock `listByWeek`; mock `readWeekSessions`/`ensureWeekMaterialized` |

Sau khi xong, `grep -n "prisma.battleSession" src/modules/team-builder` phải rỗng — điều kiện hoàn
thành, và cũng là câu ở `battle-sessions.service.ts:45` cuối cùng trở thành sự thật kiểm được.

## Edge case

- **Tuần cũ không được sinh trận.** `ensureWeekMaterialized` giữ nguyên phép kiểm `isEditableWeek`
  bên trong, nên gọi nó cho tuần quá khứ là no-op — đúng như `listByWeek` hiện nay. `getFormations`
  vì thế có thể gọi vô điều kiện và bỏ hẳn nhánh `if` ở `:119`, hoặc giữ nhánh để tránh một lời gọi
  thừa. Chọn **bỏ nhánh**: một `if` ở caller là đúng thứ interface này sinh ra để xoá.
- **`readWeekSessions` không tự sinh trận** — cố ý, và phải ghi trong doc comment. Đây là đánh đổi:
  hai hàm thay vì một hàm làm cả hai việc. Lý do: `getWeeks` cần sinh cho tuần đang mở nhưng đọc mốc
  của **mọi** tuần, nên gộp lại sẽ sinh nhầm.
- **`SESSION_INCLUDE` không dùng cho `readWeekSessions`** — không đọc `_count` cho đường này, tiết
  kiệm hai phép đếm mỗi trận trên màn xếp team.
- **Trận bị dời sang tuần khác giữa hai lời gọi.** Không đổi so với hiện tại: `saveFormation` đã
  kiểm `session.dateTime` trước khi ghi.

## Kiểm thử

- `team-builder.service.spec.ts`: mock `readWeekSessions` trả về hai trận, khẳng định đội hình được
  ghép đúng — test này lần đầu **không cần biết** Guild War tồn tại.
- Thêm: `getFormations` cho tuần đang mở phải gọi `ensureWeekMaterialized` đúng một lần; cho tuần cũ
  thì gọi và service lịch tự no-op.
- `battle-sessions.service.spec.ts`: `ensureWeekMaterialized` idempotent — gọi hai lần cho cùng tuần
  chỉ upsert, không sinh trận trùng (khoá lại hành vi của `guildWarSessionId`).
- Giữ nguyên mọi test hiện có của `battle-sessions` — `listByWeek` không đổi hành vi.

## Rủi ro

- **`getWeeks` đang dựa vào việc `listByWeek` sinh trận cho tuần đang mở** để tuần đó xuất hiện
  trong danh sách. Nếu đổi thứ tự nhầm (đọc mốc trước khi sinh), tuần đang mở biến mất khỏi màn xếp
  team cho tới khi có ai đó mở màn điểm danh. Giữ nguyên thứ tự: sinh trước, đọc sau.
- **Hai module cùng đọc `battleSession` trong một transaction** — không có transaction nào bắc qua
  hai module ở đây, nên không phát sinh.

## Ngoài phạm vi

- Gộp `team-builder` vào `battle-sessions` (đã loại ở §4).
- Dựng `<domain>.repository.ts` cho `battle-sessions` — `architecture.md` §7 nói chỉ thêm khi truy
  vấn phức tạp hoặc lặp; sau spec này chúng gom về một service nên chưa tới ngưỡng.
