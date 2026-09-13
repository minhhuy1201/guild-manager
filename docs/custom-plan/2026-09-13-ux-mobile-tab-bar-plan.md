# Mobile - thanh tab đáy màn hình có chữ (GL1) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục GL1.

**Goal:** Trên điện thoại, mọi mục nav đọc được bằng chữ mà không cần bấm thử; "Điểm danh" và "Lịch
sử điểm danh" không còn là hai icon khó phân biệt.

**Architecture:** Chỉ đổi `apps/web`.

- Danh sách mục nav (đường dẫn, nhãn, nhãn ngắn, icon, `adminOnly`) chuyển từ `main-nav.tsx` ra
  `components/shared/nav-items.ts`, dùng chung cho nav trên header và thanh tab.
- `components/shared/mobile-tab-bar.tsx`: `fixed` ở đáy, chỉ hiện dưới `sm`, mỗi mục có icon và chữ
  ngắn (Điểm danh / Lịch sử / Xếp team / Thiết lập), mục đang mở dùng jade như nav hiện tại. Mục admin
  vẫn chỉ hiện với admin (chỉ là hiển thị; chặn quyền vẫn do proxy và API).
- Thanh tab là **anh em** của `<header>`, không nằm trong nó: header có `backdrop-blur`, và
  `backdrop-filter` biến header thành containing block của mọi phần tử `fixed` bên trong.
- Header dưới `sm` chỉ còn con dấu và avatar (`MainNav` ẩn dưới `sm`).
- Khoảng chừa đáy là một biến CSS, `--app-bottom-inset` trong `globals.css`: 0 mặc định, bằng chiều
  cao thanh tab cộng `env(safe-area-inset-bottom)` khi màn hình dưới `sm` **và** thanh tab có mặt
  (`:root:has([data-slot="mobile-tab-bar"])`, nên trang đăng nhập không bị chừa). `body` chừa
  `padding-bottom` bằng biến đó; `UnsavedChangesBar` (Xếp team, bảng Điểm danh) dính ở
  `bottom: biến + 1rem`, nên không bị thanh tab che. `viewport-fit=cover` để iOS trả về safe area.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/mobile-bottom-tab-nav`, tách từ nhánh của PR bảng điểm danh (chuỗi PR).
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: `MobileTabBar`

**Files:** `components/shared/nav-items.ts`, `components/shared/mobile-tab-bar.tsx`,
`components/shared/main-nav.tsx` + test

- [x] Test đỏ: member thấy hai mục có chữ, admin thấy bốn; mục đang mở có `aria-current="page"`;
      thanh mang `data-slot="mobile-tab-bar"` (móc của CSS).
- [x] `MainNav` đọc danh sách từ `nav-items.ts`, ẩn dưới `sm`.

### Task 2: Khoảng chừa đáy

**Files:** `app/globals.css`, `app/layout.tsx`, `components/shared/site-header.tsx`,
`components/shared/unsaved-changes-bar.tsx`

- [x] `--app-bottom-inset` và `padding-bottom` của `body`; `viewport-fit=cover`.
- [x] Header render thanh tab ngay sau `<header>` khi đã đăng nhập.
- [x] Thanh Lưu dính trên thanh tab.

### Task 2b: Dải phân trang tràn màn hình điện thoại (phát hiện khi kiểm tra)

**Files:** `components/shared/table-pagination.tsx` + test

Khi mở `/` ở 390px, thanh tab không hiện: dải phân trang (11 ô `size-10`, khoảng 530px) tràn ra
ngoài, trang rộng thành 461px, điện thoại thu nhỏ cả trang và thanh tab cố định rơi xuống dưới màn
hình. Lỗi có từ trước, ở mọi bảng.

- [x] Test đỏ: dưới `sm` chỉ còn bốn nút mũi tên, các ô số trang mang `max-sm:hidden`.
- [x] Ẩn ô số trang, dấu ba chấm và ô đệm dưới `sm`; dòng "trang x/y" cạnh đó vẫn nói vị trí.

### Task 3: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §6: nav trên điện thoại.
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở `/`, `/xep-team` ở 390px (có thanh Lưu) và 1440px.
