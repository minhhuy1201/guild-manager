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

Interface phơi ra thao tác **theo ý nghĩa**, không theo cơ chế:

```ts
export interface FormationDraftActions {
  /** Đặt một người vào ô, hoặc đổi chỗ hai người */
  placeCharacter: (source: DragSource, characterId: string, target: DropTarget) => void;
  /** Ghi chú của một ô */
  writeNote: (slotId: string, text: string) => void;
  /** Thêm trận 2 vào ngày đang mở */
  addMatch: () => void;
  /** Bỏ trận 2 */
  removeMatch: () => void;
  /** Nạp một đề xuất đội hình vào ngày chưa có nháp */
  seedFrom: (proposal: MatchDraft[]) => void;
  /** Bỏ nháp, quay về bản đã lưu */
  discard: () => void;
}
```

Không thao tác nào nhận `base`, `sessionId` hay `matchIndex` — hook đã biết ngày nào đang mở
(`activeSessionId`) và trận nào đang mở (`activeMatchIndex`), và nó đã cầm bản đã lưu để hợp nhất.

### 2. Store thu hẹp interface

`drop` và `setNote` bỏ tham số `base`. Chúng vẫn cần biết "chưa có nháp thì bắt đầu từ đâu", nhưng
câu trả lời đến từ một chỗ: hook gọi `ensureDraft(sessionId, saved)` một lần trước khi ghi, hoặc
truyền bản đã lưu vào store một lần khi ngày được mở. Chọn **cách một** — nó giữ store không biết gì
về server data, đúng luật §4.2.

`setDraft` chuyển thành `private` theo quy ước (không export ra ngoài module store, chỉ
`useFormationDraft` import), và comment `:21` liệt kê người dùng biến mất vì chỉ còn một người dùng.

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
| `store/formation-store.ts:25-43` | `drop`/`setNote` bỏ `base`; thêm `ensureDraft`; `setDraft` thôi export |
| `store/formation-store.ts:78, 95` | bỏ `?? base` |
| `hooks/use-formation-draft.ts` | thêm 6 thao tác §1; tự bơm `base`/`sessionId`/`matchIndex` |
| `hooks/use-formation-pool.ts:137-143` | `setDraft` → `draft.seedFrom` |
| `hooks/use-formation-screen.ts:39-40` | comment cơ chế bỏ, comment domain giữ |
| `components/*` | gọi `placeCharacter`/`writeNote` thay vì truyền `base` xuống |

`FormationDraftState` hiện là **22 khoá** (`use-formation-draft.ts:31-74`). Sau spec nó không nhỏ đi
nhiều — phần lớn là handler mà UI thật sự cần. Đó là chấp nhận được: spec này nhắm vào *hằng số bị
rò*, không nhắm vào số lượng khoá.

## Edge case

- **Ngày chưa có nháp, người dùng gõ ghi chú đầu tiên** — chính ca mà `base` sinh ra để phục vụ.
  `ensureDraft` phải chạy trước khi `setNote` ghi, trong cùng một lần xử lý sự kiện.
- **Đổi tuần** (`setWeek`, `:62-68`) xoá sạch `drafts`. Giữ nguyên; `seedFrom` sau đó gặp ngày trống
  là đúng.
- **Prefill chạy trong `useEffect`** — thứ tự giữa "server data về" và "seed" phải giữ nguyên, nếu
  không prefill ghi đè lên nháp người dùng vừa sửa. Điều kiện "chỉ seed khi ngày **chưa** có nháp"
  phải nằm trong `seedFrom`, không phải ở caller (hiện nó ở caller).
- **`applyDrop` trả cùng tham chiếu cho drop ngoài vùng** (`:83-84`) — luật đó ở `lib/assignment.ts`
  và không đổi.

## Kiểm thử

- `use-formation-draft.test.ts` đã có → mở rộng: `seedFrom` trên ngày đã có nháp **không** ghi đè;
  `writeNote` trên ngày chưa có nháp dựng nháp từ bản đã lưu; `discard` quay về bản đã lưu.
- Ca hiện khó test: seed prefill. Sau spec nó chạy qua `useFormationDraft` nên test được ở đó, không
  cần dựng `useEffect` của pool.
- `use-formation-pool.test.ts` giữ phần tính đề xuất; phần ghi chuyển sang test của draft.

## Rủi ro

- **Thứ tự effect.** Đây là phần dễ sai nhất: gom phép ghi lại có thể đổi thời điểm nháp được dựng.
  Chuyển từng thao tác một, chạy `pnpm --filter web test` sau mỗi thao tác.
- **Interface store đổi kéo theo component.** TypeScript chỉ ra hết; không có sai lặng.

## Ngoài phạm vi

- Gộp pool vào draft (đã loại ở §4).
- Thu nhỏ `FormationDraftState` từ 22 khoá — việc riêng, và chưa chắc đáng.
- Đưa nháp vào `sessionStorage` để không mất khi reload — chưa ai yêu cầu.
