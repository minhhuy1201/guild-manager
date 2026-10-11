# W6 — Quy ước "trận Guild War trông thế nào" thành một module · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** bộ quy ước nhận diện một trận đánh — icon `Swords` khi là Guild War, chữ `text-primary`,
cỡ icon, thứ tự icon–nhãn, dòng "Hạn chót: …", và nền/viền nhạt của khung — được nói **một lần** trong
`components/shared/session-label.tsx`, thay cho bốn bản chép tay ở bốn màn.

**Kiến trúc:** một file, ba thứ xuất ra. `SessionLabel` là **một hàng inline** (icon + nhãn + chỗ cắm
cho dấu riêng của màn) và không giữ khung ngoài. `SessionDeadline` là dòng "Hạn chót: …" đầy đủ, vì cả
hai chỗ dùng nó có class y hệt nhau. `sessionTintClass(isGuildWar)` trả về class khung để caller tự ghép
vào khung của mình. Mỗi màn giữ nguyên layout, khoảng cách và dòng phụ của nó.

**Tech stack:** Next.js 16 (React 19), Tailwind v4 + `cn`, lucide-react, Base UI + shadcn/ui, Vitest 4,
`@testing-library/react` + `jsdom` (đã có sẵn, và `include` của Vitest đã bắt `*.test.tsx` từ W1).

**Spec:** [`docs/custom-spec/2026-08-21-w6-session-label-design.md`](../custom-spec/2026-08-21-w6-session-label-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)

**Phạm vi:** `apps/web` — `components/shared/`, `features/attendance/components/`,
`features/settings/components/`, `features/team-builder/components/`, `docs/frontend.md`.
`apps/api` và `packages/shared` **không đổi**.

## Bốn điểm kế hoạch chốt khác spec

Cả bốn là **spec nói sai về code hiện tại** hoặc tự mâu thuẫn với chính §1 của nó. Task 1 sửa spec
trước khi động vào code.

1. **`SessionLabel` không nhận `subtitle`, nó nhận `children` render *sau* nhãn.** Spec §1 nói module
   "không giữ khung ngoài (viền, nền, **khoảng cách**)", nhưng cùng lúc lại cho nó một prop `subtitle`
   xếp *dưới* nhãn — mà xếp dưới chính là khoảng cách. Bốn màn lại xếp dòng phụ bốn kiểu khác nhau:
   `gap-1.5` (week-timeline), `gap-1` (session-row), `block` trong `<th>` (attendance-grid), `gap-0.5`
   trong `TabsTrigger` (session-tabs) — và bốn kiểu chữ khác nhau (`text-xs font-medium
   text-muted-foreground`, `text-xs text-muted-foreground`, `block text-xs font-normal
   text-muted-foreground`, `text-xs font-normal opacity-80`). Không có gì để gom. Dòng phụ **ở lại**
   từng màn.

   Thứ *thật sự* cần một chỗ cắm là **bên trong hàng nhãn**: `session-row` gắn thêm
   `<Badge variant="secondary">Guild War</Badge>` (`session-row.tsx:51`) và `session-tabs` gắn icon
   `Lock` cùng chấm dirty (`session-tabs.tsx:81-88`) — cả ba nằm **cùng hàng** với nhãn. Nên prop là
   `children`, render sau nhãn, trong cùng `inline-flex`.

2. **`sm` = `size-3.5`, và không màn nào đổi cỡ icon.** Spec §Rủi ro nói `attendance-grid` "sẽ **thay
   đổi thật**" vì phải chọn `sm` bằng `3.5` hay `4`. Nhưng spec đếm sót: `session-tabs.tsx:80` cũng
   dùng `size-3.5`. Thực tế là **2 màn dùng `3.5`** (attendance-grid, session-tabs) và **2 màn dùng
   `4`** (week-timeline, session-row). Lấy `sm = size-3.5`, `md = size-4` thì cả bốn màn giữ nguyên
   từng pixel của icon.

3. **`SessionDeadline` phục vụ 2 màn, không phải 3 — và vì thế nó ôm luôn cái `div`.** Spec nói "chỉ
   ba trong bốn màn hiện dòng này". Grep `"Hạn chót"` trong `features/*/components/` chỉ ra đúng hai
   chỗ: `week-timeline.tsx:102` và `session-row.tsx:57`. `attendance-grid` hiện "Đã khóa",
   `session-tabs` hiện tiến độ trận — không màn nào có hạn chót. Hai chỗ còn lại giống nhau **từng ký
   tự**, kể cả class `text-xs text-muted-foreground`, nên `SessionDeadline` trả về cả `div` chứ không
   chỉ chuỗi.

