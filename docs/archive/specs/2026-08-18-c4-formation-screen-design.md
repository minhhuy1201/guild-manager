# C4 — Cắt `useFormationScreen` thành năm module có tên

Ngày: 2026-08-18 · Phạm vi: `apps/web/features/team-builder`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Độc lập với C1/C2/C3, làm lúc nào cũng được.

Một hook 340 dòng trả về object **48 khoá** cho đúng một component. Spec này cắt nó theo mối quan
tâm, để mỗi phần có interface nhỏ và test được.

## Bối cảnh

`features/team-builder/hooks/use-formation-screen.ts` gom vào một hàm:

- 5 query/mutation: `useFormationWeeks`, `useFormations`, `useCharacters`, `useAttendanceRecords`,
  `useSaveFormation` (`:48-59`).
- 2 hook tổng hợp: `usePrefill` (`:168`), `useSessionPool` (`:176`).
- **11 lần gọi selector** Zustand (`:49-50`, `:61-69`).
- 9 module `lib/` gọi trực tiếp: `week-status`, `wire`, `formation-diff`, `active-session`,
  `session-status`, `session-pool`, `active-match`, `dnd-data`, `mock-formation`.
- 1 `useState` (`:71`), 8 `useMemo`, 4 handler.
- `return` một object **48 khoá** (`:262-339`).

Component tiêu thụ nó gọi đúng một hook — `const screen = useFormationScreen()`
(`team-builder-screen.tsx:33`) — rồi rải `screen.*` khắp cây JSX.

Đây là **shallow** theo đúng định nghĩa: *interface* (48 khoá phải học) phình gần bằng
*implementation*. To không đồng nghĩa với sâu.

Kèm theo, `lib/` có 12 module, **mỗi module đúng một caller ngoài file** — chính hook này. Chúng
được tách ra để test được chứ không phải vì nhiều nơi dùng. Bằng chứng rõ nhất:
`lib/assignment.ts` export `createEmptyAssignment` mà **không call site thật nào** trong toàn
`apps/web`, chỉ có test gọi.

Nghịch lý test: 12/12 module `lib/` có file test; hook nối tất cả lại — nơi bug thật sự trú — không
có test nào. Coverage đang bám theo *"có nằm trong `lib/` không"*, không phải *"có rủi ro không"*.

## Quyết định thiết kế

### 1. Năm module, cắt theo mối quan tâm

| Module (hook) | Sở hữu | `lib/` trở thành nội bộ của nó | Interface |
|---|---|---|---|
| `useFormationWeek` | tuần đang xem, quyền sửa tuần | `week-status` | 4 khoá |
| `useSessionSelection` | ngày đánh đang mở, quyền sửa ngày | `active-session`, `session-status` | 4 khoá |
| `useFormationDraft` | bản nháp, trận 1/trận 2, lưu/huỷ | `wire`, `formation-diff`, `active-match`, `mock-formation`, `assignment` (qua store) | 12 khoá |
| `useFormationPool` | danh sách người xếp được | `pool`, `session-pool`, `prefill` | 6 khoá |
| `useFormationDnd` | cử chỉ kéo thả | `dnd-data` | 3 khoá |

`useFormationScreen` vẫn còn, nhưng chỉ còn là **phép ghép**: gọi năm hook, trả về object **năm
khoá** lồng nhau.

```ts
export function useFormationScreen() {
  const week = useFormationWeek();
  const selection = useSessionSelection(week.weekStart, week.isEditableWeek);
  const draft = useFormationDraft(selection.sessions, selection.activeSessionId, selection.editable);
  const pool = useFormationPool(selection.activeSessionId, draft.matches, draft.activeMatchIndex);
  const dnd = useFormationDnd(selection.activeSessionId, draft, pool.charactersById);

  return { week, selection, draft, pool, dnd };
}
```

Người đọc component không còn phải học 48 cái tên phẳng; họ học năm nhóm và mở nhóm mình cần.

### 2. Component nhận **nhóm**, không nhận 48 prop lẻ

