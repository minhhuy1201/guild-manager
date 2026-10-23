# 04: Phím `S` cho Bỏ qua và tự ẩn nút khi đang đua

Spec: [`docs/specs/cat-race-focus-mode.md`](../../specs/cat-race-focus-mode.md).

**What to build:** Admin bấm `S` khi đang đua để bỏ qua tới thẻ người thắng, ở cả trang thường lẫn
toàn màn hình. Nút Bỏ qua hiện cap `S`. Trong chế độ toàn màn hình, khi đang đua mà chuột đứng yên 2
giây thì tấm nút, nút ✕ và con trỏ mờ đi. Rê chuột hoặc focus bằng bàn phím vào tấm nút thì chúng
hiện lại ngay và đếm lại từ đầu. Khi chưa đua hoặc đang rút thì tấm nút luôn hiện. Khi đang hiện kết quả thì tấm nút không có mặt
(ticket 02 đã làm vậy).
Nút đang ẩn vẫn focus được bằng bàn phím.

Cần chỉnh lại spec: spec còn để ngỏ cách test tấm nút bị ẩn ("`inert` hoặc `aria-hidden`"). Cả hai
cách đều làm nút không focus được nữa. Vì vậy test đọc thuộc tính `data-idle`, và dòng đó trong
Testing Decisions phải được sửa theo.

**Blocked by:** 02

**Status:** todo

- [ ] `S` khi đang đua thì bỏ qua. `S` khi chưa đua, khi đang gõ, kèm phím bổ trợ, hoặc đã `defaultPrevented` thì không có tác dụng.
- [ ] Nút Bỏ qua có cap `S`
- [ ] Chế độ toàn màn hình đang đua: sau 2 giây không có `pointermove` thì tấm nút và ✕ có `data-idle`. `pointermove` thì hết `data-idle`.
- [ ] Focus vào tấm nút thì hết `data-idle`
- [ ] Ngoài chế độ, hoặc khi không đua, thì không bao giờ có `data-idle`
- [ ] Thời gian 2 giây là một hằng số có tên
- [ ] Spec được sửa ở dòng test tự ẩn. Thêm quy ước phím `S` và tự ẩn vào `.claude/rules/web/interaction.md`.
- [ ] Test ở `RaceStage` (fake timers). Typecheck, lint, test xanh.
