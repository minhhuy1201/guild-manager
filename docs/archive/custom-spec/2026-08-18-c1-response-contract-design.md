# C1 — Đưa chiều response vào contract

Ngày: 2026-08-18 · Phạm vi: `packages/shared` + `apps/api` + `apps/web`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).

`packages/shared` hiện chỉ định nghĩa **body request**. Mọi shape **trả về** được khai báo tay hai
lần — một bản `*.entity.ts` ở API, một bản `types/*.ts` ở web — và không có gì buộc chúng khớp nhau.
Spec này đưa chiều response vào `packages/shared` và xoá 16 file khai báo trùng.

## Bối cảnh

Quy ước đã ghi ở `CLAUDE.md` và `architecture.md` §2:

> **`packages/shared` sở hữu mọi shape đi qua mạng** — một Zod schema, bọc thành DTO ở API và dùng
> để type các hàm fetch ở web. Không bao giờ khai lại một shape ở từng app.

Thực tế chiều request tuân thủ tuyệt đối (5 schema, mọi DTO đều `createZodDto` từ chúng), còn chiều
response **không có schema nào**. Tám shape bị khai hai lần:

| Shape | apps/api | apps/web |
|---|---|---|
| Character / Member | `characters/entities/character.entity.ts:4`, `attendance/entities/attendance.entity.ts:4` | `features/members/types/member.ts:4`, `features/attendance/types/attendance.ts:6` |
| AttendanceRecord | `attendance/entities/attendance.entity.ts:12` | `features/attendance/types/attendance.ts:53` |
| BattleSession | `battle-sessions/entities/battle-session.entity.ts:2` | `features/attendance/types/attendance.ts:19` |
| Week | `battle-sessions/entities/battle-session.entity.ts:21` | `features/attendance/types/attendance.ts:41` |
| MatchFormation | `team-builder/entities/formation.entity.ts:2` | `features/team-builder/types/session-formation.ts:14` (`WireMatch`) |
| SessionFormation | `team-builder/entities/formation.entity.ts:9` | `features/team-builder/types/session-formation.ts:20` |
| FormationWeek | `team-builder/entities/formation.entity.ts:31` | `features/team-builder/types/session-formation.ts:37` |
| AuthTokens / AuthUser | `auth/entities/auth.entity.ts:4,12` | `features/auth/api/auth-api.ts:7` |

Mức độ trùng lặp: comment tiếng Việt ở `formation.entity.ts:23-26` và `session-formation.ts:29-32`
giống nhau **từng chữ**, kể cả chữ `KHÔNG` viết hoa. `session-formation.ts:7` ghi thẳng phương pháp:
*"Một trận đúng như backend trả về"*.

Rủi ro cụ thể, không phải lý thuyết: chiều response được đọc ở **nhiều** call site hơn chiều request
(mỗi bảng, mỗi thẻ, mỗi derivation) trong khi request chỉ có một handler submit. Thêm một field vào
response hôm nay là sửa hai file ở hai app và hy vọng không quên.

## Quyết định thiết kế

### 1. Response schema nằm cạnh request schema, không tách package mới

Thêm vào chính các file `packages/shared/schemas/*.schema.ts` đang có. Không tạo
`packages/shared/contracts/`.

Lý do: một domain thì một file. Tách ra sẽ đẻ thêm một entry trong `exports` map, thêm một quy ước
"cái này ở đâu", trong khi `character.schema.ts` là chỗ hiển nhiên để tìm shape của nhân vật — cả
chiều gửi lẫn chiều nhận. `exports` map không đổi.

Quy ước tên: schema là `<tên>Schema`, type suy ra là `<Tên>` (`characterSchema` → `Character`).
Chiều request giữ nguyên tên đang có (`createCharacterSchema` → `CreateCharacterInput`).

### 2. Type ở compile time, **không** parse response lúc chạy

- API: `toEntity()` khai kiểu trả về là type suy ra từ schema. Không `schema.parse()` ở đường ra.
- Web: `apiFetch<Character[]>` như hiện nay, không parse.

Lý do: quy ước dự án là *"Validate at boundaries, trust TypeScript inside"* — Zod đặt ở chỗ dữ liệu
**không tin được** đi vào. Response do chính API này dựng từ dữ liệu chính nó vừa đọc; parse lại là
trả tiền CPU cho một bất biến mà trình biên dịch đã giữ. Cái spec này mua là **một định nghĩa duy
nhất**, không phải thêm một lớp kiểm tra lúc chạy.

