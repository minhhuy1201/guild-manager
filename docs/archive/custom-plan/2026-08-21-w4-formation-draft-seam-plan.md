# W4 — Hạ `base` xuống dưới seam của draft đội hình · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** `base: MatchDraft[]` biến mất khỏi interface của `formationStore`, và `useFormationDraft`
trở thành người **duy nhất** ghi vào `drafts` — `useFormationPool` fill ngày trống qua một dây nối có
tên thay vì thò tay vào store.

**Kiến trúc:** store nhận đúng **một** action mới, `ensureDraft(sessionId, initial)` — "ngày này chưa
có nháp thì bắt đầu từ `initial`". Nó phục vụ cả hai ca: `useFormationDraft` gọi nó trước mỗi lần ghi
(với bản đã lưu), và `seedFrom` của cùng hook gọi nó khi pool đưa sang một đề xuất. `drop` và `setNote`
bỏ tham số `base` và chỉ ghi vào nháp đã có sẵn. `useFormationPool` nhận `seedFrom` như một tham số,
không còn import `setDraft`.

**Tech stack:** Next.js 16 (React 19), Zustand 5, TanStack Query 5, Vitest 4,
`@testing-library/react` + `jsdom` (đã có sẵn; `renderFormationHook` là helper chung của bốn test hook).

**Spec:** [`docs/custom-spec/2026-08-21-w4-formation-draft-seam-design.md`](../custom-spec/2026-08-21-w4-formation-draft-seam-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)
· tiền đề: [C4](../custom-spec/2026-08-18-c4-formation-screen-design.md)

**Phạm vi:** `apps/web/features/team-builder` — `store/`, `hooks/`, và một dòng trong
`apps/web/docs/frontend.md` §9. `apps/api`, `packages/shared` và **mọi component** đều **không đổi**.

## Tám điểm kế hoạch chốt khác spec

Task 1 sửa spec trước khi động vào code, vì mọi task sau đọc spec làm nguồn sự thật.

1. **Không component nào truyền `base` xuống, nên không component nào phải đổi.** Bảng "Thay đổi cụ
   thể" của spec có dòng `components/*` — "gọi `placeCharacter`/`writeNote` thay vì truyền `base`
   xuống". Grep cho thấy `base` chưa bao giờ ra tới component: `use-formation-draft.ts:165` và `:176`
   đã tự bơm `matches` vào rồi, và `team-builder-screen.tsx` chỉ truyền `screen.draft.setNote` /
   `screen.draft.applyDrop` đi tiếp. Rò `base` là rò giữa **hook và store**, không phải giữa hook và
   UI.

