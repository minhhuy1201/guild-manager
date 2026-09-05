# W1 — Giao thức "dialog gọi mutation" thành một module sâu · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** năm luật của một "dialog gọi mutation" — reset lỗi trước khi gửi, chỉ đóng khi thành
công, lỗi thì giữ dialog, hiện `message` của lỗi (fallback khi rỗng), đang chạy thì khoá nút — được
nói **một lần** trong một module có test render, thay cho 20 mẩu chép tay ở bốn dialog.

**Kiến trúc:** ba lớp trong `components/shared/`. `MutationForm` giữ **giao thức ghi** và không biết
gì về `Dialog`. `MutationDialogShell` giữ **vỏ** `Dialog`/`DialogContent`, chỉ mount thân khi mở, và
chặn yêu cầu đóng khi đang chạy. `MutationDialog` = vỏ + giao thức, cho dialog không có state riêng;
`ConfirmDeleteDialog` là adapter mỏng của nó. Hai form dialog giữ nguyên cấu trúc hai lớp hiện có
(state ô nhập nằm ở component con nên tự reset mỗi lần mở lại) và chỉ thay ruột bằng `MutationForm`.

**Tech stack:** Next.js 16 (React 19), TanStack Query, Base UI + shadcn/ui, Vitest 4,
`@testing-library/react` + `jsdom` (**đã có sẵn** trong `apps/web/package.json`).

**Spec:** [`docs/custom-spec/2026-08-21-w1-mutation-dialog-design.md`](../custom-spec/2026-08-21-w1-mutation-dialog-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)

**Phạm vi:** `apps/web` — `components/shared/`, `lib/`, `features/members`, `features/settings`,
`vitest.config.ts`, `docs/frontend.md`. `apps/api` và `packages/shared` **không đổi**.

## Năm điểm kế hoạch chốt khác spec

Bốn điểm đầu là **spec đã cũ so với code** (spec viết trước khi W3 vào nhánh); Task 1 sửa lại spec cho
khớp trước khi động vào code.

1. **Không thêm dependency nào.** `@testing-library/react@^16.3.2` và `jsdom@^26.1.0` đã nằm trong
   `devDependencies` của `apps/web` từ commit `0e003f8` (5 file hook test của team-builder dùng
   chúng). Việc duy nhất còn thiếu là `include` của `vitest.config.ts` chỉ bắt `*.test.ts`, nên file
   `.tsx` không được chạy. Mục "Rủi ro §1" của spec — "thêm dependency cần được duyệt trước" — không
   còn đúng và phải bị gỡ.
2. **Số dòng spec trích đã lệch.** Spec nói `member-form-dialog.tsx:314-398` và
   `session-form-dialog.tsx:92-225`; hai file hiện dài 198 và 228 dòng. Plan này trích lại theo bản
   thực tế trong repo tại `7988ed4`.
3. **Module tách làm ba, không phải một.** Spec chỉ mô tả `MutationDialog` ôm luôn `<Dialog>`. Làm
   đúng vậy thì `run` nằm ở component ngoài, kéo theo state của các ô nhập phải nâng lên cùng — mà
   state đó đang cố ý nằm ở component con (`{open && <MemberForm/>}`, `member-form-dialog.tsx:59-62`)
   để tự reset mỗi lần mở lại, trong khi `<Dialog>` luôn mounted để animation đóng
   (`data-closed:animate-out`, `components/ui/dialog.tsx:56`) còn chạy. Tách `MutationForm` (giao
   thức, không có `Dialog`) khỏi `MutationDialogShell` (vỏ) giữ được cả hai tính chất đó mà vẫn chỉ
   có **một** bản cài đặt của năm luật.
4. **Luật "đang chạy thì chặn đóng" đi qua một context nhỏ.** `MutationForm` báo cờ chạy lên
   `MutationDialogShell` qua `MutationPendingContext`; vỏ là chỗ duy nhất biết `onOpenChange`. Nhờ
   vậy luật áp cho **cả bốn** dialog, kể cả hai form dialog tự dựng vỏ.
5. **`ConfirmDeleteDialog` mang thêm nút "Huỷ".** Spec nói adapter chỉ đặt sẵn ba prop
   (`variant`, icon `Trash2`, …). Nhưng hai dialog xoá hiện có nút "Huỷ" (ghost + icon `X`) còn hai
   form dialog thì không — khác biệt thật, không phải trôi dạt. `MutationForm` nhận `onCancel?`; có
   thì hiện nút, không thì thôi. `ConfirmDeleteDialog` luôn bật nó.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/w1-mutation-dialog`. Không
  `git push`, không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Text hiển thị là tiếng Việt; identifier, tên file, doc comment của code mới là tiếng Anh.** Khi
  **chuyển chỗ** một chuỗi tiếng Việt hoặc một comment tiếng Việt sẵn có thì bê **nguyên văn** —
  không dịch, không sửa dấu ba chấm (`Đang xoá…`, `Đang lưu…` dùng ký tự `…`, không phải `...`).
- **`components/ui/` không được sửa** — đó là output của shadcn CLI. Mọi biến thể bọc ở
  `components/shared/` (`frontend.md` §5).
- **Doc comment tiếng Anh cho mọi hàm/component mới**: mục đích, từng param, giá trị trả về.
- **Không đổi chữ ký public của bốn dialog** (`DeleteMemberDialog`, `DeleteSessionDialog`,
  `MemberFormDialog`, `SessionFormDialog`) — `members-panel.tsx:134-141` và
  `settings-screen.tsx:77-85` giữ nguyên từng dòng.
- **Không đụng `describeLoss`, `getSessionSubtitle`, `DateTimeField`, luật trần deadline,
  `deadlineTouched`** — spec chỉ gom giao thức ghi, không gom form.
- **Không có `jest-dom`.** Assert bằng matcher của Vitest (`toBeDefined()`, `toBeNull()`,
  `toBe(true)`), không dùng `toBeInTheDocument()`.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`
  - chạy một file: `pnpm --filter web test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/lib/error-message.ts` | `errorMessageOf(caught, fallback)` — luật 4 tách riêng, test được ở node |
| `apps/web/lib/__tests__/error-message.test.ts` | bảng ca của luật 4 |
| `apps/web/components/shared/mutation-pending.ts` | `MutationPendingContext`, `useReportMutationPending` |
| `apps/web/components/shared/mutation-form.tsx` | `MutationForm` — năm luật, không có `Dialog` |
| `apps/web/components/shared/mutation-dialog.tsx` | `MutationDialogShell`, `MutationDialog` |
| `apps/web/components/shared/confirm-delete-dialog.tsx` | `ConfirmDeleteDialog` |
| `apps/web/components/shared/__tests__/mutation-dialog.test.tsx` | sáu ca của spec §Kiểm thử |

