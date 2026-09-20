# Bảng chiến thuật `/chien-thuat` — Design

Ngày: 2026-09-20 · Phạm vi: `packages/shared` (schema + enum mới), `apps/api` (module `tactics`,
một bảng và một bảng phụ trong Prisma), `apps/web` (feature `tactics` mới, `config/routes.ts`,
`components/shared/nav-items.ts`, `lib/page-banners.ts`, `public/img/bg/tactics.jpg`), tài liệu.
Không thêm biến môi trường. Không đụng luồng đăng nhập, điểm danh, xếp team.

## Bối cảnh

Bang đánh bang chiến trên một tấm map cố định. Hôm nay chiến thuật được bàn bằng lời trong Discord
và bằng ảnh vẽ tay dán lên kênh chat: không ai sửa lại được, không có phiên bản, và tuần sau thì
trôi mất.

App đã có màn Xếp team trả lời câu hỏi **ai đánh** (`FormationSlot`, mười cột đội). Cái còn thiếu là
**đánh ở đâu và theo thứ tự nào**. Spec này thêm một mục điều hướng thứ năm, `/chien-thuat`, để admin vẽ chiến
thuật lên ảnh map và cả bang mở ra xem.

Phạm vi cố tình hẹp: đây là **công cụ vẽ**, không phải mô phỏng trận đấu. Không có timeline chạy,
không có animation, không có tính toán gì trên dữ liệu vẽ. Máy chủ lưu và trả lại đúng cái admin đã
vẽ.

## Đọc đề bài

Yêu cầu gốc (`ba.md`, không commit) cộng với các câu đã chốt qua hỏi đáp:

| Câu hỏi | Chốt |
|---|---|
| Chiến thuật gắn với gì | Độc lập, có tên riêng. Không gắn tuần, không gắn `BattleSession` |
| Tên mười đội | Cố định `Đội 1`…`Đội 10` trong frontend, **không** đọc `TeamName` |
| Lưu gì | Chỉ JSON scene. Không lưu ảnh render |
| Mobile | Desktop vẽ, mobile chỉ xem |
| Cơ chế lưu | Thủ công (`Ctrl+S` / nút Lưu) + thanh chưa lưu + chặn rời trang |
| Xuất nhiều giai đoạn | Một file ZIP |
| Quân cờ tự đặt tên | Preset dùng chung, lưu DB |
| Công cụ chữ | Có |
| Undo | Theo từng giai đoạn, có redo |
| Quân cờ trên map | Kéo thả + đổi cỡ (ba cỡ), không xoay |
| Quyền `MEMBER` | Chỉ xem, **không** xuất ảnh |

Ba núm điều chỉnh thị giác, theo [`docs/design-direction.md`](../../design-direction.md):

| Núm | Giá trị | Vì sao |
|---|---|---|
| `DESIGN_VARIANCE` | 4 | Editor là công cụ, phải nhận ra ngay là cùng một app với Xếp team. Chỗ được phép lệch là thanh công cụ và bảng quân cờ — chúng không giống bất kỳ màn nào đang có |
| `MOTION_INTENSITY` | 2 | Chuyển động trong một trình vẽ là nhiễu. Chỉ giữ fade của `BannerImage` và transition sẵn có của shadcn |
| `VISUAL_DENSITY` | 7 | Màn dày đặc thao tác. Thanh công cụ và bảng quân cờ phải nhường tối đa diện tích cho map |

## Quyết định

### 1. Scene là một tài liệu JSON, không phải bảng nét vẽ chuẩn hoá

`Tactic.stages` là một cột `Json` chứa toàn bộ giai đoạn và mọi nét vẽ. Không có bảng
`TacticStage`, không có bảng `TacticElement`.

Lý do là **khả năng mở rộng**, không phải tiết kiệm công:

- Thêm một loại nét mới (vùng tô, hình tròn đánh dấu, icon kỹ năng) = thêm một nhánh vào
  discriminated union trong `packages/shared` và một nhánh render. **Không migration.** Ở phương án
  chuẩn hoá thì mỗi loại nét mới là một migration, sửa repository, sửa mapper.
