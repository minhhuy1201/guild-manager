# Ghi chú chiến thuật và layout gọn cho màn chi tiết - Design

Ngày: 2026-09-30 · Phạm vi: `packages/shared` (schema tactic), `apps/api` (module `tactics`, một
migration), `apps/web` (feature `tactics`), tài liệu. Không thêm endpoint, không thêm biến môi
trường, không đổi lược đồ scene (`schemaVersion` giữ nguyên).

## Bối cảnh

Màn `/chien-thuat/[id]` hiện mở đầu bằng `PageHeader` có ảnh banner (breadcrumb, `<h1>`, dải hoa
văn), rồi toolbar và thanh giai đoạn nằm riêng từng khối, rồi mới tới khung chứa bảng quân cờ và
map. Người vẽ phải cuộn qua phần trang trí trước khi tới map.

Yêu cầu:

1. Bỏ ảnh banner ở màn chi tiết; breadcrumb thành một hàng.
2. Toolbar và bảng quân cờ ghép thành chữ L quanh map, trong cùng một khung.
3. Mỗi chiến thuật có một ghi chú dài (diễn giải, lưu ý khi đánh). Chỉ admin viết; mọi thành viên
   đọc.

## Quyết định

### 1. Header một hàng

- Màn chi tiết không dùng `PageHeader` nữa. Thay bằng `TacticHeader`
  (`features/tactics/components/tactic-header.tsx`, thay cho `tactic-breadcrumb.tsx`):
  `← Chiến thuật / <Tên chiến thuật>` trên một hàng.
- Mũi tên và chữ "Chiến thuật" đều là link về `ROUTES.tactics`, như cũ. Tên chiến thuật là `<h1>`
  của trang, cỡ `text-lg`, nằm ngay sau `<nav>` breadcrumb (không nằm trong nó: `<h1>` là tiêu đề
  trang, không phải một mắt xích).
- Không còn nền ảnh nên chữ dùng màu thường (`text-muted-foreground` cho mắt xích,
  `text-foreground` cho tên), không còn màu trắng trên scrim.
- Khi chiến thuật chưa tải xong, `<h1>` là "Đang tải..." như trước.
- Màn danh sách `/chien-thuat` giữ nguyên `PageHeader` có banner.
- Lý do: màn này là công cụ làm việc, map là nội dung chính. `apps/web/docs/frontend.md` §6 ghi
  ngoại lệ này.

### 2. Khung editor ba hàng

Chỉ áp cho admin trên máy tính (`canDraw`). Một khung `rounded-xl border bg-card`:

```
┌──────────────────────────────────────────────┐
│ EditorToolbar                                │  border-b
├────────┬──────────────────────┬──────────────┤
│ Token  │                      │ Ghi chú      │
│ palette│         MAP          │ chiến thuật  │
├────────┴──────────────────────┴──────────────┤
│ StageBar + play/onion                        │  border-t
└──────────────────────────────────────────────┘
```

- `EditorToolbar` và `StageBar` bỏ khung riêng (`rounded-lg border bg-card shadow-xs`) vì đã nằm
  trong khung chung. Cả hai chỉ được dùng ở màn này.
- `TacticViewer` (thành viên, và admin trên điện thoại) giữ layout cũ: tab giai đoạn phía trên, map
  phía dưới.

### 3. Dữ liệu ghi chú

- `Tactic` thêm cột `notes String? @db.Text`. Migration chỉ thêm một cột nullable, dữ liệu cũ giữ
  nguyên (mọi chiến thuật có sẵn có `notes = null`).
- `@guild/shared`:
  - `TACTIC_LIMITS.tacticNotesLength = 5000`.
  - `tacticNotesSchema`: chuỗi, `trim`, tối đa 5000 ký tự, lỗi "Ghi chú chiến thuật tối đa 5000 ký
    tự.".
  - `updateTacticSchema` thêm `notes: tacticNotesSchema.nullable().optional()`.
  - `tacticDetailSchema` thêm `notes: z.string().nullable()`.
  - `tacticSummarySchema` và `createTacticSchema` không đổi: danh sách không tải ghi chú, chiến thuật
    mới tạo chưa có ghi chú.
- Ghi chú rỗng sau khi trim được gửi là `null`, giống `description` (`tactic-form-dialog.tsx`).
- Tách khỏi `description`: `description` là câu tóm tắt ngắn hiện trên thẻ ở màn danh sách; `notes`
  là nội dung dài chỉ đọc ở màn chi tiết. Không nhét vào scene JSON: ghi chú không phải phần tử vẽ,
  và nhét vào đó thì phải tăng `schemaVersion`.
- Nhãn trên giao diện là **"Ghi chú chiến thuật"**, không phải "Ghi chú": phần tử chữ trên map đã
  mang tên "Ghi chú" (`TextNoteDialog`, lỗi "Ghi chú tối đa 80 ký tự.").
