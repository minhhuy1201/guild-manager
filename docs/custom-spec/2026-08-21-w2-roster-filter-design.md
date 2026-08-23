# W2 — Một vị từ lọc roster, thay cho ba bản đã phân kỳ

Ngày: 2026-08-21 · Phạm vi: `apps/web`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Độc lập với [W3](./2026-08-21-w3-query-group-design.md); làm sau W3 vì W3 rẻ hơn và chạm cùng ba màn.

Spec này **sửa một lỗi người dùng gặp được**, không chỉ dọn kiến trúc.

## Bối cảnh

Cùng một khái niệm — "lọc danh sách nhân vật theo từ khoá và lưu phái" — tồn tại ở ba nơi, và đã
phân kỳ thành sai.

**Bản 1** — điểm danh, không có test:

```ts
// features/attendance/hooks/use-attendance.ts:80-92
const keyword = search.trim().toLowerCase();
return (characters ?? []).filter((character) => {
  const matchKeyword =
    keyword === "" ||
    character.name.toLowerCase().includes(keyword) ||
    character.id.toLowerCase().includes(keyword);
  const matchClass =
    guildClasses.length === 0 || guildClasses.includes(character.guildClass);
  return matchKeyword && matchClass;
});
```

**Bản 2** — xếp team, có test (`lib/__tests__/pool.test.ts`):

```ts
// features/team-builder/lib/pool.ts:40-58
if (assignedIds.has(character.id)) return false;
if (filter.guildClasses.length > 0 && !filter.guildClasses.includes(character.guildClass)) return false;
if (keyword.length === 0) return true;
return (
  character.name.toLowerCase().includes(keyword) ||
  character.id.toLowerCase().includes(keyword)
);
```

**Bản 3** — quản lý thành viên, **thiếu vế `id`**, không có test:

```ts
// features/members/components/members-panel.tsx:44-52
const members = allMembers.filter((member) => {
  if (guildClasses.length > 0 && !guildClasses.includes(member.guildClass)) {
    return false;
  }
  return member.name.toLowerCase().includes(normalized);   // ← chỉ tìm theo tên
});
```

Doc comment của chính component (`:32`) viết *"Bảng quản lý thành viên: tìm theo tên, lọc lưu phái"*
— tức tác giả biết, nhưng ô nhập ở hai màn kia hứa *"Tên thành viên hoặc ID…"*. Người dùng gõ ID ở
màn Quản lý thành viên thì **không ra gì**, còn gõ đúng ID đó ở màn Điểm danh thì ra.

Kèm theo, ba cách giữ state cho cùng một bộ lọc:

| Màn | State | Bằng chứng |
|---|---|---|
| Điểm danh | Zustand **có scope** | `attendance/store/attendance-filter-store.ts` (51 dòng) |
| Xếp team | Zustand **không scope** | `team-builder/store/pool-filter-store.ts` (22 dòng) |
| Thành viên | `useState` | `members-panel.tsx:38-39` |

và hai cây JSX gần trùng: `attendance-filters.tsx:106-132` với `pool-filters.tsx:155-179` — cùng
icon `Search`, cùng `pl-9`, cùng `GuildClassFilterSelect`.

## Quyết định thiết kế

### 1. Vị từ thuần, một chỗ

```ts
// lib/roster-filter.ts

/** Bộ lọc danh sách nhân vật: từ khoá và lưu phái. */
export interface RosterFilter {
  /** Từ khoá thô người dùng gõ; hàm tự chuẩn hoá */
  search: string;
  /** Lưu phái được chọn; rỗng = không lọc theo lưu phái */
  guildClasses: GuildClass[];
}

/**
 * Nhân vật này có khớp bộ lọc không.
 * Từ khoá khớp khi nằm trong TÊN hoặc ID; cả hai vế đều chuẩn hoá chữ thường
 * trước khi so, vì người dùng gõ tuỳ hoa thường.
 * @param character - Nhân vật cần xét (chỉ cần id, name, guildClass)
 * @param filter - Bộ lọc đang áp
 * @returns true khi nhân vật lọt qua cả hai vế
 */
export function matchesRosterFilter(
  character: Pick<Character, "id" | "name" | "guildClass">,
  filter: RosterFilter,
): boolean;
```

Đặt ở `lib/` cấp app, không phải trong một feature: ba feature dùng, và không feature nào sở hữu
khái niệm này. `Character` lấy từ `@guild/shared/schemas`; `Pick<>` để `PoolCandidate` của
team-builder cũng truyền vào được.

**Không** đưa sang `packages/shared`: đây là lọc phía client, backend không lọc gì cả. Luật của
`packages/shared` là "shape đi qua mạng", không phải "code dùng chung bất kỳ".

### 2. `selectPoolCharacters` co lại còn phần riêng của nó

