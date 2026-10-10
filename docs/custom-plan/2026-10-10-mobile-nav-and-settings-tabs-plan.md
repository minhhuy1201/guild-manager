# Mobile - ẩn Xếp team / Chiến thuật khỏi thanh tab, sửa dải tab Thiết lập - Implementation Plan

**Goal:** Trên điện thoại (dưới `sm`, 640px):

1. Thanh tab đáy không còn mục "Xếp team" và "Chiến thuật". Từ `sm` trở lên, nav trên header giữ nguyên.
2. Dải 3 tab ở màn Thiết lập (Lịch đánh / Thành viên / Nghỉ phép) nằm gọn trong một hàng, ba tab rộng
   bằng nhau, không tràn, không lệch.

**Architecture:** Chỉ đổi `apps/web`, không đụng API, `packages/shared`, `components/ui/`.

- `NavItem` thêm cờ `desktopOnly: boolean`, đặt cạnh `adminOnly` cho đối xứng. Hai mục `teamBuilder` và
  `tactics` mang `desktopOnly: true`: kéo-thả xếp team và bản đồ chiến thuật cần màn hình rộng.
- `MobileTabBar` lọc thêm `!item.desktopOnly` sau `navItemsFor(isAdmin)`. `MainNav` không đổi.
- Kết quả trên điện thoại: member thấy 2 mục (Điểm danh, Lịch sử), admin thấy 3 (thêm Thiết lập).
- Dải tab Thiết lập: chỉ truyền `className` vào `TabsList` / `TabsTrigger` trong `settings-tabs.tsx`
  (`components/ui/tabs.tsx` là output của shadcn CLI, không sửa).

**Giả định (cần user xác nhận):** "ẩn" = ẩn khỏi điều hướng. Mở thẳng `/xep-team` hay `/chien-thuat` trên
điện thoại (link Discord, bookmark) vẫn vào được trang. Nếu muốn chặn hẳn trang trên điện thoại thì đó là
việc khác, cần thêm một màn "mở trên máy tính" - không nằm trong plan này.

## Nguyên nhân dải tab bị lệch

`TabsTrigger` mặc định: `flex-1`, `whitespace-nowrap`, `px-3.5`, `gap-2`, `text-base`, icon `size-4.5`.
Ở 375px, nội dung `<main>` còn 343px (`px-4`). Mỗi tab cần khoảng 130px (icon 18 + gap 8 + chữ ~78 +
padding 28 + viền 2) - ước lượng, chưa đo trên trình duyệt. Ba tab ~400px > 343px. `flex-1` không co
được dưới min-content (`min-width: auto`), nên dải tab tràn và ba tab rộng khác nhau theo độ dài chữ.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `fix/mobile-nav-and-settings-tabs`, tách từ `main`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Ẩn Xếp team và Chiến thuật khỏi thanh tab điện thoại

**Files:** `apps/web/components/shared/nav-items.ts`, `apps/web/components/shared/mobile-tab-bar.tsx`,
`apps/web/components/shared/__tests__/mobile-tab-bar.test.tsx`

- [ ] Test đỏ - sửa hai test đang có trong `mobile-tab-bar.test.tsx`:
  - `"member thấy ba mục, mục nào cũng có chữ"` thành `"member thấy hai mục, mục nào cũng có chữ"`,
    kỳ vọng `["Điểm danh", "Lịch sử"]`.
  - `"admin thấy thêm Xếp team và Thiết lập"` thành `"admin thấy thêm Thiết lập, không có Xếp team và
    Chiến thuật"`, kỳ vọng `["Điểm danh", "Lịch sử", "Thiết lập"]`.
  - Comment trên test giải thích lý do: hai trang cần màn hình rộng.
- [ ] Chạy test, xác nhận đỏ vì thanh tab vẫn render 3 / 5 mục.
- [ ] `nav-items.ts`:
  - Thêm vào `NavItem`:
    ```ts
    /** Left out of the phone's tab bar - the page needs a wide screen (drag-and-drop, the map) */
    desktopOnly: boolean;
    ```
  - Mỗi mục trong `NAV_ITEMS` khai báo `desktopOnly` tường minh: `true` cho `teamBuilder` và `tactics`,
    `false` cho ba mục còn lại.
  - Sửa JSDoc `shortLabel` ("a quarter of the screen wide" không còn đúng): ví dụ "Name that fits one
    slot of the phone's tab bar".
