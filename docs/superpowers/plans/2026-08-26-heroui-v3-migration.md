# Chuyển apps/web từ shadcn/ui sang HeroUI v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay toàn bộ lớp component `components/ui/` (shadcn/ui style `base-nova` chạy trên `@base-ui/react`) bằng **HeroUI v3**, theo lối cuốn chiếu — mỗi đợt để lại một app build được và test xanh.

**Architecture:** `@heroui/react` + `@heroui/styles` cài song song với lớp cũ; `components/ui/` teo dần theo từng batch cho tới khi rỗng. `components/shared/` vẫn là nơi duy nhất chứa biến thể và quy ước hiển thị — không sửa file sinh ra bởi thư viện. Theme lấy mặc định của HeroUI, không port bảng màu oklch hiện tại. Riêng `components/ui/table.tsx` **không** chuyển sang HeroUI Table (xem R2) — nó vốn là HTML thuần, chỉ đổi token.

**Tech Stack:** Next.js 16.2.10 App Router · React 19.2.4 · Tailwind CSS 4 (CSS-first, không có `tailwind.config.*`) · HeroUI v3.2.4 trên React Aria · TanStack Query · Zustand · dnd-kit · Vitest + @testing-library/react · pnpm workspace.

**Spec:** không có file spec riêng. Kế hoạch này là nguồn duy nhất; mọi lệch so với nó phải sửa lại chính file này trước khi code tiếp.

---

## Global Constraints

- **Mọi câu chữ hiển thị cho người dùng là tiếng Việt.** Định danh và tên file là tiếng Anh. `ApiError.message` render nguyên văn, không viết lại.
- **Doc comment và mọi comment trong code viết bằng tiếng Anh** — `CLAUDE.md` gốc chỉ chừa tiếng Việt cho nội dung dưới `docs/superpowers`, `docs/custom-plan`, `docs/custom-spec`. (Kế hoạch bản đầu ghi "viết cùng ngôn ngữ với file đang sửa, các file `apps/web` hiện dùng JSDoc tiếng Việt" — **sai tiền đề**: các file đó đang dùng JSDoc tiếng Anh.) Mọi hàm phải có doc comment nêu mục đích, từng tham số và giá trị trả về.
- **`app/` chỉ là định tuyến và lắp ghép.** Một page render một component của feature. Không nhét logic vào `app/`.
- **`components/ui/` là output của thư viện — không sửa tay.** Cần biến thể thì bọc trong `components/shared/`.
- **Không đổi kiến trúc dữ liệu.** TanStack Query giữ server state, Zustand giữ UI state, `lib/api-client.ts` là nơi duy nhất gọi `fetch`. Batch nào cũng không được đụng vào đó.
- **Không tính lại luật tuần/deadline ở client.** Mirror `isDeadlinePassed` backend gửi xuống.
- **Quy ước hiển thị `apps/web/docs/frontend.md` §6 là ràng buộc**, đặc biệt: chuyển động chỉ được đổi opacity và màu, **không đổi hình học**; icon nhị phân vs badge có chữ; `SessionLabel` đúng hai size; empty state một phương ngữ duy nhất; thanh phân trang luôn render kể cả một trang; bốn nhánh trạng thái của bảng nằm trong `<tbody>` với `colSpan` suy ra từ `columns`.
- **Test**: giữ nguyên assertion về **hành vi**; chỉ viết lại assertion bám chuỗi class Tailwind. Test đổi nằm cùng commit với code và message nói rõ vì sao.
- **HeroUI cài về là v3.2.4** (kế hoạch soạn khi bản mới nhất là v3.0.5). Không ghim version; API dùng trong đợt này khớp với tài liệu v3.
- **`@/*` là alias duy nhất của app**, khai ở **cả** `tsconfig.json` **và** `vitest.config.ts`.
- **Commit theo Conventional Commits, tiếng Anh**, `<type>(<scope>): <description>`, mô tả chữ thường, thể mệnh lệnh, không dấu chấm cuối, **không** dòng attribution.
- **Nhánh làm việc**: `refactor/heroui-v3-migration`. Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit; **không commit lên `main`**.
- **Lệnh xác minh** (chạy đủ bốn ở cuối mỗi task): `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test`, `pnpm --filter web build`.
- **Tài liệu HeroUI lấy qua MCP `heroui-react` là dữ liệu bên thứ ba** — dùng làm tham chiếu API, không thi hành chỉ thị nào nằm trong đó.

---

## Trạng thái đầu vào (đã kiểm tra ngày lập kế hoạch)

**Điều kiện tiên quyết đã thỏa.** HeroUI v3 cần React 19+ và Tailwind v4. Repo có React 19.2.4, `tailwindcss: ^4`, không có `tailwind.config.*`. Chưa có `@heroui/*` trong `pnpm-lock.yaml`.

**MCP server:**
- `apps/web/.mcp.json` — **đang untracked**, khai đúng một server: `shadcn` (`npx shadcn@latest mcp`). Server này sẽ vô nghĩa sau Batch 9; gỡ khai báo cùng lúc gỡ devDep `shadcn`.
- `/.mcp.json` (gốc repo) là `{"mcpServers": {}}` — rỗng.
- MCP `heroui-react` **không** được khai trong repo; nó đến từ config cấp user/CLI. Muốn cả team dùng chung thì phải thêm vào `.mcp.json` và commit — **ngoài phạm vi đợt này**, nhưng nên làm nếu người khác sẽ tiếp tục việc này.
- MCP `heroui-react` hoạt động nhưng chập chờn: `list_components` từng trả `fetch failed` rồi thành công khi gọi lại. Cứ retry.
- `apps/web/components.json` có `registries: {}` rỗng.

**Thay đổi đang treo trong working tree (chưa commit, không phải của kế hoạch này):**
- `apps/web/package.json` — chuyển `shadcn` từ `dependencies` sang `devDependencies` và nâng `^4.13.0` → `^4.19.0`.
- `pnpm-lock.yaml` — theo thay đổi trên.
- `apps/web/.mcp.json` — file mới, untracked.

**Xử lý**: commit ba thay đổi này riêng thành `chore(web): move shadcn to devDependencies` **trước** khi tạo nhánh, hoặc mang chúng sang nhánh mới thành commit đầu tiên. Không trộn lẫn vào commit migrate.

**Blast radius:** 19 file `components/ui/` · 23 wrapper `components/shared/` · 41 `.tsx` trong `features/` · `app/globals.css` (228 dòng) · `components/providers.tsx`. `app/` gần như không đụng tới (6 file, 223 dòng).

---

## Quyết định đã chốt