4. **`size` chỉ điều khiển cỡ *icon*, không điều khiển cỡ *chữ*.** Spec viết "Cỡ icon và chữ". Không
   màn nào trong bốn màn đặt cỡ chữ cho hàng nhãn — chữ thừa hưởng từ cha (`<th>`, `TabsTrigger`,
   `CardContent`). Module đặt cỡ chữ nghĩa là đè lên bốn cái cha đó, tức là đúng thứ §1 cấm.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/w6-session-label`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Text hiển thị là tiếng Việt; identifier, tên file, doc comment của code mới là tiếng Anh.** Khi
  **chuyển chỗ** một chuỗi tiếng Việt hoặc comment tiếng Việt sẵn có thì bê **nguyên văn** — `Hạn chót:
  ` giữ đúng dấu cách sau dấu hai chấm, `Còn thay đổi chưa lưu` giữ nguyên.
- **`components/ui/` không được sửa** — đó là output của shadcn CLI. Mọi biến thể bọc ở
  `components/shared/` (`frontend.md` §5).
- **Doc comment tiếng Anh cho mọi hàm/component mới**: mục đích, từng param, giá trị trả về.
- **Không đổi chữ ký public của bốn component** (`WeekTimeline`, `SessionRow`, `AttendanceGrid`,
  `SessionTabs`) và không đụng vào bất kỳ hook, query hay hàm `lib/` nào.
- **Không kéo `getSessionSubtitle` ra khỏi `features/attendance`** (spec §4). Bốn màn tiếp tục gọi nó
  qua `@/features/attendance` hoặc đường dẫn tương đối như hiện tại.
- **Giữ token Tailwind, không đổi sang hex** — `text-primary`, `border-primary/40`, `bg-primary/5` là
  token của app và phải chạy đúng ở cả theme sáng lẫn tối (spec §Edge case).
- **Không có `jest-dom`.** Assert bằng matcher của Vitest (`toBe`, `toBeDefined()`, `toBeNull()`,
  `toContain()`), không dùng `toBeInTheDocument()`.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`
  - chạy một file: `pnpm --filter web test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/components/shared/session-label.tsx` | `SessionLabel`, `SessionDeadline`, `sessionTintClass` |
| `apps/web/components/shared/__tests__/session-label.test.tsx` | sáu ca của spec §Kiểm thử |

**Sửa**

| File | Việc |
|---|---|
| `apps/web/features/attendance/components/week-timeline.tsx` | dùng cả ba; bỏ import `Swords`, `formatDateTime` |
| `apps/web/features/settings/components/session-row.tsx` | dùng cả ba; `Badge` "Guild War" vào `children` |
| `apps/web/features/attendance/components/attendance-grid.tsx` | `SessionLabel size="sm"`; bỏ import `Swords` |
| `apps/web/features/team-builder/components/session-tabs.tsx` | `SessionLabel size="sm"`; `Lock` + chấm dirty vào `children` |
| `apps/web/docs/frontend.md` §5, §6 | thêm `session-label` vào danh sách; thêm mục quy ước mới |
| `docs/custom-spec/2026-08-21-w6-session-label-design.md` | đồng bộ với thực tế (Task 1) |

**Không đụng tới:** `components/ui/*`, `features/attendance/lib/session-subtitle.ts`,
`features/team-builder/lib/active-session.ts`, `features/settings/components/session-list.tsx`,
`features/settings/components/session-form-dialog.tsx`, `packages/shared/schemas/*`.

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
git switch -c refactor/w6-session-label
git rev-parse --abbrev-ref HEAD
```

- [x] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: Đồng bộ spec với thực tế trước khi viết code

Bốn điểm ở mục "Bốn điểm kế hoạch chốt khác spec" đều là spec nói sai hoặc tự mâu thuẫn. Sửa **trước**,
vì mọi task sau đọc spec làm nguồn sự thật.

**Files:**
- Modify: `docs/custom-spec/2026-08-21-w6-session-label-design.md`

- [x] **Bước 1: Xác nhận lại từng dữ kiện trước khi sửa**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -rn "Swords" --include="*.tsx" features | grep -v settings-tabs
grep -rn "Hạn chót" --include="*.tsx" features
grep -rn "isGuildWar" --include="*.tsx" features/*/components | wc -l
```

Kết quả mong đợi, đúng từng dòng:
- `Swords` trong 4 màn: `session-row.tsx:49` `size-4`, `session-tabs.tsx:80` `size-3.5`,
  `week-timeline.tsx:95` `size-4`, `attendance-grid.tsx:181` `size-3.5`.
- `"Hạn chót"` trong `features/*/components/` chỉ có ở `session-row.tsx:57` và `week-timeline.tsx:102`
  (các dòng trong `session-form-dialog.tsx` là nhãn ô nhập, không phải dòng hiển thị).
- `session.isGuildWar` trong `features/*/components/`: **12** lần (spec cũ ghi 9 — Bước 2 sửa lại).

Nếu khác: dừng, báo người dùng — plan này dựng trên đúng ba dữ kiện đó.

- [x] **Bước 2: Trong spec, thay khối `SessionLabelProps` ở §1**

Thay nguyên khối code của §1 bằng:

```tsx
// components/shared/session-label.tsx

export interface SessionLabelProps {
  /** Trận cần hiển thị; chỉ đọc label và isGuildWar */
  session: Pick<BattleSession, "label" | "isGuildWar">;
  /** Cỡ icon: "sm" (size-3.5) cho ô hẹp, "md" (size-4) cho danh sách */
  size?: "sm" | "md";
  /** Dấu riêng của từng màn, render sau nhãn trong cùng hàng */
  children?: ReactNode;
}
```