- Định dạng: text thường, hiện với `whitespace-pre-wrap` (giữ xuống dòng, gạch đầu dòng gõ tay).
  Không Markdown.

### 4. API

- `PATCH /tactics/:id` nhận thêm `notes`. Vẫn `AdminGuard`, vẫn trả `TacticSummary`.
- `GET /tactics/:id` (và `POST /tactics`) trả thêm `notes` trong `TacticDetail`.
- Không có endpoint mới. Không có optimistic locking, giống phần còn lại của chiến thuật
  (architecture.md §8): người lưu sau thắng.

### 5. Panel ghi chú trong editor

- Component `TacticNotesPanel`: cột bên phải khung map, đối xứng với bảng quân cờ bên trái.
- Đóng/mở bằng nút ở đầu chính panel, giống cách bảng quân cờ đóng/mở: khi đóng, panel co còn một
  cột hẹp (`w-12`) chỉ có nút mở. Không đặt nút ở toolbar, vì panel cũng cần đóng/mở được ở nơi
  không có toolbar, và đối xứng với bảng quân cờ thì người dùng đã quen.
- Mặc định: mở nếu chiến thuật đã có ghi chú, đóng nếu chưa có. Trạng thái đóng/mở là state UI của
  component, không lưu lại.
- Chế độ xem: ghi chú, hoặc "Chưa có ghi chú." khi trống; nút `[Sửa]`.
- Chế độ sửa: `Textarea` (`maxLength` 5000, có đếm ký tự), nút `[Lưu ghi chú]` và `[Hủy]`.
  - Lưu gọi `useUpdateTactic` (`PATCH` có sẵn), rồi query `tactic` được invalidate như mọi lần sửa
    chiến thuật. Bản vẽ đang sửa không bị ảnh hưởng: editor chỉ nạp scene một lần cho mỗi id.
  - Lỗi hiện ngay trong panel, nguyên văn `ApiError.message` (panel có chỗ cho một câu; bản vẽ báo lỗi
    bằng toast chỉ vì toolbar không có chỗ).
  - Hủy bỏ bản nháp, quay về chế độ xem.
- Ghi chú lưu độc lập với bản vẽ: không đi qua `dirty`, undo/redo, hay nút "Lưu" của toolbar.
- Trạng thái sửa nằm trong hook `useTacticNotesDraft`, dùng ở `TacticEditorScreen`, để leave guard
  đọc được. Ghi chú "chưa lưu" khi đang sửa và bản nháp (sau trim) khác ghi chú đã lưu.

### 6. Leave guard

- `useLeaveGuard` được gọi với `dirty || notesDraft.dirty`.
- "Lưu rồi rời" lưu phần nào đang chưa lưu: bản vẽ trước (nếu `dirty`), rồi ghi chú (nếu chưa lưu).
  Phần nào thất bại thì dừng, giữ admin ở lại trang - như hiện nay.
- Câu trong `LeaveDialog` đổi thành "Bản vẽ hoặc ghi chú có thay đổi chưa lưu. ...".

### 7. Ghi chú trong viewer

- `TacticViewer` nhận thêm prop `notes: string | null`. Có ghi chú thì hiện một khối chỉ đọc "Ghi
  chú chiến thuật": từ `lg` trở lên nằm bên phải map (rộng cố định), nhỏ hơn thì nằm dưới map.
- Không có ghi chú thì không hiện gì.
- Viewer không cho sửa ghi chú, kể cả với admin trên điện thoại: sửa là việc của editor trên máy
  tính, giống bản vẽ.

## Kiểm thử

- Shared (`tactic.schema.spec.ts` bên API): `updateTacticSchema` nhận `notes` (trim, `null`), từ
  chối chuỗi dài hơn 5000 ký tự.
- API: codec trả `notes` trong detail; service `update` ghi `notes`; http spec: `PATCH` có `notes`
  với admin thì được, với thành viên thì 403.
- Web:
  - `TacticHeader`: hai link về danh sách, `<h1>` là tên chiến thuật.
  - `TacticNotesPanel`: xem, sửa, hủy, lưu (gửi `null` khi rỗng), hiện lỗi, đóng/mở, mặc định đóng
    khi trống.
  - `TacticEditorScreen`: không còn banner; toolbar, bảng quân cờ, map, panel ghi chú, thanh giai
    đoạn nằm trong cùng một khung; thành viên không thấy nút `[Sửa]`; leave guard giữ link lại khi
    đang sửa ghi chú.
  - `TacticViewer`: có ghi chú thì hiện, không có thì không.

## Tài liệu cần sửa

- `docs/architecture.md`: bảng endpoint (`PATCH /tactics/:id`), bảng data model (`Tactic.notes`).
- `apps/web/docs/frontend.md` §6: màn chi tiết chiến thuật là ngoại lệ của `PageHeader`; ví dụ
  `breadcrumb` không còn trỏ tới `tactic-breadcrumb.tsx`.