- [ ] `mobile-tab-bar.tsx`: lọc `navItemsFor(isAdmin).filter((item) => !item.desktopOnly)`. Cập nhật
  JSDoc của component: nói rõ mục `desktopOnly` chỉ có trên header nav, và trang vẫn mở được bằng link.
- [ ] Kiểm `main-nav.test.tsx` vẫn xanh (header nav không đổi).
- [ ] Test xanh, lint, typecheck.

### Task 2: Dải tab Thiết lập vừa một hàng trên điện thoại

**Files:** `apps/web/features/settings/components/settings-tabs.tsx`,
`apps/web/features/settings/components/__tests__/settings-tabs.test.tsx`

Hướng sửa: dưới `sm`, mỗi tab xếp icon **trên** nhãn ngắn (giống thanh tab đáy), chữ nhỏ, padding hẹp;
ba tab chia đều chiều rộng.

- [ ] Test đỏ trong `settings-tabs.test.tsx` (cạnh block test ở dòng ~104 về nhãn ngắn): mỗi
  `TabsTrigger` mang class cho điện thoại - `max-sm:flex-col`, `max-sm:min-w-0`. jsdom không tính
  layout, nên test chỉ khoá class; comment trên test ghi lý do (tràn ở 375px).
- [ ] Chạy test, xác nhận đỏ vì thiếu class.
- [ ] `settings-tabs.tsx`:
  - `TabsList`: `max-sm:w-full max-sm:group-data-horizontal/tabs:h-auto` (bỏ chiều cao cố định `h-12`
    để tab hai dòng không bị cắt). Phải dùng đúng variant `group-data-horizontal/tabs:` của class gốc:
    `max-sm:h-auto` trơn không thắng được `h-12` trong tailwind-merge (hai class cùng tồn tại).
  - Mỗi `TabsTrigger`: `max-sm:min-w-0 max-sm:flex-col max-sm:gap-0.5 max-sm:px-1 max-sm:py-1.5
    max-sm:text-xs`. Gom chuỗi này vào một hằng (ví dụ `PHONE_TRIGGER_CLASS`) để ba tab dùng chung,
    tránh lặp ba lần. `min-w-0` phải có tiền tố `max-sm:`: không tiền tố thì trên desktop nó ép nhãn
    dài nhất ("Nghỉ phép của thành viên") tràn ra tab bên cạnh. Không cần `basis-0`: `flex-1` của
    Tailwind 4 đã là `1 1 0%`.
  - Giữ nguyên cặp `<span className="sm:hidden">` / `<span className="max-sm:hidden">` và `aria-label`.
  - Sửa comment trên `TabsList` cho khớp cách làm mới.
- [ ] Test xanh, lint, typecheck.
- [ ] Kiểm tay trên trình duyệt (DevTools, 360px, 375px, 414px, và 640px ngay ngưỡng `sm`): ba tab bằng
  nhau, không tràn ngang trang, tab đang chọn vẫn nền `primary`. Trên desktop dải tab không đổi.

### Task 3: Docs

**Files:** `apps/web/docs/frontend.md`

- [ ] Đoạn "Current page in the header nav" (khoảng dòng 725-737): thêm một câu - mục `desktopOnly`
  (Xếp team, Chiến thuật) chỉ có trên header nav từ `sm`, không có trên thanh tab điện thoại.
- [ ] Nếu §6 có đoạn về dải tab dưới `sm`, ghi cách xếp icon trên nhãn; không có thì bỏ qua.

## Ngoài phạm vi

- Chặn truy cập `/xep-team`, `/chien-thuat` trên điện thoại.
- Sửa `components/ui/tabs.tsx`.
- Bố cục bên trong từng panel Thiết lập (danh sách buổi, bảng thành viên, nghỉ phép).