và thay đoạn văn ngay dưới nó bằng:

```markdown
Module giữ: chọn icon, màu chữ, cỡ icon theo `size`, và thứ tự icon–nhãn. Nó **không** giữ khung
ngoài (viền, nền, khoảng cách) — mỗi màn có layout riêng và ép chung là làm hỏng cả bốn. Vì cùng lý
do đó, **dòng phụ ở lại từng màn**: bốn màn xếp nó bốn kiểu (`gap-1.5`, `gap-1`, `block` trong `<th>`,
`gap-0.5` trong `TabsTrigger`) với bốn kiểu chữ khác nhau, nên xếp nó ở đây là giữ khoảng cách hộ
caller.

Cái thật sự cần một chỗ cắm là **bên trong hàng nhãn**: `session-row` gắn thêm badge "Guild War",
`session-tabs` gắn icon `Lock` và chấm dirty — cả ba nằm cùng hàng với nhãn. Đó là `children`.

`size` là hai giá trị cố định chứ không phải một prop `className` tự do: đó là điểm khác biệt giữa
một module có quy ước và một `div` có thêm chỗ để lệch. Nó chỉ điều khiển **cỡ icon**; cỡ chữ thừa
hưởng từ cha (`<th>`, `TabsTrigger`, `CardContent`) và module không đè lên.
```

- [x] **Bước 3: Trong spec, thay §2**

Thay nguyên §2 bằng:

```markdown
### 2. `SessionDeadline` tách riêng

```tsx
/** Dòng "Hạn chót: …" của một trận. */
export function SessionDeadline({ session }: { session: Pick<BattleSession, "deadline"> }): ReactNode;
```

Chỉ **hai** trong bốn màn hiện dòng này — `week-timeline` và `session-row`; `attendance-grid` hiện
"Đã khóa" còn `session-tabs` hiện tiến độ trận. Tách khỏi `SessionLabel` thay vì thêm một prop
bật/tắt. Hai chỗ dùng nó giống nhau từng ký tự, kể cả class `text-xs text-muted-foreground`, nên
module trả về cả `div` chứ không chỉ chuỗi.
```

- [x] **Bước 4: Trong spec, sửa bảng "Thay đổi cụ thể"**

Thay hai dòng cuối của bảng bằng:

```markdown
| `features/attendance/components/attendance-grid.tsx:175-191` | `SessionLabel size="sm"` — `text-primary` chuyển từ `<th>` vào nhãn |
| `features/team-builder/components/session-tabs.tsx:77-92` | `SessionLabel size="sm"` + `Lock` và chấm dirty đi qua `children` |
```

và thêm ngay sau bảng:

```markdown
`session-row` cũng có một thứ riêng: badge `Guild War` (`session-row.tsx:51`). Nó **ở lại** màn đó,
đi qua `children` — badge là nhấn mạnh của màn thiết lập, không phải nhận diện trận.
```

- [x] **Bước 5: Trong spec, thay mục "Rủi ro"**

Thay nguyên mục bằng:

```markdown
## Rủi ro

- **Gộp visual dễ đổi giao diện ngoài ý muốn.** Đây là spec chạm nhiều pixel nhất trong đợt. Làm từng
  màn một và so bằng mắt sau mỗi màn.
- **Cỡ icon không đổi ở màn nào.** Hai màn đang dùng `size-3.5` (`attendance-grid`, `session-tabs`)
  và hai màn dùng `size-4` (`week-timeline`, `session-row`), nên `sm = size-3.5` và `md = size-4`
  giữ nguyên cả bốn.
- **Đúng một thay đổi trông thấy được, và là có chủ ý:** nhãn Guild War ở tab xếp team giờ có
  `text-primary` kể cả khi tab chưa được chọn — trước đó nó chỉ đổi màu lúc active. Đó chính là quy
  ước mà spec này gom lại; ghi vào commit message.
- **Giá trị thấp hơn các spec khác.** Đây là lý do nó xếp cuối: nó dọn trùng lặp hiển thị, không vá
  lỗi nào và không mở ra test nào mới ngoài chính nó.
```

- [x] **Bước 6: Trong spec, thay mục "Kiểm thử"**

Thay nguyên mục bằng:

```markdown
## Kiểm thử

Hạ tầng render từ [W1](./2026-08-21-w1-mutation-dialog-design.md) **đã có**: `include` của Vitest là
`**/__tests__/**/*.test.ts?(x)` và `@testing-library/react` + `jsdom` đã nằm trong `devDependencies`.

- `sessionTintClass(true/false)` là hàm thuần → test được ngay, không cần render
- `isGuildWar: true` → có icon, có `text-primary`
- `isGuildWar: false` → không icon, không `text-primary`
- `size="sm"` vs `size="md"` → khác class cỡ icon
- `children` render **sau** nhãn, trong cùng hàng
- `SessionDeadline` hiện `Hạn chót:` cùng mốc giờ đã định dạng
```

