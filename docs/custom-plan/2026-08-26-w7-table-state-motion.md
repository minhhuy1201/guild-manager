# W7 — Trạng thái thân bảng và từ vựng chuyển động — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bảng không còn nhảy layout khi tải/lọc/ghi, và bốn nhánh *lỗi / đang tải / rỗng / có dữ liệu* chỉ được viết một lần.

**Architecture:** Gom năm điểm ma sát vào ba module dùng chung mới (`TableBodyState`, `EmptyState`, `Spinner`), một bộ token chuyển động trong `globals.css`, và một `getPageSlots` trả mảng dài cố định. Không thêm dependency: `tw-animate-css` đã import sẵn ở `app/globals.css:2`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 (`@theme inline`), tw-animate-css, TanStack Query 5, shadcn/ui (`components/ui/`, không sửa tay), Vitest 4 + `@testing-library/react` (jsdom qua `// @vitest-environment jsdom` ở dòng đầu file test).

**Spec:** [`docs/custom-spec/2026-08-25-w7-table-state-motion-design.md`](../../custom-spec/2026-08-25-w7-table-state-motion-design.md)

## Global Constraints

- Phạm vi: chỉ `apps/web`. Không đụng `apps/api`, `packages/shared`, `docs/architecture.md`.
- **Không thêm dependency mới.** Dự án **không** có `@testing-library/jest-dom`, nên test dùng DOM API
  thuần (`getAttribute`, `classList.contains`), không dùng `toHaveClass` / `toHaveAttribute`.
- **Chuyển động chỉ được đổi độ mờ và màu, không đổi hình học.** Cấm `translate`, `height`, `scale` trên nội dung bảng.
- **Không sửa tay `components/ui/`** — đó là output của shadcn CLI.
- Comment, JSDoc, tên file: **tiếng Anh**. Chữ hiển thị cho người dùng: **tiếng Việt**.
- `apps/web/docs/frontend.md` là tài liệu **tiếng Anh** (chỉ tiếng Việt cho chuỗi UI được trích).
  Tiếng Việt chỉ dùng trong `docs/superpowers`, `docs/custom-plan`, `docs/custom-spec`.
- Mọi function mới phải có JSDoc nêu mục đích, từng param và giá trị trả về.
- Không mutate: luôn tạo mảng/đối tượng mới.
- Mỗi task tự commit riêng, **không gộp commit của hai task**.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- Nhánh git: task đầu tiên tạo nhánh `refactor/w7-table-state-motion` (đang ở `main` thì phải tách nhánh trước khi commit).

## Ba điều chỉnh so với spec (đã thống nhất, spec đã được cập nhật)

1. **§1 — không dùng `assertNever`.** Union `number | "ellipsis" | "blank"` có một nhánh mở (`number`), nên `switch` không thể exhaustive-check được; nhánh `default` chính là số trang. Vẫn `switch`, nhưng không có `assertNever`.
2. **§1 — vị trí chèn `BLANK`**: chèn **sát phía trong của dấu `…` đang có** (thiếu ở phải → chèn ngay *trước* `…` cuối; thiếu ở trái → chèn ngay *sau* `…` đầu). Như vậy cả số trang lẫn dấu `…` đều giữ nguyên chỉ số ô.
3. **§5 — cách tiêu thụ token**: Tailwind 4 có namespace `--ease-*` (sinh ra class `ease-out-soft`) nhưng **không** có namespace `--duration-*`. Thời lượng dùng qua arbitrary value: `duration-[var(--duration-base)]`.

---

### Task 1: §1 — Dải số trang dài cố định, thanh phân trang luôn hiện

**Files:**
- Modify: `apps/web/components/shared/table-pagination.tsx`
- Modify: `apps/web/features/members/components/members-panel.tsx:132-144`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx:230-243`
- Test: `apps/web/components/shared/__tests__/table-pagination.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: không gì.
- Produces: `export function getPageSlots(page: number, pageCount: number, siblings?: number): PageSlot[]`, `type PageSlot = number | typeof ELLIPSIS | typeof BLANK`. `TablePagination` giữ nguyên props, chỉ khác ở chỗ không bao giờ trả `null`.

- [x] **Step 1: Tách nhánh git**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD   # đang là main
git switch -c refactor/w7-table-state-motion
```

- [x] **Step 2: Viết test thất bại**

Tạo `apps/web/components/shared/__tests__/table-pagination.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TablePagination, getPageSlots } from "../table-pagination";

afterEach(cleanup);

/** Số ô của dải khi siblings = 1 (siblings * 2 + 5). */
const TOTAL_SLOTS = 7;

describe("getPageSlots", () => {
  it("luôn trả về đúng TOTAL_SLOTS ô ở mọi trang", () => {
    const pageCount = 8;
    for (let page = 1; page <= pageCount; page++) {
      expect(getPageSlots(page, pageCount, 1)).toHaveLength(TOTAL_SLOTS);
    }
  });

  it("đệm ở cuối khi tổng số trang còn nhỏ hơn số ô", () => {
    expect(getPageSlots(1, 3, 1)).toEqual([
      1,
      2,
      3,
      "blank",
      "blank",
      "blank",
      "blank",
    ]);
  });

  it("thiếu ở phía phải thì đệm ngay trước dấu ba chấm cuối", () => {
    expect(getPageSlots(1, 8, 1)).toEqual([
      1,
      2,
      "blank",
      "blank",
      "blank",
      "ellipsis",
      8,
    ]);
  });

  it("thiếu ở phía trái thì đệm ngay sau dấu ba chấm đầu", () => {
    expect(getPageSlots(8, 8, 1)).toEqual([
      1,
      "ellipsis",
      "blank",
      "blank",
      "blank",
      7,
      8,
    ]);
  });

  it("giữ nguyên chỉ số ô của số trang giữa hai trang liền nhau", () => {
    const atThree = getPageSlots(3, 8, 1);
    const atFour = getPageSlots(4, 8, 1);
    expect(atThree.indexOf(3)).toBe(atFour.indexOf(3));
    expect(atThree.indexOf(4)).toBe(atFour.indexOf(4));
  });

  it("một trang duy nhất vẫn ra đủ số ô", () => {
    expect(getPageSlots(1, 1, 1)).toHaveLength(TOTAL_SLOTS);
  });
});

describe("TablePagination", () => {
  it("giữ nguyên vị trí nút 'Trang sau' khi đổi trang", () => {
    const { container, rerender } = render(
      <TablePagination page={1} pageCount={8} onPageChange={() => {}} />
    );
    const indexOfNext = () => {
      const items = Array.from(container.querySelectorAll("li"));
      return items.findIndex(
        (item) => item.querySelector('[aria-label="Trang sau"]') !== null
      );
    };

    const atPageOne = indexOfNext();
    rerender(
      <TablePagination page={4} pageCount={8} onPageChange={() => {}} />
    );

    expect(indexOfNext()).toBe(atPageOne);
    expect(atPageOne).toBeGreaterThan(-1);
  });

  it("vẫn render khi chỉ có một trang, bốn nút điều hướng đều bị chặn", () => {
    render(<TablePagination page={1} pageCount={1} onPageChange={() => {}} />);

    for (const label of [
      "Về trang đầu",
      "Trang trước",
      "Trang sau",
      "Về trang cuối",
    ]) {
      expect(screen.getByLabelText(label).getAttribute("aria-disabled")).toBe(
        "true"
      );
    }
  });
});
```

- [x] **Step 3: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- table-pagination`
Expected: FAIL — `getPageSlots` chưa được export.

