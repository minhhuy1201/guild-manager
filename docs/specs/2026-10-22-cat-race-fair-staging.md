# Đua mèo - Màn diễn không lộ người thắng

Status: approved

Ngày: 2026-10-22 · Nối tiếp: [`2026-10-22-cat-race-drama.md`](2026-10-22-cat-race-drama.md).

Spec này **thay** §1 "Kịch bản chạy" và phần ảnh đích trong §2 "Dòng thời gian một vòng" của spec
drama. Mọi thứ khác của spec drama giữ nguyên: sân khấu, mèo pixel, đếm ngược, nước rút, slow-mo,
thanh đổi ngôi, bảng xếp hạng, thẻ kết quả. Chỉ sửa web; không đổi API, không migration, không đổi
cách server bốc thăm.

Thuật ngữ theo `GLOSSARY.md`: **bốc thăm**, **màn diễn**, **điểm lộ**, **ứng viên**, **ảnh đích**.

## Problem Statement

Admin quay thưởng trước cả guild. Người xem đã nhận ra: con mèo nằm top 3 lúc đầu cuộc đua gần như
chắc chắn thắng. Admin thử 10 vòng với 80 người và thấy đúng như vậy, nên cảm giác "đứng top 3 lúc
xuất phát là thắng".

Bốc thăm vẫn công bằng (server chọn vé bằng nguồn ngẫu nhiên mật mã). Lỗi nằm ở màn diễn:

- Màn diễn chọn một trong ba kịch bản cố định. Con thắng có một đường tốc độ riêng, khác hẳn đàn.
- Giả lập 3000 vòng mỗi kịch bản với 80 mèo: ở kịch bản song mã, con thắng nằm top 3 ở mọi mốc từ 5%
  tới đích trong 100% số vòng; ở photo finish là 100% từ mốc 30%; ở lội ngược dòng thì con thắng luôn
  nằm ngoài top 3 tới 85% rồi vọt lên. Nếu màn diễn không lộ gì, tỉ lệ này chỉ khoảng 3/80.
- Vì vậy người xem đoán được người thắng từ sớm, và tưởng vị trí lúc đầu quyết định giải.
- Ảnh đích, phần người xem thích nhất, chỉ hiện ở kịch bản photo finish, tức khoảng 1/3 số vòng.

## Solution

- **Một quy luật chung cho mọi mèo.** Bỏ ba kịch bản. Trước **điểm lộ** (70% cuộc đua), mọi mèo, kể
  cả con thắng, chạy theo cùng một quy luật ngẫu nhiên. Nhìn đường đua trước 70% không đoán được ai
  thắng hơn đoán mò.
- **Ứng viên cùng nước rút.** Mỗi vòng chọn ngẫu nhiên 2-4 **ứng viên** (khi đủ mèo) về đích sát con
  thắng. Sau điểm lộ, con thắng và các ứng viên cùng rời đàn lao lên, thứ tự giữa họ chỉ ngã ngũ sát
  vạch. Không ai nhận ra người thắng chỉ vì "con này bứt lên".
- **Khoảng cách về đích tự nhiên.** Á quân cách đích từ sát mũi tới khoảng 1-2 thân, nghiêng về phía
  sát.
- **Ảnh đích mọi vòng.** Vòng nào về đích cũng dừng trên ảnh đích 2.6 giây, ghi số thân giữa hai con
  đầu, rồi mới hiện thẻ kết quả.

## User Stories

1. Là người xem, tôi muốn không đoán được người thắng khi nhìn bảng xếp hạng đầu cuộc đua, để cả guild
   hồi hộp tới cuối.
2. Là người xem, tôi muốn con dẫn đầu lúc đầu là một con ngẫu nhiên, để vị trí đầu không mang nghĩa gì.
3. Là người xem, tôi muốn thấy vài con cùng bứt lên ở đoạn cuối, để không ai đoán được người thắng chỉ
   từ cú bứt tốc.
4. Là người xem, tôi muốn có đổi ngôi ở đoạn cuối, để màn nước rút có kịch tính.
5. Là người xem, tôi muốn luôn được xem ảnh đích sau khi về đích, vì đó là khoảnh khắc hay nhất.
6. Là người xem, tôi muốn ảnh đích ghi đúng số thân giữa hai con đầu, kể cả khi cách 1-2 thân.
7. Là người xem, tôi muốn mỗi vòng trông khác nhau, để không học thuộc được mẫu nào.
8. Là người xem trong guild, tôi muốn tin rằng vị trí lúc xuất phát không ảnh hưởng tới giải, để không
   nghi ngờ admin.
9. Là người xem, tôi muốn vị trí mèo trên màn vẫn đúng tiến độ thật, để kết quả minh bạch như trước.
10. Là người xem, tôi muốn không mèo nào chạy lùi, để chuyển động trông tự nhiên.
11. Là người xem, tôi muốn con thắng là con duy nhất chạm vạch khi về đích, để không có hai con cùng
    về.
