# 04: Preview Discord và bố cục mới

Spec: [`docs/specs/2026-10-24-announcement-note.md`](../../specs/2026-10-24-announcement-note.md)

**What to build:** Dialog gửi đội hình hiện preview giống Discord của tin kênh và một DM mẫu, cập
nhật theo từng phím gõ lưu ý, với bố cục hai cột trên màn rộng và một cột trên điện thoại.

**Blocked by:** 03 (Lưu ý trong Team notice).

**Status:** todo

- [ ] Preview dùng hàm content shared với id giữ chỗ; không có wording nào viết lại ở web.
- [ ] `Tabs` default: "Kênh bang chiến" và "Nhắn riêng (mẫu)"; tab DM chỉ có khi bật checkbox; đổi tab fade opacity `--duration-base`.
- [ ] Khung tin bọc `className="dark"`: avatar `GuildSeal`, tên bot, giờ, nội dung.
- [ ] Renderer: `#`, `##`, `**`, `*`, `>` (vạch trái 4px), pill mention `#🤒│báo-bận`, `#bang-chiến`, `@Bang` (`bg-primary/15 text-primary`).
- [ ] Ô giữ chỗ ảnh: một ô mỗi trận dưới tin kênh, một ô `team-1-tran-1.webp` dưới DM mẫu, nền inset, icon `Image`.
- [ ] DM mẫu là team 1, trận 1, như có card.
- [ ] Từ `lg`: `lg:max-w-4xl`, cột trái 2/5 (số slot `tabular-nums`, lưu ý, checkbox, dòng khoá điểm danh, cảnh báo chưa lưu), cột phải 3/5 preview, footer trải hết.
- [ ] Dưới `lg`: một cột, preview `max-h-80` tự cuộn; dialog `max-h-[calc(100dvh-2rem)]`; không tràn ngang ở 360px.
- [ ] Màn kết quả không đổi.
- [ ] Test dialog: gõ đổi preview kênh, lưu ý render thành quote dưới tiêu đề, tab DM theo checkbox.