2. **Vì thế bộ sáu tên mới ở §1 không cần thiết.** `placeCharacter`, `writeNote`, `discard`… là đổi
   tên thuần: `applyDrop`, `setNote`, `resetActive` đã ở đúng mức trừu tượng ("theo ý nghĩa, không
   theo cơ chế") và không cái nào nhận `base`. Đổi tên chúng chạm `team-builder-screen.tsx`,
   `use-formation-dnd.ts`, `slot-note-input.tsx` và hai file test cho **không** thay đổi hành vi nào.
   Kế hoạch giữ nguyên tên và chỉ **thêm** `seedFrom` — đúng một khoá mới. Ngoài ra bộ sáu của spec
   còn thiếu `clearActiveDraft` (dọn sạch ô, giữ số trận) — nó khác `resetActive` (vứt nháp) và cả hai
   đều phải còn.

3. **`ensureDraft` và `seedFrom` là **một** primitive, không phải hai.** "Ghi bản đã lưu vào nếu ngày
   chưa có nháp" và "ghi đề xuất vào nếu ngày chưa có nháp" khác nhau đúng ở giá trị truyền vào. Store
   nhận một action; `seedFrom` của hook là một dòng gọi lại nó. Đó cũng là thứ làm `seedFrom` ổn định
   qua các lần render — điều kiện của spec §Edge case ("chỉ seed khi ngày **chưa** có nháp phải nằm
   trong `seedFrom`") được thoả bởi chính store, nên `seedFrom` không cần đọc `drafts` và không làm
   `useEffect` của pool chạy lại sau mỗi thao tác kéo thả.

4. **`setDraft` không thể "private" trong một Zustand store.** Spec §2 nói nó "không export ra ngoài
   module store". `useFormationStore` là **một** hook được export; mọi khoá của state đi cùng nó và
   không có cách nào che một khoá. Cái đạt được thật sự là: sau task 4 chỉ còn **một** người gọi
   (`useFormationDraft`), và doc comment nói thẳng điều đó. Luật sống trong số người gọi, không trong
   kiểu — và task 4 có bước grep chứng minh.

5. **Một thay đổi hành vi spec không nhắc tới — và nó *không* vô hình (xem điểm 8).** Vì `ensureDraft`
   chạy **trước** mỗi lần ghi, một cú thả ra ngoài mọi vùng để lại một nháp **y hệt bản đã lưu**, chỗ
   trước đây không để lại nháp nào. `dirty` và banner điền sẵn đều so nội dung nên hai chỗ đó không
   thấy khác — nhưng ba chỗ khác thì có, nên điểm 8 hoàn lại hạt giống đó. Ở tầng store thì thay đổi
   là thật: **hai test đang khẳng định "không tạo nháp"** đổi thành "không đổi nháp", cùng commit, với
   lý do ghi trong message (`CLAUDE.md`: "Tests describe behavior… the message says why").

6. **`seedFrom` phải bọc `useCallback`.** Điểm 3 nói `seedFrom` ổn định qua các lần render; một hàm
   khai báo thẳng trong thân hook thì **không** — mỗi lần render là một tham chiếu mới, và
   `useEffect` của pool có `seedFrom` trong dependency nên nó chạy lại sau mọi lần render. Không sinh
   vòng lặp (`ensureDraft` trên ngày đã có nháp trả về đúng state cũ nên không render lại), nhưng nó
   không phải điều kế hoạch mô tả. `useCallback` với `[activeSessionId, ensureDraft]` — cả hai đều ổn
   định — làm lời hứa đó thành thật. Đây là hàm duy nhất của file được bọc, vì nó là hàm duy nhất
   được dùng làm dependency của một effect.

7. **`hasDraft` không được bỏ hẳn, chỉ đổi vai.** Task 4 bảo xoá nó vì điều kiện đã nằm trong
   `ensureDraft`. Đúng về mặt an toàn ghi, nhưng nó còn làm một việc thứ hai kế hoạch không thấy: nó
   là **biến duy nhất kích effect chạy lại**. Bấm "Hoàn tác" trên một ngày vốn trắng xoá nháp, và nếu
   effect không có gì trong dependency đổi theo thì đề xuất không bao giờ được điền lần hai — ca
   `"huỷ nháp là quay lại ngày trắng, nên đề xuất lại từ đầu và báo lại"` bắt được đúng chỗ này khi
   chạy. Nên nó ở lại dưới dạng `activeDraft` (giá trị nháp, không phải cờ), vừa là guard vừa là
   dependency; luật "không đè" vẫn nằm ở `ensureDraft`, `activeDraft` chỉ trả lời "khi nào mời lại".
   Kéo theo: ca test mới của pool đổi cách chứng minh — đưa hook một `seedFrom` rỗng và khẳng định
   `drafts` vẫn trống, thay vì đếm lời gọi trên một ngày đã có nháp (ngày đó giờ không gọi nữa).

8. **Hạt giống của một phép ghi không đổi gì phải được hoàn lại.** Điểm 5 gọi nháp-bằng-bản-đã-lưu là
   vô hình; nó không phải. Nháp ma đó (a) che lần refetch sau, vì `matchesBySession` ưu tiên `drafts`
   hơn `savedBySession`; (b) không bỏ được, vì "Đặt lại" là `disabled={!dirty}`
   (`components/formation-toolbar.tsx:72`) mà ngày vẫn sạch; (c) **chặn điền sẵn**, vì guard của pool
   ở điểm 7 là `!proposal || activeDraft` — một ngày trắng lỡ dính thao tác hụt sẽ không bao giờ được
   điền khi một ngày trước đó có đội hình về sau. Và không chỉ `target === null`: `applyDrop` trả đúng
   tham chiếu cũ cho cả pool→pool lẫn thả về đúng ô cũ. Nên `editActiveDraft` nhớ ngày đó vốn có nháp
   hay chưa, và nếu chưa mà nháp sau khi ghi vẫn đúng tham chiếu vừa gieo thì `clearDraft` — tham
   chiếu là đủ vì mọi phép ghi có tác dụng đều dựng mảng mới. Sau bước này màn hình **không có** thay
   đổi hành vi nào.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/w4-formation-draft-seam`. Không
  `git push`, không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Không đổi chữ ký public của bất kỳ component nào**, và không sửa file nào trong `components/`.
- **Text hiển thị là tiếng Việt; identifier, tên file, doc comment của code mới là tiếng Anh.** Tên
  `describe`/`it` của test trong repo này viết tiếng Việt — giữ đúng quy ước đó khi thêm ca mới.
- **Doc comment tiếng Anh cho mọi hàm/action mới**: mục đích, từng param, giá trị trả về.
- **`architecture.md` §4.2 là ràng buộc cứng: không bỏ dữ liệu server vào Zustand.** `ensureDraft`
  **nhận** bản đã lưu như một giá trị khởi đầu và ghi nó vào `drafts` — nháp là UI state kể từ giây đó.
  Store không được **giữ** thêm bất kỳ map `saved`/`base` nào bên cạnh.
- **`lib/assignment.ts` không đổi.** Luật "thả ra ngoài vùng thì `applyDrop` trả về đúng tham chiếu
  cũ" ở đó và task nào cũng phải giữ.
- **Immutable:** mọi `set` của store trả object mới (`{ ...state.drafts, [id]: … }`), không mutate.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`
  - chạy một file: `pnpm --filter web test -- <tên file>`

## Bản đồ file

**Sửa**

| File | Việc |
|---|---|
| `apps/web/features/team-builder/store/formation-store.ts` | thêm `ensureDraft`; `drop`/`setNote` bỏ `base`; doc comment của `setDraft` |
| `apps/web/features/team-builder/store/__tests__/formation-store.test.ts` | bỏ `base` khỏi mọi lời gọi; 2 ca đổi ý nghĩa; 3 ca mới |
| `apps/web/features/team-builder/hooks/use-formation-draft.ts` | `editActiveDraft` bơm `ensureDraft`; thêm `seedFrom` |
| `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts` | 4 ca mới |
| `apps/web/features/team-builder/hooks/use-formation-pool.ts` | nhận `seedFrom`; bỏ `setDraft`; `hasDraft` → `activeDraft` |
| `apps/web/features/team-builder/hooks/__tests__/use-formation-pool.test.ts` | truyền `seedFrom`; 1 ca mới |
| `apps/web/features/team-builder/hooks/use-formation-screen.ts` | truyền `draft.seedFrom` vào pool; sửa doc comment |
| `apps/web/docs/frontend.md` §9 | thêm một dòng anti-pattern |
| `docs/custom-spec/2026-08-21-w4-formation-draft-seam-design.md` | đồng bộ với thực tế (Task 1) |

**Không đụng tới:** toàn bộ `features/team-builder/components/`, `lib/assignment.ts`, `lib/prefill.ts`,
`lib/formation-diff.ts`, `hooks/use-formation-dnd.ts`, `hooks/use-session-selection.ts`,
`hooks/use-formation-week.ts`, `store/pool-filter-store.ts`, `packages/shared/*`, `apps/api/*`.

---

### Task 0: Nhánh làm việc

- [ ] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree sạch (trừ file kế hoạch này). Nếu bẩn: dừng, hỏi người
dùng.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/w4-formation-draft-seam
git rev-parse --abbrev-ref HEAD
```

- [ ] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: Đồng bộ spec với thực tế trước khi viết code

Tám điểm ở mục "Tám điểm kế hoạch chốt khác spec" đều là spec nói sai về code hiện tại hoặc bỏ sót một
hệ quả. Sửa **trước**. Điểm 6–8 lộ ra khi chạy, nên spec được sửa tiếp ở task tương ứng, không phải ở
đây.

**Files:**
- Modify: `docs/custom-spec/2026-08-21-w4-formation-draft-seam-design.md`

- [ ] **Bước 1: Xác nhận lại từng dữ kiện trước khi sửa**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web/features/team-builder
grep -rn "base" store/formation-store.ts | head
grep -rn "applyDrop\|setNote\|resetActive\|clearActiveDraft" components/
grep -rn "setDraft" hooks/ store/ | grep -v __tests__
```

Kết quả mong đợi, đúng từng dòng:
- `base` chỉ xuất hiện trong `store/formation-store.ts` (khai báo `drop`/`setNote`, doc comment, và
  hai dòng `?? base`) — **không** có ở `components/`.
- `components/team-builder-screen.tsx` truyền `screen.draft.setNote` (`:150`), `screen.draft.addMatch`
  (`:126`), `screen.draft.removeMatch` (`:127`), `screen.draft.resetActive` (`:138`),
  `screen.draft.clearActiveDraft` (`:144`); `applyDrop` đi qua `use-formation-screen.ts:62` vào
  `useFormationDnd`, không qua component nào.
- `setDraft` có **ba** người gọi ngoài store: `use-formation-draft.ts:185`, `:199`, `:211` và
  `use-formation-pool.ts:64,140`.

Nếu khác: dừng, báo người dùng — kế hoạch này dựng trên đúng ba dữ kiện đó.

- [ ] **Bước 2: Trong spec, thay nguyên §1 ("`useFormationDraft` là người duy nhất chạm store")**

Thay cả tiêu đề, khối code và đoạn văn dưới nó bằng:

````markdown
### 1. `useFormationDraft` là người duy nhất chạm store

Hook đã phơi ra thao tác **theo ý nghĩa** chứ không theo cơ chế — `applyDrop`, `setNote`, `addMatch`,
`removeMatch`, `clearActiveDraft`, `resetActive` — và **không** thao tác nào trong số đó nhận `base`:
`use-formation-draft.ts:165,176` tự bơm `matches` vào trước khi gọi store. Rò `base` là rò giữa hook
và store, không phải giữa hook và UI, nên không component nào phải đổi và không tên nào phải đổi.

Thứ còn thiếu là **một** thao tác: chỗ để pool nạp đề xuất vào một ngày chưa có nháp.

```ts
export interface FormationDraftState {
  // … 19 khoá hiện có, giữ nguyên tên …
  /** Nạp một đề xuất đội hình vào ngày chưa có nháp; ngày đã có thì không đụng */
  seedFrom: (proposal: MatchDraft[]) => void;
}
```

Không thao tác nào nhận `base`, `sessionId` hay `matchIndex` — hook đã biết ngày nào đang mở
(`activeSessionId`) và trận nào đang mở (`activeMatchIndex`), và nó đã cầm bản đã lưu để hợp nhất.
````

- [ ] **Bước 3: Trong spec, thay nguyên §2 ("Store thu hẹp interface")**

````markdown
### 2. Store thu hẹp interface

`drop` và `setNote` bỏ tham số `base` và chỉ ghi vào nháp **đã có sẵn**. Câu trả lời cho "chưa có nháp
thì bắt đầu từ đâu" đến từ đúng một chỗ: store nhận một action mới,

```ts
/** Ngày này chưa có nháp thì bắt đầu từ `initial`; đã có thì không đụng gì */
ensureDraft: (sessionId: string, initial: MatchDraft[]) => void;
```

và `useFormationDraft` gọi nó **một lần ngay trước** mỗi lần ghi, trong cùng một lần xử lý sự kiện —
`set` của Zustand là đồng bộ nên lần ghi thứ hai đọc được state vừa cập nhật. Store vẫn không **giữ**
dữ liệu server: bản đã lưu đi vào như một giá trị khởi đầu và từ giây đó nó là nháp, tức UI state,
đúng luật §4.2.

`ensureDraft` phục vụ luôn ca thứ hai: nạp đề xuất điền sẵn khác ca thứ nhất đúng ở giá trị truyền
vào. Vì thế store nhận **một** action mới chứ không phải hai đường, và `seedFrom` của hook là một dòng
gọi lại nó — nhờ vậy `seedFrom` ổn định qua các lần render và `useEffect` của pool không chạy lại sau
mỗi thao tác kéo thả.

`setDraft` **không** thể thành `private`: `useFormationStore` là một hook được export và mọi khoá của
state đi cùng nó. Cái đạt được là số người gọi rơi từ ba xuống một (`useFormationDraft`, cho
`addMatch`/`removeMatch`/`clearActiveDraft`), và doc comment `:21` đổi từ liệt kê người dùng thành
nêu luật: nó là của hook draft, không của ai khác.
````

- [ ] **Bước 4: Trong spec, thay bảng "Thay đổi cụ thể"**

Thay nguyên bảng và đoạn văn ngay dưới nó bằng:

```markdown
| File | Thay đổi |
|---|---|
| `store/formation-store.ts:25-45` | `drop`/`setNote` bỏ `base`; thêm `ensureDraft`; doc comment `setDraft` |
| `store/formation-store.ts:79, 96` | `?? base` → đọc thẳng `state.drafts[sessionId]`, không có thì thôi |
| `hooks/use-formation-draft.ts` | `editActiveDraft` bơm `ensureDraft` + `sessionId`; thêm `seedFrom` |
| `hooks/use-formation-pool.ts:64, 121, 137-143` | `setDraft` → tham số `seedFrom`; `hasDraft` → `activeDraft` (điểm 7) |
| `hooks/use-formation-screen.ts:39-40, 52-61` | truyền `draft.seedFrom` vào pool; comment cơ chế đổi thành dây nối có tên |

**Không component nào đổi**, và không thao tác nào của hook đổi tên: `base` chưa bao giờ ra khỏi
`use-formation-draft.ts`.

`FormationDraftState` hiện là **19 khoá** (`use-formation-draft.ts:31-74`) và sau spec là **20** —
`seedFrom`. Spec này nhắm vào *hằng số bị rò*, không nhắm vào số lượng khoá.
```

- [ ] **Bước 5: Trong spec, thay nguyên mục "Edge case"**

```markdown
## Edge case

- **Ngày chưa có nháp, người dùng gõ ghi chú đầu tiên** — chính ca mà `base` sinh ra để phục vụ.
  `ensureDraft` chạy trước `setNote` trong cùng một lần xử lý sự kiện.
- **Thao tác không đổi gì, trên ngày chưa có nháp** — `ensureDraft` chạy trước nên ngày đọng lại một
  nháp **y hệt bản đã lưu**. Nháp đó không vô hình (điểm 8), nên `editActiveDraft` hoàn lại nó và màn
  hình không đổi hành vi. Hai test của store đang khẳng định "không tạo nháp" vẫn phải đổi thành
  "không đổi nháp", cùng commit.
- **Đổi tuần** (`setWeek`, `:62-68`) xoá sạch `drafts`. Giữ nguyên; `seedFrom` sau đó gặp ngày trống
  là đúng.
- **Prefill chạy trong `useEffect`** — luật "không đè" chuyển từ caller vào `ensureDraft`, tức vào
  chính phép ghi. Pool vẫn đọc nháp, nhưng để trả lời câu khác: *khi nào* mời lại (điểm 7).
- **`applyDrop` trả cùng tham chiếu cho drop ngoài vùng** (`:83-84`) — luật đó ở `lib/assignment.ts`
  và không đổi.
```

- [ ] **Bước 6: Trong spec, thay nguyên mục "Kiểm thử"**

```markdown
## Kiểm thử

- `formation-store.test.ts`: mọi lời gọi `drop`/`setNote` bỏ `base` và có `ensureDraft` đứng trước.
  Hai ca "không tạo nháp" đổi thành "không đổi nháp". Ba ca mới: `ensureDraft` dựng nháp khi thiếu;
  `ensureDraft` không đè nháp đã có; `drop` khi chưa có nháp thì không ghi gì.
- `use-formation-draft.test.ts` mở rộng: `seedFrom` trên ngày chưa có nháp thì nạp; `seedFrom` trên
  ngày đã có nháp **không** ghi đè; `setNote` đầu tiên trên ngày chưa có nháp dựng nháp từ bản đã lưu
  (đội hình đã lưu còn nguyên); thả ra ngoài vùng thì ngày không dirty.
- `use-formation-pool.test.ts` giữ phần tính đề xuất và phần banner, nhận thêm `seedFrom`; thêm một ca
  khẳng định pool **không** tự ghi store — ngày đã có nháp thì `seedFrom` được gọi nhưng nháp không
  đổi.
```

- [ ] **Bước 7: Commit**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git add docs/custom-spec/2026-08-21-w4-formation-draft-seam-design.md \
        docs/custom-plan/2026-08-21-w4-formation-draft-seam-plan.md
git commit -m "docs: reconcile the w4 formation draft seam spec with the code

The spec asks components to stop passing base, but they never received it:
the leak is between the draft hook and the store, so no component and no
handler name has to change. It also splits ensureDraft and seedFrom into two
paths when they are the same primitive with a different starting value, calls
setDraft private in a store whose every key ships with the exported hook, and
misses the one behaviour that does change: a drop released outside every
droppable now leaves a draft equal to the saved copy. Adds the plan those
corrections are argued in."
```

---

### Task 2: Store — `ensureDraft` vào, `base` ra

Đây là task chạm luật nhiều nhất; làm trước và chốt bằng test của chính store.

**Files:**
- Modify: `apps/web/features/team-builder/store/formation-store.ts`
- Test: `apps/web/features/team-builder/store/__tests__/formation-store.test.ts`

**Interfaces:**
- Consumes: `applyDrop` (`../lib/assignment`), `DragSource`, `DropTarget`, `MatchDraft`
  (`../types/formation`) — không cái nào đổi.
- Produces (task 3 và 4 dựa vào đúng những chữ ký này):
  - `ensureDraft: (sessionId: string, initial: MatchDraft[]) => void`
  - `setDraft: (sessionId: string, matches: MatchDraft[]) => void` — giữ nguyên
  - `clearDraft: (sessionId: string) => void` — giữ nguyên
  - `drop: (sessionId: string, matchIndex: number, source: DragSource, characterId: string, target: DropTarget) => void`
  - `setNote: (sessionId: string, matchIndex: number, slotId: string, text: string) => void`

- [ ] **Bước 1: Viết test đỏ — thay nguyên nội dung file test của store**

`apps/web/features/team-builder/store/__tests__/formation-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import type { Assignment, MatchDraft } from "../../types/formation";
import { useFormationStore } from "../formation-store";

const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/** Ngày một trận, dùng làm bản đã lưu trong hầu hết các test. */
const ONE_MATCH: MatchDraft[] = [{ assignment: SAVED, notes: {} }];

/**
 * Đặt nháp của một ngày vào đúng chỗ bản đã lưu, như hook draft làm trước mỗi
 * lần ghi.
 * @param sessionId - Ngày cần có nháp
 * @param initial - Bản đã lưu của ngày đó
 */
function openDraft(sessionId: string, initial: MatchDraft[] = ONE_MATCH) {
  useFormationStore.getState().ensureDraft(sessionId, initial);
}

describe("useFormationStore", () => {
  beforeEach(() => {
    useFormationStore.setState({
      drafts: {},
      activeSessionId: null,
      activeMatchIndex: 0,
      selectedWeekStart: null,
    });
  });

  describe("ensureDraft", () => {
    it("ngày chưa có nháp thì dựng nháp từ bản đã lưu", () => {
      openDraft("sat");

      expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
    });

    it("ngày đã có nháp thì không đè lên", () => {
      const edited: MatchDraft[] = [{ assignment: {}, notes: { x: "y" } }];
      useFormationStore.getState().setDraft("sat", edited);

      openDraft("sat");

      expect(useFormationStore.getState().drafts.sat).toBe(edited);
    });
  });

  it("kéo thả lần đầu thì sửa trên nháp vừa dựng từ bản đã lưu", () => {
    openDraft("sat");
    useFormationStore
      .getState()
      .drop("sat", 0, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    expect(useFormationStore.getState().drafts.sat).toEqual([
      {
        assignment: {
          "team-1-pos-1": "char-1",
          "team-1-pos-2": "char-9",
        },
        notes: {},
      },
    ]);
  });

  it("chưa có nháp thì drop không ghi gì — store không tự đoán bản đã lưu", () => {
    useFormationStore
      .getState()
      .drop("sat", 0, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("giữ nháp của từng ngày tách biệt nhau", () => {
    openDraft("sat");
    openDraft("thu");
    const { drop } = useFormationStore.getState();
    drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    drop("thu", 0, { kind: "pool" }, "char-8", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });

    const { drafts } = useFormationStore.getState();
    expect(drafts.sat[0].assignment["team-1-pos-2"]).toBe("char-9");
    expect(drafts.thu[0].assignment["team-1-pos-2"]).toBe("char-8");
  });

  it("chỉ sửa trận đang mở, trận kia giữ nguyên", () => {
    openDraft("sat", [
      { assignment: SAVED, notes: {} },
      { assignment: SAVED, notes: {} },
    ]);
    useFormationStore
      .getState()
      .drop("sat", 1, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    const matches = useFormationStore.getState().drafts.sat;
    expect(matches[0].assignment["team-1-pos-2"]).toBeNull();
    expect(matches[1].assignment["team-1-pos-2"]).toBe("char-9");
  });

  it("thả ra ngoài mọi vùng thì không đổi nháp", () => {
    openDraft("sat");
    useFormationStore
      .getState()
      .drop("sat", 0, { kind: "pool" }, "char-9", null);

    expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
  });

  it("clearDraft bỏ nháp để quay về bản đã lưu", () => {
    openDraft("sat");
    const { drop, clearDraft } = useFormationStore.getState();
    drop("sat", 0, { kind: "pool" }, "char-9", {
      kind: "slot",
      slotId: "team-1-pos-2",
    });
    clearDraft("sat");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("setDraft ghi thẳng một nháp (dùng cho thêm và xoá trận)", () => {
    useFormationStore.getState().setDraft("thu", ONE_MATCH);

    expect(useFormationStore.getState().drafts.thu).toEqual(ONE_MATCH);
  });

  it("đổi tuần thì bỏ hết nháp của tuần cũ", () => {
    const { setDraft, setWeek } = useFormationStore.getState();
    setDraft("sat", ONE_MATCH);
    setWeek("2026-07-13T00:00:00.000Z");

    const state = useFormationStore.getState();
    expect(state.drafts).toEqual({});
    expect(state.selectedWeekStart).toBe("2026-07-13T00:00:00.000Z");
  });

  it("đổi sang ngày khác thì quay về trận 1", () => {
    const { setActiveMatch, setActiveSession } = useFormationStore.getState();
    setActiveMatch(1);
    setActiveSession("thu");

    expect(useFormationStore.getState().activeMatchIndex).toBe(0);
  });

  describe("setNote", () => {
    it("ghi chú đầu tiên giữ nguyên đội hình của bản đã lưu", () => {
      openDraft("sat");
      useFormationStore
        .getState()
        .setNote("sat", 0, "team-1-pos-2", "chừa cho X");

      expect(useFormationStore.getState().drafts.sat).toEqual([
        { assignment: SAVED, notes: { "team-1-pos-2": "chừa cho X" } },
      ]);
    });

    it("xoá trắng ghi chú thì bỏ hẳn khoá", () => {
      openDraft("sat");
      const store = useFormationStore.getState();
      store.setNote("sat", 0, "team-1-pos-1", "giữ buồng");
      useFormationStore.getState().setNote("sat", 0, "team-1-pos-1", "  ");

      expect(useFormationStore.getState().drafts.sat[0].notes).toEqual({});
    });

    it("chỉ chạm đúng trận đang mở, không đụng trận kia", () => {
      openDraft("sat", [
        { assignment: SAVED, notes: { "team-1-pos-1": "giữ buồng" } },
        { assignment: SAVED, notes: { "team-1-pos-1": "vào sau" } },
      ]);

      useFormationStore.getState().setNote("sat", 1, "team-1-pos-1", "tank");

      const drafts = useFormationStore.getState().drafts.sat;
      expect(drafts[0].notes).toEqual({ "team-1-pos-1": "giữ buồng" });
      expect(drafts[1].notes).toEqual({ "team-1-pos-1": "tank" });
    });

    it("không đụng gì khi chỉ số trận nằm ngoài khoảng", () => {
      openDraft("sat");
      useFormationStore
        .getState()
        .setNote("sat", 5, "team-1-pos-1", "giữ buồng");

      expect(useFormationStore.getState().drafts.sat).toBe(ONE_MATCH);
    });

    it("kéo thả không xoá mất ghi chú đã gõ", () => {
      openDraft("sat");
      const store = useFormationStore.getState();
      store.setNote("sat", 0, "team-1-pos-2", "chừa cho X");
      useFormationStore
        .getState()
        .drop("sat", 0, { kind: "pool" }, "char-9", {
          kind: "slot",
          slotId: "team-1-pos-2",
        });

      const draft = useFormationStore.getState().drafts.sat[0];
      expect(draft.assignment["team-1-pos-2"]).toBe("char-9");
      expect(draft.notes).toEqual({ "team-1-pos-2": "chừa cho X" });
    });
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- formation-store
```

Kết quả mong đợi: FAIL — `ensureDraft is not a function`, cùng lỗi kiểu ở `drop`/`setNote` vì thiếu
tham số. Nếu PASS: file test chưa được lưu đúng chỗ; dừng.

- [ ] **Bước 3: Sửa `formation-store.ts` — khai báo interface**

Thay nguyên khối `interface FormationState` (`:6-46`) bằng:

```ts
interface FormationState {
  /** Unsaved edits per battle day, keyed by session id. Missing key = untouched. */
  drafts: Record<string, MatchDraft[]>;
  /** Battle day whose tab is open */
  activeSessionId: string | null;
  /** Sub-tab open inside the day: 0 = match 1, 1 = match 2 */
  activeMatchIndex: number;
  /** Monday of the week on screen; null means the open week */
  selectedWeekStart: string | null;
  /** Switch to another day's tab, always landing on match 1 */
  setActiveSession: (sessionId: string) => void;
  /** Switch to another match inside the open day */
  setActiveMatch: (index: number) => void;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /**
   * Start a day's draft from `initial`, or leave the draft it already has.
   * This is the only door the saved copy comes through, and it comes as a
   * starting value the caller already holds: the store never fetches it and
   * never keeps a second copy of it beside the draft.
   */
  ensureDraft: (sessionId: string, initial: MatchDraft[]) => void;
  /**
   * Replace a day's draft outright. `useFormationDraft` owns this — nothing
   * else may write `drafts` wholesale, or two hooks end up deciding what a
   * day contains.
   */
  setDraft: (sessionId: string, matches: MatchDraft[]) => void;
  /** Discard a day's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into one match of the day's draft */
  drop: (
    sessionId: string,
    matchIndex: number,
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
  /** Write the note of one slot in one match of the day's draft */
  setNote: (
    sessionId: string,
    matchIndex: number,
    slotId: string,
    text: string
  ) => void;
}
```

- [ ] **Bước 4: Sửa `formation-store.ts` — phần cài đặt**

Chèn `ensureDraft` ngay **trước** `setDraft` trong object trả về, và thay hai action `drop`/`setNote`.
Ba khối đó thành:

```ts
  ensureDraft: (sessionId, initial) =>
    set((state) =>
      state.drafts[sessionId]
        ? state
        : { drafts: { ...state.drafts, [sessionId]: initial } }
    ),
  setDraft: (sessionId, matches) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: matches } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[sessionId];
      return { drafts: next };
    }),
  drop: (sessionId, matchIndex, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId];
      const match = current?.[matchIndex];
      // No draft means the caller skipped `ensureDraft`; there is nothing here
      // to edit, and guessing the saved copy is exactly what this store must
      // not do.
      if (!current || !match) return state;

      const next = applyDrop(match.assignment, source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === match.assignment) return state;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, assignment: next } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
  setNote: (sessionId, matchIndex, slotId, text) =>
    set((state) => {
      const current = state.drafts[sessionId];
      const match = current?.[matchIndex];
      if (!current || !match) return state;

      const notes = { ...match.notes };
      // A slot cleared back to blank loses its key, the same way an empty slot
      // carries no key in the assignment. The raw text is kept otherwise, so
      // typing a space mid-sentence is not swallowed.
      if (text.trim() === "") delete notes[slotId];
      else notes[slotId] = text;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, notes } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
```

Doc comment của `useFormationStore` (`:48-53`) **giữ nguyên nguyên văn** — nó vẫn đúng, và giờ đúng
hơn trước.

- [ ] **Bước 5: Chạy test của store**

```bash
pnpm --filter web test -- formation-store
```

Kết quả mong đợi: toàn bộ file PASS (16 ca). `typecheck` chưa chạy được sạch ở bước này vì
`use-formation-draft.ts` và `use-formation-pool.ts` còn gọi chữ ký cũ — đó là task 3 và 4.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder/store/formation-store.ts \
        apps/web/features/team-builder/store/__tests__/formation-store.test.ts
git commit -m "refactor(web): take the saved copy out of the formation store interface

drop and setNote each took a base array so they could build a draft for a day
that had none, which made every caller responsible for holding the right
saved copy of the right day at the right render. One ensureDraft action does
that job once, and the two writers now edit a draft that is already there.

Two store tests change on purpose: a drop released outside every droppable
used to leave no draft at all, and now leaves one equal to the saved copy,
because ensureDraft runs first. Nothing on screen reads that difference --
dirty compares content, not the existence of a draft."
```

---

### Task 3: `useFormationDraft` bơm bản đã lưu, và mọc `seedFrom`

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-draft.ts`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts`

**Interfaces:**
- Consumes: `ensureDraft`, `setDraft`, `clearDraft`, `drop`, `setNote` của store (Task 2).
- Produces (task 4 dựa vào): `FormationDraftState` giữ nguyên 19 khoá cũ, thêm
  `seedFrom: (proposal: MatchDraft[]) => void`.

- [ ] **Bước 1: Viết test đỏ — thêm một `describe` vào cuối file test của draft**

Chèn vào cuối `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts`:

```ts
describe("useFormationDraft — nạp đề xuất và nền của lần ghi đầu", () => {
  it("seedFrom nạp đề xuất vào ngày chưa có nháp", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([makeSession(SESSION_ID)], SESSION_ID, true, vi.fn())
    );

    act(() =>
      result.current.seedFrom([
        { assignment: { [SLOT]: "char-7" }, notes: { [SLOT]: "chép sang" } },
      ])
    );

    expect(result.current.assignment[SLOT]).toBe("char-7");
    expect(result.current.notes[SLOT]).toBe("chép sang");
  });

  it("seedFrom KHÔNG đè lên ngày người dùng đã sửa", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    act(() =>
      result.current.seedFrom([{ assignment: { [SLOT]: "char-7" }, notes: {} }])
    );

    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.notes[SLOT]).toBe("vào sau");
  });

  it("ghi chú đầu tiên dựng nháp từ bản đã lưu, không xoá đội hình đã lưu", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));

    expect(result.current.assignment[SLOT]).toBe("char-1");
    expect(result.current.notes[SLOT]).toBe("vào sau");
  });

  it("thả ra ngoài mọi vùng thì ngày vẫn không dirty", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    expect(result.current.dirty).toBe(false);
    expect(result.current.assignment[SLOT]).toBe("char-1");
  });

  it("thao tác không đổi gì thì không để lại nháp nào cho ngày chưa sửa", () => {
    const { result } = renderDraft();

    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    // Một nháp bằng y bản đã lưu sẽ che mất lần tải lại sau, và không có nút
    // nào bỏ được nó vì ngày vẫn sạch.
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });

  it("thao tác không đổi gì KHÔNG vứt mất nháp người dùng đang sửa dở", () => {
    const { result } = renderDraft();

    act(() => result.current.setNote(SLOT, "vào sau"));
    act(() =>
      result.current.applyDrop({ kind: "slot", slotId: SLOT }, "char-1", null)
    );

    expect(result.current.notes[SLOT]).toBe("vào sau");
    expect(result.current.dirty).toBe(true);
  });
});
```

Hai ca cuối là điểm 8; chúng cần `useFormationStore` trong import của file test.

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- use-formation-draft
```

Kết quả mong đợi: FAIL — `result.current.seedFrom is not a function` ở hai ca đầu, và lỗi kiểu ở
`drop`/`setNote` vì hook còn truyền `matches` cho store.

- [ ] **Bước 3: Sửa `use-formation-draft.ts` — khai báo `seedFrom` trong interface**

Chèn vào `FormationDraftState`, ngay **sau** `resetActive` (`:61`):

```ts
  /** Fill a day that has no draft yet with a proposed line-up */
  seedFrom: (proposal: MatchDraft[]) => void;
```

- [ ] **Bước 4: Sửa `use-formation-draft.ts` — selector và thân hook**

Trong khối selector (`:93-99`), chèn ngay sau dòng `const drafts = …`:

```ts
  const ensureDraft = useFormationStore((s) => s.ensureDraft);
```

Thay ba hàm `applyDrop`, `setNote` (`:152-177`) — và **chỉ** ba khối đó — bằng:

```ts
  /**
   * Run one edit against the open day, making sure the day has a draft to edit
   * first. This is the single place the saved copy turns into a draft: every
   * writer below goes through here, so no caller has to hold the saved copy or
   * know which day it belongs to.
   * @param write - The store call to run, given the open day's id
   */
  function editActiveDraft(write: (sessionId: string) => void) {
    if (!activeSessionId) return;

    const sessionId = activeSessionId;
    const readDraft = () => useFormationStore.getState().drafts[sessionId];
    const hadDraft = Boolean(readDraft());

    // Zustand's `set` is synchronous, so the write below already sees the draft
    // this line put in place.
    ensureDraft(sessionId, matches);
    write(sessionId);

    // The write changed nothing — a drag released outside every droppable, say.
    // Put the day back the way it was found: a draft equal to the saved copy
    // would shadow the next refetch, could not be discarded (Đặt lại is
    // disabled while the day is clean), and would block a prefill that only
    // becomes eligible later. Reference equality is the test because every
    // write that does change something builds a new array.
    if (!hadDraft && readDraft() === matches) clearDraft(sessionId);
  }

  /**
   * Hand one finished gesture to the store as a draft edit.
   * @param source - Where the drag started
   * @param characterId - Character being dragged
   * @param target - Where it was released, null when outside every droppable
   */
  function applyDrop(
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) {
    editActiveDraft((sessionId) =>
      drop(sessionId, activeMatchIndex, source, characterId, target)
    );
  }

  /**
   * Write the note of one slot in the match currently open.
   * @param slotId - Slot the note belongs to
   * @param text - New text, raw as typed
   */
  function setNote(slotId: string, text: string) {
    editActiveDraft((sessionId) =>
      setNoteInStore(sessionId, activeMatchIndex, slotId, text)
    );
  }

  /**
   * Fill the open day with a proposed line-up, but only while it has no draft
   * of its own — a proposal never overwrites something the user typed. The
   * pool computes the proposal and calls this; deciding whether it lands is
   * this hook's, because this hook owns the drafts.
   * @param proposal - Matches to start the day from
   */
  const seedFrom = useCallback(
    (proposal: MatchDraft[]) => {
      if (!activeSessionId) return;

      ensureDraft(activeSessionId, proposal);
    },
    [activeSessionId, ensureDraft]
  );
```

`seedFrom` là hàm duy nhất của file được bọc `useCallback`: pool giữ nó trong dependency của một
`useEffect`, nên một tham chiếu mới mỗi lần render sẽ làm effect đó chạy lại sau mọi thao tác. Nhớ
thêm `useCallback` vào import `react` ở đầu file.

- [ ] **Bước 5: Sửa `use-formation-draft.ts` — object trả về**

Trong khối `return { … }` (`:243-266`), chèn `seedFrom,` ngay sau `resetActive,`.

- [ ] **Bước 6: Cập nhật doc comment của hook**

Thay hai câu cuối của doc comment trên `useFormationDraft` (`:78-80`) — cụ thể là câu "The pool hook
writes the store too, but only to seed a day that has no draft yet." — bằng:

```
 * them, so the rules about what a draft edit means live in one file. It is the
 * only writer of `drafts`: the pool proposes a line-up for an empty day and
 * hands it here through `seedFrom`, rather than reaching into the store.
```

- [ ] **Bước 7: Chạy test**

```bash
pnpm --filter web test -- use-formation-draft
pnpm --filter web test -- formation-store
```

Kết quả mong đợi: cả hai file PASS. `typecheck` vẫn còn đỏ ở `use-formation-pool.ts` — task 4.

- [ ] **Bước 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder/hooks/use-formation-draft.ts \
        apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts
git commit -m "feat(web): make the draft hook the only writer of formation drafts

Every edit now runs through editActiveDraft, which puts the saved copy in
place before the store touches it, so the merge rule lives in one function
instead of at every call site. seedFrom is the door the pool will use for its
prefill: it lands only while the day has no draft, and that condition sits in
the write itself rather than in the caller."
```

---

### Task 4: `useFormationPool` gọi `seedFrom`, không gọi store

Task đóng seam. Sau nó, grep `setDraft` ngoài store chỉ còn `use-formation-draft.ts`.

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-pool.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-screen.ts`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-pool.test.ts`

**Interfaces:**
- Consumes: `seedFrom: (proposal: MatchDraft[]) => void` từ `FormationDraftState` (Task 3).
- Produces: `useFormationPool` nhận thêm **một tham số vị trí thứ 9**, `seedFrom`, đứng cuối cùng.
  `FormationPoolState` **không đổi**.

- [ ] **Bước 1: Sửa test — `renderPool` truyền `seedFrom`**

Trong `use-formation-pool.test.ts`, thêm `vi` vào import của vitest:

```ts
import { describe, expect, it, vi } from "vitest";
```

Thêm vào `interface PoolArgs`, sau `activeMatchIndex`:

```ts
  seedFrom: (proposal: MatchDraft[]) => void;
}
```

Chèn helper này ngay **trên** `DEFAULT_ARGS`:

```ts
/**
 * A `seedFrom` that behaves the way `useFormationDraft` implements it: the
 * proposal lands only while the battle under test has no draft. The contract
 * itself is pinned in `use-formation-draft.test.ts`; here it exists so the
 * banner cases can see a draft appear, and so a case can count the calls.
 * @returns A spy wrapping the seed
 */
function makeSeedFrom() {
  return vi.fn((proposal: MatchDraft[]) => {
    useFormationStore.getState().ensureDraft(SESSION_ID, proposal);
  });
}
```

`DEFAULT_ARGS` **không** nhận `seedFrom` (mỗi lần render cần một spy riêng), nên đổi kiểu của nó và
sửa `renderPool`:

```ts
/** Fixtures shared by most cases: the lone battle, nobody placed, all present. */
const DEFAULT_ARGS: Omit<PoolArgs, "seedFrom"> = {
  sessions: LONE_SESSION,
  activeSessionId: SESSION_ID,
  editable: true,
  records: ALL_PRESENT,
  assignment: {},
  matches: [{ assignment: {}, notes: {} }],
  activeMatchIndex: 0,
};

/**
 * Render `useFormationPool` over the default fixtures with a few fields changed.
 * Every argument object is built once here, before render, because the hook
 * seeds a draft in an effect — a fixture rebuilt per render would loop.
 * @param overrides - Arguments to change from the defaults
 * @param seed - Store state to put in place before the first render
 * @param seedFrom - Draft handler to hand the hook, defaulting to a real seed
 * @returns The testing-library render result plus the seedFrom spy it was given
 */
function renderPool(
  overrides: Partial<Omit<PoolArgs, "seedFrom">> = {},
  seed: Parameters<typeof renderFormationHook>[1] = {},
  seedFrom = makeSeedFrom()
) {
  const args = { ...DEFAULT_ARGS, ...overrides };

  const rendered = renderFormationHook(
    () =>
      useFormationPool(
        args.sessions,
        args.activeSessionId,
        args.editable,
        CHARACTERS,
        args.records,
        args.assignment,
        args.matches,
        args.activeMatchIndex,
        seedFrom
      ),
    seed
  );

  return { ...rendered, seedFrom };
}
```

- [ ] **Bước 2: Thêm ca mới vào cuối `describe("useFormationPool — prefill", …)`**

Chèn ngay sau ca `"ngày đã có nháp thì không đề xuất lại — xoá đề xuất là xoá hẳn"`:

```ts
  it("pool không tự ghi store: nó chỉ đưa đề xuất sang cho hook draft", () => {
    const inertSeed = vi.fn<(proposal: MatchDraft[]) => void>();

    renderPool({ sessions: SESSIONS_WITH_SOURCE }, {}, inertSeed);

    expect(inertSeed).toHaveBeenCalledOnce();
    expect(inertSeed.mock.calls[0][0][0].assignment[SLOT]).toBe("char-1");
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });
```

Một `seedFrom` rỗng chứng minh trực tiếp hơn: đề xuất vẫn được giao đủ mà `drafts` không hề có ngày
đó. Cách cũ — đếm lời gọi trên một ngày **đã có** nháp — không còn chạy được sau điểm 7, vì guard
`activeDraft` khiến ngày đó không gọi `seedFrom` nữa. Muốn vậy thì `renderPool` nhận `seedFrom` làm
tham số thứ ba, mặc định là `makeSeedFrom()`.

- [ ] **Bước 3: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- use-formation-pool
```

Kết quả mong đợi: FAIL — `useFormationPool` chưa nhận tham số thứ 9, nên `seedFrom` không bao giờ được
gọi và các ca prefill không thấy nháp nào.

- [ ] **Bước 4: Sửa `use-formation-pool.ts`**

Bỏ dòng `const setDraft = useFormationStore((state) => state.setDraft);` (`:64`). Dòng
`const drafts = useFormationStore((state) => state.drafts);` (`:63`) **giữ nguyên** — banner vẫn phải
đọc nháp; spec chỉ bỏ phép **ghi**.

Thêm tham số và cập nhật doc comment: thay hai dòng cuối của khối `@param`/`@returns` và chữ ký hàm
(`:48-60`) bằng:

```ts
 * @param activeMatchIndex - Which of those matches is open
 * @param seedFrom - Draft handler that fills a day having no draft of its own
 * @returns The filtered pool plus the marks the cards need
 */
export function useFormationPool(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  editable: boolean,
  characters: Character[],
  records: AttendanceRecordLike[],
  assignment: Assignment,
  matches: MatchDraft[],
  activeMatchIndex: number,
  seedFrom: (proposal: MatchDraft[]) => void
): FormationPoolState {
```

Đổi dòng `const hasDraft = Boolean(activeSessionId && drafts[activeSessionId]);` (`:121`) thành
`activeDraft` — giá trị nháp thay cho cờ. Nó **không** bị xoá: xem điểm 7.

Thay nguyên `useEffect` (`:137-143`) bằng:

```ts
  useEffect(() => {
    // Whether the proposal may land is `seedFrom`'s call, not this hook's.
    // `activeDraft` is read for the other half of the question — *when* to
    // offer again: discarding a draft empties the day, and that is the one
    // event after which an untouched day should be filled a second time.
    if (!proposal || activeDraft) return;
    // A fresh day starts with one match; match 2 is an explicit button press.
    seedFrom([{ assignment: proposal.assignment, notes: proposal.notes }]);
  }, [proposal, activeDraft, seedFrom]);
```

`activeDraft` là một dòng ngay trên `proposal` (điểm 7 giải thích vì sao nó không được bỏ hẳn):

```ts
  const activeDraft = activeSessionId ? drafts[activeSessionId] : undefined;
```

- [ ] **Bước 5: Sửa `use-formation-screen.ts`**

Thay ba câu cuối của doc comment (`:38-41`) — từ "which is one-way by design" đến hết — bằng:

```
 * (week → selection → draft → pool → dnd), which is one-way by design: no
 * branch returns data into an earlier one. The prefill is no exception: the
 * pool computes a proposal and hands it forward through `draft.seedFrom`,
 * which the draft branch alone decides what to do with.
```

Thêm `draft.seedFrom` làm đối số cuối của lời gọi `useFormationPool` (`:52-61`):

```ts
  const pool = useFormationPool(
    selection.sessions,
    selection.activeSessionId,
    selection.editable,
    week.characters,
    week.records,
    draft.assignment,
    draft.matches,
    draft.activeMatchIndex,
    draft.seedFrom
  );
```

- [ ] **Bước 6: Kiểm tra đầy đủ**

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: toàn bộ suite PASS, typecheck và lint sạch. Đây là lần đầu `typecheck` xanh kể từ
task 2 — nếu còn đỏ, đọc lỗi, đừng nới lỏng kiểu.

- [ ] **Bước 7: Chứng minh seam đã đóng**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web/features/team-builder
grep -rn "setDraft\|ensureDraft" hooks/ store/ --include="*.ts" | grep -v __tests__
```

Kết quả mong đợi, đúng những dòng này và không dòng nào khác:
- `store/formation-store.ts` — khai báo và cài đặt cả hai action.
- `hooks/use-formation-draft.ts` — selector `setDraft`, selector `ensureDraft`, ba lời gọi `setDraft`
  (`addMatch`, `removeMatch`, `clearActiveDraft`), hai lời gọi `ensureDraft` (`editActiveDraft`,
  `seedFrom`).

**Không được có dòng nào ở `use-formation-pool.ts`.** Nếu còn: bước 4 chưa xong.

- [ ] **Bước 8: Kiểm tay**

```bash
pnpm --filter web dev
```

Trang Xếp team, tuần hiện tại:

- Mở một ngày **chưa xếp gì** mà tuần đó đã có ngày trước có đội hình: banner "đã điền sẵn từ …" hiện
  ra và các ô đã được điền. Đúng như trước.
- Kéo một người sang ô khác trên ngày đó: banner **tắt**, nút Lưu bật.
- Bấm "Xoá hết": các ô trống, banner vẫn tắt, vẫn dirty.
- Bấm "Hoàn tác": quay về bản đã lưu, và nếu ngày đó vốn trắng thì banner **hiện lại** cùng đội hình
  điền sẵn.
- Gõ ghi chú đầu tiên vào một ô của một ngày **đã có đội hình lưu**: đội hình không bị xoá, chỉ ghi
  chú thay đổi, nút Lưu bật.
- Kéo một người rồi **thả ra ngoài khung** (ra vùng trống của trang): không có gì thay đổi, nút Lưu
  **vẫn tắt** nếu trước đó chưa sửa gì.
- Thêm trận 2, xoá trận 2, đổi tuần: y như cũ.

**Không được có khác biệt nào trông thấy được.** Nếu thấy: dừng, báo người dùng.

- [ ] **Bước 9: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder/hooks/use-formation-pool.ts \
        apps/web/features/team-builder/hooks/use-formation-screen.ts \
        apps/web/features/team-builder/hooks/__tests__/use-formation-pool.test.ts
git commit -m "refactor(web): let the pool hand its prefill to the draft hook

The pool used to reach into the store and write a draft that the draft hook
owns, which is why the screen hook carried a comment excusing it. It now
receives seedFrom and calls that, so the wiring runs forward like every other
branch and the excuse can go. The pool still reads drafts -- the prefill
banner has to know what the day currently shows."
```

---

### Task 5: Ghi luật vào `frontend.md` §9

Seam này là một anti-pattern có tên, và §9 là nơi các luật hay bị phá được ghi.

**Files:**
- Modify: `apps/web/docs/frontend.md` §9

- [ ] **Bước 1: Thêm một dòng vào bảng anti-pattern**

Chèn ngay **sau** dòng `| API data in a Zustand store | … |`:

```markdown
| Two hooks writing the same store slice | One hook owns the slice; the others hand it a value through that hook's handler |
```

- [ ] **Bước 2: Kiểm tra**

```bash
cd /home/huykirito1201/personal/guild-manager
grep -n "Two hooks writing" apps/web/docs/frontend.md
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: `grep` ra đúng một dòng; ba lệnh còn lại PASS.

- [ ] **Bước 3: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/docs/frontend.md
git commit -m "docs(web): name the two-writers store anti-pattern

The team builder had two hooks writing the same drafts slice, and the only
thing recording that was a comment excusing it. Section 9 is where rules that
get broken are written down, so it goes there."
```

---

## Kết thúc

- [ ] **Bước 1: Suite đầy đủ trên nhánh sạch**

```bash
cd /home/huykirito1201/personal/guild-manager
git status --short
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Kết quả mong đợi: working tree sạch, cả bốn lệnh PASS.

- [ ] **Bước 2: Đối chiếu kết quả với spec**

```bash
grep -rn "base" apps/web/features/team-builder/store/formation-store.ts
grep -rn "setDraft" apps/web/features/team-builder --include="*.ts" | grep -v __tests__
grep -rn "seedFrom" apps/web/features/team-builder --include="*.ts" | grep -v __tests__
```

Kết quả mong đợi:
- `base` **không còn dòng nào** trong `formation-store.ts`.
- `setDraft` chỉ còn ở `store/formation-store.ts` và `hooks/use-formation-draft.ts`.
- `seedFrom` có ở `use-formation-draft.ts` (khai báo, cài đặt, return), `use-formation-pool.ts` (tham
  số, effect) và `use-formation-screen.ts` (một đối số).

Nếu còn sót: task tương ứng chưa xong.

- [ ] **Bước 3: Báo người dùng**

Tóm tắt: `base` rời interface của store, `ensureDraft` thay nó, `useFormationDraft` là người ghi duy
nhất, pool nối qua `seedFrom`. **Không** thay đổi hành vi nào trên màn hình: hạt giống của một phép
ghi không đổi gì được `editActiveDraft` hoàn lại (điểm 8). Thay đổi nằm ở tầng store — hai test đổi
từ "không tạo nháp" sang "không đổi nháp", có lý do trong commit message. Nhánh
`refactor/w4-formation-draft-seam`, chưa push.
