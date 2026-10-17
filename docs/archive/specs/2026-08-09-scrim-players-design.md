# Quản lý người Scrim

Ngày: 2026-08-09

## Bối cảnh

Bang có những trận ngoài Bang Chiến (trận scrim do quản trị viên tự tạo trong tuần). Ở các trận
đó bang hay mượn người ngoài — không phải thành viên bang, không điểm danh, nhưng vẫn phải xếp
vào đội hình.

Hiện tại `/xep-team` chỉ xếp được người có trong bảng `Character` và đã điểm danh "Có" cho trận
đang mở. Không có chỗ nào để giữ danh sách người ngoài.

## Mục tiêu

1. Tab **"Quản lý người Scrim"** ở `/thiet-lap`, CRUD giống tab "Quản lý thành viên".
2. Ở `/xep-team`, thêm một khu vực dưới khu "Thành viên chưa xếp" liệt kê người Scrim và cho kéo
   thả vào ô đội hình. Khu này ẩn ở trận Guild War.
3. Người Scrim tách biệt hoàn toàn khỏi điểm danh: không xuất hiện ở màn Điểm danh lẫn Lịch sử
   điểm danh.

## Ngoài phạm vi

- Người Scrim không điểm danh, không có lịch sử, không có thống kê.
- Không nhập hàng loạt, không import từ trận trước.

## Quyết định thiết kế

### Bảng riêng, không phải cờ trên `Character`

Chọn bảng `ScrimPlayer` riêng thay vì thêm cột `isScrim` vào `Character`.

Cờ boolean rẻ hơn nhiều về lượng code (`FormationSlot`, wire format, prefill, store đều không phải
đụng), nhưng đổi lại mọi truy vấn điểm danh, lịch sử và tab thành viên đều phải nhớ lọc
`isScrim = false`. Quên một chỗ là người ngoài lọt vào bảng điểm danh của bang. Bảng riêng khiến
việc đó không thể xảy ra.

### Phân biệt hai loại bằng prefix id `s_`

Hệ quả của bảng riêng: một ô đội hình có thể chứa hai loại thực thể, mà toàn bộ tầng UI hiện nay
(`Assignment`, drag data, `charactersById`, diff, store) đang dùng **một chuỗi id đục duy nhất**.

Giải pháp: giữ nguyên một không gian id chung, đảm bảo hai loại id không bao giờ đụng nhau.

```
Character.id    → "meo-beo-k7ma3x"
ScrimPlayer.id  → "s_tu-hai-9xq2mp"
```

Prefix `s_` là **một phần của chính id**, không cắt đi ở bất cứ đâu:

```
wire:  slots: { "team-1-pos-1": "meo-beo-k7ma3x",
                "team-1-pos-2": "s_tu-hai-9xq2mp" }

DB:    slot1.characterId   = "meo-beo-k7ma3x"
       slot2.scrimPlayerId = "s_tu-hai-9xq2mp"
```

Giá trị trên dây = giá trị trong database = giá trị trong UI. Không có bước strip/re-add ở đâu cả.

**Bất biến đỡ toàn bộ thiết kế:** `slugifyName` chỉ sinh `[a-z0-9-]`, không bao giờ có `_`, nên
id `Character` không thể bắt đầu bằng `s_`. Có test riêng khẳng định điều này.

Hai phương án khác đã cân nhắc và bỏ:

- **Tách hai map trên wire** (`slots` + `scrimSlots`): tường minh hơn, không dựa vào quy ước đặt
  tên, nhưng UI vẫn phải gộp hai map thành một `Assignment` để kéo thả rồi tách lại khi lưu —
  thêm một lớp map hai chiều ở `wire.ts`, `formation-diff`, `prefill` và toàn bộ test đi kèm.
- **Id có nhãn `{ kind, id }`**: tường minh nhất, nhưng chạm vào gần như toàn bộ lib của
  team-builder và 12 file test hiện có.

## Data model

```prisma
/// Người chơi ngoài bang, được mượn cho các trận scrim. Không điểm danh.
model ScrimPlayer {
  /// Khoá chính do hệ thống sinh: "s_" + slug tên + hậu tố ngẫu nhiên.
  /// Prefix "s_" phân biệt với id Character — slugify không bao giờ sinh dấu gạch dưới.
  id         String     @id
  name       String
  guildClass GuildClass
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  formationSlots FormationSlot[]

  @@index([guildClass])
}

model FormationSlot {
  matchId       String
  slotId        String
  characterId   String?
  /// Người ngoài bang đứng ở ô này. Loại trừ lẫn nhau với characterId.
  scrimPlayerId String?
  note          String?

  match       FormationMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  character   Character?     @relation(fields: [characterId], references: [id], onDelete: Cascade)
  scrimPlayer ScrimPlayer?   @relation(fields: [scrimPlayerId], references: [id], onDelete: Cascade)

  @@id([matchId, slotId])
  @@index([characterId])
  @@index([scrimPlayerId])
}
```