- [x] **Bước 7: Commit**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git add docs/custom-spec/2026-08-21-w6-session-label-design.md docs/custom-plan/2026-08-21-w6-session-label-plan.md
git commit -m "docs: reconcile the w6 session label spec with the code

The subtitle prop the spec asks for would put spacing back in a module that
says it holds none, and the four screens stack it four ways; what they share
is a slot inside the label row. The spec also miscounts the deadline line as
three screens and the icon size drift as one, when it is two and none. Adds
the plan those corrections are argued in."
```

---

### Task 2: Module `session-label` — ba thứ, một chỗ, có test

Task này là phần trả về chính của spec. Sau nó, bốn màn chỉ còn việc gọi.

**Files:**
- Create: `apps/web/components/shared/session-label.tsx`
- Test: `apps/web/components/shared/__tests__/session-label.test.tsx`

**Interfaces:**
- Consumes: `formatDateTime` (`@/lib/format`), `cn` (`@/lib/utils`), `BattleSession`
  (`@guild/shared/schemas`)
- Produces:
  - `type SessionLabelSize = "sm" | "md"`
  - `interface SessionLabelProps { session: Pick<BattleSession, "label" | "isGuildWar">; size?: SessionLabelSize; children?: ReactNode }`
  - `SessionLabel(props: SessionLabelProps): ReactNode`
  - `interface SessionDeadlineProps { session: Pick<BattleSession, "deadline"> }`
  - `SessionDeadline(props: SessionDeadlineProps): ReactNode`
  - `sessionTintClass(isGuildWar: boolean): string`

- [x] **Bước 1: Viết test đỏ**

`apps/web/components/shared/__tests__/session-label.test.tsx`:

```tsx
// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/format";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "../session-label";

afterEach(cleanup);

// React chỉ gộp và xả state update trong act() khi biết mình đang bị test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const GUILD_WAR = { label: "Thứ 7 · Guild War", isGuildWar: true };
const SCRIM = { label: "Thứ 3 · 20:30", isGuildWar: false };

/**
 * Render a SessionLabel and hand back the row element it produced.
 * @param element - The SessionLabel to render
 * @returns The row element, which is the only child of the container
 */
function renderRow(element: ReactElement): HTMLElement {
  const { container } = render(element);

  return container.firstElementChild as HTMLElement;
}

describe("sessionTintClass", () => {
  it("Guild War được tô nhạt", () => {
    expect(sessionTintClass(true)).toBe("border-primary/40 bg-primary/5");
  });

  it("trận thường không tô gì", () => {
    expect(sessionTintClass(false)).toBe("");
  });
});

describe("SessionLabel", () => {
  it("Guild War có icon và chữ màu primary", () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} />);

    expect(row.querySelector("svg")).not.toBeNull();
    expect(row.className).toContain("text-primary");
    expect(row.textContent).toBe("Thứ 7 · Guild War");
  });

  it("trận thường không có icon và không đổi màu chữ", () => {
    const row = renderRow(<SessionLabel session={SCRIM} />);

    expect(row.querySelector("svg")).toBeNull();
    expect(row.className).toContain("text-primary");
  });

  it('size mặc định "md" cho icon size-4', () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} />);

    expect(row.querySelector("svg")?.getAttribute("class")).toContain("size-4");
  });

  it('size "sm" cho icon size-3.5 — cỡ của ô hẹp', () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} size="sm" />);
    const iconClass = row.querySelector("svg")?.getAttribute("class") ?? "";

    expect(iconClass).toContain("size-3.5");
    expect(iconClass).not.toContain("size-4");
  });

  it("children nằm sau nhãn, trong cùng một hàng", () => {
    const row = renderRow(
      <SessionLabel session={GUILD_WAR}>
        <span>Đã khoá</span>
      </SessionLabel>
    );

    expect(row.textContent).toBe("Thứ 7 · Guild WarĐã khoá");
  });
});

describe("SessionDeadline", () => {
  it("hiện hạn chót đã định dạng", () => {
    const deadline = "2026-08-22T12:00:00.000Z";
    const { container } = render(<SessionDeadline session={{ deadline }} />);

    expect(container.textContent).toBe(`Hạn chót: ${formatDateTime(deadline)}`);
  });
});
```

Ca thứ hai của `SessionLabel` cố ý viết `toContain("text-primary")` — **nó phải đỏ ngay cả sau khi cài
đặt xong**, và Bước 4 sẽ sửa lại thành `not.toContain`. Xem Bước 4.

- [x] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- session-label
```

Kết quả mong đợi: FAIL — `../session-label` không tồn tại. Nếu Vitest báo "No test files found":
`include` của `vitest.config.ts` không còn là `**/__tests__/**/*.test.ts?(x)` — dừng, báo người dùng.

- [x] **Bước 3: Cài đặt module**

`apps/web/components/shared/session-label.tsx`:

