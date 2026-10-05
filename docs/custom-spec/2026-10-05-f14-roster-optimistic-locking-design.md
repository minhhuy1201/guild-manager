# F14 - Chống ghi đè đội hình (optimistic locking)

Ngày: 2026-10-05 · Trạng thái: **spec, chưa triển khai** · Nguồn ý tưởng:
[`2026-10-04-feature-ideas-overview.md`](2026-10-04-feature-ideas-overview.md) ý 14 · Liên quan:
[`2026-09-07-flow-audit-overview.md`](2026-09-07-flow-audit-overview.md) AD5 · Plan:
[`../custom-plan/2026-10-05-f14-roster-optimistic-locking-plan.md`](../custom-plan/2026-10-05-f14-roster-optimistic-locking-plan.md)

## 1. Vấn đề

Hai admin cùng mở `/xep-team`. Người lưu sau xoá mất thay đổi của người trước mà không ai biết.

`PUT /team-builder/formations/:sessionId` và `PUT /team-builder/team-names` đều "xoá sạch rồi dựng
lại từ payload" và không so với thứ client đã đọc. `architecture.md` §8 đang ghi đây là rủi ro chấp
nhận; spec này gỡ dòng đó.

Còn một biến thể không cần hai admin: thành viên trả lời "Không" hoặc khai nghỉ thì server gỡ họ khỏi
đội hình (`releaseCharacterFromSession`). Admin đang mở trang với nháp cũ bấm lưu sẽ **đặt lại người
vắng vào ô** - cũng âm thầm.

## 2. Mục tiêu

- Mỗi đội hình một ngày, và map tên đội, có một số version.
- Lưu với version cũ thì bị từ chối; client hiện dialog cho admin chọn.
- Server tự gỡ người khỏi đội hình cũng tăng version.

Ngoài phạm vi:

- `PUT /tactics/:id/stages` (§8 nhắc cùng chỗ) - màn khác, không thuộc `/xep-team`. Giữ dòng §8 cho
  tactic.
- Gộp tự động hai bản (merge theo ô). Dialog chỉ cho chọn một trong hai bản.
- Hiển thị realtime "ai đang sửa" (presence).
- Cho biết **ai** đã lưu bản mới: cần thêm cột người lưu; để sau nếu cần.

## 3. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Đơn vị khoá | Một ngày đánh (cả 1-2 trận), vì PUT ghi cả ngày một lần. Tên đội: cả map. |
| D2 | Server tự gỡ người | `releaseCharacterFromSession` tăng version khi thực sự gỡ được ít nhất một ô. Lưu nháp cũ sau đó bị từ chối thay vì đặt lại người vắng. Đổi lại: gần deadline admin gặp dialog nhiều hơn. |
| D3 | Tên đội | Có version riêng, cùng cơ chế với đội hình. |
| D4 | Dialog | Ba lựa chọn: `Tải bản mới nhất` (bỏ nháp của mình), `Vẫn ghi đè` (lưu nháp lên bản mới), `Đóng` (giữ nháp, chưa làm gì). |
| D5 | Mã lỗi | `412 Precondition Failed`, không phải 409. 409 đã có ba nghĩa ở `saveFormation` (trận đã đánh, quá `matchCount`, thành viên vừa bị xoá) và web đang coi mọi 409 là "trận đã khoá → refetch". Mã riêng là phân biệt được mà không đổi shape lỗi (`ApiError` chỉ mang `statusCode` + `message`). |
| D6 | Xoá thành viên | `CharactersService.remove` **không** tăng version: `saveFormation` đã lọc id không còn tồn tại, nên lưu nháp cũ không đưa người đã xoá trở lại. |
| D7 | PR | Tách khỏi F13 (xem mục 10). |

## 4. Mô hình

### 4.1 Lưu version ở đâu

**Đội hình:** cột mới `formationVersion Int @default(0)` trên `BattleSession`.

Lý do không đặt trên `FormationMatch`: dòng của nó bị xoá rồi tạo lại mỗi lần lưu, và một ngày chưa
xếp thì không có dòng nào. Một bảng riêng của team-builder (`sessionId` → version) cũng được, nhưng
cần nhánh "chưa có dòng thì tạo, có rồi thì so" và xử lý trùng khoá khi hai lần tạo đầu tiên đua nhau;
cột trên `BattleSession` luôn có sẵn, mọi lần lưu là một câu `UPDATE ... WHERE` duy nhất.

