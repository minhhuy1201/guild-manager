# 04: Trang điểm danh

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 2 (điểm danh + lịch sử)

**What to build:** Trang điểm danh có thứ bậc rõ và không còn khoảng trống chết.
- "Tuần này của bạn" là card `raised` với dải ô trận lớn lấp đủ chiều ngang.
- Nút Có/Không lớn, phản hồi rõ khi bấm.
- Bảng điểm danh cả bang: cột tên cố định, các cột trận chia đều phần còn lại.
- Dòng tổng nổi riêng, số tổng đếm chạy lên khi dữ liệu đến.
- Banner nghỉ phép là một notice.

**Blocked by:** 03 (Khung app)

**Status:** done

- [x] Ô trận vẫn mang trạng thái qua bề mặt: emerald "Có", `destructive` "Không", amber chưa trả lời.
      Viền đậm, nền nhạt. Không gọi `sessionTintClass` trên ô trả lời.
- [x] Nút Có/Không vẫn là `Button`, logic gửi và toast không đổi.
- [x] Cột tên cố định chiều rộng (từ `lg`), các cột trận chia đều phần còn lại, không còn trải lệch. Cột tên vẫn sticky.
      `columns` vẫn bằng số `<th>`.
- [x] Chu kỳ bấm ô admin (chưa → Có → Không → Có), draft, `UnsavedChangesBar` không đổi.
- [x] Component đếm số: hiện đúng số cuối, hiện ngay khi `prefers-reduced-motion`, chạy một lần khi
      dữ liệu đến, không chạy lại khi refetch nền. Có test.
- [x] Banner nghỉ phép thành notice, vẫn là amber vì nó mang trạng thái nghỉ.
- [x] Mọi test hành vi của attendance xanh. Test assert class trang trí được viết lại, commit ghi lý do.
- [x] Ảnh 1440 + 420 + 360, sáng + tối với 1 trận; nhiều trận được phủ bằng test render (4 trận: mỗi trận một ô và một cột, `columns` bằng số `<th>`).
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
