# 03: Làm lại visual trang chủ

Spec: [`docs/specs/2026-10-24-featured-race.md`](../../specs/2026-10-24-featured-race.md).

**What to build:** Trang chủ trông bắt mắt và có cá tính, làm bằng `redesign-skill`. Hero vẫn dùng cảnh `landing.jpg` và vẫn cao, nhưng typography lớn hơn, có con dấu bang, CTA rõ hơn. Năm khối cũ giữ nguyên nội dung và copy, được làm lại visual để không còn chung một khuôn. Bảng vàng dùng vàng làm điểm nhấn cho giải HIGH; khi cuộn tới, người thắng hiện lần lượt, giải HIGH lấp lánh một lần, không lặp; `prefers-reduced-motion` tắt hết chuyển động.

**Blocked by:** 02 (Trang chủ hiện Bảng vàng)

**Status:** done

- [x] Audit trang hiện tại theo `redesign-skill`, áp dụng các sửa đổi trong giới hạn của `docs/design-direction.md` (vai trò màu, `font-heading`, radius 12px/6px, hai theme)
- [x] Hero mới: cảnh `landing.jpg`, typography lớn, con dấu bang, CTA rõ; CTA vẫn đưa người đã đăng nhập tới trang điểm danh
- [x] Năm khối cũ có visual mới, nội dung và copy không đổi; test landing hiện có vẫn xanh
- [x] Bảng vàng: vàng cho tiêu đề, viền và huy chương giải HIGH; vàng không bao giờ là màu trạng thái
- [x] Chuyển động một lần khi cuộn tới, không lặp; `prefers-reduced-motion` thì tĩnh
- [x] Đọc tốt ở cả theme sáng và tối, phone 360px và desktop
- [x] `docs/design-direction.md` ghi vai trò mới của vàng cho Featured race
