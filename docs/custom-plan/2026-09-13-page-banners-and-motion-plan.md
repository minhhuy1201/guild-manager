# Plan: banner ảnh, nền có chiều sâu và chuyển động mượt cho apps/web

Tiếp nối `2026-09-13-minimal-wuxia-redesign-plan.md`. Sau bản minimal, user thấy app đơn điệu và
thêm 5 ảnh game vào `apps/web/public/img/bg/`. Brief được mở rộng lên tỉ lệ khoảng 70/20/10
(`docs/design-direction.md`).

## Quyết định

- **Ảnh:**
  - Đổi tên sang tiếng Anh: `attendance`, `history`, `team-builder`, `settings`, `login`.
  - Ảnh login được cắt bỏ viền đen letterbox.
  - `next/image` tự resize và chuyển sang webp/avif, nên không nén tay.
- **Nền:** hai vệt gradient jade và gold rất nhạt ở hai góc trên, cùng một lớp noise SVG khoảng 3%,
  cố định khi cuộn.
- **Banner:**
  - `PageHeader` bắt buộc có prop `banner`. Map ảnh nằm trong `lib/page-banners.ts`, gồm `src`,
    `objectPosition` (cắt watermark trên màn rộng) và `tint` (màu hiện trong lúc ảnh chưa tải xong).
  - Hai lớp scrim tối giúp chữ trắng đọc được trên cả ảnh đêm lẫn ảnh ngày.
- **Login:** ảnh phủ toàn màn hình phía sau, card mờ kính.
- **Chuyển động** (chỉ CSS, không thêm thư viện):
  - Vào trang: các khối con của `main` hiện dần và nhích lên, stagger 60ms.
  - Dòng bảng: chỉ fade opacity, stagger 25ms.
  - Tile và card dữ liệu: `revealStyle(index)` kết hợp class `animate-reveal`.
  - Skeleton đổi từ pulse sang shimmer.
  - Ảnh fade-in khi tải xong.
  - Khi reduced-motion bật: xoá cả `animation-delay`.
- **`backwards` thay cho `both`:** nếu `transform` còn giữ lại sau animation, phần tử `fixed` bên
  trong sẽ lệch (`DragOverlay`, sheet chụp ảnh gửi Discord).
- **Không animate grid xếp team:** grid này được chụp để gửi Discord và dùng cho kéo thả.
- **Không dùng `ViewTransition`:** Next 16 mới chỉ có sau cờ `experimental`.

## Kiểm tra

- `pnpm --filter web lint`, `test`, `build`.
- Chụp lại 5 trang ở khổ 1440 và 400, thêm một lượt với `--force-prefers-reduced-motion`.
- User thử tay: đổi trang, kéo thả ở Xếp team, "Gửi Discord".
