# 01: Chuyển phần dựng chữ sang shared

Spec: [`docs/specs/2026-10-24-announcement-note.md`](../../specs/2026-10-24-announcement-note.md)

**What to build:** Chữ của Formation announcement và Team notice được dựng bởi hàm thuần trong
`packages/shared`, để web dựng được preview từ cùng một nguồn với API. Thành viên và admin không
thấy gì thay đổi: mọi tin gửi đi giống hệt từng byte.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Hàm content của Formation announcement và Team notice, ba mốc giờ tập hợp, tiêu đề trận và hàm format giờ Việt Nam nằm trong shared lib, trả chuỗi content.
- [x] API bọc content thành `MessagePayload`; `allowed_mentions` vẫn đặt ở API, không đổi.
- [x] Attendance announcement import hàm format giờ từ shared; không còn bản sao ở API.
- [x] Spec chữ hiện có ở API giữ nguyên chỗ và nguyên mọi case (shared chưa có test runner), vẫn xanh qua hàm bọc của API.
- [x] Test service API của announcer và notice service vẫn xanh, không sửa kỳ vọng.
- [x] Typecheck và lint của shared, api, web xanh.
