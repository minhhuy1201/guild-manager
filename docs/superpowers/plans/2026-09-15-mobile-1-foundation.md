# Mobile 1/3 - Nền tảng: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Không route nào tràn ngang ở 360-430px và ở máy xoay ngang; chữ gốc 115% và thang kích thước
44px trên điện thoại; dialog cuộn được.

**Architecture:** Chỉ đổi `apps/web`. Phần lớn là class Tailwind và một quy tắc CSS trong
`globals.css`; hành vi (tên truy cập của tab và nav, dải phân trang) có test Vitest. Phần chỉ là bố cục
thì jsdom không đo được, nên nghiệm thu bằng render thật trong Chromium (Task 5).

**Tech Stack:** Next.js 16, Tailwind 4, Base UI, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-15-mobile-optimization-design.md`](../specs/2026-09-15-mobile-optimization-design.md)
§4.1, §4.2 (tab Thiết lập), §6, §8.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt. Không dùng em dash.
- TDD cho mọi thay đổi hành vi: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- `components/ui/` chỉ sửa khi là token hoặc lỗi của chính component nền (spec §4.1).
- Nhánh `feat/web-mobile-foundation`, tách từ `main`. Commit ký, Conventional Commits, không có dòng
  attribution.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Tab Thiết lập không tràn

**Files:** `apps/web/features/settings/components/settings-tabs.tsx`,
test `apps/web/features/settings/components/__tests__/settings-tabs.test.tsx`

- [x] Test đỏ `"dưới sm hiện nhãn ngắn, tên truy cập vẫn là nhãn đầy đủ"`:
      `getByRole("tab", { name: "Thiết lập lịch đánh" })` khớp đúng chuỗi, và
      `within(tab).getByText("Lịch đánh")` mang class `sm:hidden`; tương tự cho "Quản lý thành viên" /
      "Thành viên".
- [x] Chạy `pnpm --filter web test settings-tabs`, xác nhận đỏ.
- [x] Mỗi `TabsTrigger` nhận `aria-label` là nhãn đầy đủ, con là
      `<span className="sm:hidden">Lịch đánh</span><span className="max-sm:hidden">Thiết lập lịch đánh</span>`.
      `TabsList` thêm `className="max-sm:w-full"` (trigger đã có `flex-1`).
- [x] Chạy lại test, xanh. Commit `feat(web): fit the settings tabs on a phone`.

### Task 2: Số trang ẩn dưới `lg`

**Files:** `apps/web/components/shared/table-pagination.tsx`,
test `apps/web/components/shared/__tests__/table-pagination.test.tsx`

- [x] Sửa test hiện có thành `"dưới lg chỉ còn bốn nút mũi tên, các ô số trang đều ẩn"`, kiểm
      `max-lg:hidden`. Comment của test nói lý do: ở máy xoay ngang (640-1000px) dải số làm trang tràn.
- [x] Chạy, xác nhận đỏ.
- [x] `PHONE_HIDDEN = "max-sm:hidden"` thành `NARROW_HIDDEN = "max-lg:hidden"`, cập nhật JSDoc và comment
      trong JSX.
- [x] Xanh. Commit `fix(web): hide the page numbers below lg so landscape phones do not overflow`.

### Task 3: Header ở 640-1023px và ở màn thấp

**Files:** `apps/web/components/shared/main-nav.tsx`, `apps/web/components/shared/site-header.tsx`,
test mới `apps/web/components/shared/__tests__/main-nav.test.tsx`

- [x] Test đỏ (mock `next/navigation` như `mobile-tab-bar.test.tsx`):
  - `"từ sm tới lg hiện nhãn ngắn, tên truy cập vẫn là nhãn đầy đủ"`: link "Lịch sử điểm danh" có
    `aria-label` đầy đủ, chữ "Lịch sử" nằm trong phần tử `lg:hidden`, chữ đầy đủ trong `max-lg:hidden`.
  - `"mục có nhãn ngắn trùng nhãn đầy đủ chỉ hiện chữ một lần"`: link "Điểm danh" có đúng một nút chữ.
- [x] Xác nhận đỏ.
- [x] `MainNav`: khi `shortLabel !== label` thì `aria-label={label}` và hai span như Task 1 (breakpoint
      `lg`); ngược lại giữ `{label}`. Nút `px-5` thành `px-3 lg:px-5` để bốn mục vừa 640px.
- [x] `site-header.tsx`: khối tên bang `sm:not-sr-only sm:flex` thành `lg:not-sr-only lg:flex`, `逆水寒`
      `sm:block` thành `lg:block`; comment đổi theo. `<header>` thêm
      `[@media(max-height:500px)]:static`, comment nói lý do (spec §4.1, màn thấp).
- [x] Xanh. Commit `feat(web): keep the header on one line on landscape phones and tablets`.

### Task 4: Cỡ chữ gốc, thang kích thước, dialog, ô lịch

**Files:** `apps/web/app/globals.css`, `apps/web/components/ui/button.tsx`,
`apps/web/components/ui/tabs.tsx`, `apps/web/components/ui/dialog.tsx`,
`apps/web/components/ui/calendar.tsx`, `apps/web/components/shared/site-header.tsx`

Không có hành vi để test trong jsdom; nghiệm thu ở Task 5.

- [x] `globals.css`: `html { font-size: 115% }` dưới `@media (width < 40rem)`, 120% giữ làm mặc định;
      comment nói vì sao 115% (`--spacing` 0.24rem: nút `h-10` = 44px, ô `text-sm` ≥ 16px) và breakpoint
      không dịch. (Làm 110% trước, render đo ra 42px và 15,4px, nên đổi; spec §4.1 ghi lại.)
- [x] `button.tsx`: `sm`/`xs` thêm `max-sm:h-10`, `icon-sm`/`icon-xs` thêm `max-sm:size-10`; `tabs.tsx`:
      `TabsList` thêm `max-sm:group-data-horizontal/tabs:h-12`; `site-header.tsx`: `BRAND` thêm `-m-1 p-1`.
- [x] `dialog.tsx` `DialogContent`: thêm `max-h-[calc(100dvh-2rem)] overflow-y-auto`.
- [x] `calendar.tsx`: `[--cell-size:--spacing(7)]` thêm `max-sm:[--cell-size:--spacing(10)]`.
- [x] `pnpm --filter web test`, `lint`, `typecheck` xanh. Commit
      `feat(web): scale the ui to 110% on phones and let dialogs scroll`, rồi sau lần đo đầu
      `fix(web): scale phones to 115% and keep every control at 44px`.

### Task 5: Tài liệu, nghiệm thu, PR

**Files:** `apps/web/docs/frontend.md`

- [x] §6 thêm mục "Touch has no hover" và "Phone layout" (spec §6), sửa "Tables" (số trang dưới `lg`),
      "Control sizes" (thang dưới `sm`), nav là link thật.
- [x] Render bằng Chromium (script audit) ở 360x800, 390x844, 420x930 DPR 3, 915x412, 1024x768, mọi
      route: `scrollWidth === innerWidth`; mở dialog tạo trận ở 915x412, chân dialog bấm được.
- [ ] Commit docs, push, mở PR 1 (base `main`) theo `.github/pull_request_template.md`, có
      `/pr-review`; sửa mọi nit review nêu ra.
