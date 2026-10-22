# 01: Team notice dạng text ngắn

Spec: [`docs/specs/2026-10-22-team-notice-image.md`](../../specs/2026-10-22-team-notice-image.md)

**What to build:** Team notice bỏ danh sách 6 vị trí. Text chỉ còn tiêu đề trận ("Trận i/n"), tên team (hoặc "Team N") và giờ online. Hàm dựng có hai biến thể: có ảnh (không thêm gì) và không ảnh (thêm dòng `Xem đội hình trong <#channel bang chiến>.`). Ở ticket này chưa có ảnh, nên mọi Team notice đi theo biến thể không ảnh. Admin gửi thử thì thành viên nhận DM ngắn kèm link channel.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Hàm dựng nhận thêm cờ có ảnh và id channel bang chiến. Hai biến thể đúng mẫu trong spec, dùng lại `battleHeading` và `timesOf`.
- [x] Không còn danh sách vị trí, note hay dấu "← bạn" trong text. Code chỉ phục vụ danh sách vị trí bị xoá nếu không còn ai dùng.
- [x] `allowed_mentions` vẫn đóng hết.
- [x] Service lấy id channel từ `DISCORD_BANG_CHIEN_CHANNEL_ID` đã có, không thêm biến env.
- [x] Test hàm dựng và test service cập nhật theo hành vi mới, commit nói rõ lý do đổi.
- [x] `pnpm --filter api typecheck`, `lint`, `test` xanh.
