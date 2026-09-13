# Plan: redesign "minimal wuxia" cho apps/web

Nguồn: brief ban đầu `prompt.md` (đã xoá ở #106, nội dung được giữ lại trong `docs/design-direction.md`) và `docs/design-direction.md` (bản có tính ràng buộc).

## Mục tiêu

Làm cho app giống một sản phẩm quản lý tối giản, cao cấp, có chút hồn wuxia (85% modern, 10% wuxia,
5% Nghịch Thuỷ Hàn). Không đổi business logic, API, route, auth, copy hay chức năng.

## Quyết định

- Primary giữ **navy**. **Jade** là accent: active nav, focus ring, dấu ấn bang, ornament phân mục.
  **Gold** chỉ dùng cho điểm nhấn quan trọng: banner đội hình, ornament trang đăng nhập, team 9-10.
- Emerald / đỏ / amber vẫn là Có / Không / Chưa trả lời. Gold không bao giờ là trạng thái.
- Neutral chuyển sang một họ màu ấm (hue 85). Card dựa vào viền mảnh, shadow rất nhạt.
- Be Vietnam Pro cho UI. Noto Serif (có subset tiếng Việt) cho tiêu đề trang, tiêu đề dialog
  (`DialogTitle` của shadcn dùng `font-heading`) và tên bang.
- Chỉ light theme. Token jade/gold vẫn được khai báo trong `.dark`.
- Không làm: noise, ảnh nền, hoạ tiết, animation dịch chuyển, đổi thư viện icon.

## Các bước

1. Docs: `design-direction.md` viết lại theo `prompt.md`.
2. Token và font: `app/globals.css` (neutral ấm, `--jade`, `--gold`, `--ring` jade, shadow ấm),
   `app/layout.tsx` (Noto Serif, khoảng cách `main`).
3. Khung:
   - Component mới: `GuildSeal`, `OrnamentDivider`, `PageHeader` trong `components/shared/`.
   - Header: dấu ấn và `逆水寒`.
   - Nav: active item dùng gạch chân jade.
   - `PageHeader` cho cả 4 trang. `<h1>` cũ trong thiết lập hạ thành `<h2>`.
4. Trang đăng nhập với dấu ấn và ornament gold. Favicon mới.
5. Xếp team:
   - Màu team theo 4 nhóm jade / stone / navy / gold (`team-colors.ts`).
   - Banner đội hình bỏ violet, dùng viền gold.
   - Session tabs dùng viền `border` và hover jade.
6. Tabs `default`: track đổi thành `bg-card` + viền (thay `bg-foreground/20`).
7. `apps/web/docs/frontend.md` §6 cập nhật theo.

## Kiểm tra

- `pnpm --filter web lint`, `test`, `build`.
- Chạy app local, kiểm tra từng route bằng tài khoản admin và member, và ở màn hình hẹp khoảng
  400px.