```tsx
import type { ReactNode } from "react";
import { Swords } from "lucide-react";

import type { BattleSession } from "@guild/shared/schemas";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How wide the space around the label is: a narrow cell, or a list row. */
export type SessionLabelSize = "sm" | "md";

/**
 * Icon size per named size. Two fixed values instead of a free `className`,
 * so a screen cannot quietly drift to a third one.
 */
const ICON_CLASS: Record<SessionLabelSize, string> = {
  sm: "size-3.5",
  md: "size-4",
};

/** Frame classes for a Guild War, kept beside the label they belong with. */
const GUILD_WAR_TINT = "border-primary/40 bg-primary/5";

export interface SessionLabelProps {
  /** Battle to show; only its label and its Guild War flag are read */
  session: Pick<BattleSession, "label" | "isGuildWar">;
  /** Icon size: "sm" for a narrow cell, "md" for a list row */
  size?: SessionLabelSize;
  /** Marks a single screen adds after the label, inside the same row */
  children?: ReactNode;
}

/**
 * How a battle is recognised across the app: the Guild War carries a crossed
 * swords icon and the primary colour, a scrim carries neither.
 *
 * This is one inline row and nothing more — no frame, no spacing, no second
 * line. Four screens lay a battle out four different ways, and the only thing
 * they genuinely share is what the row itself looks like. The subtitle stays
 * with each screen because each screen stacks and styles it differently.
 * @param session - Battle to show; only label and isGuildWar are read
 * @param size - Icon size; "sm" for a narrow cell, "md" for a list row
 * @param children - Marks the screen adds after the label, in the same row
 * @returns The label row
 */
export function SessionLabel({
  session,
  size = "md",
  children,
}: SessionLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        session.isGuildWar && "text-primary"
      )}
    >
      {session.isGuildWar && <Swords className={ICON_CLASS[size]} />}
      {session.label}
      {children}
    </span>
  );
}

export interface SessionDeadlineProps {
  /** Battle whose deadline is shown; only its deadline is read */
  session: Pick<BattleSession, "deadline">;
}

/**
 * The "Hạn chót: …" line of a battle.
 *
 * Returns the whole line, wrapper included: the two screens showing it write
 * it identically down to the class, so there is nothing left for a caller to
 * decide.
 * @param session - Battle whose deadline is shown
 * @returns The deadline line
 */
export function SessionDeadline({ session }: SessionDeadlineProps) {
  return (
    <div className="text-xs text-muted-foreground">
      Hạn chót: {formatDateTime(session.deadline)}
    </div>
  );
}

/**
 * Frame classes for a battle: a Guild War is tinted so it stands out of a
 * list. Returned as a string rather than rendered, because the frame belongs
 * to the screen — the tint is the only part of it that is a convention.
 * @param isGuildWar - Whether the battle is the Guild War
 * @returns Classes to merge into the frame's own className, or an empty string
 */
export function sessionTintClass(isGuildWar: boolean): string {
  return isGuildWar ? GUILD_WAR_TINT : "";
}
```

- [x] **Bước 4: Chạy test, xác nhận đúng **một** ca đỏ, rồi sửa ca đó**

```bash
pnpm --filter web test -- session-label
```

Kết quả mong đợi: 8 ca, PASS 7, FAIL đúng ca `"trận thường không có icon và không đổi màu chữ"` —
`row.className` là `"inline-flex items-center gap-1.5 font-medium"`, không chứa `text-primary`. Đó là
hành vi đúng; test viết ngược để chứng minh assert này thật sự chạm vào class.

Sửa dòng đó trong file test thành:

```tsx
    expect(row.className).not.toContain("text-primary");
```

Nếu ca nào **khác** cũng đỏ: dừng, đọc lỗi, đừng nới lỏng assert.

- [x] **Bước 5: Chạy lại cho chắc là xanh**

```bash
pnpm --filter web test -- session-label
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: 8/8 PASS, typecheck và lint sạch.

- [x] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/components/shared/session-label.tsx \
        apps/web/components/shared/__tests__/session-label.test.tsx
git commit -m "feat(web): hold the battle identity convention in one module

The swords icon, the primary text, the icon size and the tinted frame were
spelled out in four screens, and the icon size had already drifted between
them. SessionLabel owns the row, SessionDeadline owns the deadline line, and
sessionTintClass hands the frame classes back to whoever draws the frame."
```

---

### Task 3: `week-timeline` dùng cả ba

Màn đầu tiên, và là màn dùng đủ ba thứ của module — nó chốt xem module có đủ dùng không.

**Files:**
- Modify: `apps/web/features/attendance/components/week-timeline.tsx`

**Interfaces:**
- Consumes: `SessionLabel`, `SessionDeadline`, `sessionTintClass` (Task 2)
- `WeekTimeline()` giữ nguyên chữ ký; không component nào gọi nó phải đổi.

- [x] **Bước 1: Sửa khối import ở đầu file (`:1-15`)**

Bỏ `Swords` khỏi import lucide và bỏ `formatDateTime`; thêm module mới. Khối import thành:

```tsx
"use client";

import { CalendarRange, Clock, Lock } from "lucide-react";

import { DateRange } from "@/components/shared/date-range";
import { ErrorState } from "@/components/shared/error-state";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "@/components/shared/session-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getSessionSubtitle } from "../lib/session-subtitle";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useBattleSessions, useCurrentWeek } from "../hooks/use-attendance";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
```

