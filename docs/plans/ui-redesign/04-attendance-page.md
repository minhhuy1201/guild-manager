# 04: Trang điểm danh

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 2 (điểm danh + lịch sử)

**What to build:** Trang điểm danh có thứ bậc rõ và không còn khoảng trống chết.
- "Tuần này của bạn" là card `raised` với dải ô trận lớn lấp đủ chiều ngang.
- Nút Có/Không lớn, phản hồi rõ khi bấm.
- Bảng điểm danh cả bang co chiều rộng theo số trận.
- Dòng tổng nổi riêng, số tổng đếm chạy lên khi dữ liệu đến.
- Banner nghỉ phép là một notice.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Ô trận vẫn mang trạng thái qua bề mặt: emerald "Có", `destructive` "Không", amber chưa trả lời.
      Viền đậm, nền nhạt. Không gọi `sessionTintClass` trên ô trả lời.
- [ ] Nút Có/Không vẫn là `Button`, logic gửi và toast không đổi.
- [ ] Bảng co chiều rộng theo số cột trận, không trải hết màn khi có một trận. Cột tên vẫn sticky.
      `columns` vẫn bằng số `<th>`.
- [ ] Chu kỳ bấm ô admin (chưa → Có → Không → Có), draft, `UnsavedChangesBar` không đổi.
- [ ] Component đếm số: hiện đúng số cuối, hiện ngay khi `prefers-reduced-motion`, chạy một lần khi
      dữ liệu đến, không chạy lại khi refetch nền. Có test.
- [ ] Banner nghỉ phép thành notice, vẫn là amber vì nó mang trạng thái nghỉ.
- [ ] Mọi test hành vi của attendance xanh. Test assert class trang trí được viết lại, commit ghi lý do.
- [ ] Ảnh 1440 + 420 + 360, sáng + tối, với 1 trận và nhiều trận trong tuần.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
