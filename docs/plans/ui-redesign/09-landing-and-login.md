# 09: Landing và đăng nhập

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 5 (landing + đăng nhập)

**What to build:** Trang công khai thể hiện bang đẹp nhất.
- Hero, các trụ cột, ban lãnh đạo và lời mời dùng bề mặt và motion mới.
- Các bước gia nhập là chuỗi đánh số có đường nối.
- Card đăng nhập là một thiệp mời có con dấu, đặt trên cảnh.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Hero vẫn là cảnh `landing.jpg` cao, CTA điểm danh giữ nguyên đích.
- [ ] Trụ cột và ban lãnh đạo theo cấp card mới. Vàng chỉ ở điểm nhấn được phép.
- [ ] Bước gia nhập: số thứ tự và đường nối, vẫn là `<ol>`.
- [ ] Các khối dưới vẫn bọc `ScrollReveal`.
- [ ] Đăng nhập: thiệp mời trên `login.jpg`, nút Discord và thông báo lỗi đăng nhập không đổi.
- [ ] Credit NetEase vẫn hiện ở footer.
- [ ] Ảnh 1440 + 420 + 360, sáng + tối.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