- [x] **Step 4: Thay `getPageItems` bằng `getPageSlots`**

Trong `apps/web/components/shared/table-pagination.tsx`, thay khối `ELLIPSIS` + `getPageItems` (dòng 19-52) bằng:

```ts
/** Sentinel marking a "..." position in the page list. */
const ELLIPSIS = "ellipsis" as const;

/** Sentinel marking a blank filler cell, so the strip keeps a constant width. */
const BLANK = "blank" as const;

/** One cell of the page strip: a page number, an ellipsis, or a blank filler. */
export type PageSlot = number | typeof ELLIPSIS | typeof BLANK;

/**
 * Insert blank fillers at one position so the strip reaches its fixed length.
 * @param slots - The slots built so far
 * @param totalSlots - The length every strip must have
 * @param at - Index the fillers are inserted at
 * @returns A new array padded to `totalSlots`
 */
function padSlots(
  slots: readonly PageSlot[],
  totalSlots: number,
  at: number
): PageSlot[] {
  const missing = totalSlots - slots.length;
  if (missing <= 0) return [...slots];

  return [
    ...slots.slice(0, at),
    ...Array.from({ length: missing }, () => BLANK),
    ...slots.slice(at),
  ];
}

/**
 * The cells of the page strip. Always returns exactly `siblings * 2 + 5` items —
 * whatever is missing is padded with BLANK — so the strip's width does not depend
 * on the current page and the button pairs on both ends stay put.
 * Padding goes on the side that is short, right next to the ellipsis that is there,
 * which keeps every page number and every ellipsis at a stable index too.
 * @param page - Current page (1-based)
 * @param pageCount - Total number of pages
 * @param siblings - Pages kept on each side of the current one
 * @returns Exactly `siblings * 2 + 5` slots
 */
export function getPageSlots(
  page: number,
  pageCount: number,
  siblings = 1
): PageSlot[] {
  const totalSlots = siblings * 2 + 5;
  // A table with nothing in it still shows page 1 of 1.
  const safeCount = Math.max(1, pageCount);

  // Few enough pages to just show them all, left-aligned.
  if (safeCount <= totalSlots) {
    const pages: PageSlot[] = Array.from(
      { length: safeCount },
      (_, index) => index + 1
    );
    return padSlots(pages, totalSlots, pages.length);
  }

  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, safeCount - 1);
  const hasLeadingGap = left > 2;

  const slots: PageSlot[] = [1];
  if (hasLeadingGap) slots.push(ELLIPSIS);
  for (let i = left; i <= right; i++) slots.push(i);
  if (right < safeCount - 1) slots.push(ELLIPSIS);
  slots.push(safeCount);

  // Short on the left → pad just after the leading ellipsis (index 1).
  // Short on the right → pad just before the trailing ellipsis (last index - 1).
  const at = hasLeadingGap ? 2 : slots.length - 2;
  return padSlots(slots, totalSlots, at);
}
```

- [x] **Step 5: Bỏ `return null` và render ba loại ô**

Vẫn trong `table-pagination.tsx`:

Xoá dòng `if (pageCount <= 1) return null;` và sửa JSDoc của `TablePagination`, câu `@returns` thành:

```
 * @returns The pagination bar — always rendered, so filtering down to one page moves nothing
```

Thay khối `.map` (dòng 116-133 cũ) bằng:

```tsx
        {getPageSlots(page, pageCount, siblings).map((slot, index) => {
          switch (slot) {
            case ELLIPSIS:
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            case BLANK:
              // Same footprint as a page cell, no content and no tab stop:
              // this is what keeps the strip's width constant.
              return (
                <PaginationItem key={`blank-${index}`}>
                  <span className="block size-8" aria-hidden />
                </PaginationItem>
              );
            default:
              return (
                <PaginationItem key={slot}>
                  <PaginationLink
                    href="#"
                    isActive={slot === page}
                    onClick={(e) => goTo(slot, e)}
                  >
                    {slot}
                  </PaginationLink>
                </PaginationItem>
              );
          }
        })}
```

- [x] **Step 6: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- table-pagination`
Expected: PASS (8 test).

- [x] **Step 7: Bỏ hai guard `items.length > 0` bọc ngoài thanh phân trang**

Trong `apps/web/features/members/components/members-panel.tsx`, đổi

```tsx
        {members.length > 0 && (
          <TablePaginationBar
            page={pagination.page}
            ...
          />
        )}
```

thành (bỏ hẳn `{members.length > 0 && (` và `)}`):

```tsx
        <TablePaginationBar
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="thành viên"
          pageSizeId="members-page-size"
        />
```

Trong `apps/web/features/attendance/components/attendance-grid.tsx`, đổi

```tsx
        {!isError && !isPending && characters.length > 0 && (
          <div className="mt-4">
            <TablePaginationBar ... />
          </div>
        )}
```

thành:

```tsx
        <div className="mt-4">
          <TablePaginationBar
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="thành viên"
            pageSizeId="attendance-page-size"
          />
        </div>
```

- [x] **Step 8: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [x] **Step 9: Commit**

```bash
git add apps/web/components/shared/table-pagination.tsx \
        apps/web/components/shared/__tests__/table-pagination.test.tsx \
        apps/web/features/members/components/members-panel.tsx \
        apps/web/features/attendance/components/attendance-grid.tsx
git commit -m "fix(web): keep pagination controls in place across pages"
```

---

### Task 2: §5 + §6 — Token chuyển động và module `Spinner`

**Files:**
- Modify: `apps/web/app/globals.css` (thêm token vào khối `@theme inline` đầu file, thêm khối `prefers-reduced-motion` ở cuối file)
- Create: `apps/web/components/shared/spinner.tsx`
- Test: `apps/web/components/shared/__tests__/spinner.test.tsx` (tạo mới)
- Modify: `apps/web/components/shared/mutation-form.tsx:139`
- Modify: `apps/web/features/team-builder/components/formation-toolbar.tsx:74`
- Modify: `apps/web/docs/frontend.md` (§6, thêm mục "Chuyển động")

**Interfaces:**
- Consumes: không gì.
- Produces:
  - CSS custom properties `--duration-fast` (120ms), `--duration-base` (200ms), `--duration-slow` (320ms), `--ease-out-soft`; dùng qua `duration-[var(--duration-base)]` và class `ease-out-soft`.
  - `export function Spinner({ size, label }: { size?: "sm" | "md"; label?: string }): ReactNode` — trả về **Fragment** (icon + `<span className="sr-only">` khi có `label`), đặt thẳng vào `<Button>` được. Bỏ `label` ở chỗ đã tự có tên khả truy cập (nút có chữ, `RowActionButton`).

- [x] **Step 1: Viết test thất bại**

Tạo `apps/web/components/shared/__tests__/spinner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Spinner } from "../spinner";

afterEach(cleanup);

