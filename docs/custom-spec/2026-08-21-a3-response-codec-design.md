# A3 — Codec response thành module, thay vì quy ước ở mỗi call site

> **Đã hiện thực** (`cda3da9` → `abccaf5`). Rà soát lại 2026-08-23: bằng chứng chính xác (kể cả việc
> không có `.parse()` nào chạy trên schema chiều ra), trừ hai điểm nhỏ — (1) `characters.service.ts`
> lệch 1 dòng: `toEntity` ở `:118-126`, `satisfies` ở `:125`; (2) §Edge case về thứ tự sắp xếp là
> thừa, `CharactersService.list()` đã dùng đúng `orderBy: { name: 'asc' }`. Chi tiết:
> [§ Rà soát lại A1–A6](./2026-08-21-architecture-review-2-overview.md#rà-soát-lại-a1a6-2026-08-23).

Ngày: 2026-08-21 · Phạm vi: `apps/api` + `packages/shared`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Tiếp nối [C1](./2026-08-18-c1-response-contract-design.md): C1 đưa **shape** chiều ra vào
`packages/shared`; spec này đưa **phép dựng** shape đó vào một chỗ.

## Bối cảnh

C1 đã làm xong việc của nó — mọi response đều `satisfies` một shape từ `@guild/shared/schemas`.
Nhưng phép *dựng* shape vẫn là quy ước lặp ở từng call site, và đã sinh ra một bản sao thật.

**`Character` được dựng ở hai module, comment trùng từng chữ:**

```ts
// characters.service.ts:117-125
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

```ts
// attendance.service.ts:37-45
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

Hai comment giống nhau từng ký tự là bằng chứng copy-paste không cần suy luận. Kèm theo,
`attendance.service.ts:32-35` truy vấn thẳng `prisma.character` — bảng do module `characters` sở
hữu, đúng lớp vi phạm mà [A1](./2026-08-21-a1-schedule-read-seam-design.md) xử lý cho bảng lịch.

**`AttendanceRecord` dựng hai lần trong cùng một file:** `:60-68` (trong `getRecords`) và `:118-123`
(cuối `mark`) — cùng bốn field, cùng `status as AttendanceStatus`, cùng `markedAt.toISOString()`.

**Một chỗ hụt `satisfies` và không ai bắt được:**

```ts
// team-builder.service.ts:214-222 — return của saveFormation
return {
  sessionId: session.id,
  …
  locked: false,
  matches: cleaned,
};                       // ← không có satisfies SessionFormation
```

Mọi chỗ khác đều có (`team-builder:85`, `:156`, `battle-sessions:325`, `attendance:44`, `:67`,
`:123`, `characters:124`). Luật ở `apps/api/docs/backend.md` §3 hụt đúng một chỗ, âm thầm.

**Schema chiều ra hiện là type chết.** `characterSchema`, `attendanceRecordSchema`,
`battleSessionSchema`, `weekSchema`, `sessionFormationSchema`, `formationWeekSchema` chỉ được dùng
qua `z.infer`; không có chỗ nào ở API chạy `.parse()` trên chúng. Vì `satisfies` là kiểm tra biên
dịch, `row.guildClass as GuildClass` đi qua nó **không một tiếng động** — nếu database có giá trị
enum lạ (migration lệch, sửa tay), nó chảy thẳng ra client.

## Quyết định thiết kế

### 1. Một codec cho mỗi shape, đặt cạnh module sở hữu bảng

```ts
// modules/characters/characters.codec.ts
/**
 * Đổi một hàng Character thành object trả cho client.
 * @param row - Hàng đọc từ Prisma
 * @returns Nhân vật đúng shape contract
 */
export function toCharacter(row: CharacterRow): Character;
```

Re-export qua `characters.public.ts`. Cùng khuôn cho `toAttendanceRecord` (module `attendance`),
`toBattleSession` (đã có sẵn dưới dạng `private toEntity`, chỉ cần đưa ra file riêng).

Quy tắc chọn chỗ đặt: **codec thuộc module sở hữu bảng**, không thuộc module đọc. Nên
`toCharacter` ở `characters`, và `attendance` là caller.

### 2. `attendance` thôi truy vấn bảng `character`

`:31-46` (`getCharacters`) đổi thành gọi `CharactersService.list()`. Cùng lý do và cùng hình dạng
với A1: một bảng, một chủ.

`mark` ở `:91-94` chỉ kiểm tồn tại (`select: { id: true }`) — đổi thành
`charactersService.exists(characterId)`, hoặc giữ nếu muốn tránh đọc thừa; chọn **đổi**, để câu
"module khác không tự truy vấn bảng" đúng không có ngoại lệ nào phải nhớ.

### 3. Codec là chỗ duy nhất cast enum

Cast `as GuildClass` / `as AttendanceStatus` chỉ còn tồn tại bên trong codec, kèm đúng một bản của
comment giải thích. Không call site nào khác được viết `as` cho enum.

### 4. Chạy schema Zod ở chiều ra — chỉ ngoài production

```ts
// characters.codec.ts
const value = { … } satisfies Character;
return process.env.NODE_ENV === 'production' ? value : characterSchema.parse(value);
```

Đây là điểm đánh đổi rõ nhất của spec, nên nói thẳng lý do:

- **Vì sao chạy:** `satisfies` không bắt được `as`. Một enum lệch trong database là đúng loại lỗi
  mà `CLAUDE.md` yêu cầu *"fail loud"*, và hiện nó fail lặng.
- **Vì sao không chạy ở production:** `CLAUDE.md` cũng nói *"Validate at boundaries, trust
  TypeScript inside"* — dữ liệu ra khỏi process không phải biên nhận dữ liệu không tin được. Parse
  mọi response trong production là trả giá CPU cho một lớp lỗi đáng lẽ phải chết ở dev/CI.
- Đọc `process.env` trực tiếp là ngoại lệ với luật *"Nothing reads `process.env`"*; để không phá
  luật, giá trị đến từ `AppConfigService` và codec nhận cờ qua tham số, hoặc dùng một hằng số dựng
  một lần ở `config/`. Chọn hằng số ở `config/` — codec phải giữ được tính thuần.

Nếu người review thấy §4 quá tay, bỏ nó **không làm hỏng** phần còn lại của spec: §1–§3 vẫn đứng
độc lập. Ghi rõ ở đây để quyết định được tách ra khi grill.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `modules/characters/characters.codec.ts` (mới) | `toCharacter`, `CharacterRow` |
| `modules/characters/characters.public.ts` | re-export codec + `CharactersService.list/exists` |
| `modules/characters/characters.service.ts:117-125` | bỏ `toEntity` cục bộ, dùng codec |
| `modules/attendance/attendance.codec.ts` (mới) | `toAttendanceRecord` |
| `modules/attendance/attendance.service.ts:31-46` | gọi `CharactersService.list()`, bỏ truy vấn `prisma.character` |
| `modules/attendance/attendance.service.ts:60-68, 118-123` | cả hai dùng `toAttendanceRecord` |
| `modules/attendance/attendance.module.ts` | import `CharactersModule` |
| `modules/battle-sessions/battle-sessions.codec.ts` (mới) | `toBattleSession` (chuyển từ `private toEntity`, `:313-326`) |
| `modules/team-builder/team-builder.service.ts:214-222` | thêm `satisfies SessionFormation` |
| `config/` | hằng số `SHOULD_VERIFY_RESPONSES` (nếu giữ §4) |

## Edge case

- **`CharactersModule` ↔ `AttendanceModule`.** `attendance` import `characters`; `characters` không
  import `attendance`. Không có cycle, nên **không** cần `forwardRef()` — và theo `CLAUDE.md` nếu
  cần thì đó là dấu hiệu phải tách module thứ ba, không phải dấu hiệu dùng `forwardRef`.
- **`getCharacters` của attendance sắp theo `name asc`; `characters.list()` có thể sắp khác.** Kiểm
  trước khi đổi; nếu khác thì `list()` nhận tham số sắp xếp, đừng để màn điểm danh đổi thứ tự lặng.
- **`select` khác nhau.** `attendance` chỉ đọc `id, name, guildClass`; `characters.list()` có thể
  đọc nhiều hơn. Cùng shape `Character` nên không rò field, nhưng là đọc thừa — chấp nhận được với
  vài chục hàng, ghi lại để khỏi phải nghĩ lại.
- **`_count` của `battle-sessions`** chỉ codec đó biết; không gộp `SessionRow` với `CharacterRow`.

## Kiểm thử

- **Ba hàm mới đều thuần** → test round-trip không cần mock Prisma: hàng vào, shape ra, kể cả
  `markedAt` đúng ISO và `guildClass` đúng giá trị enum.
- `attendance.service.spec.ts` hiện **chỉ có** `describe('AttendanceService.mark')` — `getCharacters`
  và `getRecords` chưa có test nào. Sau khi tách codec, thêm test cho hai hàm đó ở mức service (mock
  `CharactersService`), phần dựng shape đã được codec test riêng.
- Nếu giữ §4: một test khẳng định giá trị enum lạ **ném** ở môi trường test.

## Rủi ro

- **`attendance` phụ thuộc `characters` là quan hệ module mới.** Kiểm bằng
  `module-boundary.spec.ts` sau khi thêm, và đảm bảo import đi qua `characters.public.ts` chứ không
  vào thẳng file.
- **§4 đổi hành vi ở môi trường dev/test**: dữ liệu seed lệch enum sẽ bắt đầu ném. Đó là mục đích,
  nhưng phải chạy `db:seed` lại một lần để chắc dữ liệu mẫu sạch.

## Ngoài phạm vi

- Parse response trong production (đã loại ở §4).
- Một interceptor validate mọi response tập trung — nó không biết shape nào ứng với route nào mà
  không thêm metadata cho từng handler; codec cạnh module rẻ hơn và đọc rõ hơn.