Phương án đã cân nhắc và loại: `apiFetch` nhận thêm tham số schema và `parse` mọi response. Loại vì
YAGNI — chưa có lỗi nào bắt nguồn từ việc API trả sai shape so với chính khai báo của nó, và nó biến
mọi màn hình thành nơi có thể ném lỗi Zod tiếng Anh không hiển thị được cho người dùng.

Để lệch vẫn bị bắt sớm ở phía API, `toEntity()` dùng `satisfies`:

```ts
private toEntity(row: SessionRow) {
  return { … } satisfies BattleSession;
}
```

Thiếu field hay sai kiểu → lỗi biên dịch, `pnpm --filter api typecheck` trong CI chặn lại.

### 3. `Character` và `Member` gộp làm một

Hai interface hôm nay giống hệt nhau (`id`, `name`, `guildClass`) và cùng mô tả một hàng trong bảng
`Character`; chúng tách ra chỉ vì được viết ở hai module khác nhau. Gộp thành `characterSchema` duy
nhất, dùng cho cả `GET /characters` lẫn `GET /attendance/characters`.

Nếu sau này màn quản trị cần thêm field mà màn điểm danh công khai không được thấy, lúc đó mới tách
— và tách bằng cách `characterSchema.pick(...)`, không phải viết lại từ đầu.

### 4. `role` chuyển thành enum dùng chung

`AuthUserEntity.role` hiện là `typeof ADMIN_ROLE`, với `ADMIN_ROLE` nằm ở `apps/api/src/common`.
Shape này đi qua mạng nên hằng số đó phải chuyển sang `packages/shared/enums`:

```ts
// packages/shared/enums/role.enum.ts
export const ADMIN_ROLE = "admin";
export type Role = typeof ADMIN_ROLE;
```

`apps/api/src/common` re-export lại từ shared để các chỗ đang import không phải sửa hàng loạt, hoặc
sửa thẳng call site — tuỳ số lượng, kiểm tra bằng `grep -rn ADMIN_ROLE apps/api/src`.

### 5. Xoá `*.entity.ts` và `types/*.ts`, giữ helper

Xoá 5 file entity ở API và các interface trong 3 file type ở web. **Giữ lại**
`recordKey()` (`features/attendance/types/attendance.ts:68`) — đó là logic khoá map phía client,
không phải shape đi qua mạng; chuyển nó sang `features/attendance/lib/record-key.ts`.

## Thay đổi cụ thể

### `packages/shared/schemas/character.schema.ts`

```ts
/** Một nhân vật trong bang, đúng như API trả về. */
export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  guildClass: z.enum(GuildClass),
});

export type Character = z.infer<typeof characterSchema>;
```

### `packages/shared/schemas/attendance.schema.ts`

`attendanceRecordSchema` → `AttendanceRecord` (`characterId`, `sessionId`, `status`, `markedAt`).

### `packages/shared/schemas/battle-session.schema.ts`

`battleSessionSchema` → `BattleSession` (9 field, giữ nguyên doc comment đang có ở
`battle-session.entity.ts`), `weekSchema` → `Week`.

### `packages/shared/schemas/formation.schema.ts`

`matchFormationSchema` → `MatchFormation`, `sessionFormationSchema` → `SessionFormation`,
`formationWeekSchema` → `FormationWeek`. Tên `Wire*` ở web biến mất — nó vốn là cách gọi khác của
cùng thứ.

### `packages/shared/schemas/auth.schema.ts`

`authUserSchema` → `AuthUser`, `authTokensSchema` → `AuthTokens`.
Chú ý web đang có **hai** khai báo chồng nhau: `AuthTokens` (`lib/auth-cookies.ts:22`, chỉ 2 field)
và `AuthTokensResponse` (`api/auth-api.ts:7`, kế thừa thêm `user`). Sau spec này chỉ còn `AuthTokens`
từ shared; `auth-cookies.ts` import nó thay vì tự khai.

### `apps/api`

- Xoá `characters/entities/`, `attendance/entities/`, `battle-sessions/entities/`,
  `team-builder/entities/`, `auth/entities/`.
