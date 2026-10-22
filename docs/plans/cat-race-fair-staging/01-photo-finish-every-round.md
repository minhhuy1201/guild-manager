# 01: Ảnh đích mọi vòng

Spec: [`docs/specs/2026-10-22-cat-race-fair-staging.md`](../../specs/2026-10-22-cat-race-fair-staging.md) §2.

**What to build:** Vòng nào về đích cũng chớp trắng, rồi dừng trên ảnh đích 2.6 giây với số thân
giữa hai con đầu, rồi mới hiện thẻ kết quả, dù á quân cách đích bao xa. Kể cả các vòng song mã và lội
ngược dòng, vốn trước đây không có ảnh đích. "Bỏ qua" và giảm chuyển động vẫn nhảy thẳng tới thẻ kết
quả như cũ. Màn diễn (đường chạy của mèo) chưa đổi.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Sau đích, dòng thời gian luôn ở pha ảnh đích đúng 2.6 giây rồi sang "xong", với khoảng cách á
      quân bất kỳ; test cũ dựa trên ngưỡng `0.004` và nhịp 0.9 giây được thay bằng test này.
- [x] Ngưỡng `0.004`, nhịp giữ 0.9 giây và pha "về đích thường" không còn; các hàm của dòng thời gian
      không còn nhận khoảng cách á quân; `switch` trên union pha kết thúc bằng `assertNever`.
- [x] Sự kiện về đích không còn cờ ảnh đích, vẫn mang số thân; lớp phủ luôn bật ảnh đích khi nhận nó.
- [x] Test canvas không còn ép kịch bản để kiểm ảnh đích; nó kiểm rằng mọi vòng phát sự kiện về đích
      đúng một lần, kèm số thân.
- [x] "Bỏ qua" và giảm chuyển động: không chớp, không ảnh đích (test hiện có vẫn xanh).
- [ ] (chưa kiểm được: máy không có trình duyệt và trang cần đăng nhập admin + DB local) Kiểm bằng mắt: 3 và 80 mèo, vài vòng mỗi cỡ, vòng nào cũng có ảnh đích.
- [x] Typecheck, lint, test của `web` xanh.