Migration thêm CHECK constraint bằng SQL thô: một ô không được vừa có `characterId` vừa có
`scrimPlayerId`.

```sql
ALTER TABLE "FormationSlot"
  ADD CONSTRAINT "FormationSlot_one_occupant"
  CHECK (NOT ("characterId" IS NOT NULL AND "scrimPlayerId" IS NOT NULL));
```

## `packages/shared`

- `lib/occupant-id.ts` — `SCRIM_ID_PREFIX = "s_"` và `isScrimId(id)`. Frontend và backend dùng
  chung đúng một hàm; đây là nơi duy nhất biết về quy ước prefix.
- `schemas/scrim-player.schema.ts` — `createScrimPlayerSchema` / `updateScrimPlayerSchema`, cùng
  shape với character (`name` trim, 1–50 ký tự; `guildClass` là enum `GuildClass`).

Wire format của đội hình (`assignmentSchema`, `matchSchema`, `saveFormationSchema`) **không đổi**.

## Backend (`apps/api`)

### Refactor dùng chung

Chuyển `slugifyName`, `randomString` và `generateId` từ `modules/characters/characters.lib.ts`
sang `common/lib/id.ts`. `generateId` nhận thêm prefix tuỳ chọn để module scrim dùng lại thay vì
copy. Module `characters` import từ chỗ mới.

### Module `scrim-players`

Gương của module `characters`: controller → service → prisma.

| Route | Việc |
|---|---|
| `GET /scrim-players` | Danh sách, sắp theo tên |
| `POST /scrim-players` | Thêm, id do hệ thống sinh (`s_` + slug + hậu tố) |
| `PATCH /scrim-players/:id` | Sửa tên và/hoặc lưu phái |
| `DELETE /scrim-players/:id` | Xoá, 204 |

`JwtAuthGuard` đặt ở cấp controller — chỉ quản trị viên.

Xoá là cascade xuống `FormationSlot`, **không** đếm trước xem người đó đang đứng ở bao nhiêu ô.
Dialog xác nhận giống hệt dialog xoá thành viên.

Xử lý đụng id ngẫu nhiên (`P2002`) giống `CharactersService.create`: sinh lại một lần.

### `TeamBuilderService`

Ba chỗ đổi, không thêm endpoint nào:

1. `loadCharacterIds` → `loadKnownIds`: hợp của id `Character` và id `ScrimPlayer`.
2. `buildSlotRows`: đọc `isScrimId(id)` để quyết định ghi giá trị vào `characterId` hay
   `scrimPlayerId`.
3. `getFormations`: giá trị của một ô là `characterId ?? scrimPlayerId`. Ô chỉ có ghi chú vẫn
   không xuất hiện trong `slots`.

**Trận Guild War:** id scrim bị lọc im lặng ở bước "lọc trước khi ghi" vốn đã có sẵn, thay vì ném
409. Danh sách scrim bị ẩn ở Guild War và prefill không chép scrim, nên đường duy nhất để id scrim
lọt vào payload của một trận Guild War là client bịa ra — lọc là đủ, không cần dựng lỗi và thông
báo cho một trạng thái người dùng không tạo ra được.

## Frontend (`apps/web`)

### Tab mới

Feature `features/scrim-players/`, gương của `features/members/`:

```
api/        scrim-players-api.ts, scrim-players-keys.ts
components/ scrim-players-panel.tsx, scrim-player-row.tsx,
            scrim-player-form-dialog.tsx, delete-scrim-player-dialog.tsx
hooks/      use-scrim-players.ts, use-scrim-player-mutations.ts
types/      scrim-player.ts
index.ts
```

`settings-tabs.tsx` thêm tab thứ ba "Quản lý người Scrim" kèm icon, theo đúng quy ước mọi tab đều
có icon.

**Không** trừu tượng hoá hai panel thành một `<RosterPanel>` chung dù chúng gần trùng nhau. Hai
feature độc lập, chưa có sức ép thật, và quy ước dự án cấm import xuyên internals của feature khác
nên abstraction sẽ phải đẩy lên `components/shared/` với một chuỗi prop nhãn. Khi nào có loại
danh sách người thứ ba thì tính lại.