12. Là admin, tôi muốn con thắng vẫn chạm đích đúng số giây tôi nhập, kể cả có slow-mo.
13. Là admin, tôi muốn người thắng vẫn chỉ do server quyết, để màn diễn không bao giờ đổi kết quả.
14. Là admin, tôi muốn màn đua với 2-3 người vẫn chạy đúng, dù không đủ mèo cho 2-4 ứng viên.
15. Là admin, tôi muốn màn đua với 240 mèo vẫn chạy mượt như hiện nay.
16. Là admin, tôi muốn nút "Bỏ qua" vẫn nhảy thẳng tới thẻ kết quả, không qua ảnh đích.
17. Là người dùng bật giảm chuyển động, tôi muốn thấy kết quả ngay như trước, không có ảnh đích.
18. Là admin, tôi muốn vòng đầu tiên (xem trước trên vạch xuất phát) không đổi gì.
19. Là người bảo trì, tôi muốn một test thống kê chặn lại lỗi lộ người thắng, để lỗi này không quay
    lại.

## Implementation Decisions

### 1. Màn diễn (thay §1 spec drama)

- Giữ khung hiện tại: 8 mốc thời gian chuẩn hoá `0, 0.12, 0.3, 0.5, 0.7, 0.85, 0.94, 1`, giá trị ở
  mỗi mốc = mốc + độ lệch, nội suy monotone cubic, mỗi mốc cao hơn mốc trước ít nhất 0.01, tiến độ
  không giảm, con thắng chạm đúng 1 tại `u = 1`, mọi con khác tối đa 0.9985.
- **Bỏ kịch bản**: xoá type `RaceScenario`, danh sách kịch bản, trường `scenario` của kịch bản đua và
  tham số `scenario` của hàm dựng kịch bản. Bỏ luôn các vai W/R/X, hệ số co giãn vai và nhóm "bám
  đuôi". Tên các vai không còn trong code.
- **Trước điểm lộ** (các mốc `≤ 0.7`): độ lệch của mọi mèo sinh từ cùng một bước ngẫu nhiên có giảm
  chấn và bị chặn (giống đàn hiện nay), **không đọc vai trò của mèo**. Con thắng, ứng viên và đàn đi
  qua cùng một đoạn code với cùng phân phối. Đây là bảo đảm chính của spec.
- Biên độ của đàn trước điểm lộ giữ gần như hiện nay (đàn bám sát tới khoảng 60%). Có thể nới nhẹ nếu
  cần đủ đổi ngôi, nhưng không đổi cấu trúc.
- **Sau điểm lộ** (các mốc `0.85, 0.94, 1`): đường của mỗi mèo hoà dần từ bước ngẫu nhiên về vị trí
  đích của nó.
  - Con thắng: đích = 1.
  - Ứng viên: chọn đều ngẫu nhiên `k` con trong số còn lại, `k` ngẫu nhiên từ 2 tới 4, tối đa bằng số
    mèo còn lại. Con ứng viên đầu tiên là á quân.
  - Á quân hụt đích `g` trong khoảng `0.001-0.02`, phân phối nghiêng về phía nhỏ (ví dụ
    `min + (max - min) · r²`).
  - Mỗi ứng viên tiếp theo hụt thêm một bước ngẫu nhiên nhỏ so với ứng viên trước.
  - Đàn còn lại hụt đích `0.035-0.205` như hiện nay.
- **Đổi ngôi sau điểm lộ**: ở hai mốc `0.85` và `0.94`, độ lệch của con thắng và các ứng viên có thêm
  nhiễu ngẫu nhiên đủ lớn để thứ tự giữa họ xáo trộn trước khi chốt tại vạch.
- Hạn chế đã biết: nội suy monotone cubic dùng độ dốc của đoạn kề, nên đoạn `0.5-0.7` chịu ảnh hưởng
  rất nhỏ từ mốc `0.85`. Bảo đảm "không phân biệt được" đo ở các mốc `≤ 0.5` (xem Testing Decisions).
  Ở `0.7` chỉ xấp xỉ.
- `runnerUpGap` (khoảng á quân hụt đích) vẫn nằm trong kịch bản đua, vì ảnh đích dùng nó để tính số
  thân. Khi chỉ có 1 mèo thì vẫn bằng 1 như hiện nay.
- Hàm xếp hạng dùng chung (`rankAt`, `leaderAt`) không đổi.

### 2. Ảnh đích mọi vòng (thay phần ảnh đích trong §2 spec drama)

- Về đích (`u = 1`): chớp trắng như cũ, rồi **luôn** vào pha ảnh đích, giữ **2.6 giây**, sau đó hiện
  thẻ kết quả.