describe("Spinner", () => {
  it("phát ra nhãn cho trình đọc màn hình", () => {
    render(<Spinner label="Đang lưu" />);
    expect(screen.getByText("Đang lưu").classList.contains("sr-only")).toBe(
      true
    );
  });

  it("không có nhãn thì không thêm chữ nào cho trình đọc màn hình", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".sr-only")).toBeNull();
  });

  it("cỡ mặc định là md, cỡ sm nhỏ hơn", () => {
    const { container: md } = render(<Spinner label="Đang lưu" />);
    expect(md.querySelector("svg")?.classList.contains("size-4")).toBe(true);

    const { container: sm } = render(<Spinner size="sm" label="Đang lưu" />);
    expect(sm.querySelector("svg")?.classList.contains("size-3.5")).toBe(true);
  });
});
```

- [x] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- spinner`
Expected: FAIL — không resolve được `../spinner`.

- [x] **Step 3: Viết `Spinner`**

Tạo `apps/web/components/shared/spinner.tsx`:

```tsx
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The two sizes a spinner may take. Named values rather than a free `className`,
 * same reasoning as `SessionLabel` — a third size means adding it here.
 */
const SIZE_CLASS = {
  sm: "size-3.5",
  md: "size-4",
} as const;

interface SpinnerProps {
  /** "sm" inside a row action or a table cell, "md" (the default) inside a button. */
  size?: keyof typeof SIZE_CLASS;
  /**
   * Screen reader label. Leave it out where the spinner sits inside a control that
   * already names itself — a button with visible text, or `RowActionButton`, which
   * adds its own `sr-only` label. A second one there only duplicates the name.
   */
  label?: string;
}

/**
 * The app's only spinner. Renders a fragment (icon + screen reader text) so it
 * drops straight into a button's flex row without an extra wrapper.
 * @param size - Icon size, "md" by default
 * @param label - Screen reader label
 * @returns The spinning icon plus its screen reader text
 */
export function Spinner({ size = "md", label }: SpinnerProps) {
  return (
    <>
      <LoaderCircle
        aria-hidden
        className={cn("animate-spin", SIZE_CLASS[size])}
      />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
```

- [x] **Step 4: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- spinner`
Expected: PASS (3 test).

- [x] **Step 5: Thêm token vào `globals.css`**

Trong `apps/web/app/globals.css`, ngay sau dòng `@theme inline {` (dòng 7) chèn:

```css
    /* Motion vocabulary. Three durations, no fourth without editing this file.
       Tailwind 4 has an `--ease-*` namespace (giving the `ease-out-soft` class)
       but no `--duration-*` one, so durations are used as
       `duration-[var(--duration-base)]`. */
    --duration-fast: 120ms;
    --duration-base: 200ms;
    --duration-slow: 320ms;
    --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
```

Ở **cuối file**, sau khối `@layer base { body { background-color: … } }`, thêm:

```css
/* Answered once for the whole app, never repeated at a call site. */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

- [x] **Step 6: Thay hai spinner inline**

`apps/web/components/shared/mutation-form.tsx`: bỏ `LoaderCircle` khỏi import `lucide-react` (giữ các icon còn lại), thêm `import { Spinner } from "@/components/shared/spinner";`, rồi đổi dòng 139:

```tsx
          {isPending ? <Spinner /> : submitIcon}
```

`apps/web/features/team-builder/components/formation-toolbar.tsx`: bỏ `LoaderCircle` khỏi import `lucide-react`, thêm `import { Spinner } from "@/components/shared/spinner";`, rồi đổi dòng 74:

```tsx
        {saving ? <Spinner /> : <Save />}
```

- [x] **Step 7: Cập nhật `frontend.md`**

Trong `apps/web/docs/frontend.md` §6, thêm mục mới **ngay trước** mục `### Tables`:

```markdown
### Motion

Four tokens in `app/globals.css` are the app's whole motion vocabulary:

| Token | Value | Used for |
|---|---|---|
| `--duration-fast` | 120ms | colour changes, hover, press |
| `--duration-base` | 200ms | showing/hiding content inside a frame that already exists |
| `--duration-slow` | 320ms | skeleton ⇄ data |
| `--ease-out-soft` | `cubic-bezier(0.16, 1, 0.3, 1)` | every easing |

Tailwind 4 has an `--ease-*` namespace, so `--ease-out-soft` gives the `ease-out-soft` class; it has
**no** `--duration-*` namespace, so a duration is written `duration-[var(--duration-base)]`.

**Motion may change opacity and colour only, never geometry** — no `translate`, no `height`, no
`scale` on table content. A transition that moves something is exactly what makes the layout jump.

`prefers-reduced-motion: reduce` is answered **once**, at the end of `globals.css`, for the whole app —
never repeated at a call site.

**Spinner or skeleton?**

| Situation | Use |
|---|---|
| Row count still unknown — the first load | **Skeleton** shaped like the table |
| The frame is there, waiting on something the user just did | **Spinner** in that button or cell |
| Background refetch, the old data is still correct | **Nothing** — keep the old data |

The app's only spinner is `components/shared/spinner.tsx`: `size` is `"sm"` (`size-3.5`) or `"md"`
(`size-4`). Pass `label` only where the spinner sits somewhere that has no name of its own; a button
with visible text, or `RowActionButton` (which adds its own `sr-only`), leaves it out — a second label
there only duplicates the accessible name.

**A mutation error keeps its slot.** An error line rendered above or below a table lives inside a
wrapper with a fixed minimum height (`min-h-*`), so the error appearing does not push the table or the
pagination bar down — see `members-panel` and `attendance-grid`.
```

- [x] **Step 8: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [ ] **Step 9: Kiểm tay CSS**

Run: `pnpm --filter web dev`, mở dialog xoá thành viên, bấm xoá → nút hiện spinner như cũ. Mở DevTools, chọn `<html>`, xác nhận Computed có `--duration-base: 200ms`. Bật *Emulate CSS prefers-reduced-motion: reduce* trong DevTools Rendering → spinner gần như đứng yên.

- [x] **Step 10: Commit**

```bash
git add apps/web/app/globals.css \
        apps/web/components/shared/spinner.tsx \
        apps/web/components/shared/__tests__/spinner.test.tsx \
        apps/web/components/shared/mutation-form.tsx \
        apps/web/features/team-builder/components/formation-toolbar.tsx \
        apps/web/docs/frontend.md
git commit -m "feat(web): add motion tokens and the shared spinner"
```

---

### Task 3: §4 — `EmptyState`, module anh em của `ErrorState`

**Files:**
- Create: `apps/web/components/shared/empty-state.tsx`
- Test: `apps/web/components/shared/__tests__/empty-state.test.tsx` (tạo mới)
- Modify: `apps/web/features/settings/components/session-list.tsx:48-52`
- Modify: `apps/web/features/attendance/components/member-attendance-card.tsx:61-65` và `:128-132`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx:83-89`
- Modify: `apps/web/features/team-builder/components/member-pool.tsx:73-79`
- Modify: `apps/web/docs/frontend.md` (§6, thêm mục "Trạng thái rỗng")

**Interfaces:**
- Consumes: không gì (không phụ thuộc Task 1, 2).
- Produces: `export function EmptyState({ message, icon, action }: { message: string; icon?: ReactNode; action?: ReactNode }): ReactNode` — một `<div>` với `flex flex-col items-center gap-3 py-8 text-center`, y hệt `ErrorState`.

> Ba chỗ rỗng còn lại (`members-panel`, `attendance-grid`, `attendance-log-table`) **không** sửa ở task này — chúng đi qua `TableBodyState` ở Task 4.

- [x] **Step 1: Viết test thất bại**

Tạo `apps/web/components/shared/__tests__/empty-state.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "../empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("hiện câu mô tả", () => {
    render(<EmptyState message="Tuần này chưa có trận nào." />);
    expect(screen.getByText("Tuần này chưa có trận nào.")).toBeTruthy();
  });

  it("render hành động gợi ý khi được truyền vào", () => {
    render(
      <EmptyState
        message="Bang chưa có thành viên nào."
        action={<button type="button">Thêm thành viên</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Thêm thành viên" })).toBeTruthy();
  });

  it("dùng đúng một khung với ErrorState", () => {
    const { container } = render(<EmptyState message="Chưa có gì." />);
    const frame = container.firstElementChild;
    for (const className of [
      "flex",
      "flex-col",
      "items-center",
      "gap-3",
      "py-8",
      "text-center",
    ]) {
      expect(frame?.classList.contains(className)).toBe(true);
    }
  });
});
```

- [x] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- empty-state`
Expected: FAIL — không resolve được `../empty-state`.