- Editor luôn lưu **cả tài liệu** — người dùng bấm `Ctrl+S`, không bao giờ lưu một nét lẻ. Bảng
  chuẩn hoá phục vụ ghi từng phần, mà ở đây không có ghi từng phần.
- Truy vấn xuyên nét vẽ ("chiến thuật nào đặt Đội 3 ở cổng tây") chưa phải nhu cầu. Khi thành nhu
  cầu, Postgres truy vấn được thẳng trên `jsonb` mà không cần đổi lược đồ.

Cột `stages` đọc ra là dữ liệu **không tin được** — nó có thể được ghi bởi một bản cũ của app, hoặc
sửa tay. Service parse bằng Zod ngay khi đọc, đúng quy ước "Zod thuộc về nơi dữ liệu không tin được
đi vào, kể cả JSON ra khỏi database".

### 2. Tài liệu scene mang số phiên bản

Cột lưu `{ schemaVersion: 1, stages: [...] }`, không lưu trần mảng `stages`.

Đây là điểm mở rộng thật sự của phương án JSON. Khi định dạng đổi, `lib/migrate-scene.ts` đọc bản
cũ, nâng lên bản mới, và app ghi lại bản mới ở lần lưu kế tiếp. Không có trường này thì một thay đổi
định dạng buộc phải viết migration SQL đoán mò trên JSON — đúng cái bẫy mà người ta gán cho phương
án JSON.

`schemaVersion` lớn hơn bản app biết = lỗi rõ ràng bằng tiếng Việt, **không** cố đọc bừa. "Cấu hình
sai thì hỏng to, không hỏng thầm."

### 3. Quân cờ trên map chụp lại nhãn và icon, không trỏ về preset

Một `token` trong scene mang thẳng `label` và `icon`. Nó **không** giữ `presetId`.

Preset chỉ là bảng chọn — nguồn để kéo quân ra, không phải chủ sở hữu của quân đã đặt. Xoá một preset
không được phép làm hỏng chiến thuật đã lưu, và cũng không được phép âm thầm đổi nhãn của một quân đã
vẽ tuần trước. Một tài liệu scene tự đủ nghĩa, đọc được mà không cần join.

Đổi lại: đổi tên preset không lan sang chiến thuật cũ. Đúng ý muốn — chiến thuật cũ là ảnh chụp của
quyết định cũ.

### 4. Toạ độ lưu trong không gian map ảo 1920×1071

Mọi `x`, `y`, `points`, `strokeWidth`, `fontSize` lưu theo hệ toạ độ của chính tấm ảnh map
(`map-guild-war.webp`, 1920×1071), không theo pixel màn hình.

Tấm map là **WebP**, không phải PNG: ảnh đục hoàn toàn nên kênh alpha là thừa, và Konva nạp ảnh
bằng `new Image()` thô chứ không qua `next/image` — không có ai tối ưu hộ, trình duyệt tải đúng cái
file trong `public/`. WebP q90 là 193KB so với 2.74MB của PNG, cùng 1920×1071.

Konva `Stage` được scale bằng một hệ số duy nhất `stageWidth / 1920`. Nhờ vậy một chiến thuật vẽ trên
màn 27 inch mở ra trên laptop 13 inch vẫn trùng khít, và xuất ảnh ở `pixelRatio` nào cũng ra đúng bố
cục.

### 5. `/chien-thuat` là danh sách, `/chien-thuat/[id]` là editor

Editor là một route riêng, không phải dialog toàn màn hình.

Lý do: một chiến thuật là thứ người ta **gửi cho nhau**. Đường dẫn riêng dán được vào Discord và mở
thẳng ra bản vẽ. Dialog thì không có địa chỉ.

Cả hai route yêu cầu phiên đăng nhập nhưng **không** yêu cầu `ADMIN`: bang chúng vào xem được, nên
`/chien-thuat` **không** được thêm vào `ADMIN_PATH_PREFIXES` trong `proxy.ts`. Chặn ghi nằm ở
`AdminGuard` trên từng handler ghi của API; UI ẩn nút chỉ là trang trí.