```ts
export function selectPoolCharacters<T extends PoolCandidate>(
  characters: T[], assignment: Assignment, filter: RosterFilter,
): T[] {
  const assignedIds = new Set(…);
  return characters.filter(
    (c) => !assignedIds.has(c.id) && matchesRosterFilter(c, filter),
  );
}
```

Phần riêng — "loại người đã được xếp" — ở lại; phần chung đi ra. Test hiện có của `pool.test.ts`
tách làm hai: ca lọc chuyển sang `roster-filter.test.ts`, ca "đã xếp thì không hiện" ở lại.

### 3. `RosterFilterBar` ở `components/shared/`

```tsx
export function RosterFilterBar({ value, onChange, idPrefix }: {
  value: RosterFilter;
  onChange: (next: RosterFilter) => void;
  /** Tiền tố cho id của input — ba màn có thể cùng hiện trên một trang */
  idPrefix: string;
}): ReactNode;
```

Interface nhận `value`/`onChange`, **không** biết state nằm ở đâu. Đó là điểm chính: Zustand có
scope, Zustand không scope hay `useState` đều chỉ là adapter ở phía caller. Spec này **không** ép ba
màn dùng chung một store — chúng có vòng đời khác nhau (bộ lọc điểm danh sống theo tab, bộ lọc xếp
team reset theo tuần) và gộp lại là làm hỏng cả ba.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `lib/roster-filter.ts` (mới) | `RosterFilter`, `matchesRosterFilter` |
| `lib/__tests__/roster-filter.test.ts` (mới) | bảng ca lọc |
| `components/shared/roster-filter-bar.tsx` (mới) | thanh lọc dùng chung |
| `features/attendance/hooks/use-attendance.ts:80-92` | `.filter((c) => matchesRosterFilter(c, filter))` |
| `features/team-builder/lib/pool.ts:40-58` | co lại như §2 |
| `features/members/components/members-panel.tsx:44-52` | dùng vị từ chung — **hành vi đổi: tìm được theo ID** |
| `features/members/components/members-panel.tsx:70` | placeholder `"Tên thành viên hoặc ID..."` — cùng lời hứa với hai màn kia |
| `features/attendance/components/attendance-filters.tsx:106-132` | dùng `RosterFilterBar` |
| `features/team-builder/components/pool-filters.tsx:155-179` | như trên |
| `features/team-builder/lib/__tests__/pool.test.ts` | tách ca lọc sang file mới |

`PoolFilter` trong `team-builder/lib/pool.ts` và `RosterFilter` cùng shape → gộp về `RosterFilter`,
bỏ kiểu trùng.

## Edge case

- **Từ khoá chỉ có khoảng trắng**: `.trim()` cho chuỗi rỗng → không lọc. Cả ba bản hiện tại đều làm
  vậy; khoá lại bằng test.
- **Chuẩn hoá hai phía.** Cả từ khoá lẫn `name`/`id` đều `.toLowerCase()`. Không dùng
  `localeCompare`/`normalize("NFD")` để bỏ dấu tiếng Việt — hiện không bản nào làm, và thêm vào là
  đổi hành vi ngoài phạm vi spec. Ghi lại như câu hỏi riêng.
- **Id có dạng slug tiếng Việt không dấu** (`meo-beo-k7ma3x`, `architecture.md` §5) — nên tìm theo
  ID thực tế hữu ích khi hai người trùng tên. Đây là lý do bản 3 thiếu vế `id` là lỗi chứ không phải
  lựa chọn.
- **`members-panel` dùng `normalized` cho cả `resetKey` phân trang** (`:56-58`) — giữ nguyên, vị từ
  mới không đụng tới phân trang.

## Kiểm thử

`roster-filter.test.ts`, bảng ca:

| Từ khoá | Lưu phái | Kỳ vọng |
|---|---|---|
| rỗng | rỗng | mọi nhân vật |
| khớp tên (khác hoa thường) | rỗng | khớp |
| khớp **id** | rỗng | khớp ← ca vá lỗi |
| không khớp gì | rỗng | loại |
| khớp tên | lưu phái khác | loại |
| chỉ khoảng trắng | rỗng | mọi nhân vật |

Thêm ở `pool.test.ts`: người đã xếp thì không hiện, kể cả khi khớp từ khoá.

## Rủi ro

- **Đổi hành vi màn Quản lý thành viên** (tìm thêm theo ID). Đó là mục đích; ghi vào commit message
  theo luật *"When behavior changes on purpose… the message says why"*, và sửa doc comment `:32`.
- **Gộp UI dễ kéo theo khác biệt bị mất.** So kỹ `attendance-filters` và `pool-filters` trước khi
  gộp — nếu một bên có nút/nhãn riêng thì để nó ở ngoài `RosterFilterBar`, đừng nhét prop vào.

## Ngoài phạm vi

- Gộp ba store bộ lọc (đã loại ở §3).
- Bỏ dấu tiếng Việt khi tìm (đã nói ở Edge case).