- [x] **Bước 2: Thay thân vòng lặp `battleSessions.map`**

Thay nguyên khối `return (…)` bên trong `.map(...)` bằng:

```tsx
              <div
                key={session.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-3",
                  sessionTintClass(session.isGuildWar)
                )}
              >
                <SessionLabel session={session} />
                <div className="text-xs font-medium text-muted-foreground">
                  {subtitle}
                </div>
                <SessionDeadline session={session} />
                {closed ? (
                  <StatusBadge tone="danger">
                    <Lock className="size-3.5" />
                    Đã khóa
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="success">
                    <Clock className="size-3.5" />
                    Còn hạn
                  </StatusBadge>
                )}
              </div>
```

Hai dòng `const closed = …` và `const subtitle = …` ngay trên `return` **giữ nguyên**.

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: PASS, và `lint` không còn báo import thừa.

- [ ] **Bước 4: Kiểm tay**

```bash
pnpm --filter web dev
```

Trang Điểm danh → card "Tuần điểm danh": ba thẻ ngày. Thẻ Guild War có viền và nền nhạt, icon kiếm
bắt chéo trước nhãn, nhãn màu primary. Ba dòng dưới nhãn (dòng phụ, "Hạn chót: …", badge trạng thái)
đúng thứ tự và khoảng cách như cũ. Hai thẻ scrim không viền nhạt, không icon.

**Không được có khác biệt nào trông thấy được.** Nếu thấy: dừng, báo người dùng.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/attendance/components/week-timeline.tsx
git commit -m "refactor(web): draw the week timeline battles through SessionLabel

The card kept its own copy of the icon, the primary text, the tint and the
deadline line. All four now come from the shared module; what is left in the
component is its layout and its open/closed badge."
```

---

### Task 4: `session-row` dùng cả ba, badge đi qua `children`

**Files:**
- Modify: `apps/web/features/settings/components/session-row.tsx`

**Interfaces:**
- Consumes: `SessionLabel`, `SessionDeadline`, `sessionTintClass` (Task 2)
- `SessionRow({ session, onEdit, onDelete })` giữ nguyên chữ ký — `session-list.tsx` không đổi.

- [x] **Bước 1: Sửa khối import ở đầu file (`:1-14`)**

Bỏ `Swords` và `formatDateTime`; thêm module mới:

```tsx
"use client";

import type { BattleSession } from "@guild/shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "@/components/shared/session-label";
import { Badge } from "@/components/ui/badge";
import { getSessionSubtitle } from "@/features/attendance";
import { cn } from "@/lib/utils";
```

- [x] **Bước 2: Thay thân `SessionRow`**

Doc comment ngay trên hàm **giữ nguyên nguyên văn**. Thay phần `return (…)` bằng:

```tsx
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3",
        sessionTintClass(session.isGuildWar)
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <SessionLabel session={session}>
          {session.isGuildWar && <Badge variant="secondary">Guild War</Badge>}
        </SessionLabel>
        <div className="text-xs text-muted-foreground">
          {getSessionSubtitle(session)}
        </div>
        <SessionDeadline session={session} />
      </div>

      {!session.isGuildWar && (
        <RowActions>
          <EditAction onClick={() => onEdit(session)} />
          <DeleteAction onClick={() => onDelete(session)} />
        </RowActions>
      )}
    </div>
  );
```

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [ ] **Bước 4: Kiểm tay**

```bash
pnpm --filter web dev
```

Trang Cài đặt → tab Lịch đánh: hàng Guild War có viền/nền nhạt, icon kiếm, nhãn primary, badge
"Guild War" ngay sau nhãn **cùng hàng**, không có hai nút thao tác. Hàng scrim có hai nút Sửa/Xoá và
không có badge. Dòng phụ và "Hạn chót: …" y như cũ.

**Không được có khác biệt nào trông thấy được.** Nếu thấy: dừng, báo người dùng.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/settings/components/session-row.tsx
git commit -m "refactor(web): draw the settings battle row through SessionLabel

The row now borrows the icon, the primary text, the tint and the deadline
line instead of restating them. The Guild War badge stays here, passed as a
child, because it is this screen's emphasis and not part of the convention."
```

---

### Task 5: `attendance-grid` — đầu cột dùng `SessionLabel size="sm"`