Ngoại lệ ranh giới: `BattleSession` thuộc module `battle-sessions`, nhưng **chỉ `team-builder` ghi
cột này** (trong transaction của chính nó). Comment trên cột trong `schema.prisma` ghi rõ điều đó.

**Tên đội:** bảng mới một dòng.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `Int @id @default(1)` | Luôn là 1. |
| `version` | `Int @default(0)` | |

Tên: `TeamNameVersion`. Migration tạo bảng **và chèn sẵn dòng `id = 1`**, bật RLS (cùng mẫu
`20260925004158_enable_rls_on_tactics`). Thiếu dòng là cấu hình hỏng → `findUniqueOrThrow` ném 500,
không tự tạo (fail loud).

Không đặt version lên từng dòng `TeamName`: map rỗng không có dòng nào để mang version.

### 4.2 Ghi có điều kiện

Lưu đội hình, trong transaction hiện có, **trước** `deleteMany`:

```ts
const { count } = await tx.battleSession.updateMany({
  where: { id: sessionId, formationVersion: input.version },
  data: { formationVersion: { increment: 1 } },
});
if (count === 0) throw new PreconditionFailedException(FORMATION_STALE);
```

Ném trong transaction → rollback, không xoá gì. Hai lần lưu đồng thời cùng version: câu `UPDATE` thứ
hai chờ khoá dòng, rồi Postgres (READ COMMITTED) đánh giá lại `WHERE` trên dòng mới → `count = 0` →
412. Không cần khoá advisory.

Tên đội: cùng mẫu trên `TeamNameVersion` (`where: { id: 1, version: input.version }`).

Thứ tự kiểm tra trong `saveFormation` giữ lỗi cụ thể nhất trước: 404 → 409 trận đã đánh → 409 quá
`matchCount` → 412 version (trong transaction). Trận đã đánh trả 409 kể cả khi version cũ: thông tin
"không sửa được nữa" quan trọng hơn.

### 4.3 Server tự gỡ người

`releaseCharacterFromSession(session, characterId, client)`: nếu `deleted.count + cleared.count > 0`
thì `client.battleSession.update({ where: { id }, data: { formationVersion: { increment: 1 } } })`
trên cùng client (transaction của caller). Gỡ 0 ô thì không tăng - không có gì thay đổi để admin phải
biết.

### 4.4 Message

| Hằng | Nội dung |
|---|---|
| `FORMATION_STALE` | `Đội hình ngày này vừa được lưu ở nơi khác (admin khác, hoặc có người báo vắng). Tải bản mới nhất hoặc ghi đè.` |
| `TEAM_NAMES_STALE` | `Tên đội vừa được admin khác lưu. Tải bản mới nhất hoặc ghi đè.` |

## 5. API và contract

Mọi shape trong `packages/shared/schemas/formation.schema.ts`.

| Endpoint | Thay đổi |
|---|---|
| `GET /team-builder/formations` | Mỗi `SessionFormation` thêm `version: number`. |
| `PUT /team-builder/formations/:sessionId` | Body `{ matches, version }`; `version: z.number().int().nonnegative()`. Trả `SessionFormation` với version mới. Sai version → 412. |
| `GET /team-builder/team-names` | Đổi từ `TeamNames` sang `{ names: TeamNames, version: number }` (`teamNamesStateSchema`). |
| `PUT /team-builder/team-names` | Body `{ names, version }`. Trả `{ names, version }` mới. Sai version → 412. |

`version` là bắt buộc, không có mặc định: body thiếu nó là client cũ và phải bị từ chối, không được
âm thầm lưu đè (đúng cái lỗi đang sửa).

**Cửa sổ deploy:** API và web deploy độc lập. Tab web mở từ trước bản mới sẽ gửi PUT thiếu `version`
→ 400 với message Zod; GET tên đội trả shape mới mà bản web cũ đọc như map. Chấp nhận: chỉ admin dùng
`/xep-team`, tải lại trang là hết. Ghi vào PR body.

## 6. Web

### 6.1 Nháp nhớ version gốc

Nháp phải mang **version của bản server nó được tạo từ** (`baseVersion`), không đọc version từ query
lúc bấm lưu. Lý do: TanStack Query tự refetch (mặc định khi focus lại tab, `staleTime` 60s trong
`components/providers.tsx`), bản lưu dưới nháp đổi sang version mới, và nếu lưu bằng version đó thì
khoá vô dụng.

