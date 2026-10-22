# 02: Bề mặt và component lõi

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 1 (nền tảng)

**What to build:** Mọi card, nút, tab, bảng, dialog, empty state, trang 404 và trang lỗi mang diện mạo
mới ở mọi trang cùng lúc.
- Card có ba cấp `default`, `raised`, `inset`, kèm tiêu đề section serif với divider nét cọ.
- Nút phản hồi hover/nhấn có lực.
- Tab và bảng theo skin mới, dialog có backdrop mờ.
- Empty state, 404 và error mang con dấu bang.

**Blocked by:** 01 (Token, font và brief mới)

**Status:** done

- [x] `Card` nhận biến thể (`default` mặc định, `raised`, `inset`) và ghi `data-variant`. Mọi chỗ gọi
      cũ không truyền gì vẫn ra `default`. Có test cho biến thể và mặc định.
- [x] Có một component tiêu đề section dùng chung: serif `<h2>` cộng divider nét cọ. Các card cấp
      section hiện dùng `CardTitle` chuyển sang nó, giữ nguyên text và cấp heading.
- [x] Button: hover sáng và nhích, nhấn lún, dùng token motion. Kích thước control không đổi
      (`h-10`/`h-11`/`h-9`/`h-7`, sàn 44px trên điện thoại).
- [x] Tabs: chỉnh ở `tabs.tsx`, tab chọn vẫn là bề mặt `primary`. Rule tabs trong `interaction.md`
      cập nhật cho khớp.
- [x] `TABLE_SKIN`: header tách khỏi thân, sọc nhẹ hơn, hover vẫn `foreground/5`. Bảng vẫn tự cuộn
      ngang trong container, trang không cuộn ngang.
- [x] Dialog: backdrop mờ có tint, khung theo token mới, vẫn cuộn trong `100dvh`.
- [x] `EmptyState`, `ErrorState`, `not-found`, `error`: con dấu bang, divider nét cọ, câu ngắn. Giữ
      "Thử lại", `digest`, đường về trang điểm danh. Test cũ assert class trang trí được viết lại để
      kiểm vai trò hoặc nội dung, commit ghi lý do.
- [x] Ảnh 1440 + 420, sáng + tối, ở điểm danh, thiết lập, chiến thuật và 404.
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
