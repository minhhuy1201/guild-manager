# 01: Admin bật "Hiện ở trang chủ" cho một đợt đua

Spec: [`docs/specs/2026-10-24-featured-race.md`](../../specs/2026-10-24-featured-race.md).

**What to build:** Admin đua mèo mở một đợt đã kết thúc ở `/dua-meo/[id]` và bật công tắc "Hiện ở trang chủ" để đợt đó thành Featured race; tắt để gỡ. Đợt chưa kết thúc, hoặc mọi vòng đã huỷ, thì công tắc bị vô hiệu kèm lý do và server cũng từ chối (409). Danh sách `/dua-meo` gắn huy hiệu "Bảng vàng" cho đợt đang bật. Chưa có gì hiện ở trang chủ trong ticket này.

**Blocked by:** None (can start immediately)

**Status:** todo

- [ ] `CatRaceEvent` có cột `featuredAt DateTime?` (nullable, ghi từ `Clock`), kèm migration được commit
- [ ] Shape summary và detail của đợt đua trong `packages/shared` có `featured: boolean`
- [ ] `PUT /cat-races/:id/featured` với body `{ featured: boolean }`, sau `JwtAuthGuard` + `Capability.CAT_RACE`, trả về chi tiết đợt
- [ ] Bật đợt chưa kết thúc trả 409; bật đợt không còn vòng chưa huỷ trả 409; cả hai có thông báo tiếng Việt
- [ ] Bật ghi `featuredAt` từ Clock; bật lại một đợt đã bật không đổi `featuredAt`; tắt ghi null
- [ ] Test service cho mọi ca trên, theo fixtures của `cat-race`
- [ ] Màn chi tiết có công tắc theo `interaction.md`, gọi mutation; vô hiệu kèm lý do ở hai ca 409
- [ ] Màn danh sách có huy hiệu "Bảng vàng" cho đợt có `featured`
- [ ] Test web: công tắc vô hiệu ở hai ca; bấm gọi mutation với giá trị đúng