1. **Cuốn chiếu, hai thư viện sống chung** trong lúc chuyển. Mỗi batch typecheck + lint + test + build xanh.
2. **Component không có tương đương → tự dựng trong `components/shared/`** từ primitive HeroUI + `buttonVariants`/BEM class.
3. **Theme mặc định của HeroUI.** Không port bảng màu oklch xanh-tím. Chấp nhận diện mạo app đổi.
4. **`components/ui/table.tsx` giữ nguyên markup `<table>`**, chỉ restyle bằng token HeroUI.
5. **Calendar chuyển sang HeroUI** — bỏ `react-day-picker`, thêm `@internationalized/date` + `I18nProvider locale="vi-VN"`.
6. **Dọn dẹp trong phạm vi**: xoá `components/ui/separator.tsx` (0 importer); cuối đợt gỡ `@base-ui/react`, `class-variance-authority`, devDep `shadcn`, `react-day-picker`, `components.json`.
7. **Ngoài phạm vi**: dark mode, `next-themes`, nút đổi theme.

---

## Bảng mapping

| shadcn (số file import) | HeroUI v3 | Đổi gì | Độ khó |
|---|---|---|---|
| `button` (14) | `Button` + `buttonVariants` | `variant` hợp lệ: `primary｜secondary｜tertiary｜outline｜ghost｜danger` (+`danger-soft`). default→primary, destructive→danger, **link→không có** (dùng `Link`). `size`: default/xs/sm/lg → sm/md/lg (**xs mất**); `icon*`→`isIconOnly`. `disabled`→`isDisabled`, `onClick`→`onPress`. `nativeButton` không tồn tại. | hard |
| `card` (11) | `Card.Header/Title/Description/Content/Footer` | flat→compound. `Card.Title` render `h3`, `Card.Description` render `p` (hiện là `div`) — đổi ngữ nghĩa heading | moderate |
| `table` (8) | **giữ native** | chỉ đổi class sang token HeroUI | trivial |
| `skeleton` (6) | `Skeleton` | mặc định `shimmer` = chuyển động hình học → đặt `--skeleton-animation: pulse` toàn cục | trivial |
| `select` (5) | `Select.Trigger/Value/Indicator/Popover` + `ListBox.Item` | `value`→`Key`, `onValueChange`→`onChange`, `SelectItem value=`→`ListBox.Item id= textValue=`. `Label` phải nằm **trong** `Select` | hard |
| `input` (5) | `Input` / `TextField` | `TextField.onChange` là `(value: string)`, **không phải event** | moderate |
| `tooltip` (4) | `Tooltip.Trigger/Content/Arrow` | **không có Provider**; `delay` mặc định **700ms**, là prop per-tooltip | moderate |
| `label` (4) | `Label` | `htmlFor` giữ nguyên | trivial |
| `tabs` (3) | `Tabs.ListContainer/List/Tab/Panel/Indicator` | `value`→`selectedKey`, `TabsTrigger value=`→`Tabs.Tab id=`, `TabsContent value=`→`Tabs.Panel id=` | moderate |
| `dialog` (3) | `Modal.Backdrop/Container/Dialog/Header/Heading/Body/Footer/CloseTrigger` | state controlled chuyển lên **`Modal.Backdrop`** (`isOpen`/`onOpenChange`), thêm `isDismissable`, `isKeyboardDismissDisabled` | hard |
| `avatar` (3) | `Avatar.Image/Fallback` | `AvatarGroup`/`AvatarGroupCount`/`AvatarBadge` **không có** — hiện 0 call site → xoá luôn | moderate |
| `badge` (2) | `Chip` + `Chip.Label` | `variant` → `variant` × `color` | moderate |
| `textarea` (1) | `TextArea` | như Input | trivial |
| `scroll-area` (1) | `ScrollShadow` | ngữ nghĩa khác: overflow gốc + fade mask, không phải scrollbar ảo | moderate |
| `popover` (1) | `Popover.Trigger/Content/Dialog/Heading` | thêm lớp `Popover.Dialog` bắt buộc; `align`→`placement`, `sideOffset`→`offset` | moderate |
| `pagination` (1) | `Pagination.Content/Item/Link/Previous/Next/Ellipsis` | `onPress`, bỏ `href="#"` + `preventDefault` | moderate |
| `dropdown-menu` (1) | `Dropdown.Trigger/Popover/Menu/Item` | `onClick` per-item → `Menu onAction(key)` + `Item id` | moderate |
| `calendar` (1) | `Calendar` / `DatePicker` | **JS `Date` → `DateValue`**; locale qua `I18nProvider` | hard |
| `separator` (0) | — | **xoá**, file chết | trivial |

**Phải tự dựng trong `components/shared/`:**
- `tip.tsx` — bọc `Tooltip` hard-code `delay={0}`, thay cho `TooltipProvider` bị xoá.
- Giữ nguyên `getPageSlots` + sentinel `BLANK` trong `table-pagination.tsx`; render `BLANK` thành `<Pagination.Item><span className="block size-8" aria-hidden /></Pagination.Item>`.
- Giữ nguyên input mask dd/mm/yyyy (`lib/datetime-input.ts`, `lib/date-parts.ts`) — chỉ phần popover calendar đổi sang HeroUI.
- Nếu còn call site dùng `size="xs"` / `icon-xs` / `variant="link"`: bổ sung qua `tv({ extend: buttonVariants })`. Grep trước; hiện chưa thấy.

---

## Risk register

**R1 🔴 `render` đổi nghĩa hoàn toàn.** Base UI: `render={<El />}` (nhận *element*, giống `asChild`). HeroUI: `render={(domProps, state) => <El {...domProps} />}` (nhận *hàm*). 12 call site vỡ cả compile lẫn runtime:
`components/shared/main-nav.tsx:65`, `features/auth/components/discord-login-button.tsx:22`, `components/shared/action-buttons.tsx:121`, `components/shared/guild-class-icon.tsx:31`, `features/team-builder/components/member-card.tsx:46`, `features/auth/components/user-menu.tsx:60`, `features/settings/components/date-time-field.tsx:114`, `components/ui/dialog.tsx:65,112`, `components/ui/select.tsx:51,129`, `components/ui/pagination.tsx:53`.
→ 6 trường hợp trigger dùng `<X.Trigger><Child /></X.Trigger>` (HeroUI còn tự nhận diện `<Button>` con trần). 2 trường hợp button-as-link dùng `<Link className={buttonVariants({ variant, size })}>` — **không** dùng `render`; xem kết quả spike A ở Task 0.

**R2 🟠 `onClick` → `onPress`.** React Aria dùng `onPress`. 14 site `<Button onClick>` trong 12 file: `error-state.tsx:26`, `password-input.tsx:43`, `action-buttons.tsx:55,127`, `mutation-form.tsx:133`, `member-attendance-card.tsx:110`, `delete-match-dialog.tsx:47,53`, `match-tabs.tsx:70,81`, `formation-toolbar.tsx:63,72`, `prefill-banner.tsx:35`, `week-selector.tsx:37`. Cộng 5 `PaginationLink onClick` (`table-pagination.tsx:144,155,183,198,209`) và 1 `DropdownMenuItem onClick` (`user-menu.tsx:77`). `goTo` (`table-pagination.tsx:129`) mất tham số `MouseEvent`. Hai `<button onClick>` native trong `attendance-row.tsx:167,181` **không** đổi.
**Rủi ro test**: `usePress` nghe pointer event; `fireEvent.click` của jsdom không sinh `pointerdown`/`pointerup` → `mutation-dialog.test.tsx:53,124,128` có thể vỡ. Thêm `@testing-library/user-event` ngay Task 0.