- `formation-store`: mỗi nháp ngày lưu `{ matches, baseVersion }` (hoặc map `baseVersions` song song
  - để plan chọn). `ensureDraft` nhận version của bản lưu hiện tại; `seedFrom` (prefill) cũng vậy.
- `team-name-store`: nháp lưu `baseVersion` cùng cách.
- Undo về trạng thái "không có nháp" xoá luôn `baseVersion`.

### 6.2 Lưu và dialog

`handleSave` / `save` gửi `baseVersion`. Nhánh lỗi:

- 412 → đánh dấu phần đó xung đột, mở dialog. Nháp giữ nguyên.
- 409 → giữ hành vi hiện tại (refetch, màn chuyển read-only).

Màn hình đang chạy hai lần lưu song song (`Promise.all` trong `team-builder-screen.tsx`). Một dialog
duy nhất liệt kê phần bị xung đột: `đội hình <nhãn ngày>`, `tên đội`, hoặc cả hai. Phần lưu thành công
thì đã xong, không nằm trong dialog.

Component `save-conflict-dialog.tsx` trong `features/team-builder/components/`, dựng trên
`components/shared/mutation-dialog.tsx`. Ba nút (D4):

| Nút | Làm gì |
|---|---|
| `Tải bản mới nhất` | Xoá nháp của phần xung đột, refetch. Màn hiện bản server. |
| `Vẫn ghi đè` | Refetch phần xung đột, đặt `baseVersion` của nháp = version vừa đọc, lưu lại nháp. Lần lưu này lại 412 (có người lưu tiếp trong lúc đó) → dialog mở lại. |
| `Đóng` | Không làm gì; nháp và nút Lưu còn nguyên. |

`Vẫn ghi đè` có kiểu nút nguy hiểm (destructive) vì nó xoá công người kia. Với đội hình, dialog nhắc
thêm một dòng: `Người đã báo vắng có thể bị đặt lại vào đội hình.` - banner người vắng
(`absent-banner.tsx`) vẫn chỉ ra họ sau khi ghi đè.

### 6.3 Trạng thái phụ

- Lưu thành công → nháp bị xoá như hiện nay, query refetch, version mới đến từ server.
- Đổi tuần / đổi ngày giữa chừng không ảnh hưởng: `baseVersion` gắn theo từng `sessionId`.

## 7. Lỗi và trường hợp biên

| Trường hợp | Kết quả |
|---|---|
| A và B mở cùng ngày, A lưu, B lưu | B nhận 412, dialog. |
| A lưu hai lần liên tiếp | Lần hai dùng version mới (nháp đã xoá sau lần một, nháp mới tạo từ bản đã refetch). Không 412. |
| A lưu khi nháp được tạo trước một lần refetch | Vẫn gửi `baseVersion` cũ → 412 nếu server đã đổi, lưu bình thường nếu chưa. |
| Thành viên báo "Không" khi A đang sửa ngày đó | Version tăng; A lưu → 412. |
| Thành viên báo "Không" nhưng không có trong đội hình | Version không đổi. |
| Thành viên bị xoá khi A đang sửa | Version không đổi; lưu thành công, id đã xoá bị lọc (D6). |
| Ngày đã đánh + version cũ | 409 (khoá thắng). |
| Hai PUT đồng thời cùng version | Một thành công, một 412 (mục 4.2). |
| Đổi tên đội và đội hình cùng lúc, chỉ tên đội xung đột | Đội hình lưu xong; dialog chỉ nói về tên đội. |
| Retention xoá `FormationMatch` cũ | Không đụng `formationVersion`. |
| Dòng `TeamNameVersion` bị mất | GET/PUT tên đội 500 - lỗi cấu hình, phải lộ ra. |

## 8. Kiểm thử

API (Jest, Prisma mock như các test hiện có - repo không có test chạy DB thật, nên tính đúng khi
đồng thời dựa trên ngữ nghĩa `UPDATE ... WHERE` mô tả ở 4.2, không test được ở đây):

- `saveFormation`: đúng version → tăng 1 và ghi; sai version → 412, không gọi `deleteMany`; thứ tự
  404 → 409 → 409 → 412; response mang version mới.
- `getFormations`: trả `version` của từng ngày.
- `releaseCharacterFromSession`: gỡ ≥1 ô → tăng version qua client được truyền vào; gỡ 0 ô hoặc ngày
  đã đánh → không tăng.
