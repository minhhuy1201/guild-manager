# 01: Lỗi của Server Action đua mèo hiện đúng câu backend trên production

**What to build:** Trên production, khi một thao tác đua mèo bị backend từ chối (ví dụ "Đăng tổng kết
lên Discord" khi chưa đặt kênh thông báo chung), toast hiện đúng câu tiếng Việt backend trả về thay vì
lỗi React #441. Lỗi mạng (API sập) hiện "Không kết nối được máy chủ.".

Nguyên nhân: ở bản production, Server Action ném lỗi thì React chỉ gửi `{digest}` về client, mất cả
`message` lẫn `statusCode` của `ApiError`. Next khuyên trả lỗi dự kiến dưới dạng giá trị
(`node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`, "model expected errors
as return values").

Ticket này dựng cơ chế dùng chung, rồi áp dụng cho module đua mèo để làm tracer bullet.

Hình dạng đã chốt trong plan:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; statusCode: number };
```

- Phía server: một helper chạy lời gọi API, bắt **chỉ** `ApiError` thành giá trị lỗi. Mọi lỗi khác
  được ném lại, để Next vẫn ghi log phía server và `redirect()` vẫn chạy.
- Phía client: một helper trả về `data`, hoặc ném lại `ApiError(message, statusCode)`. Nhờ vậy
  `errorMessageOf`, `recoverSession`, `combineQueries` và `MutationForm` giữ nguyên.
- Thêm một adapter bọc server action thành hàm ném lỗi, dùng cho `mutationFn` / `queryFn`.
- `apiFetch` đổi lỗi mạng (`fetch` reject) thành `ApiError` mang câu fallback sẵn có, status 503.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Regression test: giá trị lỗi giữ nguyên sau khi round-trip `JSON.parse(JSON.stringify())`, và
      helper client dựng lại đúng `ApiError`. Một lỗi 401 qua helper vẫn được `isSessionExpired` nhận ra.
- [x] Helper server ném lại lỗi không phải `ApiError`. Có test.
- [x] `apiFetch` biến lỗi mạng thành `ApiError` 503 với câu "Không kết nối được máy chủ.". Có test.
- [x] Mọi hàm export trong module api đua mèo trả về `ActionResult`, và các hook đua mèo đi qua adapter.
- [x] Test api và hook đua mèo cập nhật theo hình dạng mới.
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