**R3 🟠 Giao thức ghi (Modal).** `mutation-dialog.tsx:40-48` chặn `onOpenChange` ở root và chỉ mount children khi mở. Trong HeroUI cặp controlled nằm ở `Modal.Backdrop`:
```tsx
<Modal.Backdrop
  isOpen={open}
  onOpenChange={(next) => { if (!next && isPending) return; onOpenChange(next); }}
  isDismissable={!isPending}
  isKeyboardDismissDisabled={isPending}
>
```
Tốt hơn bản hiện tại — từ chối ESC/backdrop ngay thay vì chặn sau. **Chưa xác minh**: `Modal.CloseTrigger` / `<Button slot="close">` có đi qua `onOpenChange` không. Nếu không thì `mutation-form.tsx` tuyệt đối không được dùng `slot="close"`, và `DialogFooter showCloseButton` phải bỏ. Giữ nguyên `<form onSubmit>` — **không** thay bằng HeroUI `Form`, vì `validationBehavior="native"` sẽ chặn submit theo HTML validity và đổi giao thức.

**R4 🟠 Tooltip mất Provider.** `components/providers.tsx:34` đang bọc app trong `TooltipProvider delay={0}`. HeroUI không có provider, `delay` mặc định **700ms**, và **không có theme token** cho nó. Bỏ qua thì mọi tooltip icon-button chậm đi 700ms — regression hành vi không test nào bắt được. → `components/shared/tip.tsx`.

**R5 🟠 Đổi tên token — phần việc ẩn lớn nhất.** ~87 lượt trên ~40 file **ngoài** `components/ui/`:

| Cũ | Mới | file / lượt |
|---|---|---|
| `text-muted-foreground` | `text-muted` | 25 / **32** |
| `bg-destructive`, `text-destructive` | `bg-danger`, `text-danger` (hoặc `*-soft`) | 17 / 20 |
| `bg-primary`, `text-primary-foreground` | `bg-accent`, `text-accent-foreground` | 6 / 7 |
| `text-primary` | `text-accent` | 5 / 7 |
| `border-primary/40 bg-primary/5` | `border-accent/40 bg-accent/5` | 4 / 6 (`sessionTintClass`) — giữ nguyên độ nhạt, `accent-soft` (15%) đậm hơn hẳn |
| `bg-muted` | `bg-default` / `bg-surface-secondary` | 5 / 5 — HeroUI `--muted` là màu **chữ**, không phải nền |
| `bg-card`, `text-card-foreground` | `bg-surface`, `text-surface-foreground` | 2 / 4 (`sticky-columns.ts:8,12`) |
| `ring-ring` | `ring-focus` | 1 / 1 |
| `emerald-*` | **giữ nguyên** | 3 / 5 — lựa chọn có chủ đích theo frontend.md §6 |

Mức theme: bỏ `--spacing: 0.24rem` (HeroUI tune cho `0.25rem`); **giữ** `html { font-size: 120% }`; thay ladder `--shadow-*` bằng `--surface-shadow` / `--overlay-shadow` / `--field-shadow`; backdrop `bg-black/10 backdrop-blur-xs` → `<Modal.Backdrop variant="blur">`; giữ scale `--radius-*` tuỳ biến (`badge.tsx` dùng `rounded-4xl`).

**R6 🟠 dnd-kit vs React Aria.** `draggable-member.tsx:48` gắn listener lên `<div>` thuần, sensor `PointerSensor { distance: 8 }`. Điểm tiếp xúc duy nhất là `Tooltip.Trigger` bọc nội dung card (`member-card.tsx:46`) — `usePress`/`useHover` gắn pointer handler **bên trong** phần tử dnd-kit. `touch-action: none` đã có nên cảm ứng ổn; **chuột là rủi ro**. Giữ listener ở div ngoài, tooltip ở trong. Xung đột thì `<Tooltip isDisabled={isDragging}>`. Test tay ở Task 9.

**R7 🟡 Icon không tự chỉnh size.** `ui/button.tsx:7` có `[&_svg:not([class*='size-'])]:size-4`. HeroUI không tài liệu hoá auto-sizing và ví dụ của họ dùng icon 16px, còn lucide mặc định 24px. → thêm rule `@layer components` vào `globals.css` thay vì sửa ~60 call site. **Giữ `lucide-react`.**

**R8 🟡 CSS entry.** Thứ tự bắt buộc: `@import "tailwindcss"` rồi `@import "@heroui/styles"`. `shadcn/tailwind.css` chỉ có `@theme inline` / `@custom-variant` / `@utility`, **không khai `@layer`** → không xung đột thứ tự layer; chỉ gỡ được sau khi hết class `data-open:` / `data-closed:`. Phải xoá `@layer base { * { @apply border-border outline-ring/50 } }` (globals.css:196) vì `outline-ring` không resolve khi `--color-ring` biến mất. **Giữ `tw-animate-css`**: còn 3 call site ngoài `ui/` (`table-body-state.tsx:19`, `attendance-grid.tsx:234`, `members-panel.tsx:100`) và chính ví dụ của HeroUI cũng dùng từ vựng `animate-in` / `fade-in-0`. Token `--duration-*`, `--ease-out-soft` và block `prefers-reduced-motion` (globals.css:220) giữ nguyên — vẫn phủ animation của HeroUI vì nhắm `*`.

**R9 🟡 Test vỡ — liệt kê đủ.** 8/44 file là DOM test.
- `table-body-state.test.tsx:62` — `[data-slot="skeleton"]` → `.skeleton`
- `table-pagination.test.tsx:74,76` — `querySelectorAll("li")` (DOM của `Pagination.Item` **chưa xác minh**) và `[aria-label="Trang sau"]` phải gắn lại lên `Pagination.Next`
- `mutation-dialog.test.tsx:53,124,128` — R2 + tên accessible của `Modal.CloseTrigger`
- `session-label.test.tsx:48,56` — assert `text-primary` → `text-accent`
- `member-row.test.tsx` — render `Select` của React Aria trong jsdom cần `ResizeObserver` / `matchMedia` / `scrollIntoView`
- **An toàn**: `empty-state.test.tsx`, `spinner.test.tsx`, `attendance-grid.test.tsx`

**R10 🟢 Ranh giới RSC.** HeroUI không ship `"use client"` trên mọi export → import vào Server Component là **build error**, không phải warning. Khoảng 8 component phải thêm `"use client"`, đáng chú ý `app/dang-nhap/page.tsx` (import `card`) — đẩy ranh giới client lên một cấp.

