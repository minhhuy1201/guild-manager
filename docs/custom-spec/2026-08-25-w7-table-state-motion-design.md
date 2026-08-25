# W7 — Trạng thái thân bảng và từ vựng chuyển động

Ngày: 2026-08-25 · Phạm vi: `apps/web`.

Yêu cầu gốc: UI mượt hơn, có spinner/skeleton cho bảng khi chưa có dữ liệu, nút điều hướng của
phân trang **không được xê dịch** — chỉ số trang đổi, và giảm bớt code trùng.

Spec này gom năm điểm ma sát vào **ba module** và **một bộ token**. Không thêm dependency mới:
`tw-animate-css` đã được import sẵn ở `app/globals.css:2` nhưng chưa chỗ nào trong app dùng.

## Bối cảnh

### 1. Dải số trang co giãn nên hai nút phải bị đẩy

`getPageItems` (`components/shared/table-pagination.tsx:31-52`) trả về số phần tử **phụ thuộc trang
hiện tại**:

| Gọi | Kết quả | Số ô |
|---|---|---|
| `getPageItems(1, 8, 1)` | `[1, 2, …, 8]` | 4 |
| `getPageItems(4, 8, 1)` | `[1, …, 3, 4, 5, …, 8]` | 7 |

Dải số nằm **giữa** cặp nút đầu/trước và cặp nút sau/cuối, nên độ dài của nó chính là toạ độ của hai
nút bên phải. Bấm "sau" ba lần thì nút "sau" trượt đi ba ô — con trỏ không còn nằm trên nút vừa bấm.

Ngoài ra `TablePagination` `return null` khi `pageCount <= 1` (dòng 79), và cả `MembersPanel` lẫn
`AttendanceGrid` chỉ render `TablePaginationBar` khi danh sách khác rỗng — lọc còn 1 trang là cả
thanh biến mất, kéo layout nhảy.

### 2. `TableSkeleton` là module nông

Module chỉ tiết kiệm 8 dòng JSX, còn phần phức tạp thật — thang bốn nhánh *lỗi / đang tải / rỗng /
có dữ liệu* cộng với `colSpan` — vẫn nằm ở từng chỗ gọi, chép tay ba lần:

| Màn | Vị trí |
|---|---|
| Điểm danh — lưới | `features/attendance/components/attendance-grid.tsx:183-222` |
| Điểm danh — lịch sử | `features/attendance/components/attendance-log-table.tsx:101-158` |
| Thành viên | `features/members/components/members-panel.tsx:102-148` |

Và nó **đã lệch nhau**: trong cùng một bảng ở `attendance-grid.tsx`, hàng lỗi dùng
`colSpan={SKELETON_COLUMNS}` (=5, dòng 186) còn hàng rỗng dùng `colSpan={battleSessions.length + 2}`
(dòng 198).

Phép thử xoá: xoá `TableSkeleton` thì phức tạp **dồn lại** một chỗ chứ không chỉ dời đi — đúng dấu
hiệu cần đào sâu.

### 3. Skeleton của lưới điểm danh khai sai số cột

`SKELETON_COLUMNS = 5` là hằng cứng (`attendance-grid.tsx:38`), trong khi header render
`battleSessions.length + 2` cột (dòng 161-182). Lúc đang tải, `sessions` còn `undefined` nên
`battleSessions` rỗng → **header chỉ có 2 cột trong khi thân bảng có 5 ô**. Dữ liệu về với 4 trận thì
header nhảy lên 6 cột và toàn bộ chiều rộng cột dựng lại một lượt. Đây là cú giật rõ nhất trên màn
điểm danh.

### 4. Trạng thái rỗng viết tay 8 lần, hai phương ngữ

`rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground` ở
`members-panel.tsx:130`, `session-list.tsx:49`, `member-attendance-card.tsx:129`; và
`py-8 text-center text-muted-foreground` ở `attendance-grid.tsx:198`, `attendance-log-table.tsx:120`,
`team-builder-screen.tsx:85`, `member-pool.tsx:74`, `member-attendance-card.tsx:62`.

