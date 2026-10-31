# 02: Trang "Lực lượng lưu phái" (chỉ đọc)

Spec: [`docs/specs/2026-10-31-class-change-survey.md`](../../specs/2026-10-31-class-change-survey.md)

**What to build:** Mọi người đã đăng nhập thấy mục "Lực lượng lưu phái" (nhãn ngắn "Lưu phái") trên nav
header và tab bar điện thoại, mở `/luu-phai`. Trang hiện banner (tên đợt, hạn chót), bốn ô số (đã điền /
tổng, định chuyển, trong đó chắc chắn, phái tăng mạnh nhất), và hai tab: **Trước / sau** và **Danh sách**.
Chưa từng có đợt thì trang hiện cơ cấu phái hiện tại (chỉ cột "hiện tại", không ô số khảo sát). Chưa có
form (ticket 03). Bố cục theo prototype đã duyệt (mô tả trong spec, mục Web).

**Blocked by:** 01

**Status:** done - theme and phone-width check pending in a browser

- [x] Hàm thuần đếm trước/sau trong `packages/shared/lib`: "trước" = `fromClass` của người đã trả lời +
      lưu phái hiện tại của người chưa trả lời; "sau" tách phần chắc chắn và cân nhắc; trả cả số người
      định chuyển và số chắc chắn. Test dạng bảng (không ai trả lời, toàn giữ nguyên, chuyển chắc chắn,
      chuyển cân nhắc, `fromClass` khác lưu phái hiện tại).
- [x] `ROUTES.classOutlook = "/luu-phai"`, trang mỏng trong `app/` render một component của feature mới
      `features/class-survey`; mục nav mở cho mọi người, `desktopOnly: false`. Đọc `.claude/rules/web/*` trước.
- [x] Request function `"use server"` qua `apiFetch` + query key + hook TanStack Query; component không fetch.
- [x] Tab **Trước / sau**: hai thanh mỗi phái, thanh "sau" phần liền = chắc chắn, phần sọc = cân nhắc,
      ghi `trước → sau` và ±N, sắp theo số "sau". Tab **Danh sách**: thành viên, phái hiện tại, phái dự định
      + badge mức độ, "Giữ nguyên", "Chưa điền". Màu/icon từ `GUILD_CLASS_COLOR` / `GUILD_CLASS_IMAGE`; theo
      `docs/design-direction.md` (jade/gold cho badge mức độ, không dùng emerald/red/amber vốn dành cho trạng
      thái điểm danh - ±N dùng màu chữ trung tính hoặc jade).
- [ ] Đúng ở cả hai theme, vừa màn điện thoại (không cuộn ngang trang).
- [x] Test Vitest màn trang (kiểu `attendance-screen.test.tsx`): đợt đang mở, đợt đã đóng, chưa có đợt.
- [x] `docs/architecture.md` §4.2 (danh sách feature) cập nhật; thuật ngữ **Class outlook** vào `GLOSSARY.md`.