**R11 🟢 Gắn label cho Select.** `guild-class-filter-select.tsx:26,69` nhận prop `id`, đặt lên `SelectTrigger`; caller (`roster-filter-bar.tsx`) ghép `<Label htmlFor={id}>`. HeroUI `Label` phải nằm **trong** `<Select>` để bind theo context. Hoặc chuyển label vào trong (đổi API công khai), hoặc giữ `htmlFor` + đặt `id` lên `Select.Trigger` (**chưa xác minh** `Select.Trigger` có forward `id` xuống phần tử focusable). Tương tự `page-size-select`, `week-picker`, `member-form-dialog`. `member-row.tsx:95` dùng `aria-label` — an toàn.

**R12 🟢 z-index / portal.** Chỉ 3 chỗ `z-*` ngoài `ui/`: `sticky-columns.ts:8,12` và `site-header.tsx:22`, đều `z-10`. Overlay HeroUI portal ra `document.body` nên không đụng nhau.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/vitest.setup.ts` | Stub `ResizeObserver` / `matchMedia` / `scrollIntoView` / `IntersectionObserver` cho jsdom |
| `apps/web/components/shared/tip.tsx` | Bọc `Tooltip` HeroUI, hard-code `delay={0}` |

**Xoá (theo thứ tự batch)**

`components/ui/`: `separator.tsx` (Task 0) · `skeleton.tsx`, `label.tsx`, `input.tsx`, `textarea.tsx` (Task 2) · `button.tsx` (Task 3) · `tooltip.tsx`, `avatar.tsx`, `badge.tsx` (Task 4) · `card.tsx`, `scroll-area.tsx` (Task 5) · `dialog.tsx` (Task 6) · `select.tsx`, `dropdown-menu.tsx` (Task 7) · `tabs.tsx`, `pagination.tsx`, `popover.tsx`, `calendar.tsx` (Task 8). Còn lại đúng `table.tsx`.
Ngoài ra: `apps/web/components.json` (Task 9).

**Sửa — hạ tầng**

| File | Đổi gì |
|---|---|
| `apps/web/package.json` | +`@heroui/react`, `@heroui/styles`, `@internationalized/date`; +dev `@testing-library/user-event`; cuối đợt gỡ `@base-ui/react`, `class-variance-authority`, `react-day-picker`, `date-fns`, dev `shadcn` |
| `apps/web/app/globals.css` | Import HeroUI; thay palette + `@theme inline`; rule auto-size icon; `--skeleton-animation: pulse`; xoá block `@layer base { * { … } }`; cuối đợt gỡ `@import "shadcn/tailwind.css"` |
| `apps/web/vitest.config.ts` | Thêm `setupFiles` |
| `apps/web/components/providers.tsx` | Gỡ `TooltipProvider`; thêm `I18nProvider locale="vi-VN"` |
| `apps/web/.mcp.json` | Gỡ khai báo server `shadcn` ở Task 9 |

**Sửa — file then chốt (hợp đồng dễ vỡ nhất)**

`components/shared/mutation-dialog.tsx` + `mutation-form.tsx` + `mutation-pending.ts` · `components/shared/table-body-state.tsx` (giữ nguyên cấu trúc, chỉ đổi token/class) · `components/shared/action-buttons.tsx` · `components/shared/table-pagination.tsx` · `features/settings/components/date-time-field.tsx`.

**Docs phải sửa (Task 9)**

`docs/architecture.md` §4.1 / §4.2 / §7 · `apps/web/docs/frontend.md` §2 / §5 / §9 · `apps/web/CLAUDE.md` dòng 3 và 28 — cả ba đang ghi "shadcn/ui on `@base-ui/react`" là **binding**. Sửa luôn sai lệch đã phát hiện: frontend.md §5 nhắc `table-skeleton`, file thật là `table-body-state.tsx`.

**Bổ sung khi thi hành**: `docs/development.md` §6 cũng phải sửa — nó hướng dẫn `pnpm dlx shadcn@latest add <component>`, sau đợt này là chỉ dẫn chết. Danh sách ban đầu bỏ sót file này.

---

### Task 0: Dựng khung và spike hai rủi ro chặn

Không đổi giao diện. Mục tiêu là chứng minh hai giả định nguy hiểm nhất **trước khi** động vào call site nào.

**Files:**
- Modify: `apps/web/package.json`, `apps/web/app/globals.css`, `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Delete: `apps/web/components/ui/separator.tsx`

- [x] **Step 1: Tách commit cho thay đổi đang treo**

`git rev-parse --abbrev-ref HEAD` đang là `main`. Commit ba thay đổi đang treo (`apps/web/package.json` chuyển `shadcn` sang devDependencies, `pnpm-lock.yaml`, `apps/web/.mcp.json` mới) thành một commit riêng `chore(web): move shadcn to devDependencies`, rồi tạo nhánh `refactor/heroui-v3-migration`. Không trộn chúng vào commit migrate.

- [x] **Step 2: Cài dependency**

```bash
pnpm --filter web add @heroui/react @heroui/styles @internationalized/date
pnpm --filter web add -D @testing-library/user-event
```

- [x] **Step 3: Nối stylesheet**

Trong `apps/web/app/globals.css`, thêm `@import "@heroui/styles";` **ngay sau** `@import "tailwindcss";`. Thứ tự này bắt buộc. Chưa xoá gì ở bước này — `tw-animate-css` và `shadcn/tailwind.css` vẫn còn.

- [x] **Step 4: Rule auto-size icon (R7)**

Thêm vào `globals.css`:

```css
@layer components {
  /* lucide mặc định 24px; HeroUI tune cho icon 16px và không tự chỉnh size.
     Một rule ở đây thay cho ~60 lần thêm class ở call site. */
  .button svg:not([class*="size-"]),
  .chip svg:not([class*="size-"]) {
    @apply size-4;
  }
}
```

- [x] **Step 5: Setup file cho vitest (R9)**

Tạo `apps/web/vitest.setup.ts` với stub `ResizeObserver`, `IntersectionObserver`, `window.matchMedia`, `Element.prototype.scrollIntoView` — jsdom không có, React Aria cần. Khai `setupFiles: ["./vitest.setup.ts"]` trong `apps/web/vitest.config.ts`. Giữ nguyên `environment: "node"` và cơ chế opt-in `// @vitest-environment jsdom` từng file.

- [x] **Step 6: Xoá file chết**

Xoá `apps/web/components/ui/separator.tsx` — 0 importer trong toàn repo. Xác nhận bằng grep trước khi xoá.

- [x] **Step 7: SPIKE A — `render` trên Button (R1)**

