# Plan: banner trang chiến thuật, số giai đoạn và công cụ chọn quân cờ

Ba yêu cầu của user trên trang `/chien-thuat/[id]`:

1. Trang mở bằng ảnh banner, breadcrumb lồng vào trong banner.
2. Nút giai đoạn chỉ có icon đồng hồ, cần thêm số thứ tự bên phải icon.
3. Click vào quân cờ đã đặt trên map phải chỉnh được nó (di chuyển, xoá), không phải đặt thêm quân
   cờ mới lên trên.

## Quyết định

### 1. Banner + breadcrumb

- Dùng lại `PageHeader` (`banner="tactics"`, `size="compact"`) thay vì tự dựng một strip mới: hai
  lớp scrim và phần fade ảnh đã nằm sẵn ở đó.
- `PageHeader` thêm prop tuỳ chọn `breadcrumb`, render **trên** `<h1>`, cùng trong lớp scrim.
- `TacticBreadcrumb` đổi sang bảng màu trên ảnh (chữ trắng) và chỉ còn dẫn tới trang cha
  ("Chiến thuật"); tên chiến thuật là `<h1>` của banner, nên không lặp tên hai lần cách nhau 8px.
- Trang chi tiết dùng `size="compact"`: map vẫn là phần chính, banner không được đẩy map xuống quá.

### 2. Số thứ tự trên tab giai đoạn

- `StageTab` luôn hiện số thứ tự cạnh mặt đồng hồ ("icon 1", "icon 2"), không chỉ từ giai đoạn 13.
- Số đó `aria-hidden`: tên giai đoạn vẫn là accessible name của tab, screen reader không đọc "1
  Giai đoạn 1".
- `needsStageNumber` mất lý do tồn tại → xoá cùng test của nó; tab luôn `size="xs"`.
- Mặt đồng hồ vẫn giữ (nhìn ra timeline), `PLAIN_CLOCK_FACE` vẫn là fallback sau giai đoạn 12.

### 3. Công cụ "Chọn"

- Thêm tool `select`, đứng đầu toolbar, icon `MousePointer2`, phím `1`; các tool cũ dịch phím sang
  `2`–`6`. Tool mặc định **vẫn là `token`** — đổi mặc định sẽ làm người đang quen đặt quân cờ ngay
  khi mở trang phải bấm thêm một nút, mà quy tắc dưới đây đã đủ để sửa đúng phần user phàn nàn.
- `select` + pointer down: `hitTest` → chọn phần tử dưới con trỏ, hoặc bỏ chọn khi bấm ra chỗ trống.
- Tool `token`: nếu điểm bấm đã có phần tử thì **chọn** nó chứ không đặt quân cờ chồng lên — đặt
  chồng chưa bao giờ là ý muốn của user, còn vẽ mũi tên/nét tay bắt đầu từ một quân cờ thì vẫn cho.
- Toolbar: khi có phần tử được chọn, nhóm "phần tử đang chọn" hiện nút `Xoá` (kèm key cap `Delete`)
  cạnh ba nút cỡ; nút cỡ chỉ hiện với quân cờ, nút xoá hiện với mọi loại phần tử.
- Kéo quân cờ và `Delete` trên bàn phím đã chạy từ trước, không sửa.

## Kiểm tra

- `pnpm --filter web test`, `lint`, `build`.
- Test cập nhật: `stage-tab`, `stage-bar`, `page-header`, `tactic-breadcrumb`,
  `tactic-editor-screen`, `editor-toolbar`, `use-tactic-editor`, `editor-store`, `shortcuts`.