`components/shared/error-state.tsx` đã tồn tại cho nhánh *lỗi*. Nhánh *rỗng* thì không có module nào
— bất đối xứng giữa hai thứ đáng lẽ phải giống nhau, và `frontend.md` §6 chưa hề đặt tên cho nó.

### 5. Chuyển động không có module

- Spinner viết inline hai chỗ: `mutation-form.tsx:139`, `formation-toolbar.tsx:74` — cùng một
  `<LoaderCircle className="animate-spin" />`.
- Không có thời lượng/easing dùng chung; toàn app chỉ có 4 chỗ dùng `transition-colors`, đều là hover
  của kéo-thả.
- Ba khối *mount/unmount* làm nhảy layout: `<p>` lỗi ở `members-panel.tsx:96`, `<p>` lỗi ở
  `attendance-grid.tsx:225`, và cả `TablePaginationBar`.
- Ghi tại chỗ **không có tín hiệu đang chạy nào**: đổi quyền trong bảng thành viên
  (`members-panel.tsx:71-74`) và điểm danh (`attendance-grid.tsx:130-145`) đều `mutateAsync` rồi im
  lặng cho tới khi hàng đổi.

## Quyết định thiết kế

### 1. `getPageItems` trả về mảng **dài cố định**

```ts
/** Ô trống giữ chỗ, để dải số trang luôn cùng độ dài. */
const BLANK = "blank" as const;

type PageSlot = number | typeof ELLIPSIS | typeof BLANK;

/**
 * Các ô của dải số trang. Luôn trả về đúng `siblings * 2 + 5` phần tử —
 * thiếu bao nhiêu thì đệm bằng BLANK — nên chiều rộng của dải không đổi
 * theo trang hiện tại, và hai cặp nút hai đầu đứng yên.
 */
function getPageSlots(page: number, pageCount: number, siblings: number): PageSlot[];
```

`BLANK` render ra `<span className="size-8" aria-hidden />` — cùng kích thước ô nhưng không có nội
dung, không vào tab order. Đệm ở **đầu hay cuối** thì theo phía đang thiếu, và chèn **sát phía trong
của dấu `…` đang có**: thiếu ở phải (trang đầu) thì chèn ngay *trước* `…` cuối, thiếu ở trái (trang
cuối) thì chèn ngay *sau* `…` đầu. Như vậy cả số trang lẫn dấu `…` đều giữ nguyên chỉ số ô.

Đây là biến thể thứ ba của cùng một union đã có, nên vẫn `switch` trên giá trị. Không có
`assertNever`: union `number | typeof ELLIPSIS | typeof BLANK` có một nhánh mở (`number`) nên
exhaustiveness không kiểm được — nhánh `default` chính là số trang.

**`pageCount <= 1` không còn `return null`.** Nó render dải với đúng một số trang và bốn nút đều
`aria-disabled` — thanh phân trang giữ nguyên chiều cao, lọc còn 0/1 trang thì không có gì nhảy. Hệ
quả: `MembersPanel` và `AttendanceGrid` bỏ luôn điều kiện `items.length > 0` bọc ngoài
`TablePaginationBar`.

### 2. `TableBodyState` — thang bốn nhánh nói **một lần**

```tsx
// components/shared/table-body-state.tsx

interface TableBodyStateProps<TItem> {
  /** Trạng thái gộp của nhóm query, từ `combineQueries`. */
  state: QueryGroupState;
  /** Số cột của header — quyết định cả colSpan lẫn số ô skeleton. */
  columns: number;
  /** Class riêng theo chỉ số cột, cho cột bị ẩn ở breakpoint nào đó. */
  columnClassNames?: readonly (string | undefined)[];
  /** Các hàng của trang hiện tại. */
  rows: readonly TItem[];
  /** Vẽ một hàng. Caller nói hàng *trông thế nào*, không nói nhánh nào thắng. */
  renderRow: (item: TItem) => ReactNode;
  /** Câu hiển thị khi không có hàng nào. */
  emptyMessage: string;
  /** Số hàng skeleton, mặc định 5. */
  skeletonRows?: number;
}
```

