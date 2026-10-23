# 02: Lưu ý trong Formation announcement

Spec: [`docs/specs/2026-10-24-announcement-note.md`](../../specs/2026-10-24-announcement-note.md)

**What to build:** Admin gõ "Lưu ý thêm" trong dialog gửi đội hình, bấm gửi, và lưu ý hiện thành
khung quote ngay dưới tiêu đề tin trong channel bang chiến. Để trống thì tin như cũ.

**Blocked by:** 01 (Chuyển phần dựng chữ sang shared).

**Status:** done

- [x] Shared có một schema lưu ý: trim, rỗng sau trim là không có lưu ý, tối đa `ANNOUNCEMENT_NOTE_MAX_CHARS` (500), giữ xuống dòng.
- [x] Body announce nhận `note` không bắt buộc qua schema đó; response không đổi.
- [x] Content tin kênh: mỗi dòng lưu ý tiền tố `> `, dòng trống thành `>`, khối chèn ngay sau dòng tiêu đề; không lưu ý thì giống hệt hiện tại.
- [x] `allowed_mentions` của tin kênh vẫn chỉ mở role guild.
- [x] Hook gửi lưu ý trong request announce và reset khi dialog đóng.
- [x] Dialog có ô "Lưu ý thêm" (`FieldLabel` icon `Pin`, `Textarea`, placeholder ví dụ thật, `maxLength` 500, bộ đếm `n/500` `tabular-nums`, dòng phụ), khoá khi đang gửi.
- [x] Test chữ, schema, service announcer, hook và dialog phủ các điểm trên.