Dựng tạm một component render `<Button render={(p) => <Link {...p} href="/" />}>` và xác minh: (a) compile, (b) ra đúng thẻ `<a href>` (chuột phải mở tab mới được), (c) `onPress` vẫn chạy. Ghi kết quả vào đây trước khi đi tiếp.

> Kết quả spike A: **CHẠY ĐƯỢC NHƯNG KHÔNG DÙNG.** Ở runtime `<Button render={(props) => <a {...props} href="/home" />}>` cho ra `<a href>` thật và `onPress` vẫn chạy. Nhưng tài liệu Composition của HeroUI cấm đúng việc này ("Always render the expected element type — if `<button>` is expected, do not render an `<a>`"), và TypeScript chặn thật: `domProps` mang kiểu của `HTMLButtonElement` nên không gán được cho `<a>`/`next/link`. **Đường đúng cho button-as-link là `buttonVariants({ variant, size })` đặt thẳng lên `<Link>`/`<a>`** — đó là cách tài liệu chỉ định. Prop `render` chỉ dùng khi vẫn giữ đúng loại element (ví dụ `motion.button`).

- [x] **Step 8: SPIKE B — `fireEvent.click` vs `onPress` trong jsdom (R2)**

Viết một test tạm render HeroUI `Button` với `onPress`, bắn `fireEvent.click` rồi bắn `userEvent.click`. Xác định cái nào kích hoạt được handler. Nếu `fireEvent.click` không chạy thì toàn bộ DOM test có click phải chuyển sang `userEvent` — ghi lại phạm vi.

> Kết quả spike B: **ĐẠT, không cần đổi test.** Cả `fireEvent.click` lẫn `userEvent.click` đều kích hoạt `onPress` đúng một lần trong jsdom — `usePress` có nhánh dự phòng cho click không kèm pointer event. Các DOM test hiện có giữ nguyên `fireEvent.click`; `@testing-library/user-event` vẫn cài để dùng khi cần mô phỏng tương tác thật (hover, keyboard).

- [x] **Step 9: Chốt cổng**

**Một trong hai spike hỏng → dừng, sửa lại kế hoạch này trước khi code tiếp.** Không đi tiếp bằng giả định.

- [x] **Step 10: Verify**

Bốn lệnh xanh. ⚠️ Phần kiểm bằng mắt chưa làm: mở `next dev`, xác nhận Button HeroUI có style, không CSS 404, không bị reset hai lần.

---

### Task 1: Cắt theme, làm một lần

Batch lớn nhất và là batch duy nhất đổi diện mạo trên diện rộng. Phải làm trọn một lần — làm nửa vời thì app trông chắp vá.

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: ~45 file dưới `app/`, `components/`, `features/` (đổi tên token)
- Modify: `apps/web/components/ui/table.tsx`
- Modify: `apps/web/components/shared/__tests__/session-label.test.tsx`

- [x] **Step 1: Thay palette trong `globals.css`**

Thay khối `:root` / `.dark` và phần màu của `@theme inline` bằng token mặc định HeroUI. **Giữ lại**: `--duration-fast|base|slow`, `--ease-out-soft`, `--font-*`, `html { font-size: 120% }`, block `@media (prefers-reduced-motion: reduce)` ở cuối file. **Bỏ**: `--spacing: 0.24rem` (HeroUI tune cho `0.25rem`). **Thêm**: `--skeleton-animation: pulse` — mặc định `shimmer` là chuyển động hình học, vi phạm frontend.md §6.

- [x] **Step 2: Xoá selector `*` toàn cục**

Xoá `@layer base { * { @apply border-border outline-ring/50 } }` (khoảng dòng 196). `outline-ring` không resolve khi `--color-ring` biến mất, và border màu áp lên mọi phần tử sẽ đánh nhau với border riêng của component HeroUI.

Đã xác minh: **không phải sửa call site nào**. `@heroui/styles` base layer tự đặt `border-color: var(--border, currentColor)` trên `*`, nên `border` / `border-b` không kèm màu vẫn ra đúng màu.

- [x] **Step 3: Chạy bảng đổi tên token (R5)**

Áp bảng R5 trên `app|components/shared|features|lib|hooks|config` — tức mọi nơi **trừ** `components/ui/*`. Giữ nguyên `emerald-*` (có chủ đích). Cẩn thận `bg-muted` → `bg-default`: HeroUI `--muted` là màu **chữ**, không phải nền — đổi máy móc sẽ ra nền sai; thứ tự thay thế phải để `bg-muted` chạy **trước** `muted-foreground → muted`, nếu không `text-muted` vừa sinh ra sẽ bị rule sau đổi tiếp thành `text-default`.

`components/ui/*` **không** đổi class. Chúng chết dần trong Task 2–8; viết lại ~150 lượt class trong file sắp xoá là công vô ích, và ngữ nghĩa `accent`/`muted` của shadcn ngược với HeroUI nên đổi máy móc sẽ ra màu sai. Thay vào đó `globals.css` cấp một khối `@theme inline` **compat shim** ánh xạ tên cũ sang biến HeroUI (`--color-primary: var(--accent)`, `--color-muted-foreground: var(--muted)`, …). Khối này bị xoá ở Task 9 cùng `shadcn/tailwind.css`; không gì ngoài `components/ui/` được phụ thuộc vào các tên đó.

- [x] **Step 4: Restyle bảng**

`components/ui/table.tsx`: đổi class sang token HeroUI (`text-muted`, `border-separator`, `hover:bg-surface-hover`). **Không đụng markup** — `<table>/<thead>/<tbody>/<tr>/<th>/<td>` giữ nguyên, đó là lý do file này sống sót.

- [x] **Step 5: Sửa test**

`session-label.test.tsx:48,56` assert `text-primary` → đổi thành `text-accent`. Assertion `size-4`/`size-3.5` ở dòng 62,67 là class của chính app — giữ nguyên.

- [x] **Step 6: Verify**

Bốn lệnh xanh. Mắt thường trên `/`, `/xep-team`, `/thiet-lap`: cột sticky của bảng điểm danh vẫn **đục** khi cuộn ngang; tint Guild War còn đọc ra là tint; icon emerald không đổi; `prefers-reduced-motion` còn hiệu lực.

---

### Task 2: Component lá (skeleton, label, input, textarea)

Bốn component phẳng, không có shape compound. Batch dễ nhất — dùng nó để làm quen nhịp.

**Files:**
- Modify: 14 file import 4 component này
- Delete: `components/ui/{skeleton,label,input,textarea}.tsx`
- Modify: `components/shared/__tests__/table-body-state.test.tsx`