**Sửa**

| File | Việc |
|---|---|
| `apps/web/vitest.config.ts` | `include` bắt thêm `*.test.tsx`; sửa doc comment đã sai |
| `apps/web/features/members/components/delete-member-dialog.tsx` | → `ConfirmDeleteDialog` |
| `apps/web/features/settings/components/delete-session-dialog.tsx` | → `ConfirmDeleteDialog` (giữ `describeLoss`) |
| `apps/web/features/members/components/member-form-dialog.tsx` | → `MutationDialogShell` + `MutationForm` |
| `apps/web/features/settings/components/session-form-dialog.tsx` | → như trên; validate client `throw` thay vì `setError` |
| `apps/web/docs/frontend.md` §5, §8 | quy ước mới + "đã có component test" |
| `docs/custom-spec/2026-08-21-w1-mutation-dialog-design.md` | đồng bộ với thực tế (Task 1) |

**Không đụng tới:** `components/ui/dialog.tsx`, `members-panel.tsx`, `settings-screen.tsx`,
`date-time-field.tsx`, `lib/datetime-input.ts`, mọi hook mutation.

---

### Task 0: Nhánh làm việc

- [x] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree sạch (trừ file kế hoạch này). Nếu bẩn: dừng, hỏi người
dùng.

- [x] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/w1-mutation-dialog
git rev-parse --abbrev-ref HEAD
```

- [x] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter web test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: Đồng bộ spec với thực tế trước khi viết code

Spec được viết trước khi W3 vào nhánh; ba chỗ của nó nói sai về repo hiện tại. Sửa **trước**, vì mọi
task sau đều đọc spec làm nguồn sự thật.

**Files:**
- Modify: `docs/custom-spec/2026-08-21-w1-mutation-dialog-design.md`

- [x] **Bước 1: Xác nhận lại từng dữ kiện trước khi sửa**

```bash
grep -n "@testing-library/react\|jsdom" apps/web/package.json
grep -rn "@vitest-environment jsdom" apps/web --include="*.ts" | grep -v node_modules | head
grep -n "include" apps/web/vitest.config.ts
wc -l apps/web/features/members/components/member-form-dialog.tsx \
      apps/web/features/settings/components/session-form-dialog.tsx
```

Kết quả mong đợi: hai package có trong `devDependencies`; ít nhất một hook test đã khai
`// @vitest-environment jsdom`; `include` là `["**/__tests__/**/*.test.ts"]`; hai file dài 198 và 228
dòng. Nếu khác: dừng, báo người dùng — plan này dựng trên đúng bốn dữ kiện đó.

- [x] **Bước 2: Trong spec, thay bảng "Thay đổi cụ thể"**

Thay nguyên bảng bằng:

```markdown
| File | Thay đổi |
|---|---|
| `components/shared/mutation-pending.ts` (mới) | context để thân báo cờ chạy lên vỏ |
| `components/shared/mutation-form.tsx` (mới) | `MutationForm` — năm luật, không có `Dialog` |
| `components/shared/mutation-dialog.tsx` (mới) | `MutationDialogShell`, `MutationDialog` |
| `components/shared/confirm-delete-dialog.tsx` (mới) | `ConfirmDeleteDialog` |
| `lib/error-message.ts` (mới) | `errorMessageOf` — luật 4, tách ra để test ở môi trường node |
| `features/members/components/delete-member-dialog.tsx` | bỏ `useState` lỗi, `try/catch`, khối lỗi, nút — còn phần cảnh báo + `run` |
| `features/settings/components/delete-session-dialog.tsx` | như trên (giữ `describeLoss`) |
| `features/members/components/member-form-dialog.tsx` | bỏ 5 mẩu; giữ 2 ô nhập |
| `features/settings/components/session-form-dialog.tsx` | như trên; giữ luật trần deadline, validate client `throw` thay vì `setError` |
| `vitest.config.ts` | `include` bắt thêm `*.test.tsx` — dependency test đã có sẵn |
```

- [x] **Bước 3: Trong spec, thay mục "Rủi ro"**

Thay nguyên mục bằng:

```markdown
## Rủi ro

- **Gộp UI dễ đánh rơi khác biệt nhỏ** giữa bốn dialog (khoảng cách, thứ tự nút). So từng cái trước
  khi chuyển; khác biệt nào có lý do thì để lại ở `children` hoặc thành một prop tường minh — nút
  "Huỷ" của hai dialog xoá là một khác biệt thật, nên nó thành `onCancel?` chứ không bị nuốt.
- **`MutationDialogShell` chỉ mount thân khi mở**, nên lỗi cũ và giá trị ô nhập cũ chết theo lần
  đóng trước. Đây là điều kiện để hai form dialog giữ nguyên được cấu trúc hai lớp của chúng.
```

(Dependency test không còn là rủi ro: `@testing-library/react` và `jsdom` đã nằm trong
`apps/web/package.json` từ đợt test hook của team-builder.)

- [x] **Bước 4: Trong spec, thêm mục §5 vào "Quyết định thiết kế"**

Chèn ngay sau §4 ("Biến thể xoá là adapter mỏng"):

```markdown
### 5. Vỏ và giao thức là hai component

`MutationForm` giữ năm luật và **không** biết tới `Dialog`. `MutationDialogShell` giữ
`Dialog`/`DialogContent`, chỉ mount thân khi `open`, và chặn yêu cầu đóng lúc đang chạy.
`MutationDialog` là hai cái ghép lại.

Lý do tách: state các ô nhập của hai form dialog nằm ở component con để tự reset mỗi lần mở lại,
trong khi `<Dialog>` phải luôn mounted thì animation đóng mới chạy. Nếu module ôm cả hai vai thì
`run` — vốn phải đọc state đó — bị đẩy ra ngoài vỏ, kéo state lên theo và mất cơ chế reset. Hai form
dialog vì vậy tự dựng vỏ bằng `MutationDialogShell` và đặt `MutationForm` ở component con.

Cờ chạy đi từ thân lên vỏ qua `MutationPendingContext`. Vỏ là chỗ duy nhất cầm `onOpenChange`, nên
luật "đang chạy thì bỏ qua yêu cầu đóng" áp cho cả bốn dialog chứ không riêng hai cái xoá.
```

- [x] **Bước 5: Trong spec, sửa hai số dòng đã lệch ở mục "Bối cảnh"**

`// member-form-dialog.tsx:314-343 và session-form-dialog.tsx:92-161` →
`// member-form-dialog.tsx:90-115 và session-form-dialog.tsx:96-161`.

- [x] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add docs/custom-spec/2026-08-21-w1-mutation-dialog-design.md docs/custom-plan/2026-08-21-w1-mutation-dialog-plan.md
git commit -m "docs: reconcile the w1 mutation dialog spec with the code