Module giữ toàn bộ: thứ tự nhánh (lỗi trước, đang tải sau — đúng quy ước `QueryBoundary` đang có),
`colSpan` suy ra **một lần** từ `columns`, hàng skeleton, hàng rỗng qua `EmptyState`, và chuyển cảnh
ở §4. Nó render thẳng các `<TableRow>` nên vẫn đặt trong `<TableBody>`, y như `TableSkeleton` hôm nay.

`components/shared/table-skeleton.tsx` **bị xoá**; `SKELETON_COLUMN_CLASSES` ở
`attendance-log-table.tsx:36-41` chuyển thành prop `columnClassNames`.

`features/members/components/members-skeleton.tsx` **cũng bị xoá**: `MembersPanel` là chỗ dùng duy
nhất, và khi phần bảng chuyển sang `TableBodyState` thì `QueryBoundary` bọc ngoài không còn lý do tồn
tại — bộ lọc và nút "Thêm thành viên" render ngay từ lúc đang tải, bớt thêm một cú dựng lại layout.

Ba chỗ gọi rút gọn từ ~35 dòng thang điều kiện xuống một thẻ. `attendance-grid.tsx` bỏ được luôn
`isError`/`isPending` khỏi thân JSX; `attendance-log-table.tsx` bỏ được cả `ErrorState` import.

### 3. Số cột được chốt **một chỗ** cho cả header lẫn thân

Trong `attendance-grid.tsx`, thay `SKELETON_COLUMNS = 5` bằng một giá trị dẫn xuất:

```ts
/** Một tuần có tối đa 4 trận (architecture.md §6) — số cột ngày lúc chưa biết lịch. */
const PLACEHOLDER_DAY_COLUMNS = 4;

const dayColumns = isPending ? PLACEHOLDER_DAY_COLUMNS : battleSessions.length;
const columns = dayColumns + 2; // tên + các ngày + thao tác
```

Header render `dayColumns` ô ngày: khi đang tải là ô giữ chỗ (`<Skeleton>` trong `<th>`), khi xong là
`SessionLabel` thật. `columns` đi thẳng vào `TableBodyState`. Kết quả: hình học bảng **không đổi**
giữa lúc tải và lúc có dữ liệu, chỉ nội dung ô đổi — và hai `colSpan` lệch nhau ở dòng 186/198 biến
mất vì chỉ còn một nguồn.

### 4. `EmptyState` — module anh em của `ErrorState`

```tsx
// components/shared/empty-state.tsx

interface EmptyStateProps {
  /** Câu tiếng Việt mô tả vì sao chưa có gì. */
  message: string;
  /** Icon tuỳ chọn, mặc định Inbox. */
  icon?: ReactNode;
  /** Hành động gợi ý, ví dụ nút "Thêm thành viên". */
  action?: ReactNode;
}
```

Cùng khung, cùng khoảng cách, cùng cỡ chữ với `error-state.tsx` — hai nhánh của cùng một câu chuyện
thì phải trông như nhau. Một phương ngữ duy nhất: `flex flex-col items-center gap-3 py-8 text-center`.
Bản viền đứt (`border-dashed`) bỏ đi, vì bốn chỗ dùng nó và bốn chỗ dùng bản kia đang nói **cùng một
điều**.

Dùng ở cả tám chỗ; trong bảng thì đi qua `TableBodyState` (§2), ngoài bảng thì gọi trực tiếp.

### 5. Token chuyển động: nói **một lần**, ở `globals.css`

