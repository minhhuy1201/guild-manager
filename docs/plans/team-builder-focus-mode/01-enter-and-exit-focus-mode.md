# 01: Vào và thoát chế độ toàn màn hình

Spec: [`docs/specs/team-builder-focus-mode.md`](../../specs/team-builder-focus-mode.md).

**What to build:** Admin bấm nút "Toàn màn hình" trên thanh công cụ (hoặc bấm `F`), và việc xếp đội
phủ kín màn hình trong một lớp phủ. Trình duyệt cũng vào toàn màn hình nếu cho phép. Lớp phủ có thanh
trên mỏng với tên trận và nút ✕. Grid và pool chuyển vào lớp phủ, vẫn với bố cục hiện tại (chồng
dọc, cuộn trong lớp phủ) và chỉ mount một lần. Kéo thả, lưu và hoàn tác chạy như ngoài trang. Thoát
bằng `Esc`, ✕, hoặc khi trình duyệt rời toàn màn hình. Focus quay về nút. Draft giữ nguyên. Nút chỉ
có từ `lg` và khi trận còn sửa được. Trận chuyển sang read-only thì chế độ tự tắt.

UI: giữ quy ước trong `.claude/rules/web/` (cap `Kbd` trên nút, `isTypingTarget`, lớp z có sẵn).

**Blocked by:** None (can start immediately)

**Status:** todo

- [ ] Trận sửa được: có nút "Toàn màn hình" với cap `F`. Read-only thì không có nút.
- [ ] Bấm nút hoặc `F` thì có dialog "Xếp đội hình toàn màn hình" chứa grid và pool
- [ ] `F` trong ô nhập, hoặc kèm phím bổ trợ, không bật chế độ
- [ ] `Esc` hoặc ✕ tắt chế độ và trả focus về nút. `Esc` đã bị dialog khác chặn, hoặc bấm trong ô nhập, thì không tắt.
- [ ] Bật thì gọi `requestFullscreen` trên `documentElement`. Nếu bị reject thì chế độ vẫn bật (catch rỗng có ghi lý do).
- [ ] `fullscreenchange` mà không còn `fullscreenElement` thì tắt chế độ. Tắt bằng ✕ hoặc `Esc` mà document đang toàn màn hình thì gọi `exitFullscreen`.
- [ ] Trận chuyển sang read-only khi đang bật thì chế độ tắt
- [ ] Grid và pool chỉ mount một lần (không trùng id droppable)
- [ ] Test ở `TeamBuilderScreen` cho các ca trên. Typecheck, lint, test xanh.
