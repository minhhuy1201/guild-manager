# 02: Trang chủ hiện Bảng vàng

Spec: [`docs/specs/2026-10-24-featured-race.md`](../../specs/2026-10-24-featured-race.md).

**What to build:** Khách mở `/trang-chu`, chưa cần đăng nhập, thấy khối Bảng vàng ngay dưới hero. Khối này hiện tối đa 3 Featured race mới nhất theo ngày kết thúc. Mỗi đợt có tên, ngày kết thúc, số người tham gia, và các hạng mục theo hạng giải kèm người thắng (tên, class). Thẻ lớn là đợt mới nhất; desktop đặt tối đa 2 thẻ nhỏ bên phải, phone xếp dọc. Không có Featured race, hoặc API lỗi, thì khối bị ẩn. Ticket này dựng khối với style gọn theo design system; phần làm đẹp nằm ở ticket 03.

**Blocked by:** 01 (Admin bật "Hiện ở trang chủ")

**Status:** done

- [x] Schema Zod public trong `packages/shared`: `id`, `name`, `endedAt`, `participantCount`, `prizes[]` (`name`, `tier`, `winners[]` gồm `name`, `guildClass`); không có số vé, Discord, id nhân vật
- [x] `GET /public/featured-races`, không guard, trong một controller riêng của module `cat-race`; tối đa `FEATURED_RACE_LIMIT = 3`, xếp theo `endedAt` giảm dần
- [x] Vòng bị huỷ không hiện; prize không có người thắng hợp lệ bị bỏ; prize xếp theo tier rồi `sortOrder`, winner theo `drawnAt`
- [x] Test service cho giới hạn, thứ tự, lọc vòng huỷ, và shape không có số vé; test controller cho route public không guard
- [x] Page `/trang-chu` gọi endpoint public không kèm token; lỗi thì ghi log server và ẩn khối, phần còn lại của trang vẫn render
- [x] Khối Bảng vàng là component của feature `landing`, nhận danh sách qua prop, đứng ngay dưới hero trong `ScrollReveal`
- [x] Test `LandingScreen`: danh sách rỗng thì không có khối; có đợt thì có tên đợt, hạng mục, người thắng, không có số vé; test cũ vẫn xanh
