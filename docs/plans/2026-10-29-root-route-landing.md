# Kế hoạch: Route gốc `/` -> `/trang-chu` | `/diem-danh`, logo -> `/trang-chu`

## Bối cảnh

Hiện `/` render màn điểm danh (`apps/web/app/page.tsx`) và logo ở header dẫn người đã đăng nhập về
đó. Mong muốn:

- Màn điểm danh nằm ở **`/diem-danh`**.
- `/` khi đã đăng nhập -> **`/diem-danh`**; `/` khi chưa đăng nhập -> `/trang-chu` (đã đúng từ trước).
- Logo/tên bang ở header luôn dẫn về **`/trang-chu`**.

Đi cùng PR với commit đổi con trỏ switch và animation nút theme (`fix/switch-cursor-theme-toggle`).

## Hướng làm

`/` được trả lời ở proxy, không phải ở page: `access.ts` đã ghi rằng `redirect()` của page nằm sau
loading boundary gốc sẽ stream 200 và skeleton rồi mới redirect; proxy cho 307 sạch.

1. `config/routes.ts`: `attendance: "/diem-danh"`, thêm `root: "/"`.
2. Chuyển page: `git mv app/page.tsx app/diem-danh/page.tsx`, sửa doc comment. Không tạo
   `app/page.tsx` mới: matcher của proxy phủ `/` và mọi verdict cho `/` đều là redirect.
3. `features/auth/core/access.ts`: thêm variant `"attendance"` (đã đăng nhập ở gốc site -> đưa tới
   điểm danh của tuần). Khách ở `pathname === ROUTES.root` vẫn là `"landing"`.
4. `proxy.ts`: `decide()` xử lý `"attendance"` bằng redirect tới `ROUTES.attendance` mang cookie vừa
   gia hạn (`withCookies`, như `onward`); `signedOutResponse` xử lý như `onward` (không thể xảy ra,
   giữ switch exhaustive).
5. `components/shared/site-header.tsx`: logo `href={ROUTES.landing}` luôn luôn.
6. Cố ý giữ nguyên: mặc định `'/'` của `safeRedirect` và `DiscordLoginButton` - cả hai nay đi qua
   proxy tới `/diem-danh` thêm một bước, nút "Mở website" của bot (`/dang-nhap?redirect=%2F`) vẫn chạy.
7. Docs: `docs/architecture.md` §4.3 mô tả `/` cho cả hai trạng thái và màn điểm danh ở `/diem-danh`.

## Test (đỏ trước)

- `access.test.ts`: đã đăng nhập `/` -> `"attendance"`; khách `/` -> `"landing"`; khách `/diem-danh` -> `"login"`.
- `proxy.test.ts`: đã đăng nhập `/` -> 307 tới `/diem-danh`; phiên vừa gia hạn ở `/` giữ cookie mới.
- `site-header.test.tsx`: href của logo là `ROUTES.landing` khi đã đăng nhập.
- Sửa test nào đang coi `"/"` là điểm danh (ví dụ `main-nav.test.tsx`).

## Kiểm chứng

`pnpm --filter web test`, `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint`,
`pnpm --filter web build` (xác nhận không có page gốc vẫn build được).