- [x] **Step 3: Viết `EmptyState`**

Tạo `apps/web/components/shared/empty-state.tsx`:

```tsx
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Vietnamese sentence saying why there is nothing here. */
  message: string;
  /** Optional icon, an inbox by default. */
  icon?: ReactNode;
  /** Optional suggested action, e.g. an "Thêm thành viên" button. */
  action?: ReactNode;
}

/**
 * The empty block shown in place of a card's or table's content when the data
 * loaded fine but holds nothing. Deliberately the same frame, spacing and type
 * scale as `error-state.tsx`: two branches of one story should look alike.
 * @param message - Sentence describing the empty result
 * @param icon - Icon above the message
 * @param action - Suggested action below the message
 * @returns Centered empty block
 */
export function EmptyState({
  message,
  icon = <Inbox className="size-6" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
```

- [x] **Step 4: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- empty-state`
Expected: PASS (3 test).

- [x] **Step 5: Thay năm chỗ rỗng viết tay ngoài bảng**

Mỗi file thêm `import { EmptyState } from "@/components/shared/empty-state";`.

`apps/web/features/settings/components/session-list.tsx` — thay khối `{!hasScrim && (…)}`:

```tsx
      {!hasScrim && <EmptyState message="Tuần này chưa có trận scrim nào." />}
```

`apps/web/features/attendance/components/member-attendance-card.tsx` — thay khối `<CardContent className="py-8 …">`:

```tsx
        <Card>
          <CardContent>
            <EmptyState message="Tài khoản chưa được gán nhân vật, liên hệ quản trị viên." />
          </CardContent>
        </Card>
```

và thay khối `{battleSessions.length === 0 && (<p className="rounded-lg border border-dashed …">…</p>)}`:

```tsx
            {battleSessions.length === 0 && (
              <EmptyState message="Tuần này chưa có trận nào." />
            )}
```

`apps/web/features/team-builder/components/team-builder-screen.tsx` — thay khối `<CardContent className="py-8 …">`:

```tsx
      <Card>
        <CardContent>
          <EmptyState message="Tuần này chưa có trận đánh nào." />
        </CardContent>
      </Card>
```

`apps/web/features/team-builder/components/member-pool.tsx` — thay nhánh `pool.length === 0`:

```tsx
            {pool.length === 0 ? (
              <EmptyState
                message={
                  isFiltering
                    ? "Không có thành viên nào khớp bộ lọc."
                    : "Không còn ai để xếp cho trận này."
                }
              />
            ) : (
```

> `member-pool.tsx:68` vẫn giữ `border-dashed` — đó là viền vùng thả kéo-thả, không phải trạng thái rỗng. `slot-cell.tsx` và `prefill-banner.tsx` cũng vậy.

- [x] **Step 6: Cập nhật `frontend.md`**

Trong `apps/web/docs/frontend.md` §6, thêm mục mới ngay **trước** mục "Chuyển động" (đã thêm ở Task 2):

```markdown
### Empty state

`components/shared/empty-state.tsx` (`<EmptyState message icon? action? />`) is the **only** way to
say "loaded fine, holds nothing". Same frame, same spacing, same type scale as
`components/shared/error-state.tsx` — two branches of one story should look alike.

One dialect: `flex flex-col items-center gap-3 py-8 text-center`. The dashed-border variant
(`rounded-lg border border-dashed p-4`) is gone. Inside a table it arrives through `table-body-state`;
outside one, call it directly.

The `border-dashed` left in the app is the drag-and-drop drop-zone border (`member-pool`, `slot-cell`,
`prefill-banner`), not an empty state.
```

- [x] **Step 7: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [x] **Step 8: Commit**

```bash
git add apps/web/components/shared/empty-state.tsx \
        apps/web/components/shared/__tests__/empty-state.test.tsx \
        apps/web/features/settings/components/session-list.tsx \
        apps/web/features/attendance/components/member-attendance-card.tsx \
        apps/web/features/team-builder/components/team-builder-screen.tsx \
        apps/web/features/team-builder/components/member-pool.tsx \
        apps/web/docs/frontend.md
git commit -m "feat(web): add the shared empty state and use it outside tables"
```

---

### Task 4: §2 — `TableBodyState`, xoá `TableSkeleton` và `MembersSkeleton`

**Files:**
- Create: `apps/web/components/shared/table-body-state.tsx`
- Test: `apps/web/components/shared/__tests__/table-body-state.test.tsx` (tạo mới)
- Delete: `apps/web/components/shared/table-skeleton.tsx`
- Delete: `apps/web/features/members/components/members-skeleton.tsx`
- Modify: `apps/web/features/members/components/members-panel.tsx`
- Modify: `apps/web/features/attendance/components/attendance-log-table.tsx`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Modify: `apps/web/docs/frontend.md` (§6 "Tables")

**Interfaces:**
- Consumes: `EmptyState` (Task 3), token `--duration-slow` (Task 2), `QueryGroupState` từ `@/lib/query-group`.
- Produces:

```ts
export function TableBodyState<TItem>(props: {
  state: QueryGroupState;
  columns: number;
  columnClassNames?: readonly (string | undefined)[];
  rows: readonly TItem[];
  renderRow: (item: TItem) => ReactNode;
  emptyMessage: string;
  skeletonRows?: number;
}): ReactNode;
```

> `MembersSkeleton` bị xoá vì `MembersPanel` là chỗ dùng duy nhất, và sau khi chuyển sang `TableBodyState` thì bộ lọc + nút "Thêm thành viên" render ngay từ lúc đang tải — bớt một cú dựng lại layout.

- [x] **Step 1: Viết test thất bại**

Tạo `apps/web/components/shared/__tests__/table-body-state.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { QueryGroupState } from "@/lib/query-group";
import { TableBodyState } from "../table-body-state";

afterEach(cleanup);

const COLUMNS = 4;

/**
 * Build a query group state with only the fields a case cares about.
 * @param overrides - Fields this case sets
 * @returns A full QueryGroupState
 */
function makeState(overrides: Partial<QueryGroupState> = {}): QueryGroupState {
  return {
    isPending: false,
    isError: false,
    errorMessage: "",
    refetch: vi.fn(),
    ...overrides,
  };
}

/**
 * Render the component inside a real table, which is where it must live.
 * @param state - Query group state for this case
 * @param rows - Rows of the current page
 * @returns The testing-library render result
 */
function renderInTable(state: QueryGroupState, rows: readonly string[]) {
  return render(
    <Table>
      <TableBody>
        <TableBodyState
          state={state}
          columns={COLUMNS}
          rows={rows}
          emptyMessage="Không có gì cả."
          renderRow={(name) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
            </TableRow>
          )}
        />
      </TableBody>
    </Table>
  );
}

describe("TableBodyState", () => {
  it("lỗi thắng đang-tải", () => {
    const { container } = renderInTable(
      makeState({ isError: true, isPending: true, errorMessage: "Hỏng rồi." }),
      []
    );

    expect(screen.getByText("Hỏng rồi.")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });

  it("đang tải thì render đúng skeletonRows hàng, mỗi hàng đủ số cột", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableBodyState
            state={makeState({ isPending: true })}
            columns={COLUMNS}
            skeletonRows={3}
            rows={[]}
            emptyMessage="Không có gì cả."
            renderRow={() => null}
          />
        </TableBody>
      </Table>
    );

    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0].querySelectorAll("td")).toHaveLength(COLUMNS);
  });

  it("rỗng khác có-dữ-liệu", () => {
    renderInTable(makeState(), []);
    expect(screen.getByText("Không có gì cả.")).toBeTruthy();

    cleanup();

    renderInTable(makeState(), ["Mèo Mập"]);
    expect(screen.getByText("Mèo Mập")).toBeTruthy();
    expect(screen.queryByText("Không có gì cả.")).toBeNull();
  });

  it("colSpan bằng columns ở cả hàng lỗi lẫn hàng rỗng", () => {
    const { container: onError } = renderInTable(
      makeState({ isError: true, errorMessage: "Hỏng rồi." }),
      []
    );
    expect(onError.querySelector("td")?.getAttribute("colspan")).toBe(
      String(COLUMNS)
    );

    cleanup();

    const { container: onEmpty } = renderInTable(makeState(), []);
    expect(onEmpty.querySelector("td")?.getAttribute("colspan")).toBe(
      String(COLUMNS)
    );
  });

  it("áp class riêng theo chỉ số cột cho hàng skeleton", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableBodyState
            state={makeState({ isPending: true })}
            columns={COLUMNS}
            columnClassNames={[undefined, undefined, undefined, "hidden"]}
            skeletonRows={1}
            rows={[]}
            emptyMessage="Không có gì cả."
            renderRow={() => null}
          />
        </TableBody>
      </Table>
    );

    const cells = container.querySelectorAll("tbody td");
    expect(cells[3].classList.contains("hidden")).toBe(true);
    expect(cells[0].classList.contains("hidden")).toBe(false);
  });
});
```

- [x] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- table-body-state`
Expected: FAIL — không resolve được `../table-body-state`.

