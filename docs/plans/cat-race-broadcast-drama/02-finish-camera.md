# 02: Finish camera trong canvas gốc

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Ở đoạn cuối mỗi vòng đua, đường đua giãn dần về phía vạch đích, để khoảng cách ở
nhóm đầu rộng ra mà mèo không bị phóng to. Từ 80% đến 93% thời gian đua (race time `u`), quãng đường
phía sau điểm đích giãn dần từ ×1 lên ×2 theo đường smoothstep. Điểm đích (mũi mèo ở tiến độ 1)
không dịch chuyển. Cột tên, dải trời và đám đông vẫn vẽ bằng layout thật, nên tên luôn thẳng hàng với
làn. Ở chế độ canvas `finish` (đường đua đứng yên sau thẻ người thắng), camera ở mức giãn tối đa để
khớp khung cuối cùng của cuộc đua. Chế độ `start` (vạch xuất phát) không giãn. Khi người xem bật
reduced motion thì không giãn. Không có công tắc.

Thuật toán đã chốt, lấy từ prototype (`features/cat-race/prototype/finish-camera.ts` còn đó tới
ticket 06; bản copy canvas `prototype/camera-race-canvas.tsx` cho thấy 3 chỗ cần nối: tính layout
camera trong hàm vẽ một khung, đưa nó cho phần vẽ đường đua và cho `frameAt`, còn phần vẽ tên giữ
layout thật):

```ts
// from the prototype
const CAMERA_FROM_U = 0.8, CAMERA_FULL_U = 0.93, CAMERA_STRETCH = 2;
stretch = 1 + (CAMERA_STRETCH - 1) * smoothstep((u - CAMERA_FROM_U) / (CAMERA_FULL_U - CAMERA_FROM_U));
finishPoint = layout.startX + layout.travel;
camera = { ...layout, startX: finishPoint - layout.travel * stretch, travel: layout.travel * stretch };
```

Đặt hàm này là một hàm thuần riêng trong `lib/` của feature, với các ngưỡng được đặt tên (không dùng
số trần).

**Blocked by:** None (can start immediately)

**Model:** sonnet - thêm logic mới (hàm layout camera) và nối vào canvas

**Status:** done (visual check pending: run by the user before the PR)

- [x] Hàm layout camera có test: trước 80% trả về đúng layout gốc; từ 93% trở đi `travel` gấp đôi; điểm đích (`startX + travel`) không đổi ở mọi `u`; tắt thì trả về layout gốc; `u` giữa 80% và 93% cho độ giãn nằm giữa 1 và 2, tăng dần
- [x] Canvas dùng layout camera cho đường đua và vị trí mèo khi phát lại một vòng đua và ở chế độ `finish`; cột tên và dải trời giữ layout thật
- [x] Reduced motion thì canvas không giãn
- [x] Test canvas hiện có vẫn xanh
- [ ] Chạy app xem bằng mắt (`pnpm --filter web dev`, mở một đợt đua): đoạn cuối giãn ra, tên vẫn khớp làn, không mèo nào ra khỏi khung
- [x] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