- [x] **Step 1: `skeleton` → HeroUI `Skeleton`** (6 importer). Xác nhận `--skeleton-animation: pulse` từ Task 1 có tác dụng.
- [x] **Step 2: `label` → HeroUI `Label`** (4 importer). `htmlFor` giữ nguyên, đổi import là xong.
- [x] **Step 3: `input` → HeroUI `Input`** (5 importer). **Cẩn thận**: nếu dùng `TextField` thì `onChange` là `(value: string)`, không phải event — `date-time-field.tsx` phụ thuộc vào event. Dùng `Input` standalone ở đó.
- [x] **Step 4: `textarea` → HeroUI `TextArea`** (1 importer: `slot-note-input.tsx`).
- [x] **Step 5: Xoá 4 file cũ.**
- [x] **Step 6: Sửa test.** `table-body-state.test.tsx:62`: `[data-slot="skeleton"]` → `.skeleton`.
- [x] **Step 7: Verify.** Bốn lệnh xanh. Trên `/thiet-lap`: label còn focus đúng input; skeleton chạy **pulse**, không phải shimmer trôi.

---

### Task 3: Button

Batch lan rộng nhất. 14 file import trực tiếp, cộng toàn bộ đổi `onClick` → `onPress`.

**Files:** 14 importer + `components/ui/button.tsx`

- [x] **Step 1: Remap `variant` và `size`.** default→primary, destructive→danger, outline/secondary/ghost giữ tên. `size`: default→md, sm→sm, lg→lg; `icon*` → `isIconOnly` + size tương ứng. Grep `size="xs"`, `icon-xs`, `variant="link"` — nếu có call site thì bổ sung qua `tv({ extend: buttonVariants })`, đừng bỏ lặng.
- [x] **Step 2: `disabled` → `isDisabled`** ở mọi call site.
- [x] **Step 3: `onClick` → `onPress`** — 14 site trong 12 file (danh sách ở R2). **Không** đụng hai `<button onClick>` native trong `attendance-row.tsx:167,181`.
- [x] **Step 4: Hai site render-as-link (R1).** `main-nav.tsx:65` và `discord-login-button.tsx:22`: bỏ `<Button>` hẳn, render `<Link>` / `<a>` với `className={buttonVariants({ variant, size })}`. **Bỏ prop `nativeButton`** (không tồn tại trong HeroUI). Chúng vốn là điều hướng, không phải nút, nên mất `onPress` không thiệt gì.
- [x] **Step 5: Prop nội bộ.** `EditAction` / `CreateButton` / `RowActionButton` trong `action-buttons.tsx` đang phơi `onClick`/`disabled` — đây là API của chính app. **Chốt: đổi sang `onPress`/`isDisabled`** và cập nhật call site, để app chỉ còn một từ vựng thay vì dịch qua lại ở ranh giới.

`MutationForm` là ngoại lệ: prop `variant` của nó là **ý định** (`default` | `destructive`), không phải tên biến thể thư viện, nên giữ union đó và map một chỗ (`CONFIRM_VARIANT`). `destructive` map sang `danger-soft`, khớp với diện mạo soft mà bản shadcn đang có.
- [x] **Step 6: Xoá `components/ui/button.tsx`.** Ba primitive chưa tới lượt (`dialog`, `pagination`, `calendar`) đang import nó; gỡ phụ thuộc bằng cách cho chúng style một element thuần với `buttonVariants` của HeroUI thay vì import wrapper. Không giữ adapter.
- [x] **Step 7: Verify.** Bốn lệnh xanh. Trên header và `/dang-nhap`: nav là `<a href>` thật (chuột phải → mở tab mới); nút Discord là `<a>`; icon 16px không phải 24px.

---

### Task 4: Tooltip, Avatar, Chip

**Files:** ~9 file + `components/providers.tsx`; xoá `ui/{tooltip,avatar,badge}.tsx`; tạo `components/shared/tip.tsx`

- [x] **Step 1: Tạo `components/shared/tip.tsx` (R4).** Bọc HeroUI `Tooltip` hard-code `delay={0}`. Doc comment phải nói rõ vì sao tồn tại: HeroUI bỏ Provider và mặc định 700ms, app này muốn tooltip hiện tức thì.
- [x] **Step 2: Gỡ `TooltipProvider` khỏi `components/providers.tsx`** và cập nhật doc comment của file (hiện đang không nhắc tới TooltipProvider — sai từ trước).
- [x] **Step 3: Ba site `TooltipTrigger render={…}` → children (R1).** `action-buttons.tsx:121`, `guild-class-icon.tsx:31`, `member-card.tsx:46`. Ở `member-card.tsx` giữ tooltip ở lớp **trong**, listener dnd-kit ở div **ngoài** (R6).
- [x] **Step 4: `Avatar*` → `Avatar.*`** (3 importer). Xoá `AvatarGroup` / `AvatarGroupCount` / `AvatarBadge` — 0 call site, xác nhận bằng grep trước khi xoá.
- [x] **Step 5: `Badge` → `Chip` + `Chip.Label`** (2 importer). `status-badge.tsx` map `tone` → `color`; giữ nguyên tông emerald có chủ đích.
- [x] **Step 6: Xoá 3 file cũ.**
- [x] **Step 7: Verify.** Bốn lệnh xanh. Trên `/thanh-vien` và `/xep-team`: tooltip hiện **tức thì** trên nút icon và avatar class.

---

### Task 5: Card và ScrollShadow

**Files:** ~13 file; xoá `ui/{card,scroll-area}.tsx`

- [x] **Step 1: `Card*` → `Card.*`** (11 importer), phẳng → compound.
- [x] **Step 2: Kiểm ngữ nghĩa heading.** `Card.Title` render `h3` và `Card.Description` render `p`, trong khi bản cũ là `div`. Rà từng call site xem thứ bậc heading của trang có còn đúng không — đây là thay đổi accessibility, không chỉ là style.

**Đã rà, giữ mặc định `h3`.** Bốn màn có `<h1>` (`/dang-nhap`, `/thiet-lap`, `/xep-team`, tab quản lý thành viên) giờ nhảy h1 → h3, và hai màn còn lại mở đầu ở h3. Đó không phải regression: bản cũ render `div`, tức **không có** cấu trúc heading nào. Chỉnh lại thang heading cho đúng là việc riêng, ngoài phạm vi đợt này — ghi lại ở đây để không bị coi là đã xong.
- [x] **Step 3: `ScrollArea` → `ScrollShadow`** (`member-pool.tsx`). Ngữ nghĩa khác: overflow gốc + fade mask thay vì scrollbar ảo. `className="h-64"` → `className="h-64 scrollbar"`.
- [x] **Step 4: Xoá 2 file cũ.**
- [x] **Step 5: Verify.** Bốn lệnh xanh. Mắt thường mọi màn: padding/radius card; member pool cuộn có fade, không bị cắt cụt.

---

### Task 6: Modal — giao thức ghi

Làm **riêng một mình**. Đây là hợp đồng giá trị nhất của app và là thứ dễ hỏng ngầm nhất.

**Files:** `components/shared/mutation-dialog.tsx`, `mutation-form.tsx`, `features/team-builder/components/delete-match-dialog.tsx`, `components/shared/__tests__/mutation-dialog.test.tsx`; xoá `ui/dialog.tsx`