- Mỗi service đổi `import type { XEntity } from './entities/…'` thành
  `import type { X } from '@guild/shared/schemas'`, và `toEntity()` thêm `satisfies X`.
- `battle-sessions.module.ts:12-15` và `characters.module.ts:10` bỏ phần `export type {…}` — type
  giờ đến từ package, module khác không cần xin qua đây nữa. (Đây cũng là một nửa động lực của
  [C5](./2026-08-18-c5-module-seam-design.md).)

### `apps/web`

- Xoá interface trong `features/members/types/member.ts`,
  `features/attendance/types/attendance.ts`, `features/team-builder/types/session-formation.ts`.
- `features/*/index.ts` bỏ phần re-export type; nơi cần thì import thẳng từ `@guild/shared/schemas`.
  Việc này **giảm** bề mặt của các `index.ts` — `features/attendance/index.ts` hiện đang export 4
  type ra ngoài.
- `features/team-builder/lib/wire.ts` giữ nguyên: nó đổi giữa shape trên dây và `MatchDraft` nội bộ
  của màn hình, đó là chuyển đổi thật, không phải khai lại shape.

Sau khi sửa `packages/shared`: `pnpm --filter @guild/shared build`.

## Edge case

- **`z.enum(GuildClass)` với TypeScript enum** — Zod 4 nhận enum gốc. `AttendanceStatus` làm tương
  tự. Enum vẫn ở `packages/shared/enums`, schema chỉ tham chiếu.
- **`opponent: string | null`** — dùng `.nullable()`, không `.optional()`. API luôn gửi field này,
  giá trị `null`.
- **`markedAt`, `dateTime`, `deadline`, `weekStart`** là ISO string, không phải `Date`. Giữ nguyên
  `z.string()` như hiện tại (`isoDateTime` refine đã có trong `battle-session.schema.ts:4`, dùng lại
  cho cả chiều response).
- **`matches: MatchFormation[]` rỗng** — nghĩa "ngày này chưa xếp gì", đã ghi trong doc comment; giữ
  nguyên câu chữ khi chuyển sang schema.
- **Swagger** — các entity hiện là `interface` thuần, không có decorator, nên tài liệu response hôm
  nay vốn đã trống. Spec này không làm nó tệ hơn, cũng không sửa. Nếu muốn Swagger đọc được response
  thì `nestjs-zod` có `createZodDto` dùng được cho cả response — việc riêng.

## Kiểm thử

Không có test hành vi mới: đây là refactor giữ nguyên hành vi. Cái bắt lỗi là trình biên dịch.

- `pnpm --filter api typecheck` và `pnpm --filter web typecheck` phải xanh — `satisfies` ở mỗi
  `toEntity()` là chỗ lỗi sẽ nổ nếu shape lệch.
- Các spec hiện có của service (`battle-sessions.service.spec.ts`,
  `characters.service.spec.ts`, `attendance.service.spec.ts`, `team-builder.service.spec.ts`) chạy
  lại không sửa gì — nếu phải sửa thì nghĩa là đã đổi hành vi ngoài ý muốn.
- Thêm một test nhỏ ở `apps/web` khẳng định `Character` từ shared có đúng ba field, để việc thêm
  field vào contract là một thay đổi có chủ đích chứ không phải vô tình.

## Rủi ro

- **Diff lớn, chạm gần như mọi feature.** Nên làm thành một nhánh riêng, một commit cho
  `packages/shared`, một commit cho mỗi app, để review được từng phần.
- **Quên `pnpm --filter @guild/shared build`** → API chạy bằng `dist` cũ. Type vẫn xanh nên lỗi chỉ
  hiện lúc chạy. Đây chính là lý do [C6](./2026-08-18-c6-shared-package-identity-design.md) đáng làm
  ngay sau.

## Ngoài phạm vi

- Thêm field mới vào response (`isDeadlinePassed`, `weekEnd`) —
  [C2b](./2026-08-18-c2-schedule-flags-design.md).
- Parse response lúc chạy ở web — đã loại ở §2.
- Sinh client TypeScript từ OpenAPI thay cho schema viết tay — phương án lớn hơn nhiều, chỉ đáng bàn
  nếu số endpoint tăng gấp mấy lần.
