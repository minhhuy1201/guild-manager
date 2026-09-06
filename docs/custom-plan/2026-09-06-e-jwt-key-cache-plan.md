# E — Khoá HMAC dựng một lần, không dựng lại mỗi request — Implementation Plan

**Goal:** `verifyJwt` dựng `CryptoKey` một lần cho mỗi secret trong vòng đời module, thay vì mỗi lần
gọi. Chữ ký hàm không đổi, behaviour không đổi.

**Architecture:** Cache nằm trong `apps/web/features/auth/core/jwt.ts`, ở module scope, sau
interface — người gọi (`proxy.ts`, `features/auth/server.ts`) không biết gì về nó. Không nâng lên
`proxy.ts`: cache thuộc về module sở hữu phép toán.

**Spec:** [`docs/custom-spec/2026-09-06-e-jwt-key-cache-design.md`](../custom-spec/2026-09-06-e-jwt-key-cache-design.md)

## Ba điểm phải làm đúng

1. **Cache `Promise<CryptoKey>`, không cache giá trị đã resolve.** Hai lần verify chạy đồng thời
   phải cùng chờ một lần `importKey`, không phải mỗi bên tự dựng một khoá.
2. **Khoá theo `secret`.** `verifyJwt` nhận secret làm tham số; một cache bỏ qua tham số đó sẽ trả
   nhầm khoá nếu có hai secret. Dùng `Map<string, Promise<CryptoKey>>`.
3. **Promise bị reject phải bị gỡ khỏi cache.** Đây là chỗ dễ hỏng nhất: giữ lại một promise hỏng
   nghĩa là một lần lỗi nhất thời khoá chết mọi lần verify cho tới khi tiến trình chết. Hôm nay
   `importKey` ném thì rơi vào `catch` và thành `null`, và điều đó phải giữ nguyên — chỉ là lần gọi
   sau vẫn phải thử lại được.

## Global Constraints

- Không đổi behaviour. Không đổi chữ ký `verifyJwt`. Không đụng `proxy.ts`, `server.ts`.
- Không thêm dependency, không thêm file nguồn.
- Comment, JSDoc, tên biến: tiếng Anh. Tên test: tiếng Việt, theo `jwt.test.ts` đang có.
- **TDD**: mỗi thay đổi bắt đầu bằng một test đỏ, xác nhận nó đỏ đúng lý do, rồi mới viết code.
- Cache ở module scope nên rò rỉ giữa các test: **mỗi test dùng một secret riêng**, không dựa vào
  việc reset module.
- Nhánh: `perf/cache-jwt-hmac-key`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

---

### Task 1: Test đỏ chốt số lần `importKey`

**Files:** `apps/web/features/auth/core/__tests__/jwt.test.ts`

- [x] `describe("cache khoá HMAC")` với `vi.spyOn(crypto.subtle, "importKey")`, `afterEach` restore.
- [x] Test A — "verify hai lần với cùng secret chỉ dựng khoá một lần": hai lần `verifyJwt` tuần tự,
      `importKey` được gọi đúng một lần, cả hai vẫn trả payload.
- [x] Test B — "hai secret khác nhau dựng hai khoá riêng": mỗi token chỉ verify được bằng secret của
      nó, `importKey` gọi hai lần. Chốt điểm 2.
- [x] Test C — "hai lần verify đồng thời chỉ dựng khoá một lần": `Promise.all` hai lần gọi,
      `importKey` gọi đúng một lần. Chốt điểm 1 — một cache lưu giá trị đã resolve sẽ đỏ ở đây.
- [x] Test D — "importKey hỏng một lần không khoá chết các lần sau": spy reject lần đầu → `null`;
      lần gọi sau (spy đã trả lại bình thường) → payload. Chốt điểm 3.
- [x] Chạy test, xác nhận A, C, D đỏ và B xanh (B là behaviour hiện có, giữ chỗ chống hồi quy).

### Task 2: Memo hoá khoá

**Files:** `apps/web/features/auth/core/jwt.ts`

- [x] Thêm `const keyCache = new Map<string, Promise<CryptoKey>>()` ở module scope.
- [x] `importKey` đọc cache trước; khi miss thì tạo promise, `set` ngay (chưa await) rồi gắn
      `.catch` để `delete` khỏi cache và ném tiếp — reject không được giữ lại.
- [x] JSDoc nói rõ vì sao cache promise chứ không cache khoá, và vì sao reject bị gỡ.
- [x] Chạy test: tất cả xanh, không test cũ nào phải sửa kỳ vọng.

### Task 3: Kiểm

- [x] `pnpm --filter web test` · `typecheck` · `lint` xanh.

## Ảnh hưởng contract

Không có.