### `/xep-team`

Thêm component `ScrimPool`, đặt ngay dưới `MemberPool`:

- **Ẩn khi** trận đang mở có `isGuildWar = true`, hoặc khi màn ở chế độ read-only (tuần cũ, trận
  đã qua giờ đánh) — cùng luật với `MemberPool`.
- **Nội dung:** toàn bộ người Scrim trừ những ai đang đứng trong trận đang mở. Không lọc theo
  điểm danh — họ không có điểm danh.
- **Droppable id** `scrim-pool`. `toDropTarget` map id này về `{ kind: "pool" }`: thả một thành
  viên vào khu scrim chỉ nghĩa là gỡ khỏi ô, không phát sinh ngữ nghĩa mới.
- **Drag data** tái dùng `MemberDragData` nguyên vẹn — id là chuỗi đục, tầng kéo thả không cần
  biết loại.

Các chỗ khác của màn xếp team:

- `charactersById` gộp thêm người Scrim để ô lưới và `DragOverlay` vẽ được tên và lưu phái. Thẻ
  của người Scrim mang badge "Scrim" để người xếp phân biệt được với thành viên bang.
- `absentIds` **loại trừ** id scrim. Nếu không, mọi người Scrim đã xếp đều bị gắn nhãn "đã báo
  nghỉ" oan, vì họ không bao giờ có bản ghi điểm danh.
- `buildPrefill` **bỏ qua** id scrim khi chép đội hình từ trận trước, và không tính chúng vào
  `droppedCount` — con số đó có nghĩa là "gỡ vì báo nghỉ", không phải "không chép".
- Xoá một người Scrim thì invalidate cả query formations, không chỉ query danh sách scrim.
- `pool.ts` và `useSessionPool` **không đổi**: chúng chỉ làm việc với thành viên bang. Khu scrim
  là một dẫn xuất riêng.

### Gỡ bỏ "Thiếu phái"

Thanh "Thiếu phái" bị xoá. Nó là thuần frontend, không có endpoint nào phía API. Xoá bốn chỗ:

- `features/team-builder/components/class-shortage.tsx`
- `features/team-builder/lib/class-shortage.ts`
- `features/team-builder/lib/__tests__/class-shortage.test.ts`
- lời gọi `<ClassShortage>` trong `team-builder-screen.tsx`

## Edge case

| Tình huống | Xử lý |
|---|---|
| Người Scrim bị xoá khi đang nằm trong nháp chưa lưu | Đã có sẵn: lọc theo known ids trước khi ghi, ô rơi mất, ghi chú của ô giữ nguyên |
| Người Scrim đã xếp ở trận 1, mở trận 2 | Vẫn hiện trong khu scrim kèm nhãn "đang đánh trận 1", giống hệt thành viên bang |
| Thứ 7 có thêm một trận scrim do quản trị viên tạo | `isGuildWar = false` nên khu scrim **vẫn hiện**. Luật ẩn bám vào cờ Guild War, không bám vào thứ trong tuần |
| Đội hình quá 8 tuần | Purge hiện có xoá theo `FormationMatch`, cascade xuống slot — không phải đụng gì |
| Tên người Scrim trùng tên thành viên bang | Không sao, id mới là thứ phân biệt — đúng luật đang áp dụng cho `Character` |
| Người Scrim còn trong đội hình của một trận đã đánh xong | Xoá vẫn cascade, ô trong lịch sử mất người nhưng giữ ghi chú |

## Tài liệu

`README.md` đang mô tả `/thiet-lap` là "Hai tab" — sửa thành ba tab và kể thêm tab mới.

## Test

Thêm:

- Bất biến id: `generateId` cho `Character` không bao giờ trả về chuỗi bắt đầu bằng `s_`, kể cả
  khi tên đầu vào là "Scrim Boy" hay chuỗi toàn ký tự lạ.
- `scrim-players.service.spec`: CRUD, sinh id có prefix, xử lý `P2002`, 404 khi id không tồn tại.
- `team-builder.service.spec`: routing id vào đúng cột, đọc ngược `characterId ?? scrimPlayerId`,
  lọc id scrim khi trận là Guild War.
- Dẫn xuất khu scrim pool: trừ người đã xếp trong trận đang mở, không lọc theo điểm danh.
- `buildPrefill` bỏ id scrim và không cộng vào `droppedCount`.
- `toDropTarget("scrim-pool")` trả về `{ kind: "pool" }`.

Bớt: `lib/__tests__/class-shortage.test.ts`.