`team-builder-screen.tsx` truyền cả nhóm xuống component con thay vì bóc từng khoá:
`<MemberPool {...screen.pool} />`, `<FormationGrid {...screen.draft} />`. Việc component con cần gì
trở thành câu hỏi trả lời được bằng cách nhìn interface của nhóm.

### 3. `lib/` **không** đổi chỗ, chỉ đổi vai

12 module `lib/` giữ nguyên vị trí và giữ nguyên test. Cái đổi là chúng thôi làm *seam của feature*
và trở thành **internal seam** của một trong năm hook — private với phần còn lại, dùng bởi test của
chính hook đó.

Lý do không gộp chúng vào hook: chúng là hàm thuần, test rẻ, và bộ test hiện có là tài sản thật. Cái
sai không phải "tách ra `lib/`", mà là **không có gì test ở tầng nối chúng lại**.

### 4. Xoá export không có call site

`createEmptyAssignment` (`lib/assignment.ts`) không được ai gọi ngoài test → xoá khỏi export, hoặc
xoá hẳn nếu test viết lại được bằng `assign()`/literal. Một hàm chỉ tồn tại để test chính nó thì
đang test chính nó.

Rà thêm bằng `grep`: `findSlotOf`, `assign`, `unassign`, `swap` (`assignment.ts`) chỉ được gọi trong
chính file; `toWire`, `toWireNotes` (`wire.ts`) và `isDirty` (`formation-diff.ts`), `buildSlotId`
(`mock-formation.ts`) cũng vậy. Bỏ `export` của chúng và để test đi qua hàm public
(`applyDrop`, `toWireMatches`, `isDayDirty`, `createMockFormation`) — đó chính là nguyên tắc
*"interface là bề mặt test"*. Nếu một hàm không test được qua interface public thì hãy giữ export và
ghi lý do; đừng bỏ test.

### 5. Store giữ nguyên

`store/formation-store.ts` không đổi. Doc comment của nó (`:48-53`) đã tự đặt đúng ranh giới —
*"Mọi luật về một cú thả nằm ở `lib/assignment.ts`; store không thêm luật nào"* — và rà soát xác
nhận đúng. `useFormationDraft` là nơi duy nhất gọi selector của store, gom **11 lần gọi rải rác** về
một chỗ.

## Thay đổi cụ thể

```
features/team-builder/hooks/
├── use-formation-screen.ts      # còn ~20 dòng: ghép 5 hook
├── use-formation-week.ts        # mới
├── use-session-selection.ts     # mới
├── use-formation-draft.ts       # mới
├── use-formation-pool.ts        # mới (hấp thụ use-session-pool, use-prefill)
├── use-formation-dnd.ts         # mới
├── use-formations.ts            # giữ nguyên (query)
├── use-formation-weeks.ts       # giữ nguyên (query)
└── use-save-formation.ts        # giữ nguyên (mutation)
```

`use-session-pool.ts` và `use-prefill.ts` bị hấp thụ vào `use-formation-pool.ts` — chúng vốn đã là
hai mảnh của cùng một câu hỏi "ai xếp được vào trận này".

Phân bổ 48 khoá hiện tại:

- **week** — `weeks`, `weekStart`, `isEditableWeek`, `setWeek`
- **selection** — `sessions`, `activeSessionId`, `editable`, `setActiveSession`
- **draft** — `matches`, `matchCount`, `activeMatchIndex`, `assignment`, `notes`, `dirty`,
  `dirtySessionIds`, `canAddMatch`, `setActiveMatch`, `setNote`, `addMatch`, `removeMatch`,
  `clearActiveDraft`, `resetActive`, `handleSave`, `saving`, `saveErrorMessage`, `slotCount`
- **pool** — `pool`, `charactersById`, `absentIds`, `otherMatchIds`, `prefill`
- **dnd** — `activeCharacter`, `handleDragStart`, `handleDragEnd`, `cancelDrag`
- **status** (`isPending`, `isError`, `errorMessage`, `refetch`) — đặt vào `week`, vì cả ba query
  nguồn đều được khởi động từ nhánh tuần; component đọc `screen.week.isPending`.