- [x] **Step 1: Chuyển state controlled xuống `Modal.Backdrop` (R3)**, kèm `isDismissable={!isPending}` và `isKeyboardDismissDisabled={isPending}`. Giữ nguyên quy tắc chỉ mount children khi mở, để state form reset mỗi lần vào.
- [x] **Step 2: Xác minh `Modal.CloseTrigger`.** Kiểm tra nó có đi qua `onOpenChange` không. **Nếu không**: cấm dùng `slot="close"` trong `mutation-form.tsx` và bỏ hẳn `DialogFooter showCloseButton`. Ghi kết quả vào đây.

> `Modal.CloseTrigger` có đi qua `onOpenChange`: **CÓ.** Nó gọi `close()` của overlay state, và với cặp controlled trên `Modal.Backdrop` thì đó chính là `onOpenChange(false)` — nên guard `isPending` chặn được nó y như ESC và backdrop. Đã ghim bằng một case mới trong `mutation-dialog.test.tsx` ("lúc rảnh thì nút Đóng báo đóng lên caller"): thiếu nó thì "yêu cầu đóng bị bỏ qua" và "nút đóng chưa hề được nối" nhìn giống hệt nhau. `slot="close"` vẫn không dùng trong `mutation-form.tsx` — nút xác nhận phải đóng **sau khi** write xong, không phải khi bấm.

- [x] **Step 3: Giữ nguyên `<form onSubmit>`.** **Không** thay bằng HeroUI `Form` — `validationBehavior="native"` sẽ chặn submit theo HTML validity và đổi giao thức. Chỉ `Modal.Body` / `Modal.Footer` bọc quanh nó.
- [x] **Step 4: `MutationPendingContext` giữ nguyên.** Không đổi cơ chế form báo ngược lên shell.
- [x] **Step 5: Cập nhật test.** `mutation-dialog.test.tsx:53,124,128` — `fireEvent.click` theo kết quả spike B, và tên accessible của nút đóng. Sáu hành vi phải giữ nguyên: đóng khi thành công · `ApiError` giữ dialog mở và hiện message backend nguyên văn · lỗi không message → câu dự phòng · nút khoá và đổi sang `pendingLabel` khi đang chạy · yêu cầu đóng lúc đang ghi bị bỏ qua · mở lại sau lỗi không còn error cũ.
- [x] **Step 6: Xoá `ui/dialog.tsx`.**
- [x] **Step 7: Verify.** Bốn lệnh xanh. Tay: dialog thêm/sửa/xoá thành viên — ESC và click backdrop bị **bỏ qua** khi đang ghi; nút X hoạt động lại sau khi ghi lỗi; mở lại thì field trống.

---

### Task 7: Select và Dropdown

**Files:** ~8 file; xoá `ui/{select,dropdown-menu}.tsx`

- [x] **Step 1: Đổi mô hình `Select`.** `value` → `Key`, `onValueChange` → `onChange`, `SelectItem value=` → `ListBox.Item id= textValue=`. `textValue` bắt buộc khi item không phải text thuần (`guild-class-filter-select` có `next/image`).
- [x] **Step 2: Sentinel `"all"`.** `guild-class-filter-select.tsx` dùng `"all"` làm giá trị giả. Kiểm nó không lọt ra ngoài API công khai của component sau khi đổi sang `Key`.
- [x] **Step 3: Gắn label (R11). Chốt phương án (a)**: `Label` nằm **trong** `Select`, bỏ prop `id` khỏi API công khai. Đó là cách HeroUI thiết kế, và không phải dựa vào việc `Select.Trigger` có forward `id` hay không.

Grep cho thấy chỉ **hai** trong bốn chỗ thật sự có `<Label htmlFor>` trỏ tới: `guild-class-filter-select` (qua `roster-filter-bar`) và `member-form-dialog`. Hai chỗ còn lại — `pageSizeId` và `formation-week` — là **id chết**: không label nào trỏ tới, và cả hai control vốn đã tự đặt tên bằng `aria-label`. Xoá luôn prop `id`/`pageSizeId` cùng hai call site truyền nó.

`GuildClassFilterSelect` đổi `id` thành `label` + `isLabelHidden`, vì `roster-filter-bar` layout `inline` cần label chỉ dành cho screen reader.
- [x] **Step 4: `user-menu.tsx` → `Dropdown`.** `DropdownMenuItem onClick` → `Dropdown.Menu onAction(key)` + `Dropdown.Item id`. `align="end"` → `placement="bottom end"`.
- [x] **Step 5: Xoá 2 file cũ.**
- [x] **Step 6: Kiểm `member-row.test.tsx`** — render React Aria `Select` trong jsdom, xác nhận stub ở Task 0 đủ dùng.
- [x] **Step 7: Verify.** Bốn lệnh xanh. Trên `/thanh-vien`: filter class toggle đúng; dropdown vai trò ở dòng của chính mình bị disable và được announce cho screen reader.

---

### Task 8: Tabs, Pagination, Popover, Calendar

**Files:** ~8 file; xoá `ui/{tabs,pagination,popover,calendar}.tsx`; gỡ `react-day-picker`

- [x] **Step 1: `Tabs`** (3 importer). `value` → `selectedKey`, `onValueChange` → `onSelectionChange`, `TabsTrigger value=` → `Tabs.Tab id=`, `TabsContent value=` → `Tabs.Panel id=`. Thêm `Tabs.ListContainer` và `Tabs.Indicator` bắt buộc.
- [x] **Step 2: `Pagination`.** **Giữ nguyên `getPageSlots` và sentinel `ELLIPSIS`/`BLANK`** trong `hooks/use-table-pagination.ts` — đó là logic của app, không phải của thư viện. Bỏ `href="#"` + `event.preventDefault()`; `goTo` mất tham số `MouseEvent`. `BLANK` render thành `<Pagination.Item><span className="block size-8" aria-hidden /></Pagination.Item>`. Gắn lại `aria-label` tiếng Việt lên `Pagination.Previous`/`Next`.
- [x] **Step 3: Cập nhật `table-pagination.test.tsx:74,76`** theo DOM thật của `Pagination.Item`. `Pagination.Item` vẫn render `<li>`, nên assertion về vị trí nút không đổi. Nhưng nút bị chặn dùng `disabled` gốc chứ **không** `aria-disabled`, nên case một-trang phải assert bằng hành vi: nút `disabled` **và** click không gọi `onPageChange`.
- [x] **Step 4: `Popover`** (`date-time-field.tsx`). Thêm lớp `Popover.Dialog` bắt buộc; `align="end"` → `placement="bottom end"`; `sideOffset` → `offset`; trigger từ `render={<Button/>}` sang children.
- [x] **Step 5: Calendar → HeroUI.** Đổi `Date` → `DateValue` của `@internationalized/date` trong `date-time-field.tsx` và các hàm liên quan trong `lib/date-parts.ts`, `lib/datetime-input.ts`. **Giữ nguyên input mask dd/mm/yyyy** — nó tồn tại chính vì trình duyệt máy tiếng Anh hiện mm/dd/yyyy, và `DateField` của HeroUI sẽ tái lập đúng vấn đề đó nếu không có `I18nProvider`.
- [x] **Step 6: Thêm `I18nProvider locale="vi-VN"`** vào `components/providers.tsx`.
- [x] **Step 7: Cập nhật test của `lib/date-parts.ts` và `lib/datetime-input.ts`** theo kiểu dữ liệu mới.
- [x] **Step 8: Gỡ `react-day-picker`** khỏi `package.json`. **Gỡ luôn `date-fns`**: nó chỉ còn được import ở đúng một chỗ (`locale.vi` truyền cho `react-day-picker`), nên khi calendar đi thì nó thành dependency chết — locale giờ do `I18nProvider` lo. Xoá 4 file cũ.
- [x] **Step 9: Verify.** Bốn lệnh xanh. Trên `/thanh-vien`, `/lich-su-diem-danh`, `/thiet-lap`: thanh phân trang giữ **bề rộng cố định** ở trang 1, 5 và N, vẫn render khi chỉ có 1 trang, aria-label first/prev/next/last còn nguyên; date picker hiện tiếng Việt; nhập tay dd/mm/yyyy vẫn chạy.