```css
@theme inline {
    /* Ba mốc thời lượng, không thêm mốc thứ tư mà không sửa file này. */
    --duration-fast: 120ms;   /* đổi màu, hover, nhấn */
    --duration-base: 200ms;   /* hiện/ẩn nội dung trong khung có sẵn */
    --duration-slow: 320ms;   /* skeleton ⇄ dữ liệu */
    --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
    /* Trả lời một lần cho cả app, không lặp ở từng chỗ gọi. */
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

Cách tiêu thụ: Tailwind 4 có namespace `--ease-*` nên `--ease-out-soft` sinh ra class `ease-out-soft`;
**không** có namespace `--duration-*`, nên thời lượng viết bằng arbitrary value
`duration-[var(--duration-base)]`.

Quy tắc: **chuyển động chỉ được đổi độ mờ và màu, không đổi hình học.** Không `translate`, không
`height`, không `scale` trên nội dung bảng — vì mục tiêu của cả spec này là ngăn layout xê dịch, và
một transition dịch chuyển chính là thứ đang gây ra nó.

### 6. `Spinner` — một module thay hai bản inline

```tsx
// components/shared/spinner.tsx

interface SpinnerProps {
  /** "sm" (size-3.5) trong nút và ô bảng, "md" (size-4) là mặc định. */
  size?: "sm" | "md";
  /** Nhãn cho trình đọc màn hình; bắt buộc vì spinner không có chữ. */
  label: string;
}
```

Hai giá trị cỡ có tên, không phải `className` tự do — cùng lý lẽ với `SessionLabel` (`frontend.md` §6).
Thay hai chỗ inline hiện có (`mutation-form.tsx:139`, `formation-toolbar.tsx:74`).

**Spinner hay skeleton?** Ranh giới rõ, không tuỳ hứng:

| Tình huống | Dùng |
|---|---|
| Chưa biết dữ liệu có bao nhiêu hàng — lần tải đầu | **Skeleton** đúng hình bảng |
| Đã có khung, đang chờ một thao tác của người dùng | **Spinner** trong chính nút/ô đó |
| Đang tải lại nền, dữ liệu cũ vẫn đúng | **Không gì cả** — giữ dữ liệu cũ, giảm độ mờ còn 60% |

### 7. Chỗ nào đang mount/unmount thì **giữ chỗ sẵn**

Ba khối nêu ở §5 phần Bối cảnh đổi từ `{cond && <X/>}` sang một ô luôn tồn tại:

- Hai `<p>` lỗi mutation (`members-panel.tsx:96`, `attendance-grid.tsx:225`) nằm trong một khối
  `min-h-*` cố định, hiện lên bằng độ mờ.
- `TablePaginationBar` luôn render (đã chốt ở §1).

### 8. Ghi tại chỗ phải có tín hiệu

- Bảng thành viên: `Select` quyền của hàng đang ghi bị `disabled` và hiện `Spinner` cỡ `sm` cạnh nó,
  lấy từ `updateMutation.isPending` cộng id hàng đang ghi.
- Lưới điểm danh: nút xác nhận của hàng đang lưu đổi sang `Spinner`, đúng cách `MutationForm` đang làm.

## Thứ tự triển khai

Thứ tự do **ai tiêu thụ ai** quyết định, không phải do việc nào dễ hơn.

```
§1 ─────────────────────────────────► độc lập hoàn toàn
§5 (token) + §6 (Spinner) ─┐
§4 (EmptyState) ───────────┴─► §2 (TableBodyState) ─► §3 ─► §7 + §8
```

| Bước | Mục | Vì sao ở vị trí đó |
|---|---|---|
| 1 | §1 — dải slot dài cố định | Không phụ thuộc ai và không ai phụ thuộc nó. Tự nó đóng trọn yêu cầu "nút điều hướng không xê dịch". Việc bỏ `return null` và bỏ guard `items.length > 0` là **tiền đề** cho §7 |
| 2 | §5 token + §6 `Spinner` | Nền. §2 cần token để làm chuyển cảnh skeleton ⇄ dữ liệu. Bước này gần như không đổi giao diện: chỉ thay hai spinner inline đang có |
| 3 | §4 `EmptyState` | Nền. §2 dùng nó cho nhánh rỗng bên trong bảng. Làm sau §2 thì phải sửa `TableBodyState` hai lần |
| 4 | §2 `TableBodyState`, xoá `TableSkeleton` | Bước lớn nhất, và chỉ vào được khi §4 với §5 đã xong — nếu không nó lại tự đẻ ra nhánh rỗng và thời lượng riêng, đúng thứ đang cần dọn |
| 5 | §3 số cột lưới điểm danh | Rơi ra gần như miễn phí khi chuyển `attendance-grid` sang §2, nhưng vẫn là bước riêng vì còn phải sửa **header** render ô ngày giữ chỗ |
| 6 | §7 ô giữ chỗ + §8 tín hiệu ghi tại chỗ | Cuối, vì nó chạm đúng những file bước 4–5 vừa viết lại, và ô giữ chỗ cho thanh phân trang cần §1 xong trước |

**Đầu tiên là §1** vì nó là thứ duy nhất không nợ ai và trả kết quả nhìn thấy được ngay.
**Cuối cùng là §7 + §8** vì đó là lớp đánh bóng đặt lên cấu trúc mà bước 4–5 vừa dựng; làm sớm là
viết trên nền sắp bị thay.

Mỗi bước tự kiểm và tự commit theo bảng ở mục *Kiểm chứng*; không gộp commit của hai bước.

## Không làm trong đợt này

- **Phân trang cho `attendance-log-table`.** Là bất đối xứng thật (hai bảng kia có, bảng không giới
  hạn số hàng thì không), nhưng độc lập với spec này và đáng một quyết định riêng.
- **Animation chuyển trang / chuyển tab.** Ngoài phạm vi yêu cầu, và mọi hiệu ứng dạng đó đều dịch
  chuyển hình học — trái §5.
- **Đổi `Skeleton` của shadcn.** Nó là output của CLI (`components/ui/`), không sửa tay.

## Ảnh hưởng tài liệu

- `apps/web/docs/frontend.md` §6 "Tables": thay `table-skeleton` bằng `table-body-state` trong ba
  gạch đầu dòng Loading/Failure/Paging.
- `apps/web/docs/frontend.md` §6: thêm mục **"Trạng thái rỗng"** (`empty-state.tsx`) và mục
  **"Chuyển động"** (token, `Spinner`, quy tắc spinner-hay-skeleton, quy tắc không đổi hình học).
- `docs/architecture.md` không đổi — không thêm endpoint, cột, page hay biến môi trường nào.

## Kiểm chứng

| Điều đã chốt | Cách kiểm |
|---|---|
| Dải số trang dài cố định | Test thuần cho `getPageSlots`: mọi `page ∈ [1, pageCount]` cho ra cùng `length` |
| Nút điều hướng không xê dịch | Render test: `getBoundingClientRect().x` của nút "sau" bằng nhau ở trang 1 và trang 4 |
| `pageCount <= 1` vẫn render | Render test: thanh phân trang có mặt, bốn nút `aria-disabled` |
| Bốn nhánh thân bảng | Render test `TableBodyState`: lỗi thắng đang-tải; rỗng khác có-dữ-liệu; `colSpan` bằng `columns` ở cả ba hàng đặc biệt |
| Lưới điểm danh không dựng lại | Render test: số `<th>` lúc `isPending` bằng số `<th>` sau khi có 4 trận |
| `prefers-reduced-motion` | Kiểm tay — CSS thuần, không có nhánh JS để test |

Hạ tầng render test đã có từ W1 (`@testing-library/react` + `jsdom`, `include` của Vitest đã bắt
`*.test.tsx`).