### 6. Tẩy xoá là xoá phần tử, không phải một phần tử mới

Công cụ tẩy tìm phần tử nằm dưới con trỏ và bỏ nó khỏi mảng. Không có "nét tẩy" màu nền ghi đè lên
hình.

Nét tẩy màu nền sẽ hỏng ngay khi đổi ảnh map hoặc khi xuất ảnh nền trong suốt, và làm tài liệu phình
mãi. Xoá phần tử thì undo trả lại nguyên trạng, và kích thước tài liệu đi xuống khi người ta xoá.

### 7. Không khoá lạc quan (optimistic locking)

`PUT /tactics/:id/stages` ghi đè, không so sánh với bản client đã đọc. Hai admin sửa cùng một chiến
thuật thì người lưu sau thắng.

Giống hệt `PUT /team-builder/formations/:sessionId` và cùng một lý do đã ghi ở
[`architecture.md`](../../architecture.md) §8: bang có một đến hai admin. Xem lại khi có từ ba admin
sửa cùng một chiến thuật thường xuyên.

## Mô hình dữ liệu

```prisma
/// Một bản vẽ chiến thuật bang chiến. Độc lập: không gắn tuần, không gắn BattleSession.
model Tactic {
  id          String   @id @default(cuid())
  /// Tên hiển thị, do admin đặt.
  name        String
  description String?  @db.VarChar(500)
  /// Tài liệu scene: { schemaVersion, stages }, theo tacticSceneSchema trong @guild/shared.
  /// Dữ liệu không tin được khi đọc ra - service luôn parse bằng Zod, không cast.
  stages      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([updatedAt])
}

/// Quân cờ tự đặt tên, dùng chung cho mọi chiến thuật. Cấu hình toàn cục như TeamName:
/// không thuộc về một chiến thuật nào, nên không có quan hệ.
/// Quân đã đặt lên map KHÔNG trỏ về đây - nó chụp lại label và icon (quyết định 3).
model TacticTokenPreset {
  id        String   @id @default(cuid())
  label     String   @db.VarChar(40)
  /// Khoá trong TACTIC_TOKEN_ICONS (@guild/shared/enums). Không phải tên icon tự do.
  icon      String
  /// Thứ tự hiển thị trong bảng quân cờ.
  sortOrder Int
  createdAt DateTime @default(now())

  @@unique([label])
}
```

`Tactic` và `TacticTokenPreset` không có quan hệ với nhau và cũng không có quan hệ với `Character`
hay `BattleSession`. Chúng đứng riêng trong sơ đồ quan hệ, cùng nhóm với `TeamName` và `BotChannel`.

## Lược đồ scene (`packages/shared`)

`packages/shared/schemas/tactic.schema.ts`, discriminated union theo `kind`, mọi nhánh render kết
bằng `assertNever`:

```ts
tacticTokenSchema    = { kind: "token",    id, label, icon, x, y, size: "sm"|"md"|"lg", color }
tacticArrowSchema    = { kind: "arrow",    id, points: number[], color, strokeWidth }
tacticFreehandSchema = { kind: "freehand", id, points: number[], color, strokeWidth }
tacticTextSchema     = { kind: "text",     id, x, y, text, color, fontSize }

tacticElementSchema = discriminatedUnion("kind", [...])
tacticStageSchema   = { id, name, elements: tacticElementSchema[] }
tacticSceneSchema   = { schemaVersion: literal(1), stages: tacticStageSchema[] }
```

`packages/shared/enums/tactic.enum.ts`:

| Enum | Giá trị |
|---|---|
| `TACTIC_COLORS` | `red`, `blue`, `yellow`, `white` — bốn màu, lưu bằng khoá chứ không phải mã hex, để đổi bảng màu sau này không phải sửa dữ liệu cũ |
| `TACTIC_STROKE_WIDTHS` | `2`, `4`, `8`, `14` (đơn vị map ảo) |
| `TACTIC_TOKEN_SIZES` | `sm`, `md`, `lg` |
| `TACTIC_TOKEN_ICONS` | Bộ icon cho phép, khoảng 20 khoá ánh xạ sang `lucide-react` ở phía web |