## Edge case

- **Thứ tự hook và phụ thuộc vòng.** `useFormationDnd` cần `draft`, còn `draft` không cần `dnd` —
  chuỗi phụ thuộc là một chiều: `week → selection → draft → pool → dnd`. Giữ đúng chiều này, đừng để
  hook sau bơm dữ liệu ngược lên hook trước.
- **`EMPTY_MATCHES` và `FORMATION`** (`:30,36`) là hằng module dựng một lần để memo không chạy lại;
  chúng đi theo `useFormationDraft`. Đừng dựng lại trong thân hook.
- **`activeSessionId` có thể `null`.** Bốn handler hiện đang guard bằng `if (!activeSessionId)
  return`. Sau khi cắt, `useFormationDraft` nhận `activeSessionId: string | null` và giữ nguyên các
  guard — đừng đổi sang `""` cho tiện, `""` là một session id hợp lệ về mặt kiểu.
- **`useSessionPool` đang nhận `activeSessionId ?? ""`** (`:179`) — đúng kiểu lách vừa nói. Sửa
  luôn khi hấp thụ vào `useFormationPool`.
- **Số lần render.** 11 selector riêng lẻ là cố ý (tránh re-render thừa so với một `useFormationStore()`
  lấy cả store). Gom về `useFormationDraft` vẫn giữ nguyên kiểu selector-từng-field, chỉ đổi chỗ
  đứng.

## Kiểm thử

Đây là điểm chính của spec — sau khi cắt, mỗi hook mới **test được**, cái hook 340 dòng thì không.

`apps/web` hiện chạy Vitest ở môi trường **node**, không có jsdom, và không có test component nào
(`frontend.md` §8). Test hook cần render, nên spec này kéo theo một quyết định hạ tầng:

- Thêm `jsdom` + `@testing-library/react` vào `apps/web` devDependencies, và một
  `environmentMatchGlobs` (hoặc `// @vitest-environment jsdom` ở đầu file) để **chỉ** file test hook
  chạy jsdom; phần còn lại giữ node cho nhanh.
- Cập nhật `frontend.md` §8: từ "không có test component" thành "không có test component; có test
  hook".

Ưu tiên viết test, theo mức rủi ro:

1. `useFormationDraft` — thêm/xoá trận 2, `dirty` bật/tắt đúng lúc, `handleSave` xoá nháp khi thành
   công và **giữ** nháp khi thất bại, `409` kích hoạt refetch (`:246-260`). Đây là logic đắt nhất và
   hiện hoàn toàn không được phủ.
2. `useSessionSelection` — chọn ngày mặc định khi `storedActiveId` không còn trong danh sách.
3. `useFormationPool` — người đã báo nghỉ vẫn nằm trong `absentIds` chứ không bị tự gỡ.
4. `useFormationWeek`, `useFormationDnd` — mỏng, test sau cùng.

Test `lib/` hiện có giữ nguyên toàn bộ, trừ phần phải sửa vì §4 bỏ `export`.

## Rủi ro

- **Đây là refactor nhiều file, không đổi hành vi.** Không có test nào ở tầng hook để bắt lỗi lúc
  cắt, nên viết test cho `useFormationDraft` **trước**, rồi mới cắt — đó là phần duy nhất đủ phức tạp
  để cắt sai mà không ai biết.
- **Đừng cắt và đổi hành vi trong cùng một commit.** Cắt xong, chạy tay màn `/xep-team` (kéo thả,
  thêm trận 2, lưu, đổi tuần) rồi mới sửa gì khác.

## Ngoài phạm vi

- Bỏ `mock-formation.ts` để layout lưới đến từ server — layout hiện là dữ liệu tĩnh dựng một lần
  (`:30`), đổi nó là chuyện của domain, không phải của refactor này.
- Gộp `pool-filter-store` vào `formation-store` — hai store hiện tách đúng theo hai mối quan tâm.
- Test component (`team-builder-screen.tsx` và cây con) — sau khi có test hook thì phần còn lại chủ
  yếu là JSX.
