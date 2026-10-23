# 03: Lưu ý trong Team notice

Spec: [`docs/specs/2026-10-24-announcement-note.md`](../../specs/2026-10-24-announcement-note.md)

**What to build:** Khi bật "Nhắn riêng từng người", mọi DM của lần gửi có cùng lưu ý ngay dưới tiêu
đề, trên dòng "Bạn ở Team X". "Nhắn lại người lỗi" gửi đúng lưu ý đó.

**Blocked by:** 02 (Lưu ý trong Formation announcement).

**Status:** done

- [x] Body notify-members nhận `note` không bắt buộc qua cùng schema lưu ý; response không đổi.
- [x] Content Team notice: khối quote lưu ý ngay sau tiêu đề; không lưu ý thì giống hệt hiện tại.
- [x] `allowed_mentions` của Team notice vẫn không mở gì.
- [x] Mọi DM của lần gửi có cùng lưu ý, cả hai trận, cả lần nhắn lại thu hẹp bằng `notices`.
- [x] Hook gửi lưu ý trong request notify-members đầu tiên và mọi lần retry.
- [x] Test chữ, service notice và hook phủ các điểm trên.
