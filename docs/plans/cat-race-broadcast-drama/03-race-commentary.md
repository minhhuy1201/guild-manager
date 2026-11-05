# 03: Bình luận trên màn đua

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Trong lúc đua, một thanh **Commentary** ("BÌNH LUẬN") ở góc dưới trái đường đua kể
diễn biến bằng tiếng Việt. Thanh nằm đúng chỗ và cùng kiểu với thanh "ĐỔI NGÔI": nhãn đỏ sơn mài
"BÌNH LUẬN" và dòng chữ trên nền tối, cỡ chữ to hơn thanh "ĐỔI NGÔI" một chút để đọc được trên stream.
Thanh đứng yên tới khi có câu mới; câu mới hiện lên bằng `race-rise`. Câu "gấp" là chữ vàng, câu
thường là chữ giấy. Thanh có `aria-live="polite"`. Khi bình luận chạy, thanh "ĐỔI NGÔI" không hiện:
xoá `leadToast` khỏi state overlay trước khi đưa cho `RaceOverlays`. Live region sẵn có của
`RaceOverlays` vẫn giữ. Ở ticket này bình luận luôn bật; công tắc là ticket 04. Bình luận chạy giống
hệt ở chế độ toàn màn hình.

Logic là một bộ nhớ thuần trong `lib/`. Có hai đầu vào: một `RaceCue` và một lần cập nhật bảng
(`RaceStanding[]`), mỗi lần kèm thời điểm (ms). Kết quả là bộ nhớ mới và có thể kèm một dòng
`{ text, isHype }`. Nguồn ngẫu nhiên được truyền vào. Một hook mỏng giữ bộ nhớ cho mỗi vòng, reset khi
vòng mới bắt đầu, và nhận nhãn mèo (`catLabels`) cùng thời lượng đua. Quy tắc, đầy đủ trong spec
(mục Implementation Decisions):

- Câu gấp hiện ngay: `go`, `sprint`, `slow-motion` bật, `finish`, và đổi ngôi từ hạng 5 trở xuống.
- Câu thường cách câu trước ít nhất 2,2 giây, không thì bị bỏ.
- `lead-change`: nếu 3 giây trước mèo đó đứng hạng ≥5 thì nói "{tên} từ hạng {X} vọt lên dẫn đầu!";
  không thì chọn một câu đổi ngôi thường.
- Bảng: sau 25% chặng, mèo nào lên ≥4 hạng trong 3 giây và vào top 3 thì "Chú ý {tên}! Từ cuối đoàn
  lên hạng {r}!" (mỗi mèo một lần). Sau 45% chặng thì "Nửa chặng đường..." một lần, kèm hai mèo đầu.
  Từ 55% đến 80% chặng, nếu mèo thứ ba kém đầu dưới 1 thân thì "Ba chú mèo dính nhau như sam!" một
  lần. Phần trăm chặng tính từ lúc `go` chia cho thời lượng.
- `finish`: kém dưới 0,5 thân thì "Sát nút! Phải soi ảnh đích!", còn lại "Về đích! Chờ trọng tài xác
  nhận...". Không bao giờ nêu tên.
- `countdown` không có lời bình.

Bản tham chiếu đang chạy (hook ghép cả bộ nhớ vào React) nằm ở `features/cat-race/prototype/`:
`use-race-commentary.ts` và `race-commentary-bar.tsx`. Bản thật tách phần thuần ra `lib/` để test
được. Keyframes và thời lượng của thanh dùng các biến `--stage-*` sẵn có (`race-rise`,
`--stage-rise-duration`), đúng quy ước overlay sân khấu trong `.claude/rules/web/interaction.md`.

**Blocked by:** None (can start immediately)

**Model:** sonnet - quy tắc bình luận mới, overlay mới, nối vào `RaceStage`

**Status:** todo

- [ ] Test lib (nguồn ngẫu nhiên có seed như `seeded-random.ts`) cho từng quy tắc trên, có test câu thường bị bỏ khi chưa đủ 2,2 giây, câu gấp không bị chặn, và câu `finish` không chứa tên mèo nào
- [ ] Test `RaceStage` (canvas đã mock, bắn `onCue`/`onStandings`): khi đua, thanh bình luận hiện câu theo cue `go` và `lead-change`; thanh "ĐỔI NGÔI" không hiện
- [ ] Bình luận reset khi bấm "Đua tiếp" rồi đua vòng mới
- [ ] Thanh bình luận chỉ hiện khi đang đua (không ở vạch xuất phát, không trên thẻ người thắng)
- [ ] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