Ô hẹp nhất trong bốn màn, và là nơi cỡ icon từng lệch.

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`

**Interfaces:**
- Consumes: `SessionLabel` (Task 2). Không dùng `SessionDeadline` (đầu cột hiện "Đã khóa", không hiện
  hạn chót) và không dùng `sessionTintClass` (`<th>` không có khung riêng).
- `AttendanceGrid` giữ nguyên chữ ký.

- [x] **Bước 1: Bỏ import `Swords`, thêm `SessionLabel`**

Trong khối import đầu file: xoá nguyên dòng `import { Swords } from "lucide-react";` (`:4`) và thêm

```tsx
import { SessionLabel } from "@/components/shared/session-label";
```

vào cụm import `@/components/shared/…` đã có, giữ đúng thứ tự alphabet của cụm đó.

- [x] **Bước 2: Thay khối `<TableHead>` của mỗi trận**

Thay nguyên khối `return (…)` bên trong `battleSessions.map` ở phần `<TableHeader>` bằng:

```tsx
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
```

Dòng `const subtitle = getSessionSubtitle(session);` ngay trên `return` **giữ nguyên**.

Hai điều đã kiểm và cố ý:
- `text-primary` rời `<th>` để vào đúng nhãn. `<th>` vốn là `text-muted-foreground` và hai `<span>`
  dòng dưới cũng vậy, nên màu của chúng không đổi — trước đây `text-primary` trên `<th>` chỉ có tác
  dụng lên nhãn mà thôi.
- `justify-center` cũ trong `<span>` là thừa: `inline-flex` co theo nội dung nên `justify-*` không
  đổi gì, và `text-center` của `<th>` mới là thứ căn giữa nó.

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [ ] **Bước 4: Kiểm tay**

```bash
pnpm --filter web dev
```

Trang Điểm danh → bảng "Điểm danh theo ngày đánh": đầu cột Guild War có icon nhỏ (`size-3.5`, bằng
đúng cỡ cũ) và nhãn primary, căn giữa. Dòng phụ và "Đã khóa" bên dưới vẫn xám và nhỏ. Thu hẹp cửa sổ
xuống mobile: cột tên và cột thao tác vẫn dính, hàng đầu cột không cao thêm.

**Không được có khác biệt nào trông thấy được.** Nếu thấy: dừng, báo người dùng.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/attendance/components/attendance-grid.tsx
git commit -m "refactor(web): draw the attendance column heads through SessionLabel

This head was the one that had drifted, carrying size-3.5 where two other
screens carried size-4. The difference is now the named size=\"sm\", and the
primary colour moved off the th onto the label it was always meant for."
```

---

### Task 6: `session-tabs` — `Lock` và chấm dirty đi qua `children`

Màn cuối, và là màn duy nhất **thay đổi trông thấy được**.

**Files:**
- Modify: `apps/web/features/team-builder/components/session-tabs.tsx`

**Interfaces:**
- Consumes: `SessionLabel` (Task 2). `SessionFormation` không có trường `deadline` và tab không có
  khung riêng cần tô, nên hai thứ còn lại của module không dùng ở đây. `SessionFormation` khớp
  cấu trúc với `Pick<BattleSession, "label" | "isGuildWar">` nên không cần ép kiểu.
- `SessionTabs({ sessions, activeSessionId, dirtySessionIds, onSelect, slotCount })` giữ nguyên chữ ký.

- [x] **Bước 1: Bỏ `Swords` khỏi import, thêm `SessionLabel`**

Đầu file (`:3-6`) thành:

```tsx
import { Lock } from "lucide-react";
import type { MatchFormation, SessionFormation } from "@guild/shared/schemas";

import { SessionLabel } from "@/components/shared/session-label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionSubtitle } from "@/features/attendance";
```

- [x] **Bước 2: Thay `<span>` nhãn bên trong `<TabsTrigger>`**

Thay nguyên khối `<span className="inline-flex items-center justify-center gap-1.5"> … </span>` bằng:

```tsx
              <SessionLabel session={session} size="sm">
                {session.locked ? <Lock className="size-3 opacity-70" /> : null}
                {dirtySessionIds.has(session.sessionId) ? (
                  <span
                    className="size-1.5 rounded-full bg-current"
                    aria-label="Còn thay đổi chưa lưu"
                  />
                ) : null}
              </SessionLabel>
```

`<span className="text-xs font-normal opacity-80">` chứa `progress`/`subtitle` ngay dưới **giữ
nguyên**, cùng cả comment dài về `group-data-horizontal/tabs` ở trên `TabsList`.

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [ ] **Bước 4: Kiểm tay — đây là màn có thay đổi thật**

```bash
pnpm --filter web dev
```

Trang Xếp team:

- **Thay đổi có chủ ý, phải thấy:** nhãn tab Guild War giờ có màu primary **kể cả khi tab đó chưa được
  chọn**. Trước đó nó chỉ đổi màu lúc active. Đây chính là quy ước spec gom lại.
- Icon kiếm vẫn `size-3.5` như cũ, đứng trước nhãn.
- Tab của trận đã khoá vẫn có ổ khoá nhỏ mờ **sau** nhãn; tab còn thay đổi chưa lưu vẫn có chấm tròn
  sau ổ khoá. Với tab Guild War, chấm dirty giờ là màu primary vì nó dùng `bg-current` — đúng ý.
- Dòng tiến độ `"12/60 · 8/60"` bên dưới không đổi; hàng thẻ trận không bị ép còn 32px.

Nếu thấy khác biệt **ngoài** đúng một điểm màu ở trên: dừng, báo người dùng.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder/components/session-tabs.tsx
git commit -m "refactor(web): draw the team builder tabs through SessionLabel