- [x] **Step 3: Viết `TableBodyState`**

Tạo `apps/web/components/shared/table-body-state.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import type { QueryGroupState } from "@/lib/query-group";

/** Placeholder rows shown while a table's first load is running. */
const DEFAULT_SKELETON_ROWS = 5;

/**
 * Opacity-only transition for the three special rows. No geometry: the whole point
 * of this module is that the table's shape does not move between branches.
 */
const FADE_IN = "animate-in fade-in duration-[var(--duration-slow)] ease-out-soft";

interface TableBodyStateProps<TItem> {
  /** Combined state of the query group, from `combineQueries`. */
  state: QueryGroupState;
  /** Header column count — drives both colSpan and the skeleton cell count. */
  columns: number;
  /** Per-column classes, for a column hidden at some breakpoint. */
  columnClassNames?: readonly (string | undefined)[];
  /** Rows of the current page. */
  rows: readonly TItem[];
  /** Draw one row. The caller says what a row looks like, never which branch wins. */
  renderRow: (item: TItem) => ReactNode;
  /** Sentence shown when there is no row at all. */
  emptyMessage: string;
  /** Number of skeleton rows, 5 by default. */
  skeletonRows?: number;
}

/**
 * The four-branch table body — failure, loading, empty, data — said once.
 * Branch order is fixed, error before loading, matching `QueryBoundary`: a group
 * where one query failed while another is still running must show the failure
 * rather than a skeleton that would never finish.
 *
 * Renders bare `<TableRow>` elements, so it must be placed inside `<TableBody>`.
 * @param props - state, columns, columnClassNames, rows, renderRow, emptyMessage, skeletonRows
 * @returns The rows of whichever branch wins
 */
export function TableBodyState<TItem>({
  state,
  columns,
  columnClassNames,
  rows,
  renderRow,
  emptyMessage,
  skeletonRows = DEFAULT_SKELETON_ROWS,
}: TableBodyStateProps<TItem>) {
  if (state.isError) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className={FADE_IN}>
          <ErrorState message={state.errorMessage} onRetry={state.refetch} />
        </TableCell>
      </TableRow>
    );
  }

  if (state.isPending) {
    return (
      <>
        {Array.from({ length: skeletonRows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <TableCell
                key={columnIndex}
                className={columnClassNames?.[columnIndex]}
              >
                <Skeleton className="h-5 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className={FADE_IN}>
          <EmptyState message={emptyMessage} />
        </TableCell>
      </TableRow>
    );
  }

  return <>{rows.map((item) => renderRow(item))}</>;
}
```

- [x] **Step 4: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- table-body-state`
Expected: PASS (5 test).

- [x] **Step 5: Chuyển `attendance-log-table` sang `TableBodyState`**

Trong `apps/web/features/attendance/components/attendance-log-table.tsx`:

Bỏ hai import `ErrorState` và `TableSkeleton`, thêm:

```tsx
import { TableBodyState } from "@/components/shared/table-body-state";
```

Đổi tên hằng ở dòng 36-41 và thêm số cột:

```ts
/** Header column count: member, session, status, marked-at. */
const COLUMN_COUNT = 4;

/** Per-column CSS classes, so the skeleton hides the same column as the header. */
const COLUMN_CLASSES = [
  undefined,
  undefined,
  undefined,
  MARKED_AT_COLUMN,
] as const;
```

Trong component, lấy nguyên `state` thay vì bóc lẻ — đổi

```tsx
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();
```

thành

```tsx
  const state = useAttendanceBoard();
```

và sửa tiêu đề (dòng 91) thành:

```tsx
          Lịch sử điểm danh{!state.isPending && !state.isError && ` (${rows.length})`}
