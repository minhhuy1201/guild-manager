# 08: Trang thiết lập

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 4 (chiến thuật + thiết lập)

**What to build:** Trang thiết lập nhìn cùng một kiểu với phần còn lại của app.
- Dải chọn tuần rõ ràng.
- Mỗi trận là một card, trận Bang Chiến có cạnh nhấn.
- Bảng thành viên và bảng nghỉ phép dùng chung skin bảng của app.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Tab theo `tabs.tsx` mới. Nhãn ngắn/dài trên điện thoại giữ như cũ (test settings-tabs xanh).
- [ ] Dòng trận thành card, guild war có cạnh nhấn, vẫn reveal theo `revealStyle`.
- [ ] `LeavePanel` dùng skin `DataTable` chung. Dữ liệu, cột và hành động không đổi. Trang điểm danh,
      nơi cũng dùng `LeavePanel`, vẫn đúng.
- [ ] Dialog tạo/sửa/xoá trận và thành viên không đổi hành vi.
- [ ] Ảnh 1440 + 420, sáng + tối, cả ba tab.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
