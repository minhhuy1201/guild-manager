# W6 — Quy ước "trận Guild War trông thế nào" thành một module

Ngày: 2026-08-21 · Phạm vi: `apps/web`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **sau** [W1](./2026-08-21-w1-mutation-dialog-design.md) — W1 dựng hạ tầng test render, và
module này là ứng viên đầu tiên đáng render-test.

## Bối cảnh

Cùng một bộ quy ước nhận diện trận xuất hiện ở bốn cây JSX:

| Màn | Vị trí |
|---|---|
| Điểm danh — dòng thời gian tuần | `features/attendance/components/week-timeline.tsx:86-102` |
| Thiết lập — hàng lịch | `features/settings/components/session-row.tsx:38-57` |
| Điểm danh — đầu cột lưới | `features/attendance/components/attendance-grid.tsx:175-191` |
| Xếp team — tab ngày | `features/team-builder/components/session-tabs.tsx:77-92` |

Bộ quy ước gồm: icon `Swords` khi `isGuildWar`, chữ `text-primary`, viền/nền
`border-primary/40 bg-primary/5`, `label` do backend dựng, dòng phụ qua `getSessionSubtitle`, và
dòng `Hạn chót: {formatDateTime(deadline)}`.

`session.isGuildWar &&` xuất hiện **9 lần** trong `features/*/components/`.

Phần *chữ* đã được gom đúng: `getSessionSubtitle` sống ở `features/attendance/lib/`, có test, và
được ba màn dùng qua `index.ts` của feature. Phần *nhận diện* thì chưa — và đã lệch:
`attendance-grid.tsx` dùng `size-3.5` cho icon, hai chỗ kia dùng `size-4`.

`frontend.md` §6 nói quy ước hiển thị (icon trạng thái, nút hành động, khung bảng) phải sống trong
`components/shared/`. Quy ước này chưa.

## Quyết định thiết kế

### 1. `SessionLabel` — nhận diện, không phải layout

```tsx
// components/shared/session-label.tsx

export interface SessionLabelProps {
  /** Trận cần hiển thị; chỉ đọc label và isGuildWar */
  session: Pick<BattleSession, "label" | "isGuildWar">;
  /** Cỡ icon và chữ: "sm" cho ô hẹp (đầu cột lưới), "md" cho danh sách */
  size?: "sm" | "md";
  /** Hiện dòng phụ (đối thủ / ghi chú) bên dưới nhãn */
  subtitle?: ReactNode;
}
```

Module giữ: chọn icon, màu chữ, cỡ icon theo `size`, và thứ tự icon–nhãn. Nó **không** giữ khung
ngoài (viền, nền, khoảng cách) — mỗi màn có layout riêng và ép chung là làm hỏng cả bốn.

`size` là hai giá trị cố định chứ không phải một prop `className` tự do: đó là điểm khác biệt giữa
một module có quy ước và một `div` có thêm chỗ để lệch. `size-3.5` của `attendance-grid` trở thành
`size="sm"` — khác biệt được **đặt tên** thay vì trôi nổi.

### 2. `SessionDeadline` tách riêng

```tsx
/** Dòng "Hạn chót: …" của một trận. */
export function SessionDeadline({ session }: { session: Pick<BattleSession, "deadline"> }): ReactNode;
```

Chỉ ba trong bốn màn hiện dòng này, nên tách khỏi `SessionLabel` thay vì thêm một prop bật/tắt.

### 3. Tint để lại cho caller, dưới dạng một hàm

`border-primary/40 bg-primary/5` là thuộc tính của **khung**, không phải của nhãn. Nhưng nó vẫn là
quy ước chung, nên:

```ts
/** Class khung cho một trận: Guild War được tô nhạt để nổi trong danh sách. */
export function sessionTintClass(isGuildWar: boolean): string;
```

Caller ghép vào `className` của khung riêng của mình. Cách này giữ được quy ước ở một chỗ mà không
ép bốn màn dùng chung một khung.

### 4. Không kéo `getSessionSubtitle` sang `components/shared/`

Nó là logic domain của điểm danh, đã có chỗ và có test. `SessionLabel` nhận `subtitle` như một
`ReactNode` — không biết nó được dựng thế nào.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `components/shared/session-label.tsx` (mới) | `SessionLabel`, `SessionDeadline`, `sessionTintClass` |
| `features/attendance/components/week-timeline.tsx:86-102` | dùng cả ba |
| `features/settings/components/session-row.tsx:38-57` | dùng cả ba |
| `features/attendance/components/attendance-grid.tsx:175-191` | `SessionLabel size="sm"` |
| `features/team-builder/components/session-tabs.tsx:77-92` | `SessionLabel` + giữ `Lock` và chấm dirty riêng |

`session-tabs` có thêm hai thứ không màn nào khác có: icon `Lock` khi trận đã khoá, và chấm báo có
chỉnh sửa chưa lưu. Cả hai **ở lại** trong component đó — chúng là trạng thái của màn xếp team, không
phải nhận diện trận.

## Edge case

- **`label` do backend dựng** (`formatSessionLabel`, `architecture.md` §5: *"never stored"*). Module
  chỉ hiển thị, không tự dựng nhãn — nếu có chỗ nào đang tự ghép chuỗi ngày giờ thì đó là lỗi riêng,
  ghi lại chứ đừng nhét vào spec này.
- **Trận scrim có `opponent`** hiện ở dòng phụ qua `getSessionSubtitle`; Guild War không có đối thủ
  (`battle-sessions.service.ts:186-188` chặn). `subtitle` là `ReactNode` nên `undefined` là hợp lệ.
- **Cỡ chữ khác nhau giữa bốn màn** ngoài icon: kiểm từng chỗ trước khi gộp. Nếu một màn thật sự cần
  cỡ thứ ba, thêm giá trị vào `size` — đừng mở prop `className`.
- **Chế độ tối / theme**: `text-primary` và `bg-primary/5` là token Tailwind của app, không phải màu
  cứng. Giữ nguyên token, không đổi sang hex.

## Kiểm thử

Cần hạ tầng render từ [W1](./2026-08-21-w1-mutation-dialog-design.md):

- `isGuildWar: true` → có icon, có `text-primary`
- `isGuildWar: false` → không icon
- `size="sm"` vs `size="md"` → khác class cỡ icon (khoá lại đúng chỗ đã lệch)
- `sessionTintClass(true/false)` là hàm thuần → test được ngay, không cần render

Nếu W1 chưa làm, phần hàm thuần (`sessionTintClass`) vẫn test được; phần render đợi.

## Rủi ro

- **Gộp visual dễ đổi giao diện ngoài ý muốn.** Đây là spec chạm nhiều pixel nhất trong đợt. Làm
  từng màn một và so bằng mắt sau mỗi màn; `attendance-grid` sẽ **thay đổi thật** (icon từ `3.5`
  thành `sm` — quyết định xem `sm` bằng `3.5` hay bằng `4`, rồi ghi vào commit message).
- **Giá trị thấp hơn các spec khác.** Đây là lý do nó xếp cuối: nó dọn trùng lặp hiển thị, không vá
  lỗi nào và không mở ra test nào mới ngoài chính nó.

## Ngoài phạm vi

- Gom khung/layout của bốn màn (đã loại ở §1, §3).
- Đưa `getSessionSubtitle` ra khỏi `features/attendance` (đã loại ở §4).