```

Thay toàn bộ `<TableBody>` bằng:

```tsx
          <TableBody>
            <TableBodyState
              state={state}
              columns={COLUMN_COUNT}
              columnClassNames={COLUMN_CLASSES}
              rows={rows}
              emptyMessage={
                allRecords.length === 0
                  ? "Chưa có ai điểm danh."
                  : "Không có lượt điểm danh phù hợp."
              }
              renderRow={(record) => {
                const character = characterMap.get(record.characterId);
                const session = sessionMap.get(record.sessionId);
                const present = record.status === AttendanceStatus.PRESENT;
                return (
                  <TableRow key={`${record.characterId}-${record.sessionId}`}>
                    <TableCell>
                      {character ? (
                        <CharacterName character={character} />
                      ) : (
                        <span className="font-medium">—</span>
                      )}
                    </TableCell>
                    <TableCell>{session?.label ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <StatusIcon
                        tone={present ? "success" : "danger"}
                        label={ATTENDANCE_STATUS_LABEL[record.status]}
                      />
                    </TableCell>
                    <TableCell
                      className={cn("text-muted-foreground", MARKED_AT_COLUMN)}
                    >
                      {formatDateTime(record.markedAt)}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </TableBody>
```

- [x] **Step 6: Chuyển `members-panel` sang `TableBodyState`**

Trong `apps/web/features/members/components/members-panel.tsx`:

Bỏ import `QueryBoundary` và `MembersSkeleton`, thêm:

```tsx
import { TableBodyState } from "@/components/shared/table-body-state";
```

Thêm hằng cạnh `EMPTY_FILTER`:

```ts
/** Header column count: name, class, Discord, role, actions. */
const COLUMN_COUNT = 5;
```

Bỏ `<QueryBoundary …>` bọc ngoài: return giờ bắt đầu thẳng bằng `<div className="flex flex-col gap-4">` và kết bằng `</div>`.

Thay `<TableBody>`:

```tsx
          <TableBody>
            <TableBodyState
              state={state}
              columns={COLUMN_COUNT}
              rows={pagination.pagedItems}
              emptyMessage={
                isFiltering
                  ? "Không có thành viên nào khớp."
                  : "Bang chưa có thành viên nào."
              }
              renderRow={(member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  currentDiscordId={session?.discordId ?? ""}
                  onEdit={(target) => {
                    setEditing(target);
                    setFormOpen(true);
                  }}
                  onDelete={setDeleting}
                  onRoleChange={handleRoleChange}
                />
              )}
            />
          </TableBody>
```

Xoá hẳn khối `{members.length === 0 && (<div className="rounded-lg border border-dashed …">…</div>)}` — nhánh rỗng giờ nằm trong bảng.

- [x] **Step 7: Chuyển `attendance-grid` sang `TableBodyState`**

Trong `apps/web/features/attendance/components/attendance-grid.tsx`:

Bỏ import `ErrorState` và `TableSkeleton`, bỏ `TableCell` khỏi import `@/components/ui/table` nếu không còn dùng, thêm:

```tsx
import { TableBodyState } from "@/components/shared/table-body-state";
```

Đổi

```tsx
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();
```

thành

```tsx
  const state = useAttendanceBoard();
```

Sửa dòng gợi ý vuốt ngang (dòng 152) thành:

```tsx
        {!state.isError && !state.isPending && battleSessions.length > 0 && (
```

Thay toàn bộ `<TableBody>`:

```tsx
          <TableBody>
            <TableBodyState
              state={state}
              columns={SKELETON_COLUMNS}
              rows={pagination.pagedItems}
              emptyMessage="Không tìm thấy thành viên phù hợp."
              renderRow={(character) => (
                <AttendanceRow
                  key={character.id}
                  character={character}
                  sessions={battleSessions}
                  recordMap={recordMap}
                  lockedSessionIds={lockedSessionIds}
                  allLocked={allLocked}
                  isEditing={editingId === character.id}
                  draft={editingId === character.id ? draft : {}}
                  onStartEdit={handleStartEdit}
                  onDraftChange={handleDraftChange}
                  onCancel={handleCancel}
                  onConfirm={handleConfirm}
                />
              )}
            />
          </TableBody>
```

> `SKELETON_COLUMNS` vẫn là hằng cứng ở bước này — Task 5 mới thay nó bằng giá trị dẫn xuất. Đây là chỗ duy nhất còn nhắc nó, nên hai `colSpan` lệch nhau ở dòng 186/198 đã biến mất ngay tại bước này.

- [x] **Step 8: Xoá hai module nông**

```bash
git rm apps/web/components/shared/table-skeleton.tsx \
       apps/web/features/members/components/members-skeleton.tsx
grep -rn "TableSkeleton\|MembersSkeleton" apps/web --include="*.ts" --include="*.tsx"
```

Expected: `grep` không ra kết quả nào.

- [x] **Step 9: Cập nhật `frontend.md`**

Trong `apps/web/docs/frontend.md` §6, thay ba gạch đầu dòng của mục `### Tables` bằng:

```markdown
- Loading / Failure / Empty / Data → **`table-body-state`**, placed inside `<TableBody>`. It owns all
  four branches and their order (failure before loading — the same convention as `query-boundary`),
  derives `colSpan` **once** from the `columns` prop, and crosses between branches with opacity. The
  call site only says what a row *looks like*, through `renderRow`, never which branch wins.
- `columns` must equal the header's `<th>` count. A table whose column count follows the data must
  pin that count in **one** variable shared by header and body — see `attendance-grid`.
- Paging → `use-table-pagination` (client-side, resets to page 1 when the filter changes) rendered
  with `table-pagination-bar` / `page-size-select`. The pagination bar **always** renders, even at one
  page, so filtering does not move the layout.
```

- [x] **Step 10: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [ ] **Step 11: Kiểm tay**

Run: `pnpm --filter web dev`. Mở `/` (điểm danh), `/lich-su-diem-danh`, `/thiet-lap` → tab thành viên. Kiểm: lúc tải hiện skeleton đúng số cột; gõ bộ lọc không khớp thì hiện `EmptyState` chứ không phải khung viền đứt; bảng thành viên lúc tải vẫn thấy bộ lọc và nút "Thêm thành viên".

- [x] **Step 12: Commit**

```bash
git add -A apps/web/components/shared apps/web/features apps/web/docs/frontend.md
git commit -m "refactor(web): say the four table body states once in table-body-state"
```

---

### Task 5: §3 — Số cột lưới điểm danh chốt một chỗ

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Test: `apps/web/features/attendance/__tests__/attendance-grid.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `TableBodyState` (Task 4).
- Produces: không có API mới; chỉ đổi `SKELETON_COLUMNS` thành `PLACEHOLDER_DAY_COLUMNS` + biến dẫn xuất `dayColumns` / `columns` trong nội bộ component.

- [x] **Step 1: Viết test thất bại**

Tạo `apps/web/features/attendance/__tests__/attendance-grid.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleSession } from "@guild/shared/schemas";

const boardState = {
  isPending: true,
  isError: false,
  errorMessage: "",
  refetch: vi.fn(),
};
let sessions: BattleSession[] = [];

/** Stable identity: `useTablePagination` resets page whenever `resetKey` changes by reference. */
const NO_CHARACTERS: never[] = [];

vi.mock("../hooks/use-attendance-board", () => ({
  useAttendanceBoard: () => boardState,
}));
vi.mock("../hooks/use-deadline-refresh", () => ({
  useDeadlineRefresh: () => {},
}));
vi.mock("../hooks/use-attendance", () => ({
  useFilteredCharacters: () => NO_CHARACTERS,
  useBattleSessions: () => ({ data: sessions }),
  useAttendanceRecords: () => ({ data: {} }),
  useMarkAttendance: () => ({ mutateAsync: vi.fn(), error: null }),
}));

import { AttendanceGrid } from "../components/attendance-grid";

afterEach(cleanup);

/**
 * Build a battle session with only the fields the header reads.
 * @param id - Session id, also used to build its label
 * @returns A battle session shaped for the header
 */
function makeSession(id: string): BattleSession {
  return {
    id,
    label: `Trận ${id}`,
    dateTime: "2026-08-24T20:00:00.000Z",
    deadline: "2026-08-24T03:00:00.000Z",
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: null,
    weekStart: "2026-08-24T00:00:00.000Z",
    attendanceCount: 0,
    hasFormation: false,
  };
}

describe("AttendanceGrid", () => {
  beforeEach(() => {
    sessions = [];
    boardState.isPending = true;
  });

  it("số cột header không đổi giữa lúc tải và lúc có 4 trận", () => {
    const { container, rerender } = render(<AttendanceGrid isAdmin={false} />);
    const headerCount = () => container.querySelectorAll("thead th").length;

    const whilePending = headerCount();

    boardState.isPending = false;
    sessions = ["a", "b", "c", "d"].map(makeSession);
    rerender(<AttendanceGrid isAdmin={false} />);

    expect(headerCount()).toBe(whilePending);
    expect(whilePending).toBe(6);
  });
});
```

> `makeSession` đã khớp đúng `battleSessionSchema` của `packages/shared`, nên không cần `as BattleSession`.

- [x] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- attendance-grid`
Expected: FAIL — header lúc `isPending` chỉ có 2 `<th>`, không phải 6.

- [x] **Step 3: Thay hằng cứng bằng giá trị dẫn xuất**

Trong `apps/web/features/attendance/components/attendance-grid.tsx`, thay

```ts
/** Skeleton column count before the battle days are known: Member + 3 days + Actions. */
const SKELETON_COLUMNS = 5;
```

bằng

```ts
/**
 * Day columns drawn while the week's schedule is still loading. A guess, not a rule —
 * it only has to be a plausible week so the header does not visibly resize when the
 * real sessions land.
 */
const PLACEHOLDER_DAY_COLUMNS = 4;
```

Thêm `import { Skeleton } from "@/components/ui/skeleton";` và, ngay sau `const recordMap = records ?? {};`, thêm:

```ts
  // One source for the table's geometry: the header and the body must never disagree
  // about how many columns there are, or the whole width recomputes when data lands.
  const dayColumns = state.isPending
    ? PLACEHOLDER_DAY_COLUMNS
    : battleSessions.length;
  const columns = dayColumns + 2; // name + days + actions
```

- [x] **Step 4: Header render ô ngày giữ chỗ khi đang tải**

Thay khối `{battleSessions.map((session) => { … })}` trong `<TableHeader>` bằng:

```tsx
              {state.isPending
                ? Array.from({ length: dayColumns }, (_, index) => (
                    <TableHead key={index} className="text-center">
                      <Skeleton className="mx-auto h-5 w-20" />
                    </TableHead>
                  ))
                : battleSessions.map((session) => {
                    const subtitle = getSessionSubtitle(session);
                    return (
                      <TableHead key={session.id} className="text-center">
                        <SessionLabel session={session} size="sm" />
                        <span className="block text-xs font-normal text-muted-foreground">
                          {subtitle}
                        </span>
                        {passedSessionIds.has(session.id) && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Đã khóa
                          </span>
                        )}
                      </TableHead>
                    );
                  })}
```

- [x] **Step 5: Truyền `columns` vào `TableBodyState`**

Đổi `columns={SKELETON_COLUMNS}` thành `columns={columns}`.

- [x] **Step 6: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- attendance-grid`
Expected: PASS.

- [x] **Step 7: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [x] **Step 8: Commit**

```bash
git add apps/web/features/attendance/components/attendance-grid.tsx \
        apps/web/features/attendance/__tests__/attendance-grid.test.tsx
git commit -m "fix(web): keep the attendance grid geometry stable while loading"
```

---

### Task 6: §7 + §8 — Ô giữ chỗ cho lỗi mutation và tín hiệu ghi tại chỗ

**Files:**
- Modify: `apps/web/features/members/components/members-panel.tsx`
- Modify: `apps/web/features/members/components/member-row.tsx`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Modify: `apps/web/features/attendance/components/attendance-row.tsx`

**Interfaces:**
- Consumes: `Spinner` (Task 2), token `--duration-base` (Task 2), `TablePaginationBar` luôn render (Task 1).
- Produces:
  - `MemberRow` thêm prop `isSavingRole: boolean`.
  - `AttendanceRow` thêm prop `isSaving: boolean`. Spinner ở đây **không** truyền `label` — `RowActionButton` đã tự kèm `sr-only`.

- [x] **Step 1: Ô giữ chỗ cho lỗi mutation ở bảng thành viên**

Trong `apps/web/features/members/components/members-panel.tsx`, thay khối lỗi (dòng ~95):

```tsx
        {updateMutation.error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateMutation.error.message}
          </p>
        )}
```

bằng một ô luôn tồn tại:

```tsx
        {/* Always occupies its slot: an error appearing must not push the table down. */}
        <div className="min-h-10">
          {updateMutation.error && (
            <p className="animate-in rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive fade-in duration-[var(--duration-base)] ease-out-soft">
              {updateMutation.error.message}
            </p>
          )}
        </div>
```

- [x] **Step 2: Ô giữ chỗ cho lỗi mutation ở lưới điểm danh**

Trong `apps/web/features/attendance/components/attendance-grid.tsx`, thay

```tsx
        {markError && (
          <p className="mt-4 text-center text-sm text-destructive">
            {markError.message}
          </p>
        )}
```

bằng:

```tsx
        {/* Always occupies its slot, so the pagination bar below never moves. */}
        <div className="mt-4 min-h-5">
          {markError && (
            <p className="animate-in text-center text-sm text-destructive fade-in duration-[var(--duration-base)] ease-out-soft">
              {markError.message}
            </p>
          )}
        </div>
```

- [x] **Step 3: Viết test thất bại cho tín hiệu ghi ở `MemberRow`**

Tạo `apps/web/features/members/__tests__/member-row.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { Table, TableBody } from "@/components/ui/table";
import { MemberRow } from "../components/member-row";

afterEach(cleanup);

const MEMBER: GuildMember = {
  id: "m1",
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
  role: GuildRole.MEMBER,
  discordId: "42",
  discordUsername: "meomap",
  lastLoginAt: null,
};

/**
 * Render one member row inside a real table.
 * @param isSavingRole - Whether this row's role write is in flight
 * @returns The testing-library render result
 */
function renderRow(isSavingRole: boolean) {
  return render(
    <Table>
      <TableBody>
        <MemberRow
          member={MEMBER}
          currentDiscordId="other"
          isSavingRole={isSavingRole}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRoleChange={vi.fn()}
        />
      </TableBody>
    </Table>
  );
}

describe("MemberRow", () => {
  it("đang ghi thì khoá select quyền và báo cho trình đọc màn hình", () => {
    renderRow(true);
    expect(screen.getByText("Đang lưu quyền").classList.contains("sr-only")).toBe(
      true
    );
    expect(
      screen.getByLabelText(`Quyền của ${MEMBER.name}`).hasAttribute("disabled")
    ).toBe(true);
  });

  it("không ghi thì không có spinner", () => {
    renderRow(false);
    expect(screen.queryByText("Đang lưu quyền")).toBeNull();
  });
});
```

> `MEMBER` đã khớp đúng `guildMemberSchema` của `packages/shared`, nên không cần `as GuildMember`.

- [x] **Step 4: Chạy test cho chắc nó fail**

Run: `pnpm --filter web test -- member-row`
Expected: FAIL — `isSavingRole` chưa tồn tại trên props.

- [x] **Step 5: Thêm tín hiệu ghi vào `MemberRow`**

Trong `apps/web/features/members/components/member-row.tsx`, thêm import:

```tsx
import { Spinner } from "@/components/shared/spinner";
```

Thêm prop vào `MemberRowProps` (và một dòng `@param` tương ứng trong JSDoc của component):

```tsx
  /** This row's role write is in flight — lock the dropdown and show a spinner */
  isSavingRole: boolean;
```

Nhận nó trong destructuring, rồi thay ô quyền:

```tsx
      <TableCell>
        <div className="flex items-center gap-2">
          <Select
            value={member.role}
            disabled={isRoleLocked || isSavingRole}
            onValueChange={(next) =>
              onRoleChange(member, String(next) as GuildRole)
            }
          >
            <SelectTrigger
              aria-label={`Quyền của ${member.name}`}
              className="w-36"
            >
              <SelectValue>{() => GUILD_ROLE_LABEL[member.role]}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {GUILD_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {GUILD_ROLE_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSavingRole && <Spinner size="sm" label="Đang lưu quyền" />}
        </div>
      </TableCell>
```

- [x] **Step 6: Truyền `isSavingRole` từ `MembersPanel`**

Trong `apps/web/features/members/components/members-panel.tsx`, trong `renderRow` thêm:

```tsx
                  isSavingRole={
                    updateMutation.isPending &&
                    updateMutation.variables?.id === member.id
                  }
```

- [x] **Step 7: Chạy test cho chắc nó pass**

Run: `pnpm --filter web test -- member-row`
Expected: PASS (2 test).

- [x] **Step 8: Tín hiệu ghi ở lưới điểm danh**

Trong `apps/web/features/attendance/components/attendance-row.tsx`, thêm import:

```tsx
import { Spinner } from "@/components/shared/spinner";
```

Thêm prop vào `AttendanceRowProps`:

```tsx
  /** This row's attendance write is in flight — show a spinner instead of the tick */
  isSaving: boolean;
```

Nhận nó trong destructuring, rồi thay cặp nút khi đang sửa:

```tsx
          <RowActions className="gap-1.5">
            <RowActionButton
              label="Huỷ"
              icon={<X className="size-4" />}
              disabled={isSaving}
              onClick={onCancel}
            />
            <RowActionButton
              label="Xác nhận điểm danh"
              icon={isSaving ? <Spinner size="sm" /> : <Check className="size-4" />}
              variant="default"
              disabled={isSaving}
              onClick={() => onConfirm(character)}
            />
          </RowActions>
```

- [x] **Step 9: Theo dõi hàng đang lưu trong `AttendanceGrid`**

Trong `apps/web/features/attendance/components/attendance-grid.tsx`, thêm state cạnh `editingId`:

```ts
  // The row id being written. Not `mutation.isPending`: one confirm fires several
  // parallel `mark` calls, so the mutation cannot say which row they belong to.
  const [savingId, setSavingId] = useState<string | null>(null);
```

Sửa `handleConfirm`:

```ts
  const handleConfirm = async (character: Character) => {
    const changes = getChangedCells(character);
    if (changes.length === 0) {
      handleCancel();
      return;
    }

    setSavingId(character.id);
    // The error surfaces through the mutation's `markError`, so swallow it here to avoid a stray promise.
    const saved = await Promise.all(
      changes.map(({ sessionId, status }) => {
        const input = { characterId: character.id, sessionId, status };
        return mark(input);
      })
    ).catch(() => null);
    setSavingId(null);

    if (saved) handleCancel();
  };
```

Trong `renderRow`, thêm:

```tsx
                  isSaving={savingId === character.id}
```

- [x] **Step 10: Kiểm toàn bộ**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS cả ba.

- [ ] **Step 11: Kiểm tay**

Run: `pnpm --filter web dev`.
- `/thiet-lap` → tab thành viên: đổi quyền một người → select bị khoá và có spinner cạnh nó cho tới khi hàng đổi; gây lỗi (đổi quyền chính mình bị chặn sẵn nên dùng DevTools chặn request) → dòng lỗi hiện lên **không** đẩy bảng xuống.
- `/`: bấm bút chì một hàng, đổi một ô, bấm dấu tích → nút tích thành spinner cho tới khi lưu xong.
- Lọc cho danh sách còn 1 trang rồi còn 0 kết quả: thanh phân trang vẫn ở nguyên chỗ.

- [x] **Step 12: Commit**

```bash
git add apps/web/features/members/components/members-panel.tsx \
        apps/web/features/members/components/member-row.tsx \
        apps/web/features/members/__tests__/member-row.test.tsx \
        apps/web/features/attendance/components/attendance-grid.tsx \
        apps/web/features/attendance/components/attendance-row.tsx
git commit -m "feat(web): signal in-place writes and reserve room for mutation errors"
```

---

## Đối chiếu với spec

| Mục spec | Task |
|---|---|
| §1 `getPageSlots` dài cố định, bỏ `return null`, bỏ hai guard `items.length > 0` | 1 |
| §5 token chuyển động + `prefers-reduced-motion` | 2 |
| §6 `Spinner` thay hai bản inline | 2 |
| §4 `EmptyState` (5 chỗ ngoài bảng) | 3 |
| §4 `EmptyState` (3 chỗ trong bảng, qua `TableBodyState`) | 4 |
| §2 `TableBodyState`, xoá `TableSkeleton` | 4 |
| §3 số cột lưới điểm danh chốt một chỗ | 5 |
| §7 ô giữ chỗ cho hai `<p>` lỗi mutation | 6 |
| §7 `TablePaginationBar` luôn render | 1 |
| §8 tín hiệu ghi tại chỗ (thành viên + điểm danh) | 6 |
| Ảnh hưởng tài liệu — `frontend.md` §6 "Tables" | 4 |
| Ảnh hưởng tài liệu — `frontend.md` §6 "Empty state" | 3 |
| Ảnh hưởng tài liệu — `frontend.md` §6 "Motion" (kèm quy ước ô giữ chỗ lỗi mutation, §7) | 2 |

Ba mục "Không làm trong đợt này" của spec (phân trang cho `attendance-log-table`, animation chuyển
trang/tab, sửa `Skeleton` của shadcn) không xuất hiện trong bất kỳ task nào — đúng như đã chốt.
