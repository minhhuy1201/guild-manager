# W4 — Hạ `base` xuống dưới seam của draft đội hình

Ngày: 2026-08-21 · Phạm vi: `apps/web/features/team-builder`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Tiếp nối [C4](./2026-08-18-c4-formation-screen-design.md): C4 tách `useFormationScreen` thành năm
hook; spec này dọn nốt chỗ rò giữa hai trong số đó và store.

## Bối cảnh

`formationStore` giữ **chỉ** phần chỉnh sửa chưa lưu — đúng luật `architecture.md` §4.2 (*"Never put
an API response in Zustand"*), và doc comment của nó nói rõ điều đó:

```ts
// features/team-builder/store/formation-store.ts:45-51
/**
 * Draft state of the formation builder (Zustand).
 * Holds ONLY unsaved edits — the saved formations are server data and stay in
 * TanStack Query. Every rule about what a drop means lives in `lib/assignment.ts`;
 * this store adds none of its own.
 */
```

Nhưng vì không giữ được bản đã lưu, nó **đẩy hằng số "draft = saved + edits" ra interface** dưới
dạng một tham số:

```ts
// :25-43
/** Replace a day's draft outright — used by the prefill and by add/remove match */
setDraft: (sessionId: string, matches: MatchDraft[]) => void;
…
drop: (sessionId, matchIndex, base: MatchDraft[], source, characterId, target) => void;
/**
 * Write the note of one slot in one match.
 * Takes `base` for the same reason `drop` does: the day may have no draft yet,
 * and the first note typed has to build one from the saved copy.
 */
setNote: (sessionId, matchIndex, base: MatchDraft[], slotId, text) => void;
```

```ts
// :78, :95
const current = state.drafts[sessionId] ?? base;
```

Hai vấn đề nằm ngay trong đoạn trích:

**1. `base` là hằng số rò ra interface.** Người gọi phải cầm sẵn bản đã lưu và truyền đúng bản của
đúng ngày đó, ở đúng lần render đó. Truyền lệch một nhịp là ghi đè draft bằng dữ liệu cũ. Kiểu
`MatchDraft[]` không phân biệt được "bản đã lưu của ngày này" với "bản đã lưu của ngày khác".

**2. `setDraft` là setter thô, và ai được dùng nó thì ghi trong comment.** *"used by the prefill and
by add/remove match"* (`:21`) là một luật sống trong tiếng Anh, không trong kiểu. Hiện có **ba**
người ghi vào `drafts`:

| Người ghi | Bằng chứng |
|---|---|
| `useFormationDraft` | `:185`, `:199`, `:211` — tự dựng `MatchDraft[]` rồi `setDraft` |
| `formationStore` | `drop`, `setNote` |
| `useFormationPool` | `:137-143` — `useEffect` seed prefill bằng `setDraft` |

`useFormationPool` là chỗ đáng ngại nhất: một feature-hook khác reach vào store để ghi trạng thái mà
`useFormationDraft` sở hữu. `use-formation-screen.ts:39-40` phải ghi một comment giải thích việc đó
("the pool seeds an empty day's draft through the store") — dấu hiệu kinh điển của một seam thiếu
tên.

## Quyết định thiết kế

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
gọi lại nó. `seedFrom` là dependency của `useEffect` bên pool nên nó được bọc `useCallback` — chỉ
`activeSessionId` và `ensureDraft` làm dependency, cả hai đều ổn định, nên effect không chạy lại sau
mỗi thao tác kéo thả.

`setDraft` **không** thể thành `private`: `useFormationStore` là một hook được export và mọi khoá của
state đi cùng nó. Cái đạt được là số người gọi rơi từ ba xuống một (`useFormationDraft`, cho
`addMatch`/`removeMatch`/`clearActiveDraft`), và doc comment `:21` đổi từ liệt kê người dùng thành
nêu luật: nó là của hook draft, không của ai khác.

### 3. `useFormationPool` gọi `seedFrom`, không gọi store

`use-formation-pool.ts:137-143` đổi từ `setDraft(sessionId, matches)` thành `draft.seedFrom(matches)`.
Comment ở `use-formation-screen.ts:39-40` được thay bằng một dây nối có tên — nhưng **giữ lại** phần
comment nói *vì sao* prefill được phép ghi vào nháp, vì đó là lý do domain chứ không phải cơ chế.

### 4. Không gộp `useFormationPool` vào `useFormationDraft`

Chúng khác việc: pool tính đề xuất, draft giữ chỉnh sửa. C4 tách chúng ra có lý do và spec này không
đảo lại. Chỉ đổi **hướng** phụ thuộc: pool → draft, thay vì cả hai → store.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `store/formation-store.ts:25-45` | `drop`/`setNote` bỏ `base`; thêm `ensureDraft`; doc comment `setDraft` |
| `store/formation-store.ts:79, 96` | `?? base` → đọc thẳng `state.drafts[sessionId]`, không có thì thôi |
| `hooks/use-formation-draft.ts` | `editActiveDraft` bơm `ensureDraft` + `sessionId` và hoàn lại hạt giống khi phép ghi không đổi gì; thêm `seedFrom` |
| `hooks/use-formation-pool.ts:64, 121, 137-143` | `setDraft` → tham số `seedFrom`; `hasDraft` → `activeDraft`, chỉ còn là nhịp kích lại effect |
| `hooks/use-formation-screen.ts:39-40, 52-61` | truyền `draft.seedFrom` vào pool; comment cơ chế đổi thành dây nối có tên |
| `apps/web/docs/frontend.md` §9 | một dòng anti-pattern: hai hook cùng ghi một slice của store |

**Không component nào đổi**, và không thao tác nào của hook đổi tên: `base` chưa bao giờ ra khỏi
`use-formation-draft.ts`.

`FormationDraftState` hiện là **19 khoá** (`use-formation-draft.ts:31-74`) và sau spec là **20** —
`seedFrom`. Spec này nhắm vào *hằng số bị rò*, không nhắm vào số lượng khoá.

## Edge case

- **Ngày chưa có nháp, người dùng gõ ghi chú đầu tiên** — chính ca mà `base` sinh ra để phục vụ.
  `ensureDraft` chạy trước `setNote` trong cùng một lần xử lý sự kiện.
- **Thao tác không đổi gì, trên ngày chưa có nháp** — thả ra ngoài mọi vùng, kéo trong pool rồi thả
  lại vào pool, thả một người về đúng ô họ đang đứng. `applyDrop` trả đúng tham chiếu cũ cho cả ba, và
  vì `ensureDraft` chạy **trước** phép ghi, ngày sẽ đọng lại một nháp **y hệt bản đã lưu** ở chỗ trước
  đây không có nháp nào. Nháp đó **không** vô hình:
  - `matchesBySession` ưu tiên `drafts` hơn `savedBySession`, nên lần refetch sau của ngày đó không
    lên được màn hình nữa;
  - không nút nào bỏ được nó — "Đặt lại" là `disabled={!dirty}` và `isDayDirty` so nội dung nên ngày
    vẫn sạch;
  - nó **chặn điền sẵn**: guard của pool là `!proposal || activeDraft`, nên một ngày trắng lỡ dính
    thao tác hụt sẽ không bao giờ được điền khi một ngày trước đó có đội hình về sau.

  Vì vậy `editActiveDraft` **hoàn lại** hạt giống của chính nó khi phép ghi không đổi gì: nhớ ngày đó
  vốn có nháp hay chưa, và nếu chưa mà nháp sau khi ghi vẫn đúng tham chiếu vừa gieo thì `clearDraft`.
  So sánh bằng tham chiếu là đủ vì mọi phép ghi có tác dụng đều dựng mảng mới. Kết quả: **không có
  thay đổi hành vi nào nhìn thấy được** trên màn hình. Ở tầng store thì có: hai test đang khẳng định
  "không tạo nháp" đổi thành "không đổi nháp", vì store một mình không còn tự dựng nháp nữa.
- **Đổi tuần** (`setWeek`, `:62-68`) xoá sạch `drafts`. Giữ nguyên; `seedFrom` sau đó gặp ngày trống
  là đúng.
- **Prefill chạy trong `useEffect`** — điều kiện "chỉ seed khi ngày **chưa** có nháp" chuyển từ caller
  vào `ensureDraft` của store, tức là vào chính phép ghi: dù effect có gọi nhầm, store cũng không đè.
  Pool **vẫn** đọc nháp của ngày đang mở, nhưng để trả lời một câu khác — *khi nào* đề xuất lại. Bấm
  "Hoàn tác" xoá nháp, và đó là biến duy nhất báo cho effect biết ngày vừa trắng trở lại; bỏ nó khỏi
  dependency thì ngày vốn trắng không bao giờ được điền lần hai.
- **`applyDrop` trả cùng tham chiếu cho drop ngoài vùng** (`:83-84`) — luật đó ở `lib/assignment.ts`
  và không đổi.

## Kiểm thử

- `formation-store.test.ts`: mọi lời gọi `drop`/`setNote` bỏ `base` và có `ensureDraft` đứng trước.
  Hai ca "không tạo nháp" đổi thành "không đổi nháp". Ba ca mới: `ensureDraft` dựng nháp khi thiếu;
  `ensureDraft` không đè nháp đã có; `drop` khi chưa có nháp thì không ghi gì.
- `use-formation-draft.test.ts` mở rộng: `seedFrom` trên ngày chưa có nháp thì nạp; `seedFrom` trên
  ngày đã có nháp **không** ghi đè; `setNote` đầu tiên trên ngày chưa có nháp dựng nháp từ bản đã lưu
  (đội hình đã lưu còn nguyên); thả ra ngoài vùng thì ngày không dirty **và không đọng lại nháp nào**;
  cùng thao tác hụt đó **không** vứt mất nháp người dùng đang sửa dở.
- `use-formation-pool.test.ts` giữ phần tính đề xuất và phần banner, nhận thêm `seedFrom`; thêm một ca
  khẳng định pool **không** tự ghi store — đưa cho nó một `seedFrom` rỗng thì đề xuất vẫn được giao
  đủ nhưng `drafts` không hề có ngày đó.

## Rủi ro

- **Thứ tự effect.** Đây là phần dễ sai nhất: gom phép ghi lại có thể đổi thời điểm nháp được dựng.
  Chuyển từng thao tác một, chạy `pnpm --filter web test` sau mỗi thao tác.
- **Interface store đổi kéo theo hook.** Không component nào chạm tới, và TypeScript chỉ ra hết những
  chỗ còn lại; không có sai lặng.

## Ngoài phạm vi

- Gộp pool vào draft (đã loại ở §4).
- Thu nhỏ `FormationDraftState` từ 19 khoá — việc riêng, và chưa chắc đáng.
- Đưa nháp vào `sessionStorage` để không mất khi reload — chưa ai yêu cầu.
