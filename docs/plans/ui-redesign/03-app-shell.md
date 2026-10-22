# 03: Khung app - header, nav, banner trang, chuyển trang

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 1 (nền tảng)

**What to build:** Đi qua các trang, người dùng thấy:
- Header kính mờ trên nền mực, với thanh active trượt sang mục vừa chọn.
- Tab bar điện thoại khớp header.
- Mỗi trang mở bằng banner cao kiểu điện ảnh, cảnh zoom chậm một lần.
- Nội dung trang cross-fade khi chuyển trang.
- Footer gọn, vẫn ghi credit NetEase.

**Blocked by:** 02 (Bề mặt và component lõi)

**Status:** todo

- [ ] Header vẫn mang `dark` ở cả hai theme, vẫn `sticky`, vẫn không ghim khi `max-height: 500px`.
      Nền kính mờ, viền dưới sáng nhẹ.
- [ ] `MainNav` có một indicator jade chung trượt tới mục đang active (bằng `transform`). Mục active
      vẫn là ghost button, `text-foreground`, icon jade. Các link vẫn là `Link` + `buttonVariants`.
      Có test kiểm mục active đúng theo route.
- [ ] Tab bar điện thoại khớp header, vẫn chiếm `--app-bottom-inset`, mục active rõ.
- [ ] `PageHeader`: props giữ nguyên. Banner cao hơn trên màn rộng, `isPlainOnPhone` vẫn chỉ hiện chữ
      dưới `sm`. Tiêu đề lớn hơn. Hai scrim vẫn còn. Cảnh zoom chậm một lần (Ken Burns, `transform`,
      không lặp) và vẫn fade vào trên màu chủ đạo.
- [ ] Chuyển trang cross-fade nội dung `<main>` bằng `<ViewTransition>` của React, header đứng yên.
      Trình duyệt không hỗ trợ thì không có lỗi.
- [ ] Reduced motion tắt Ken Burns, indicator trượt và cross-fade.
- [ ] Footer giữ credit NetEase và câu không liên kết.
- [ ] Rule `display.md` (page header, header) và `interaction.md` (nav, motion) cập nhật.
- [ ] Trang đua mèo không đổi hiển thị (ảnh trước/sau giống nhau trừ header).
- [ ] Ảnh 1440 + 420 + 360, sáng + tối, ở mọi trang.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