- `saveTeamNames` / `getTeamNames`: như trên với `TeamNameVersion`; thiếu dòng → ném.
- Schema shared: thiếu `version` → 400.
- `migration-rls.spec.ts` bắt bảng mới thiếu RLS (đã có sẵn).

Web (Vitest):

- Store: `ensureDraft` / `seedFrom` ghi `baseVersion`; refetch không đổi `baseVersion` của nháp đang có.
- `useFormationDraft.handleSave`: gửi `baseVersion`; 412 → trạng thái xung đột, nháp còn; 409 → hành vi cũ.
- `useTeamNameDraft.save`: tương tự.
- Dialog: ba nút làm đúng việc; `Vẫn ghi đè` gặp 412 lần nữa → dialog mở lại; chỉ liệt kê phần xung đột.

## 9. Tài liệu phải cập nhật

- `docs/architecture.md`: §8 bỏ đoạn "No optimistic locking on the roster", chỉ giữ cho tactic; §5
  dòng `BattleSession` (cột `formationVersion`, chỉ team-builder ghi), dòng `TeamName` + model mới
  `TeamNameVersion`, dòng `FormationSlot` (gỡ người tăng version); bảng endpoint (body có `version`,
  412).
- `schema.prisma`: comment trên cột và model mới.
- `docs/custom-spec/2026-09-07-flow-audit-overview.md` AD5: ghi đã xử lý, link spec này.

## 10. Một PR hay hai

Hai PR, F14 một PR riêng:

- Không chung code: F13 nằm trong `discord-bot`, F14 nằm trong `team-builder`, `packages/shared`,
  web, và có migration.
- Merge PR chạm `apps/api` có migration thì CI migrate production trước khi deploy (CLAUDE.md,
  "Shipping"). Tách ra thì F13 không phải chờ, và rollback từng cái độc lập.
- F13 cần `discord:register` sau deploy; F14 cần admin tải lại `/xep-team`. Hai thao tác sau deploy
  khác nhau, dễ ghi vào PR body hơn khi tách.
- Giới hạn 900 dòng mỗi PR: ước lượng [suy luận] F13 khoảng 250-400 dòng, F14 khoảng 600-900 dòng
  (shared schema, migration, service, hai store, dialog, test). Gộp gần như chắc vượt.

## Nguồn

- Ghi đè cả ngày: `apps/api/src/modules/team-builder/team-builder.service.ts` (`saveFormation` -
  "Overwrite the WHOLE day's formation", `tx.formationMatch.deleteMany({ where: { sessionId } })`).
- Ghi đè cả map tên đội: cùng file, `saveTeamNames` (`tx.teamName.deleteMany({})`).
- Server tự gỡ người: cùng file, `releaseCharacterFromSession`.
- Lọc thành viên đã xoá khi lưu: cùng file, `this.characters.listIds(tx)` → `knownIds.has(characterId)`.
- Ba nghĩa của 409: cùng file (`Trận này đã đánh xong`, `Ngày này chỉ đánh ... trận`, `Có thành viên vừa bị xoá`).
- Web coi 409 là khoá: `apps/web/features/team-builder/hooks/use-formation-draft.ts` (`CONFLICT_STATUS = 409`, `handleSave`).
- Lưu song song hai phần: `apps/web/features/team-builder/components/team-builder-screen.tsx:82`
  (`Promise.all([screen.draft.handleSave(), screen.teamNames.save()])`).
- `ApiError` chỉ có `message` + `statusCode`: `apps/web/lib/api-client.ts:10`.
- `staleTime: 60 * 1000`: `apps/web/components/providers.tsx:27`.
- `PreconditionFailedException` có trong `@nestjs/common`: `apps/api/node_modules/@nestjs/common/exceptions/precondition-failed.exception.d.ts`.
- Rủi ro đang được chấp nhận: `docs/architecture.md` §8 ("No optimistic locking on the roster or on a tactic").
- Kiểm tra AD5: `docs/custom-spec/2026-09-07-flow-audit-overview.md` AD5.
- RLS bảng mới: `docs/production.md` §5, `apps/api/prisma/migrations/20260925004158_enable_rls_on_tactics`.
- Postgres READ COMMITTED đánh giá lại `WHERE` sau khi chờ khoá dòng: https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED
  (đã đọc 2026-10-05) - "The search condition of the command (the `WHERE` clause) is re-evaluated to
  see if the updated version of the row still matches the search condition."
