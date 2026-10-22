# 02: Màn diễn không lộ người thắng

Spec: [`docs/specs/2026-10-22-cat-race-fair-staging.md`](../../specs/2026-10-22-cat-race-fair-staging.md) §1.

**What to build:** Bấm ĐUA thì trước điểm lộ (70%) không nhìn ra ai thắng: con dẫn đầu và top 3 lúc
đầu là những con ngẫu nhiên, con thắng chạy như mọi con khác. Sau điểm lộ, con thắng cùng 2-4 ứng viên
chọn ngẫu nhiên rời đàn lao lên, thứ tự giữa họ xáo trộn tới sát vạch, á quân về sát nút tới khoảng
1-2 thân. Ba kịch bản cố định không còn. Người thắng vẫn do server quyết.

**Blocked by:** 01 (Ảnh đích mọi vòng) - 01 xoá đoạn test canvas đang ép kịch bản để kiểm ảnh đích,
nên ticket này chỉ còn bỏ `scenario` mà không đụng cùng chỗ.

**Status:** todo

- [ ] Viết trước test "không lộ người thắng" và chạy cho đỏ trên code hiện tại: 2000 vòng có seed,
      80 mèo và 3 mèo, người thắng chọn đều; ở `u = 0.12, 0.3, 0.5`, tỉ lệ con thắng nằm top 3 cách
      `3/n` không quá ±3 điểm phần trăm (3 mèo: tỉ lệ dẫn đầu cách `1/3` không quá ±3 điểm).
- [ ] Kiểu `RaceScenario`, danh sách kịch bản, trường và tham số `scenario`, các vai W/R/X, hệ số co
      giãn vai và nhóm bám đuôi không còn trong code và test.
- [ ] Ở các mốc `≤ 0.7`, độ lệch của mọi mèo sinh từ cùng một đoạn code, không đọc vai trò của mèo.
- [ ] Bất biến, nhiều seed, 2/3/8/80/240 mèo: tiến độ không giảm; bắt đầu 0; con thắng đúng 1 và
      nhất tại `u = 1`; không con nào khác chạm 1; `runnerUpGap` trong `[0.001, 0.02]` khi có từ 2 mèo.
- [ ] Trung bình ít nhất 1 lần đổi ngôi sau `u = 0.7` (80 mèo).
- [ ] Với 80 mèo, tại `u = 1` có 3-5 mèo (con thắng + 2-4 ứng viên) cách đích không quá khoảng của
      ứng viên xa nhất; với 2-3 mèo số ứng viên tự giảm, không lỗi.
- [ ] Test "không lộ người thắng" xanh; số cụ thể (biên độ đàn, nhiễu sau điểm lộ, bước giữa ứng
      viên) chốt sao cho mọi test xanh. Nếu phải đổi cấu trúc thì cập nhật spec trước.
- [ ] Kiểm bằng mắt: 3, 30, 80, 240 mèo; đầu cuộc đua không có con nào "rõ là sẽ thắng"; 240 mèo vẫn
      mượt.
- [ ] Typecheck, lint, toàn bộ test của `web` xanh.