Bảy quân mặc định (Đội công, Đội thủ, Cơ động, Trinh sát, Tập kết, Đội trụ, Bảo tiêu) và mười đội
`Đội 1`…`Đội 10` **không** nằm trong `packages/shared`: chúng là bảng chọn để hiển thị, không phải
shape đi qua mạng — scene đã chụp lại `label` và `icon` rồi (quyết định 3). Chúng sống ở
`features/tactics/lib/built-in-tokens.ts`.

Giới hạn cứng, kiểm ở Zod nên cả hai phía cùng một luật:

| Giới hạn | Giá trị | Vì sao |
|---|---|---|
| Số giai đoạn | ≤ 20 | Một trận bang chiến không có 20 pha |
| Phần tử mỗi giai đoạn | ≤ 400 | Nhiều hơn thì bản vẽ đã không đọc được |
| Điểm mỗi nét tự do | ≤ 4000 | Một nét kéo dài vài giây |
| Độ dài `text` | ≤ 80 ký tự | Ghi chú trên map, không phải đoạn văn |
| Tên giai đoạn | ≤ 40 ký tự | |
| `Tactic.name` | ≤ 80 ký tự | |
| `Tactic.description` | ≤ 500 ký tự | Khớp đúng `@db.VarChar(500)`, nếu không thì giới hạn database trả `500` thay vì `400` |

Vượt bất kỳ giới hạn nào = `400` kèm thông báo tiếng Việt, hiển thị nguyên văn cho người dùng. Ở mức
trần (20 × 400 phần tử) tài liệu vào khoảng vài trăm KB — dưới giới hạn body mặc định của Express.
Đó là mốc để xem lại phương án lưu nếu giới hạn phải nới.

## Backend — module `tactics`

`apps/api/src/modules/tactics/`: `tactics.module.ts`, `tactics.controller.ts`, `tactics.service.ts`,
`tactics.codec.ts`, `dto/`, `__tests__/`. **Không** tạo `tactics.public.ts`: hôm nay không module
nào gọi sang `tactics`, và dự án không dựng bề mặt công khai đầu cơ. File đó ra đời cùng module thứ
hai thực sự cần nó.

`tactics.codec.ts` giữ phần chuyển từ hàng Prisma sang shape của `@guild/shared/schemas`, và **cả
phần parse `stages` ra khỏi `Json`** — đó là nơi duy nhất `Prisma.JsonValue` được mở ra.

| Method | Path | Quyền | Việc |
|---|---|---|---|
| `GET` | `/tactics` | Bearer | Danh sách, **không** kèm `stages` (chỉ id, tên, mô tả, số giai đoạn, `updatedAt`) |
| `GET` | `/tactics/:id` | Bearer | Một chiến thuật kèm toàn bộ scene |
| `POST` | `/tactics` | Admin | Tạo mới, scene khởi tạo một giai đoạn tên `Giai đoạn 1`, không phần tử |
| `PATCH` | `/tactics/:id` | Admin | Đổi tên, mô tả |
| `PUT` | `/tactics/:id/stages` | Admin | Ghi đè toàn bộ scene |
| `DELETE` | `/tactics/:id` | Admin | Xoá |
| `GET` | `/tactics/token-presets` | Bearer | Danh sách preset, theo `sortOrder` |
| `POST` | `/tactics/token-presets` | Admin | Thêm preset |
| `DELETE` | `/tactics/token-presets/:id` | Admin | Xoá preset (chiến thuật đã vẽ không đổi) |

`JwtAuthGuard` đặt trên controller, `AdminGuard` đặt trên từng handler ghi. Đây là controller đầu
tiên của dự án trộn quyền đọc và quyền ghi trong cùng một file — `characters` và `team-builder` gác
cả controller, `battle-sessions` đã gác theo handler, nên mẫu này có sẵn tiền lệ.

Danh sách cố tình không trả `stages`: màn danh sách chỉ cần tên và số giai đoạn, còn scene là phần
nặng nhất của bản ghi.

## Frontend — feature `tactics`