The tab was the last screen restating the icon, and the only one that left
the Guild War label uncoloured until its tab was selected. It is coloured
now, which is the convention the other three already followed. The lock and
the unsaved-changes dot stay here as children: they are this screen's state,
not part of what a battle looks like."
```

---

### Task 7: Ghi quy ước vào `frontend.md`

`frontend.md` §6 nói thẳng: "**Extend this section when you add a convention.**" Task này làm đúng thế,
và cập nhật danh sách building block ở §5.

**Files:**
- Modify: `apps/web/docs/frontend.md` §5, §6

- [x] **Bước 1: Thêm `session-label` vào danh sách building block ở §5**

Trong đoạn "Current shared building blocks: …", chèn `session-label` đúng thứ tự alphabet — giữa
`roster-filter-bar` và `site-header`. Đoạn đó thành:

```markdown
Current shared building blocks: `action-buttons`, `confirm-delete-dialog`, `date-range`,
`error-state`, `guild-class-filter-select`, `guild-class-icon`, `main-nav`, `mutation-dialog`,
`mutation-form`, `mutation-pending`, `page-size-select`, `password-input`, `query-boundary`,
`roster-filter-bar`, `session-label`, `site-header`, `status-badge`, `status-icon`,
`table-pagination`, `table-pagination-bar`, `table-skeleton`.
```

- [x] **Bước 2: Thêm mục quy ước vào §6**

Chèn ngay **sau** mục "### Guild class → an icon with a tooltip" và **trước** "### Actions":

```markdown
### A battle → the swords icon and the primary colour

Four screens show a battle by name, and all four recognise the Guild War the same way:
`components/shared/session-label.tsx` is where that is written.

- `SessionLabel` is **one inline row** — the `Swords` icon when `isGuildWar`, `text-primary`, the
  backend-built `label`, in that order. `size` is `"sm"` (`size-3.5`, a narrow cell: the attendance
  column head, a team builder tab) or `"md"` (`size-4`, a list row: the week timeline, the settings
  schedule). Two named values, not a free `className` — a third size means adding a value here, not
  a class at the call site.
- `SessionDeadline` is the whole `Hạn chót: …` line, wrapper class included. Only the week timeline
  and the settings row show it.
- `sessionTintClass(isGuildWar)` returns `border-primary/40 bg-primary/5` for the Guild War, to be
  merged into whatever frame the screen already draws.

What the module deliberately does **not** hold: the frame, the spacing, and the subtitle. The four
screens stack a battle four different ways, so the subtitle stays with each of them and keeps its own
typography; the text itself is shared through `getSessionSubtitle`
(`features/attendance/lib/session-subtitle.ts`), which is attendance domain logic and stays there.

Marks that belong to **one** screen go through `children`, rendered after the label in the same row:
the settings row's "Guild War" badge, the team builder tab's lock icon and unsaved-changes dot.

`label` is built by the API (`architecture.md` §5 — never stored). Never assemble a battle's name on
the frontend.
```

- [x] **Bước 3: Ghi component test thứ hai vào §8**

Trong §8, thay câu

```
Component tests are the exception, not the rule: the one that exists
covers `components/shared/mutation-dialog.tsx`, because the five write rules it holds have no pure
function to test them through.
```

bằng

```
Component tests are the exception, not the rule: the two that exist cover
`components/shared/mutation-dialog.tsx`, because the five write rules it holds have no pure function
to test them through, and `components/shared/session-label.tsx`, because a convention about which
icon and which colour appear can only be checked by rendering it.
```

- [x] **Bước 4: Kiểm tra**

```bash
cd /home/huykirito1201/personal/guild-manager
grep -n "session-label" apps/web/docs/frontend.md
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: `grep` ra 3 dòng (§5, §6, §8); ba lệnh còn lại PASS.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/docs/frontend.md
git commit -m "docs(web): write down the battle identity convention

Section 6 asks to be extended when a convention is added, and this one now
has a module to point at. Records what the module holds and, just as much,
what it refuses to hold: the frame, the spacing and the subtitle."
```

---

## Kết thúc

- [x] **Bước 1: Suite đầy đủ trên nhánh sạch**

```bash
cd /home/huykirito1201/personal/guild-manager
git status --short
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Kết quả mong đợi: working tree sạch, cả bốn lệnh PASS.

- [x] **Bước 2: Đối chiếu kết quả với spec**

```bash
grep -rn "Swords" apps/web/features --include="*.tsx"
grep -rn "border-primary/40" apps/web --include="*.tsx" | grep -v node_modules
grep -rn "Hạn chót:" apps/web --include="*.tsx" | grep -v node_modules
```

Kết quả mong đợi:
- `Swords` chỉ còn ở `features/settings/components/settings-tabs.tsx` (icon của tab, không liên quan)
  — bốn màn đã sạch.
- `border-primary/40` chỉ còn ở `components/shared/session-label.tsx`.
- `Hạn chót:` chỉ còn ở `components/shared/session-label.tsx`.

Nếu còn sót ở `features/`: task tương ứng chưa xong.

- [x] **Bước 3: Báo người dùng**

Tóm tắt: module mới, 8 ca test, bốn màn đã chuyển, và **một** thay đổi giao diện có chủ ý (nhãn Guild
War ở tab xếp team giờ luôn màu primary). Nhánh `refactor/w6-session-label`, 7 commit, chưa push.