- Bỏ ngưỡng `0.004`, nhịp giữ 0.9 giây và nhánh "về đích không có ảnh". Pha "về đích thường" rời khỏi
  union pha của dòng thời gian; mọi `switch` trên union đó phải kết thúc bằng `assertNever`.
- Hàm tính thời gian dòng thời gian không còn nhận `runnerUpGap`: thời lượng giữ không còn phụ thuộc
  khoảng cách.
- Sự kiện "về đích" không còn cờ "có ảnh đích hay không"; nó vẫn mang số thân giữa hai con đầu. Lớp
  phủ luôn bật ảnh đích khi nhận sự kiện này.
- Ảnh đích vẫn chỉ vẽ hai con đầu, đọc từ kịch bản, không chép từ đường đua.
- "Bỏ qua" và giảm chuyển động giữ nguyên: không chớp, không ảnh đích, nhảy tới thẻ kết quả.

### 3. Tài liệu

- `GLOSSARY.md` thêm nhóm "Cat race" (đã làm trong buổi chốt quyết định).
- Spec drama thêm một dòng ở đầu trỏ sang spec này cho §1 và phần ảnh đích của §2. Không sửa phần
  còn lại của spec drama.

## Testing Decisions

- Test hành vi nhìn thấy được qua interface công khai, không test hằng số nội bộ hay thứ tự gọi
  `random`. Mọi test dùng `random` có seed để chạy lại được.
- **Seam 1: hàm dựng kịch bản đua + `rankAt`** (lớp `lib/` thuần). Prior art: test kịch bản đua hiện
  có, đã dùng seed và đếm đổi ngôi.
  - Bất biến, với nhiều seed và 2/3/8/80/240 mèo: tiến độ không giảm; bắt đầu 0; con thắng đúng 1 và
    nhất tại `u = 1`; không con nào chạm 1 ngoài con thắng; `runnerUpGap` trong `[0.001, 0.02]` khi có
    từ 2 mèo.
  - **Không lộ người thắng** (test cho lỗi này): 2000 vòng có seed, 80 mèo và 3 mèo, người thắng chọn
    đều ngẫu nhiên. Ở các mốc `0.12, 0.3, 0.5`, tỉ lệ con thắng nằm top 3 cách `3/n` không quá ±3 điểm
    phần trăm (với 3 mèo, top 3 là mọi con nên kiểm thêm tỉ lệ dẫn đầu cách `1/3` không quá ±3 điểm).
    Test này phải đỏ trên code hiện tại.
  - **Còn kịch tính**: trung bình số lần đổi ngôi sau `u = 0.7` ít nhất 1 (80 mèo).
  - **Ứng viên**: với 80 mèo, tại `u = 1` có từ 3 tới 5 mèo (con thắng + 2-4 ứng viên) nằm trong
    khoảng ứng viên xa nhất.
- **Seam 2: dòng thời gian + lớp phủ** (lớp `lib/` thuần). Prior art: test dòng thời gian và test
  lớp phủ hiện có.
  - Sau đích, pha luôn là ảnh đích trong đúng 2.6 giây rồi là "xong", với bất kỳ khoảng cách nào.
  - Sự kiện về đích luôn bật ảnh đích trên lớp phủ, mang đúng số thân.
- Test component hiện có (`race-canvas`, `race-overlays`, `race-stage`) chỉ sửa chỗ đang truyền
  `scenario` hay cờ ảnh đích; không thêm seam mới ở tầng component.
- Kiểm bằng mắt trên trình duyệt thật: 3, 30, 80, 240 mèo, vài vòng mỗi cỡ. Ảnh đích hiện mọi vòng;
  đầu cuộc đua không thấy con nào "rõ là sẽ thắng".

## Out of Scope

- Cách server bốc thăm, API, dữ liệu, migration.
- Thứ tự làn và nút xáo làn (không ảnh hưởng người thắng; giữ nguyên).
- Đồng bộ cùng một màn diễn giữa nhiều máy xem (mỗi máy vẫn tự sinh màn diễn; người thắng vẫn như
  nhau).
- Âm thanh, camera, hình ảnh sân khấu, mèo, bảng xếp hạng, thẻ kết quả.
- Cho admin chọn hoặc xem kiểu màn diễn.

## Further Notes

- Số liệu giả lập ở Problem Statement chạy bằng chính hàm dựng kịch bản đua trong repo (3000 vòng mỗi
  kịch bản, 80 mèo, ngày 2026-10-22).
- Các hệ thống đua ảo có cấp phép cũng bốc kết quả trước rồi dựng màn đua theo kết quả, và cố ý che
  người thắng trong lúc chiếu. Nguồn: USPTO 6921331, 7291070, 5722890, 8795046 (đọc phần tóm tắt).
- Số cụ thể (biên độ đàn, nhiễu sau điểm lộ, bước giữa các ứng viên) chốt khi làm, sao cho test thống
  kê xanh. Nếu không đạt mà phải đổi cấu trúc, cập nhật spec này trước.
