# 02: Banner đầu trang gọn

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md)

**What to build:** Banner đầu trang thôi chiếm chỗ của tính năng. Mọi trang dùng chung một dải gọn khoảng 96-128px (cỡ banner đua mèo trước đây), tiêu đề nhỏ lại, để mắt người dùng rơi ngay vào nội dung trang. Cảnh, scrim, nút cấp trang (chọn tuần, tạo mới) và chế độ chữ trơn trên điện thoại vẫn giữ.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Banner mọi trang cao khoảng 96px ở điện thoại, khoảng 128px ở desktop. Tiêu đề cỡ `text-2xl` / `text-3xl`.
- [x] Chỉ còn một cỡ banner: prop `isCompact` bị bỏ, hai trang đua mèo và test cập nhật theo.
- [x] Nút cấp trang vẫn nằm trong banner, căn với tiêu đề.
- [x] Trang điểm danh và lịch sử trên điện thoại vẫn hiện chữ trơn, không có cảnh.
- [x] Spec (user story 14, 15, 17 và phần banner) và `docs/design-direction.md` bỏ ý "banner cao, kiểu điện ảnh", ghi lý do: banner cao làm người dùng không tập trung vào tính năng.
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