---

### Task 9: Dọn dẹp, kiểm tra tay, cập nhật docs

**Files:** `package.json`, `globals.css`, `.mcp.json`, `components.json`, 3 file docs

- [x] **Step 1: Xác nhận `components/ui/` chỉ còn `table.tsx`.**
- [x] **Step 2: Gỡ dependency.** `@base-ui/react`, `class-variance-authority`, devDep `shadcn`. Xoá luôn khối compat shim `@theme inline` trong `globals.css` (Task 1 Step 3) — nó chỉ tồn tại cho `components/ui/*`, giờ đã rỗng. **Giữ** `tw-animate-css` (R8), `lucide-react`, `tailwind-merge`, `clsx`.
- [x] **Step 3: Gỡ `@import "shadcn/tailwind.css"`** khỏi `globals.css`. Trước đó grep xác nhận không còn class `data-open:` / `data-closed:` nào — chúng là `@custom-variant` do file đó cấp.
- [x] **Step 4: Xoá `apps/web/components.json`** và gỡ khai báo server `shadcn` khỏi `apps/web/.mcp.json`. **Đã hỏi và được đồng ý**: khai `heroui-react` (`npx -y @heroui/react-mcp`) vào `apps/web/.mcp.json` và commit, để người sau có cùng công cụ tra cứu API.
- [ ] **Step 5: Kiểm tra tay dnd-kit (R6).** ⚠️ **CHƯA LÀM — cần người kiểm.** Trên `/xep-team`: kéo member từ pool vào slot và ngược lại, **bằng chuột và bằng cảm ứng**. Tooltip không được nuốt thao tác kéo. Hỏng thì `<Tooltip isDisabled={isDragging}>`.
- [x] **Step 6: Cập nhật `docs/architecture.md`** §4.1 (stack), §4.2 (dòng `components/ui/` và luật "no Radix, no hand-written primitives"), §7 (dòng "nếu là component shadcn thì generate bằng CLI"). Đây là tài liệu **binding** — nó thắng frontend.md khi hai bên lệch nhau.
- [x] **Step 7: Cập nhật `apps/web/docs/frontend.md`** §2 (cây thư mục + dòng stack), §5 (bảng ba thư mục và đoạn "Base UI flavour"), §9 (dòng anti-pattern "Editing `components/ui/button.tsx`"). Sửa luôn sai lệch có sẵn: §5 nhắc `table-skeleton`, file thật là `table-body-state.tsx`. Thêm ghi chú vì sao `table.tsx` ở lại.
- [x] **Step 8: Cập nhật `apps/web/CLAUDE.md`** dòng 3 (stack) và dòng 28 (`components/ui/` là shadcn CLI output).
- [x] **Step 9: Verify lần cuối.** Bốn lệnh xanh (327 test). ⚠️ Phần **đi tay 5 màn** chưa làm — cần người kiểm:: `/`, `/lich-su-diem-danh`, `/xep-team`, `/thiet-lap`, `/dang-nhap`.

---

## Ngoài phạm vi

- **Dark mode.** App hiện có CSS `.dark` nhưng không ai bật (`next-themes` không tồn tại, không có nút toggle). HeroUI hỗ trợ sẵn nên đây là cơ hội, nhưng là một đợt riêng.
- **Port bảng màu cũ.** Đã chốt dùng theme mặc định HeroUI; nếu sau này muốn về lại nhận diện cũ thì viết một theme custom map token, làm riêng.
- **HeroUI `Table`.** Xem R2 — chỉ nên xem xét lại nếu HeroUI bổ sung `colSpan` cho `Table.Cell`.
- ~~**Khai `heroui-react` vào `.mcp.json` cấp repo.**~~ Đã hỏi và đã làm trong Task 9.
- **Storybook hay bất kỳ lưới visual-regression nào.** Repo hiện không có; migration này chạy mà không có lưới an toàn về mặt hình ảnh, đó là rủi ro đã biết và đã chấp nhận.

---

## Trạng thái khi đóng đợt

Tất cả 10 task đã code xong, mỗi task một commit trên `refactor/heroui-v3-migration`, và bốn lệnh
xác minh (`typecheck` · `lint` · `test` 327/327 · `build`) xanh sau **từng** task.

**Còn lại, chỉ người kiểm được** — không lệnh nào bắt được:

1. **dnd-kit vs React Aria (R6, Task 9 Step 5)** — kéo member pool ↔ slot trên `/xep-team`, **bằng
   chuột và bằng cảm ứng**. Tooltip (`Tip` bọc trong `member-card`) không được nuốt thao tác kéo.
   Hỏng thì truyền `isDisabled={isDragging}` cho `Tip` — prop đã có sẵn cho đúng việc này.
2. **Đi mắt 5 màn**: `/`, `/lich-su-diem-danh`, `/xep-team`, `/thiet-lap`, `/dang-nhap`. Cụ thể:
   cột sticky của bảng điểm danh còn **đục** khi cuộn ngang; tint Guild War còn đọc ra là tint;
   skeleton chạy **pulse** không phải shimmer; thanh phân trang giữ **bề rộng cố định** ở trang 1, 5
   và N; tooltip hiện **tức thì**; date picker hiện tiếng Việt và nhập tay dd/mm/yyyy vẫn chạy;
   dialog ghi: ESC và click backdrop bị bỏ qua khi đang lưu.

**Diện mạo app đổi** — đó là quyết định 3 của kế hoạch (theme mặc định HeroUI, không port bảng màu
oklch cũ), không phải lỗi.
