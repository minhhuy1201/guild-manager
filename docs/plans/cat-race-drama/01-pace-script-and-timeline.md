# 01: Kịch bản theo pha và dòng thời gian có slow-mo

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §1, §2.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Bấm ĐUA thì mèo chạy theo kịch bản mới: đàn bám sát tới khoảng 60%, đổi ngôi
nhiều lần ở cuối, một trong ba kịch bản (lội ngược dòng, song mã, photo finish) chọn ngẫu nhiên mỗi
vòng. Đếm ngược dài 2.4 giây (3 bước 0.8 giây, canvas vẫn tự vẽ số tạm thời như cũ). Đoạn `u ≥ 0.9`
chạy chậm khoảng ×3, con thắng vẫn chạm đích đúng số giây đã nhập. Về đích giữ 0.9 giây, hoặc 2.6
giây khi về sát nút (chưa có ảnh đích, chỉ giữ lâu hơn), rồi hiện thẻ kết quả. Hình ảnh chưa đổi.

Hai module thuần: kịch bản (đường tiến độ monotone cubic qua 8 mốc, bảng độ lệch theo vai, độ lệch
đàn) và dòng thời gian (thời gian thật → pha, `u`, nước rút, slow-mo, quyết định ảnh đích). Lấy đúng
số và công thức trong spec §1-§2, vốn chép từ prototype.

**Blocked by:** None (can start immediately)

**Status:** todo

- [ ] `buildRaceScript` nhận `scenario` tuỳ chọn (type alias `RaceScenario`), trả kịch bản mang
      `scenario` và đường tiến độ từng mèo; `CatMotion` và dao động cũ bị xoá.
- [ ] Thứ hạng vẫn là một hàm dùng chung cho đường đua và bảng xếp hạng.
- [ ] Test kịch bản (nhiều seed, cả 3 kịch bản, 2/8/30/240 mèo): tiến độ không giảm; bắt đầu 0; người
      thắng đúng 1 và nhất tại `u = 1`; không con nào ≥ người thắng tại `u = 1`; số lần đổi ngôi tối
      thiểu (lội ngược dòng ≥ 1, song mã ≥ 3, photo finish ≥ 2); photo finish luôn dưới ngưỡng ảnh đích
      0.004, hai kịch bản kia luôn trên.
- [ ] Test dòng thời gian ở các mốc biên: 0, 2.4 giây, 74% thời lượng (`u = 0.9`), đúng thời lượng
      (`u = 1`), giữ 0.9 / 2.6 giây.
- [ ] Đường đua và màn đua dùng dòng thời gian mới; "Bỏ qua" và giảm chuyển động hoạt động như cũ.
- [ ] Test cũ của `race-script`, `race-frame`, `race-canvas`, `race-stage` cập nhật theo hành vi mới;
      commit ghi lý do.
- [ ] `pnpm --filter web test`, `typecheck`, `lint` xanh.