The test dependencies the spec asked to add are already installed, the line
numbers it quotes predate w3, and the module needs a shell/protocol split the
spec did not foresee. Adds the plan the split is argued in."
```

---

### Task 2: `errorMessageOf` — luật 4, tách ra để test được ở node

Luật 4 là chỗ hành vi **đổi có chủ ý**: hiện chỉ `ApiError` được đọc `message`; sau task này mọi
`Error` có `message` đều được đọc, `fallbackError` chỉ dùng khi `message` rỗng. Đó là điều kiện để
validate phía client của `session-form-dialog` chuyển sang `throw`.

**Files:**
- Create: `apps/web/lib/error-message.ts`
- Test: `apps/web/lib/__tests__/error-message.test.ts`

**Interfaces:**
- Produces: `errorMessageOf(caught: unknown, fallback: string): string`

- [x] **Bước 1: Viết test đỏ**

`apps/web/lib/__tests__/error-message.test.ts` (môi trường node mặc định — hàm thuần):

```ts
import { describe, expect, it } from "vitest";

import { ApiError } from "../api-client";
import { errorMessageOf } from "../error-message";

const FALLBACK = "Không lưu được thay đổi.";

describe("errorMessageOf", () => {
  it("đọc nguyên văn message của ApiError", () => {
    const caught = new ApiError("Tên thành viên đã tồn tại.", 409);

    expect(errorMessageOf(caught, FALLBACK)).toBe("Tên thành viên đã tồn tại.");
  });

  it("đọc message của Error thường — validate phía client ném ra cái này", () => {
    const caught = new Error("Ngày giờ chưa hợp lệ.");

    expect(errorMessageOf(caught, FALLBACK)).toBe("Ngày giờ chưa hợp lệ.");
  });

  it("message rỗng thì dùng câu fallback", () => {
    expect(errorMessageOf(new Error(""), FALLBACK)).toBe(FALLBACK);
  });

  it("message chỉ có khoảng trắng cũng coi như rỗng", () => {
    expect(errorMessageOf(new Error("   "), FALLBACK)).toBe(FALLBACK);
  });

  it("thứ ném ra không phải Error thì dùng câu fallback", () => {
    expect(errorMessageOf("mất mạng", FALLBACK)).toBe(FALLBACK);
    expect(errorMessageOf(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
```

- [x] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- error-message
```

Kết quả mong đợi: FAIL — `../error-message` không tồn tại.

- [x] **Bước 3: Cài đặt**

`apps/web/lib/error-message.ts`:

```ts
/**
 * The sentence to show for a value thrown by a write.
 *
 * Every `Error` that reaches a dialog already carries text written for the
 * user: an `ApiError` holds the backend's Vietnamese message, and a
 * client-side check throws its own. The fallback is for what has nothing to
 * say — a network failure, a string, an `undefined`.
 * @param caught - Value thrown by the write
 * @param fallback - Sentence used when the value carries no message
 * @returns Message to render
 */
export function errorMessageOf(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message.trim().length > 0) {
    return caught.message;
  }

  return fallback;
}
```

- [x] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter web test -- error-message
pnpm --filter web typecheck
pnpm --filter web lint
```

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/lib/error-message.ts apps/web/lib/__tests__/error-message.test.ts
git commit -m "feat(web): read the user-facing sentence off any thrown Error

Until now only an ApiError had its message shown, so a client-side check had
to write straight into the dialog's error state instead of throwing. Reading
every Error's message lets those checks throw like everything else, and the
per-dialog fallback is left for what carries no sentence at all."
```

---

### Task 3: Module `mutation-dialog` — năm luật, một chỗ, có test render

Task lớn nhất và là phần trả về chính của spec. Nó cũng là task mở lớp test render: `include` của
Vitest hiện không bắt file `.tsx` nào.

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/components/shared/mutation-pending.ts`
- Create: `apps/web/components/shared/mutation-form.tsx`
- Create: `apps/web/components/shared/mutation-dialog.tsx`
- Create: `apps/web/components/shared/confirm-delete-dialog.tsx`
- Test: `apps/web/components/shared/__tests__/mutation-dialog.test.tsx`

**Interfaces:**
- Consumes: `errorMessageOf` (Task 2)
- Produces:
  - `MutationFormProps { title, description?, submitLabel, pendingLabel, submitIcon, fallbackError,
    variant?, onCancel?, run, onDone, children? }` · `MutationForm(props): ReactNode`
  - `MutationDialogShell({ open, onOpenChange, children }): ReactNode`
  - `MutationDialogProps = Omit<MutationFormProps, "onDone" | "onCancel"> & { open, onOpenChange,
    showCancel? }` · `MutationDialog(props): ReactNode`
  - `ConfirmDeleteDialog(props: Omit<MutationDialogProps, "submitIcon" | "variant" | "showCancel">): ReactNode`

- [x] **Bước 1: Nới `include` của Vitest cho file `.tsx`**

`apps/web/vitest.config.ts` — sửa đúng hai chỗ, doc comment và `include`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Cấu hình Vitest cho apps/web.
 * Mặc định chạy ở môi trường node — hàm thuần và tầng data không cần DOM. File
 * nào cần DOM (hook, component) tự khai `// @vitest-environment jsdom` ở dòng đầu.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Mọi mốc giờ trong app tính theo giờ Việt Nam; cố định TZ để test không đổi
    // kết quả theo máy chạy.
    env: { TZ: "Asia/Ho_Chi_Minh" },
    include: ["**/__tests__/**/*.test.ts?(x)"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
```

- [x] **Bước 2: Smoke test — Base UI `Dialog` có sống trong jsdom không**

Base UI dựng popup qua portal và có thể đòi API trình duyệt mà jsdom không có. Thử **trước** khi viết
sáu ca, để nếu vỡ thì vỡ ở một file 20 dòng chứ không phải ở giữa task.

Tạo tạm `apps/web/components/shared/__tests__/smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("Base UI dialog trong jsdom", () => {
  it("render được nội dung khi mở", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Chào</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Chào")).toBeDefined();
  });
});
```

```bash
pnpm --filter web test -- smoke
```

Kết quả mong đợi: PASS. Nếu FAIL vì thiếu API trình duyệt (`ResizeObserver`, `matchMedia`,
`scrollIntoView`), thêm stub ngay đầu file test rồi chạy lại — ví dụ:

```tsx
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

và mang stub đó sang file test thật ở Bước 4. Nếu FAIL vì lý do khác: dừng, báo người dùng.

```bash
rm apps/web/components/shared/__tests__/smoke.test.tsx
```

- [x] **Bước 3: Xoá file smoke rồi viết test đỏ cho sáu ca của spec**

`apps/web/components/shared/__tests__/mutation-dialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import { MutationDialog, type MutationDialogProps } from "../mutation-dialog";

// Dialog mở ở portal; một cái còn sót lại sẽ trả về hai nút cùng tên cho ca sau.
afterEach(cleanup);

// React chỉ gộp và xả state update trong act() khi biết mình đang bị test;
// thiếu cờ này thì lỗi của một mutation không kịp tới chỗ assert.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const SUBMIT_LABEL = "Xoá thành viên";
const PENDING_LABEL = "Đang xoá…";
const FALLBACK = "Không xoá được thành viên này.";

/**
 * Render a MutationDialog with everything a case needs already filled in.
 * @param overrides - Props this case cares about
 * @returns The render result plus the onOpenChange spy
 */
function renderDialog(overrides: Partial<MutationDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const props: MutationDialogProps = {
    open: true,
    onOpenChange,
    title: "Xoá Mèo Mập?",
    submitLabel: SUBMIT_LABEL,
    pendingLabel: PENDING_LABEL,
    submitIcon: null,
    fallbackError: FALLBACK,
    run: async () => {},
    showCancel: true,
    ...overrides,
  };

  const view = render(<MutationDialog {...props} />);

  return { ...view, onOpenChange, props };
}

/** Click the confirm button. */
function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));
}

describe("MutationDialog", () => {
  it("run xong êm thì dialog đóng", async () => {
    const { onOpenChange } = renderDialog({ run: async () => {} });

    clickSubmit();

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("ApiError thì giữ dialog và hiện nguyên văn message của backend", async () => {
    const message = "Không xoá được vì thành viên còn lịch sử điểm danh.";
    const { onOpenChange } = renderDialog({
      run: async () => {
        throw new ApiError(message, 409);
      },
    });

    clickSubmit();

    expect(await screen.findByText(message)).toBeDefined();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("lỗi không có message thì hiện câu fallback", async () => {
    renderDialog({
      run: async () => {
        throw new Error("");
      },
    });

    clickSubmit();

    expect(await screen.findByText(FALLBACK)).toBeDefined();
  });

  it("đang chạy thì nút bị khoá và đổi nhãn", async () => {
    let finish = () => {};
    renderDialog({
      run: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });

    clickSubmit();

    const button = await screen.findByRole("button", { name: PENDING_LABEL });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    finish();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: PENDING_LABEL })).toBeNull()
    );
  });

  it("đang chạy thì yêu cầu đóng bị bỏ qua", async () => {
    let finish = () => {};
    const { onOpenChange } = renderDialog({
      run: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });

    clickSubmit();
    await screen.findByRole("button", { name: PENDING_LABEL });

    // Nút X ở góc đi qua onOpenChange của Dialog — đúng đường mà vỏ chặn.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).not.toHaveBeenCalled();

    // Nút "Huỷ" gọi thẳng người gọi nên nó phải tự khoá.
    const cancel = screen.getByRole("button", { name: "Huỷ" });
    expect((cancel as HTMLButtonElement).disabled).toBe(true);

    finish();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("mở lại sau khi lỗi thì không còn lỗi cũ", async () => {
    const run = async () => {
      throw new ApiError("Máy chủ đang bận.", 503);
    };
    const { rerender, props } = renderDialog({ run });

    clickSubmit();
    expect(await screen.findByText("Máy chủ đang bận.")).toBeDefined();

    rerender(<MutationDialog {...props} run={run} open={false} />);
    rerender(<MutationDialog {...props} run={run} open />);

    expect(screen.queryByText("Máy chủ đang bận.")).toBeNull();
  });
});
```

- [x] **Bước 4: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- mutation-dialog
```

Kết quả mong đợi: FAIL — `../mutation-dialog` không tồn tại. Nếu Vitest báo "No test files found"
thay vì lỗi import: `include` ở Bước 1 chưa đúng, sửa lại rồi chạy tiếp.

- [x] **Bước 5: Cài đặt — context báo cờ chạy**

`apps/web/components/shared/mutation-pending.ts`:

```ts
"use client";

import { createContext, useContext } from "react";

/** Reporter used when a form is rendered outside a dialog shell. */
const NO_SHELL = () => {};

/**
 * How the write protocol tells the dialog around it that a write is in flight.
 * The shell is the only piece holding `onOpenChange`, so it is the only piece
 * that can refuse to close while the write is still running.
 */
export const MutationPendingContext = createContext<
  ((isPending: boolean) => void) | null
>(null);

/**
 * The reporter a form calls when its write starts and when it settles.
 * @returns Function taking the new pending flag; a no-op with no shell above
 */
export function useReportMutationPending(): (isPending: boolean) => void {
  return useContext(MutationPendingContext) ?? NO_SHELL;
}
```

- [x] **Bước 6: Cài đặt — giao thức ghi**

`apps/web/components/shared/mutation-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessageOf } from "@/lib/error-message";
import { useReportMutationPending } from "./mutation-pending";

export interface MutationFormProps {
  /** Dialog title */
  title: string;
  /** Optional line rendered between the title and the body */
  description?: ReactNode;
  /** Confirm button label while idle */
  submitLabel: string;
  /** Confirm button label while the write runs */
  pendingLabel: string;
  /** Confirm button icon while idle (Save, Trash2…) */
  submitIcon: ReactNode;
  /** Sentence shown when the thrown value carries no message of its own */
  fallbackError: string;
  /** Confirm button style */
  variant?: "default" | "destructive";
  /** Cancel handler. Omit for no cancel button — the corner X is still there. */
  onCancel?: () => void;
  /** The write. Throwing keeps the form up and shows the error. */
  run: () => Promise<unknown>;
  /** Called once, after the write resolved */
  onDone: () => void;
  /** Body: the inputs, or the delete warning */
  children?: ReactNode;
}

/**
 * The write protocol every mutation dialog follows, written once.
 *
 * Five rules live here and nowhere else: the error resets before sending, the
 * caller is told to close only on success, a failure keeps the form up with
 * the message the error carried, and the confirm button locks and swaps its
 * label while the write runs. Callers say *what* is written (`run`) and what
 * it *looks like* (`children`, the labels) — never how the protocol goes.
 *
 * It holds its own pending flag rather than taking one: `member-form-dialog`
 * has two mutations to fold into one flag, and folding is exactly what should
 * not be repeated per caller.
 * @param title - Dialog title
 * @param description - Optional line under the title
 * @param submitLabel - Confirm button label while idle
 * @param pendingLabel - Confirm button label while the write runs
 * @param submitIcon - Confirm button icon while idle
 * @param fallbackError - Sentence shown when the thrown value has no message
 * @param variant - Confirm button style
 * @param onCancel - Cancel handler; omit for no cancel button
 * @param run - The write; throwing keeps the form up
 * @param onDone - Called once the write resolved
 * @param children - Body of the dialog
 * @returns Form holding the whole write protocol
 */
export function MutationForm({
  title,
  description,
  submitLabel,
  pendingLabel,
  submitIcon,
  fallbackError,
  variant = "default",
  onCancel,
  run,
  onDone,
  children,
}: MutationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const reportPending = useReportMutationPending();

  /**
   * Run the write, then either close or show what went wrong.
   * @param event - Submit event of the form
   * @returns Promise settled once the dialog closed or the error is on screen
   */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    reportPending(true);

    try {
      await run();
    } catch (caught) {
      setError(errorMessageOf(caught, fallbackError));
      return;
    } finally {
      // Cleared before onDone so the flag is down by the time the shell is
      // asked to close — a closing dialog must not still look busy.
      setIsPending(false);
      reportPending(false);
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      {description}
      {children}

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        {onCancel && (
          // Khoá luôn lúc đang chạy: nút này gọi thẳng người gọi, không đi qua
          // chốt chặn đóng của vỏ.
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={onCancel}
          >
            <X />
            Huỷ
          </Button>
        )}
        <Button type="submit" variant={variant} disabled={isPending}>
          {isPending ? <LoaderCircle className="animate-spin" /> : submitIcon}
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

- [x] **Bước 7: Cài đặt — vỏ và bản ghép**

`apps/web/components/shared/mutation-dialog.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MutationForm, type MutationFormProps } from "./mutation-form";
import { MutationPendingContext } from "./mutation-pending";

interface MutationDialogShellProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
  /** Body — mounted only while open */
  children: ReactNode;
}

/**
 * The dialog around a write.
 *
 * Two rules live here. A close requested while the write is in flight is
 * ignored, so a mutation cannot land in a dialog that is gone. And the body
 * mounts only while open, so the fields and the error of the previous visit
 * die with it — which is why a caller can keep its form state in a child and
 * still get a clean form every time.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @param children - Body, mounted only while open
 * @returns Dialog shell holding the two dialog-level rules
 */
export function MutationDialogShell({
  open,
  onOpenChange,
  children,
}: MutationDialogShellProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <MutationPendingContext.Provider value={setIsPending}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isPending) return;
          onOpenChange(next);
        }}
      >
        <DialogContent>{open && children}</DialogContent>
      </Dialog>
    </MutationPendingContext.Provider>
  );
}

export interface MutationDialogProps
  extends Omit<MutationFormProps, "onDone" | "onCancel"> {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
  /** Render a "Huỷ" button beside the confirm one */
  showCancel?: boolean;
}

/**
 * A dialog whose whole job is one write: the shell plus the protocol.
 *
 * Use this when the body has no state of its own. A dialog whose body holds
 * state that must reset per visit builds the two halves itself —
 * `MutationDialogShell` outside, `MutationForm` in a child — so the child
 * remounts on every open.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @param showCancel - Render a "Huỷ" button beside the confirm one
 * @param form - Everything MutationForm needs except onDone and onCancel
 * @returns Dialog wired to the write protocol
 */
export function MutationDialog({
  open,
  onOpenChange,
  showCancel = false,
  ...form
}: MutationDialogProps) {
  const close = () => onOpenChange(false);

  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <MutationForm
        {...form}
        onDone={close}
        onCancel={showCancel ? close : undefined}
      />
    </MutationDialogShell>
  );
}
```

- [x] **Bước 8: Cài đặt — adapter xoá**

`apps/web/components/shared/confirm-delete-dialog.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";

import { MutationDialog, type MutationDialogProps } from "./mutation-dialog";

type ConfirmDeleteDialogProps = Omit<
  MutationDialogProps,
  "submitIcon" | "variant" | "showCancel"
>;

/**
 * A delete confirmation: the write protocol with the three things every
 * delete dialog would otherwise repeat — a destructive button, the bin icon,
 * and a cancel button beside it, because a destructive dialog deserves a way
 * out that is not the corner X.
 * @param props - Everything MutationDialog takes but the three fixed props
 * @returns Delete confirmation dialog
 */
export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  return (
    <MutationDialog
      {...props}
      variant="destructive"
      submitIcon={<Trash2 />}
      showCancel
    />
  );
}
```

- [x] **Bước 9: Chạy test cho chắc là xanh**

```bash
pnpm --filter web test -- mutation-dialog
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: 6/6 PASS. Nếu ca "yêu cầu đóng bị bỏ qua" đỏ vì `onOpenChange` vẫn được gọi: cờ
`isPending` của vỏ chưa kịp lên trước cú click — kiểm tra `reportPending(true)` chạy **trước**
`await run()`, đừng nới lỏng assert.

- [x] **Bước 10: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/vitest.config.ts apps/web/components/shared/mutation-pending.ts \
        apps/web/components/shared/mutation-form.tsx \
        apps/web/components/shared/mutation-dialog.tsx \
        apps/web/components/shared/confirm-delete-dialog.tsx \
        apps/web/components/shared/__tests__/mutation-dialog.test.tsx
git commit -m "feat(web): hold the whole write-dialog protocol in one module

Four dialogs each spelled out the same five rules and no test could reach any
of them. MutationForm now owns the protocol, MutationDialogShell owns the two
dialog-level rules, and the six cases that were unwritable are written. The
Vitest include glob picks up .tsx so a render test can exist at all."
```

---

### Task 4: Hai dialog xoá dùng `ConfirmDeleteDialog`

Hai file này là bản chép tay đầy đủ nhất của giao thức — chúng đi trước vì sau khi chuyển, chỉ còn
phần cảnh báo và `run`.

**Files:**
- Modify: `apps/web/features/members/components/delete-member-dialog.tsx`
- Modify: `apps/web/features/settings/components/delete-session-dialog.tsx`

**Interfaces:**
- Consumes: `ConfirmDeleteDialog` (Task 3)
- `DeleteMemberDialog({ member, onClose })` và `DeleteSessionDialog({ session, onClose })` giữ nguyên
  chữ ký — `members-panel.tsx:139` và `settings-screen.tsx:82` không đổi.

- [x] **Bước 1: Viết lại `delete-member-dialog.tsx`**

```tsx
"use client";

import type { Character } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { useDeleteMember } from "../hooks/use-member-mutations";

interface DeleteMemberDialogProps {
  /** Thành viên sắp xoá; null thì dialog đóng */
  member: Character | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Xác nhận xoá một thành viên. Nói thẳng là mất cả lịch sử vì database xoá cascade,
 * không có đường khôi phục.
 * @param member - Thành viên sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
 */
export function DeleteMemberDialog({
  member,
  onClose,
}: DeleteMemberDialogProps) {
  const deleteMutation = useDeleteMember();

  return (
    <ConfirmDeleteDialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // Tiêu đề dựng ở ngoài phần thân, nên vẫn phải phòng lúc dialog đã đóng.
      title={member ? `Xoá ${member.name}?` : ""}
      submitLabel="Xoá thành viên"
      pendingLabel="Đang xoá…"
      fallbackError="Không xoá được thành viên này."
      run={async () => {
        if (!member) return;
        await deleteMutation.mutateAsync(member.id);
      }}
    >
      <div className="text-sm">
        Toàn bộ lịch sử điểm danh và các ô đội hình đã xếp của thành viên này sẽ
        mất theo, kể cả tuần cũ — không khôi phục được.
      </div>
    </ConfirmDeleteDialog>
  );
}
```

- [x] **Bước 2: Viết lại `delete-session-dialog.tsx`**

`describeLoss` (`:26-44`) giữ **nguyên văn từng dòng**, kể cả doc comment tiếng Việt.

```tsx
"use client";

import type { BattleSession } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { getSessionSubtitle } from "@/features/attendance";
import { useDeleteSession } from "../hooks/use-session-mutations";

interface DeleteSessionDialogProps {
  /** Trận sắp xoá; null thì dialog đóng */
  session: BattleSession | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Câu cảnh báo trước khi xoá, nói thẳng sẽ mất những gì.
 * @param session - Trận sắp xoá
 * @returns Câu mô tả hậu quả
 */
function describeLoss(session: BattleSession): string {
  const losses: string[] = [];

  if (session.attendanceCount > 0) {
    losses.push(`${session.attendanceCount} lượt điểm danh`);
  }
  if (session.hasFormation) losses.push("1 đội hình đã xếp");

  if (losses.length === 0) return "Trận này chưa có dữ liệu gì.";

  return `Trận này đã có ${losses.join(
    " và "
  )} — xoá là mất hết, không khôi phục được.`;
}

/**
 * Xác nhận xoá một trận scrim.
 * @param session - Trận sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
 */
export function DeleteSessionDialog({
  session,
  onClose,
}: DeleteSessionDialogProps) {
  const deleteMutation = useDeleteSession();

  return (
    <ConfirmDeleteDialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // Tiêu đề dựng ở ngoài phần thân, nên vẫn phải phòng lúc dialog đã đóng.
      title={session ? `Xoá trận ${session.label}?` : ""}
      description={
        session && (
          <div className="text-sm text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )
      }
      submitLabel="Xoá trận"
      pendingLabel="Đang xoá…"
      fallbackError="Không xoá được trận này."
      run={async () => {
        if (!session) return;
        await deleteMutation.mutateAsync(session.id);
      }}
    >
      <div className="text-sm">{session && describeLoss(session)}</div>
    </ConfirmDeleteDialog>
  );
}
```

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [x] **Bước 4: Kiểm tay**

```bash
pnpm --filter web dev
```

- Trang Thành viên → xoá một người: tiêu đề đúng tên, câu cảnh báo y như cũ, nút "Huỷ" bên trái và
  "Xoá thành viên" đỏ bên phải. Bấm "Huỷ" và bấm X ở góc đều đóng.
- Trang Cài đặt → xoá một trận: có dòng phụ (giờ đánh) mờ ở trên và câu `describeLoss` ở dưới.
- **Khác biệt trông thấy được, có chủ ý:** khoảng cách giữa các khối là `gap-4` thay vì `gap-3` —
  hai dialog xoá giờ dùng đúng lưới của hai form dialog. Nếu thấy chỗ nào khác biệt **ngoài** cái
  này: dừng, báo người dùng.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/members/components/delete-member-dialog.tsx \
        apps/web/features/settings/components/delete-session-dialog.tsx
git commit -m "refactor(web): confirm both deletions through ConfirmDeleteDialog

The two dialogs were the same five steps in the same order, differing only in
one fallback sentence. What is left in each is the warning it shows and the
one line it writes."
```

---

### Task 5: `member-form-dialog` giữ hai ô nhập, bỏ giao thức

**Files:**
- Modify: `apps/web/features/members/components/member-form-dialog.tsx:1-173`

**Interfaces:**
- Consumes: `MutationDialogShell`, `MutationForm` (Task 3)
- `MemberFormDialog({ open, member, onOpenChange })` giữ nguyên chữ ký — `members-panel.tsx:134`
  không đổi. `GuildClassOption` (`:175-198`) **giữ nguyên từng dòng**.

- [x] **Bước 1: Sửa vỏ (`:51-66`)**

```tsx
export function MemberFormDialog({
  open,
  member,
  onOpenChange,
}: MemberFormDialogProps) {
  return (
    // Vỏ chỉ mount thân khi mở, nên state của form tự reset mỗi lần mở lại.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <MemberForm member={member} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}
```

- [x] **Bước 2: Sửa thân (`:81-173`)**

Bỏ `error`, `saving`, `handleSubmit`, khối lỗi và `DialogFooter`; `run` chỉ còn phần ghi:

```tsx
function MemberForm({ member, onDone }: MemberFormProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [guildClass, setGuildClass] = useState<GuildClass>(
    member?.guildClass ?? GUILD_CLASS_OPTIONS[0]
  );

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  return (
    <MutationForm
      title={member ? "Sửa thành viên" : "Thêm thành viên"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu…"
      submitIcon={<Save />}
      fallbackError="Không lưu được thay đổi."
      onDone={onDone}
      run={async () => {
        const input = { name: name.trim(), guildClass };

        if (member) {
          await updateMutation.mutateAsync({ id: member.id, input });
          return;
        }
        await createMutation.mutateAsync(input);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-name">Tên</Label>
        <Input
          id="member-name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-class">Lưu phái</Label>
        <Select
          value={guildClass}
          onValueChange={(next) => setGuildClass(String(next) as GuildClass)}
        >
          <SelectTrigger id="member-class" className="w-full">
            <SelectValue>
              {() => <GuildClassOption guildClass={guildClass} />}
            </SelectValue>
          </SelectTrigger>
          {/* Mở như popover dưới trigger thay vì neo item đang chọn vào trigger. */}
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_CLASS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                <GuildClassOption guildClass={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </MutationForm>
  );
}
```

Doc comment của `MemberFormDialog` và `MemberForm` giữ nguyên nguyên văn.

- [x] **Bước 3: Sửa import ở đầu file (`:1-33`)**

Bỏ `AlertCircle`, `LoaderCircle`, `ApiError`, `Dialog`, `DialogContent`, `DialogFooter`,
`DialogHeader`, `DialogTitle`, `Button`; thêm hai module mới. Khối import còn lại:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Save } from "lucide-react";

import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { useCreateMember, useUpdateMember } from "../hooks/use-member-mutations";
```

- [x] **Bước 4: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: PASS, và `lint` không còn báo import thừa.

- [x] **Bước 5: Kiểm tay**

```bash
pnpm --filter web dev
```

- Thêm thành viên: gõ tên, chọn lưu phái, Enter trong ô tên vẫn submit (nút là `type="submit"` trong
  `<form>` như cũ).
- Ô tên để trống rồi bấm Lưu: trình duyệt chặn bằng `required` như cũ, chưa gọi API.
- Thêm trùng tên (nếu backend chặn): message tiếng Việt của backend hiện nguyên văn, dialog **không**
  đóng. Bấm X đóng rồi mở lại: form trắng, không còn lỗi cũ.
- Sửa một thành viên: hai ô điền sẵn đúng người đang sửa.

- [x] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/members/components/member-form-dialog.tsx
git commit -m "refactor(web): write the member form through MutationForm

The form keeps its two fields and its own state; the error state, the
try/catch, the two pending flags folded into one, the error block and the
two-label button are the shared protocol now."
```

---

### Task 6: `session-form-dialog` — validate phía client chuyển sang `throw`

Task này **đổi cách lỗi validate đi ra**, không đổi thứ người dùng thấy: hai câu kiểm tra trước khi
gửi giờ `throw` thay vì `setError`, và `MutationForm` đọc `message` của chúng (Task 2).

**Files:**
- Modify: `apps/web/features/settings/components/session-form-dialog.tsx:1-228`

**Interfaces:**
- Consumes: `MutationDialogShell`, `MutationForm` (Task 3)
- `SessionFormDialog({ open, session, onOpenChange })` giữ nguyên chữ ký — `settings-screen.tsx:77`
  không đổi. `DEFAULT_BATTLE_TIME`, `DEFAULT_DEADLINE_TIME`, `handleDateTimeChange`,
  `deadlineTouched` và luật trần deadline **giữ nguyên**.

- [x] **Bước 1: Sửa vỏ (`:51-66`)**

```tsx
export function SessionFormDialog({
  open,
  session,
  onOpenChange,
}: SessionFormDialogProps) {
  return (
    // Vỏ chỉ mount thân khi mở, nên state của form tự reset mỗi lần mở lại.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <SessionForm session={session} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}
```

- [x] **Bước 2: Bỏ `error`/`saving` và đổi `handleSubmit` thành `submitSession` (`:92-161`)**

Bỏ dòng `const [error, setError] = useState<string | null>(null);` (`:92`) và dòng
`const saving = …` (`:96`). Thay `handleSubmit` bằng:

```tsx
  /**
   * Kiểm tra hai ô ngày giờ rồi tạo mới hoặc cập nhật tuỳ theo đang sửa trận nào.
   * Ném lỗi thì `MutationForm` giữ dialog lại và hiện đúng câu đã ném.
   * @returns Promise hoàn tất khi đã lưu xong
   */
  async function submitSession() {
    // Ô ngày giờ trả về rỗng khi người dùng gõ dở hoặc gõ ngày không có thật.
    if (!dateTime || (!isGuildWar && !deadline)) {
      throw new Error("Ngày giờ chưa hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm.");
    }

    // Ô ngày giờ là hai input text có mask, không phải `datetime-local`, nên
    // không có thuộc tính `max` để trình duyệt tự chặn — kiểm tra ở đây thay thế.
    if (
      !isGuildWar &&
      !isWithinDeadlineCap(new Date(deadline), new Date(dateTime))
    ) {
      throw new Error(DEADLINE_CAP_MESSAGE);
    }

    if (!session) {
      await createMutation.mutateAsync({
        dateTime: fromInputValue(dateTime),
        deadline: fromInputValue(deadline),
        opponent: opponent.trim() || null,
      });
      return;
    }

    // Hạn chót của Guild War do hệ thống đặt; gửi lên là 400.
    await updateMutation.mutateAsync({
      id: session.id,
      input: {
        dateTime: fromInputValue(dateTime),
        ...(isGuildWar ? {} : { deadline: fromInputValue(deadline) }),
        opponent: isGuildWar ? null : opponent.trim() || null,
      },
    });
  }
```

- [x] **Bước 3: Thay `<form>` bằng `<MutationForm>` (`:163-228`)**

Bỏ `DialogHeader`/`DialogTitle`, khối lỗi và `DialogFooter`; ba ô nhập giữ nguyên từng dòng:

```tsx
  return (
    <MutationForm
      title={session ? "Sửa ngày đánh" : "Thêm trận scrim"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu…"
      submitIcon={<Save />}
      fallbackError="Không lưu được thay đổi."
      onDone={onDone}
      run={submitSession}
    >
      <DateTimeField
        id="session-date-time"
        label="Ngày giờ đánh"
        value={dateTime}
        onChange={handleDateTimeChange}
        defaultTime={DEFAULT_BATTLE_TIME}
      />

      {!isGuildWar && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-opponent">Tên bang đối thủ</Label>
          <Input
            id="session-opponent"
            maxLength={100}
            placeholder="Để trống nếu chưa chốt"
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
          />
        </div>
      )}

      {isGuildWar ? (
        <div className="flex flex-col gap-1.5">
          <Label>Hạn chót điểm danh</Label>
          <p className="text-sm text-muted-foreground">
            17:00 Thứ 5 — cố định, không sửa được.
          </p>
        </div>
      ) : (
        <DateTimeField
          id="session-deadline"
          label="Hạn chót điểm danh"
          value={deadline}
          onChange={(value) => {
            setDeadlineTouched(true);
            setDeadline(value);
          }}
          defaultTime={DEFAULT_DEADLINE_TIME}
          description="Muộn nhất 10:00 sáng ngày đánh."
        />
      )}
    </MutationForm>
  );
```

- [x] **Bước 4: Sửa import ở đầu file (`:1-28`)**

```tsx
"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { deadlineCapFor, isWithinDeadlineCap } from "@guild/shared/lib";
import { DEADLINE_CAP_MESSAGE, type BattleSession } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateSession,
  useUpdateSession,
} from "../hooks/use-session-mutations";
import { fromInputValue, toInputValue } from "../lib/datetime-input";
import { DateTimeField } from "./date-time-field";
```

- [x] **Bước 5: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [x] **Bước 6: Kiểm tay**

```bash
pnpm --filter web dev
```

Trang Cài đặt → Thêm trận scrim:

- Bấm Lưu khi chưa nhập ngày: hiện đúng câu "Ngày giờ chưa hợp lệ. Nhập theo dạng dd/mm/yyyy và
  HH:mm.", dialog không đóng.
- Đặt hạn chót muộn hơn 10:00 ngày đánh: hiện `DEADLINE_CAP_MESSAGE`, dialog không đóng.
- Chọn giờ đánh khi chưa đụng ô hạn chót: hạn chót vẫn tự điền theo trần như cũ.
- Sửa một trận Guild War: không có ô đối thủ, không có ô hạn chót, chỉ có dòng "17:00 Thứ 5 — cố
  định, không sửa được.".
- Lưu thành công: dialog đóng, danh sách cập nhật.

- [x] **Bước 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/settings/components/session-form-dialog.tsx
git commit -m "refactor(web): write the session form through MutationForm

The two checks that run before sending now throw their Vietnamese sentence
instead of writing the dialog's error state by hand, so every failure this
form can have leaves through the same door."
```

---

### Task 7: Tài liệu và rà soát cuối

**Files:**
- Modify: `apps/web/docs/frontend.md` §5, §8

- [x] **Bước 1: Cập nhật danh sách shared của `frontend.md` §5**

Thay dòng "Current shared building blocks: …" bằng (giữ thứ tự bảng chữ cái):

```markdown
Current shared building blocks: `action-buttons`, `confirm-delete-dialog`, `date-range`,
`error-state`, `guild-class-filter-select`, `guild-class-icon`, `main-nav`, `mutation-dialog`,
`mutation-form`, `mutation-pending`, `page-size-select`, `password-input`, `query-boundary`,
`roster-filter-bar`, `site-header`, `status-badge`, `status-icon`, `table-pagination`,
`table-pagination-bar`, `table-skeleton`.
```

- [x] **Bước 2: Thêm mục mới vào §5, ngay sau "Filtering a roster list"**

```markdown
### Writing through a dialog

A dialog whose job is one write does **not** spell the protocol out again. Five rules live in
`MutationForm` (`components/shared/mutation-form.tsx`): the error resets before sending, the caller
is told to close only on success, a failure keeps the dialog up, the sentence shown is the thrown
`Error`'s own `message` — an `ApiError` carries the backend's, a client-side check throws its own —
with the per-dialog `fallbackError` left for what carries no sentence, and the confirm button locks
and swaps to `pendingLabel` while the write runs. The form holds its **own** pending flag rather
than taking one, because a screen with two mutations would otherwise fold them per caller.

Two more rules are the dialog's, not the form's, and live in `MutationDialogShell`
(`components/shared/mutation-dialog.tsx`): a close requested while the write is in flight is
ignored, and the body mounts only while open. The form reports its pending flag up through
`MutationPendingContext` — the shell is the only piece holding `onOpenChange`.

Which of the two you reach for depends on the body:

- Body with no state of its own → `MutationDialog` (shell + form in one), or `ConfirmDeleteDialog`
  for a deletion, which is the same thing with the destructive button, the bin icon and a "Huỷ"
  button beside it.
- Body holding state that must be clean on every visit (the member and session forms) → build the
  two halves yourself: `MutationDialogShell` outside, `MutationForm` in a child component. The
  child remounts on every open, so its fields reset without a line of code saying so.

The caller says *what* is written (`run`, an `async` function) and what it *looks like*
(`children`, the labels). `run` returns a promise and takes no callbacks: work that must follow a
successful write is `await`ed inside `run` itself, in plain order.
```

- [x] **Bước 3: Cập nhật §8 cho đúng thực tế test**

Thay câu "There are no component tests; there are hook tests, and those need a DOM — a hook test
file opts in with `// @vitest-environment jsdom` on its first line, so the rest of the suite stays on
node." bằng:

```markdown
Most files here are `.test.ts` on node. Anything needing a DOM — a hook test, and the one component
test — opts in with `// @vitest-environment jsdom` on its first line, so the rest of the suite stays
on node; the include glob is `**/__tests__/**/*.test.ts?(x)`, so a `.tsx` test is picked up too.
Component tests are the exception, not the rule: the one that exists covers
`components/shared/mutation-dialog.tsx`, because the five write rules it holds have no pure function
to test them through. `@testing-library/react` has no `jest-dom` beside it — assert with Vitest's
own matchers.
```

- [x] **Bước 4: Rà không còn bản giao thức viết tay nào**

```bash
grep -rn "instanceof ApiError" apps/web --include="*.tsx" | grep -v node_modules
grep -rn "isPending ? \"Đang\|Đang lưu…\|Đang xoá…" apps/web --include="*.tsx" | grep -v node_modules
grep -rn "AlertCircle" apps/web --include="*.tsx" | grep -v node_modules
```

Kết quả mong đợi:
- Lệnh 1: **rỗng** — `errorMessageOf` là chỗ duy nhất phân loại lỗi, và nó không dùng `ApiError`.
- Lệnh 2: chỉ `components/shared/__tests__/mutation-dialog.test.tsx` và bốn dialog truyền
  `pendingLabel` — **không** file nào còn tự dựng `isPending ? … : …`.
- Lệnh 3: chỉ `components/shared/mutation-form.tsx` (và những chỗ dùng icon cho việc khác, ví dụ
  `error-state.tsx` — kiểm tra từng dòng, chỗ nào là khối lỗi của dialog thì chưa chuyển xong).

- [x] **Bước 5: Kiểm tra toàn bộ**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: cả ba sạch, và số test file tăng đúng **hai** so với Task 0 Bước 3
(`error-message.test.ts`, `mutation-dialog.test.tsx`). Dán số file/số test vào phần báo cáo — không
tuyên bố "xong" khi chưa nhìn thấy output.

- [x] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/docs/frontend.md
git commit -m "docs(web): document the write-dialog protocol and the component test"
```

- [x] **Bước 7: Review và báo cáo**

Chạy `/code-review` trên nhánh, sửa những gì đáng sửa, rồi tóm tắt cho người dùng: các commit đã tạo,
output của `pnpm --filter web test`, hành vi đổi có chủ ý (đọc `message` của mọi `Error`; đang chạy
thì chặn đóng; hai dialog xoá đổi `gap-3` → `gap-4`), và năm điểm kế hoạch chốt khác spec.

---

## Ngoài phạm vi (theo spec)

- **Toast thay cho lỗi inline** — đổi quy ước hiển thị toàn app, cần quyết định riêng và cập nhật
  `frontend.md` §6.
- **Gom logic form** (validate, dirty state, `deadlineTouched`) — spec này chỉ gom **giao thức ghi**.
- **Test render cho hai form dialog** — sáu ca của spec đều là luật của giao thức, và giao thức chỉ
  có một bản cài đặt. Test cho hai ô nhập của `MemberForm` là việc khác, chưa có ai yêu cầu.
- **Sửa `components/ui/dialog.tsx`** — output của shadcn CLI, không hand-edit.