```
apps/web/features/tactics/
├── api/         tactics.ts ("use server") + query key factory
├── hooks/       use-tactics, use-tactic, use-token-presets, use-save-tactic, …
├── store/       editor-store.ts — công cụ đang chọn, màu, cỡ nét, giai đoạn active,
│                scene đang sửa, ngăn undo/redo
├── lib/         scene.ts (tạo/sửa phần tử), hit-test.ts, history.ts, export-image.ts,
│                migrate-scene.ts, built-in-tokens.ts, token-icon.ts
├── types/
├── components/  tactic-list-screen, tactic-editor-screen, editor-toolbar, stage-bar,
│                token-palette, tactic-canvas, tactic-viewer, export-dialog,
│                token-preset-dialog, mobile-editor-notice
└── index.ts
```

Route và điều hướng:

- `config/routes.ts`: `tactics: "/chien-thuat"` và một hàm dựng đường dẫn editor.
- `components/shared/nav-items.ts`: mục **Chiến thuật**, icon `Swords`, `adminOnly: false`, chèn
  giữa Xếp team và Thiết lập.
- `lib/page-banners.ts`: khoá `tactics`, `src: "/img/bg/tactics.jpg"`, `tint: "#83653E"`.
  `tactics.jpg` là bản sao của tấm map đã làm phẳng nền và nén JPEG — cùng lý do
  `landing.jpg` là bản sao của `login.jpg`: một khoá, một file, đổi cái này không kéo theo cái kia.
- `app/chien-thuat/page.tsx` và `app/chien-thuat/[id]/page.tsx` — hai trang mỏng, mỗi trang render
  một component của feature.

Quy ước trạng thái, không có ngoại lệ:

- **TanStack Query** giữ dữ liệu đã lưu trên máy chủ.
- **Zustand** giữ scene đang sửa, công cụ đang chọn, và ngăn undo/redo. Scene đang sửa là trạng thái
  UI của một phiên vẽ chưa gửi đi, không phải bản sao của response.
- Mở editor = copy scene từ query vào store một lần. Lưu xong = invalidate query.

Konva:

- `konva` + `react-konva` cài vào `apps/web` (không phải root — root là marker).
- `tactic-canvas.tsx` nạp qua `next/dynamic` với `ssr: false`; Konva cần `window`.
- Một `Stage` duy nhất, scale `stageWidth / 1920`. Ảnh map ở `Layer` dưới, phần tử ở `Layer` trên.
- Đổi cỡ quân cờ bằng ba nút cỡ trên thanh công cụ khi đang chọn một quân, **không** dùng
  `Transformer` — không có xoay, không có resize tự do, nên handle chỉ là nhiễu.

Undo/redo:

- Ngăn riêng cho **từng giai đoạn**, mỗi ngăn tối đa 50 bước. Đổi giai đoạn không xáo trộn lịch sử
  của giai đoạn kia.
- `Ctrl+Z` hoàn tác, `Ctrl+Shift+Z` làm lại, `Ctrl+S` lưu. Phím tắt chỉ gắn khi editor mở và tiêu
  điểm không nằm trong ô nhập liệu.
- Thêm/xoá/đổi tên/nhân bản giai đoạn **không** vào ngăn undo — chúng là thao tác trên tài liệu, và
  một `Ctrl+Z` làm sống lại cả một giai đoạn đã xoá thì khó đoán hơn là một hộp thoại xác nhận.

Lưu và rời trang:

- Nút **Lưu** và `Ctrl+S`. Không tự động lưu.
- `components/shared/unsaved-changes-bar.tsx` dùng lại nguyên, cộng `beforeunload` khi còn thay đổi
  chưa lưu.

Xuất ảnh (admin):

- `stage.toDataURL({ pixelRatio: 2 })` cho giai đoạn đang mở.
- Nhiều giai đoạn: render từng giai đoạn vào một `Stage` ẩn rồi gói bằng `jszip`, tên file
  `<tên chiến thuật>-<số>-<tên giai đoạn>.png`.
- `MEMBER` không thấy nút xuất ảnh.

Mobile:

- `/chien-thuat` hoạt động đầy đủ: danh sách, mở xem.
- Trang xem dùng `tactic-viewer` — canvas chỉ đọc, pinch zoom và pan, chuyển giai đoạn bằng tab.
- Dưới `lg`, editor hiện `mobile-editor-notice`: "Mở trên máy tính để vẽ chiến thuật." Không dựng
  công cụ vẽ cảm ứng.

## Bố cục editor

```
┌─ đội hình | mũi tên | vẽ tự do | chữ | tẩy ‖ 4 màu ‖ 4 cỡ nét ‖ Hoàn tác Làm lại ‖ Lưu  Xuất ┐
├─ Giai đoạn 1* | Giai đoạn 2 | …            [+ Thêm giai đoạn] [⧉ Nhân bản]                   ┤
├──────────────┬───────────────────────────────────────────────────────────────────────────────┤
│ Quân cờ  [«] │                                                                               │
│ Đội công     │                                                                               │
│ Đội thủ      │                   map-guild-war.webp trên Konva Stage                          │
│ Cơ động      │                                                                               │
│ …            │                                                                               │
│ Đội 1…10     │                                                                               │
│ [+ Thêm đội] │                                                                               │
└──────────────┴───────────────────────────────────────────────────────────────────────────────┘
```

Quân cờ trên map là vòng tròn, icon `lucide-react` ở giữa, viền theo màu đang chọn trên thanh công
cụ. Bảng quân cờ bên trái collapse được, trạng thái collapse nằm trong Zustand và reset khi tải lại
trang — app chưa dùng `localStorage` ở đâu cả, và một tuỳ chọn hiển thị chưa đáng để mở đường đó. Màu sắc lấy nguyên token của `globals.css`, không đẻ màu mới ngoài bốn màu vẽ.

## Xử lý lỗi

- Lỗi API tới dưới dạng `ApiError` mang thông báo tiếng Việt của backend, hiển thị nguyên văn.
- Lưu hỏng thì **không** xoá trạng thái chưa lưu trong store: người vẽ còn nguyên bản vẽ để thử lại.
- `stages` trong DB không parse được = `500` với thông báo nêu rõ chiến thuật nào hỏng. Không trả
  scene rỗng, không "tự chữa" âm thầm.
- `schemaVersion` lớn hơn bản app biết = lỗi rõ ràng, mời cập nhật trang.

## Kiểm thử

Vitest (`apps/web/features/tactics/__tests__/`):

- `hit-test` — tẩy trúng quân cờ, trúng nét tự do, trượt thì không xoá gì.
- `history` — đẩy, hoàn tác, làm lại, tràn ngăn 50 bước, ngăn của hai giai đoạn độc lập nhau.
- `scene` — thêm/xoá/di chuyển/đổi cỡ phần tử trả về đối tượng mới, không sửa tại chỗ.
- `migrate-scene` — bản 1 đi thẳng qua; `schemaVersion` lạ thì ném lỗi.
- `built-in-tokens` — đủ bảy quân mặc định và mười đội, mỗi quân một icon hợp lệ.

Jest (`apps/api/src/modules/tactics/__tests__/`):

- CRUD chiến thuật và preset.
- Zod chặn vượt từng giới hạn, thông báo là tiếng Việt.
- `stages` hỏng trong DB làm `GET /tactics/:id` hỏng to, không trả scene rỗng.
- `AdminGuard` có mặt trên đúng các handler ghi; `MEMBER` đọc được, ghi thì `403`.

## Ngoài phạm vi

Ghi lại để không ai tưởng là sót:

- Không gắn chiến thuật với tuần hay `BattleSession`. Nếu cần, thêm một cột `sessionId` nullable về
  sau, không phải bây giờ.
- Không đăng chiến thuật sang Discord. Xuất ảnh rồi dán tay.
- Không có lịch sử phiên bản, không có khoá lạc quan (quyết định 7).
- Không đọc `TeamName`: mười đội trên bảng quân cờ là nhãn cố định.
- Không vẽ được trên điện thoại.
- Không có nhiều map: đúng một tấm `map-guild-war.webp`. Thêm map là đổi lược đồ scene, nên sẽ đi
  kèm `schemaVersion: 2`.
