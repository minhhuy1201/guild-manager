# Đua mèo - Màn đua kịch tính kiểu giang hồ

Ngày: 2026-10-22 · Trạng thái: **approved** (người dùng duyệt prototype và cho làm thẳng, 2026-10-22)
· Nối tiếp: [`2026-10-15-cat-race-redesign.md`](2026-10-15-cat-race-redesign.md).
· §1 "Kịch bản chạy" và phần ảnh đích của §2 bị thay bởi
[`2026-10-22-cat-race-fair-staging.md`](2026-10-22-cat-race-fair-staging.md).

Spec này **thay** phần kịch bản chạy (§3 "Quy tắc kịch bản" về dao động đều), đếm ngược 1.5 giây,
nhịp giữ 0.8 giây sau đích và thẻ kết quả của spec trước. Giữ nguyên R1-R8: mỗi mèo một làn, mọi mèo
trên cùng một vạch, vị trí trên màn = tiến độ thật, tên luôn hiện, thời lượng nhập 10-40 giây, bảng
xếp hạng liệt kê toàn bộ mèo. Chỉ sửa web; không đổi API, không migration.

**Nguồn sự thật về hình ảnh:** prototype đã duyệt,
[`assets/2026-10-22-cat-race-drama-prototype.html`](assets/2026-10-22-cat-race-drama-prototype.html)
(mở trực tiếp bằng trình duyệt). Khi spec và prototype lệch nhau về hình ảnh, màu, nhịp, chữ, thì
prototype thắng, trừ các chỗ ghi rõ ở mục "Khác với prototype".

## Problem Statement

Admin dùng màn đua mèo để quay thưởng trước cả guild. Màn đua hiện tại đơn điệu, không ai thấy hồi
hộp:

- Mèo chạy gần như đều tốc (tiến độ tuyến tính cộng dao động tối đa 4%). Con thắng có thời gian về
  đích ngắn nhất nên dẫn đầu gần như từ giây đầu; đàn kéo giãn ngay từ đầu. Người xem đoán được ai
  thắng từ sớm.
- Đường đua là nền phẳng theo theme, sọc làn 6%, một vạch xuất phát và hai cột ca-rô. Không bối cảnh,
  không cảm giác tốc độ.
- Mèo là sprite 2 frame, chỉ chân động.
- Đếm ngược là một ô số tĩnh; về đích giữ 0.8 giây rồi hiện thẻ ngay, không có khoảnh khắc "ai về
  nhất?".
- Bảng xếp hạng nhảy cóc; thẻ kết quả và confetti giống nhau cho mọi bậc giải.

## Solution

Hướng đã chốt: **A - giang hồ pixel** cho hình ảnh, cộng **cơ chế kịch tính kiểu truyền hình (C)**.
Không âm thanh.

- **Kịch bản theo pha**: mỗi mèo có đường tốc độ riêng qua các mốc; mỗi vòng chọn ngẫu nhiên một
  trong ba kịch bản (lội ngược dòng, song mã, photo finish). Đàn bám sát tới khoảng 60%, đổi ngôi
  nhiều lần ở cuối. Người thắng vẫn do server quyết; chỉ phần dàn dựng đổi.
- **Cao trào**: đếm ngược bằng 3 đèn lồng, "CHẠY!", banner "NƯỚC RÚT" ở 84%, slow-mo khoảng ×3 cùng
  viền tối từ 90%, chớp trắng khi về đích, ảnh đích phóng to khi về sát nút.
- **Sân khấu cố định một màu** (không theo theme sáng/tối): trời hoàng hôn, núi và chùa, dây đèn lồng,
  khán giả pixel sau hàng rào nhún theo độ hồi hộp, cổng tam quan ở đích, cờ mốc 25/50/75%.
- **Mèo pixel mới**: 4 frame phi nước đại, thân nhún, sọc vằn, phụ kiện theo phái, vương miện cho con
  dẫn đầu, bụi và vệt gió.
- **Kiểu truyền hình**: thanh "TRỰC TIẾP" phía trên, thanh "ĐỔI NGÔI" khi con nhất đổi, bảng xếp hạng
  trượt mượt với ▲▼ và khoảng cách tính bằng thân mèo.
- **Thẻ kết quả theo nhịp**: tên người thắng đập vào màn, tỉ lệ thắng, top 2-3, tem "KÈO DƯỚI",
  confetti theo bậc giải.

## User Stories

1. Là admin, tôi muốn mỗi vòng đua có diễn biến khác nhau, để cả guild không đoán trước được ai thắng.
2. Là người xem, tôi muốn đàn mèo bám sát nhau tới giữa đường, để còn hy vọng mèo của mình.
3. Là người xem, tôi muốn thấy con dẫn đầu đổi nhiều lần ở đoạn cuối, để thấy hồi hộp.
4. Là người xem, tôi muốn có vòng "lội ngược dòng" nơi con đang ở cuối đàn bứt lên về nhất.
5. Là người xem, tôi muốn có vòng "song mã" hai con giằng co tới vạch đích.
6. Là người xem, tôi muốn có vòng về sát nút, được xem ảnh đích phóng to rồi mới biết ai thắng.
7. Là người xem, tôi muốn vị trí mèo trên màn vẫn đúng tiến độ thật, để kết quả minh bạch như trước.
8. Là người xem, tôi muốn không mèo nào chạy lùi, để chuyển động trông tự nhiên.
9. Là admin, tôi muốn con thắng vẫn chạm đích đúng số giây tôi nhập, kể cả có slow-mo.
10. Là người xem, tôi muốn đếm ngược 3-2-1 bằng đèn lồng sáng dần rồi chữ "CHẠY!", để biết lúc xuất
    phát.
11. Là người xem, tôi muốn banner "NƯỚC RÚT" khi vào đoạn cuối, để biết sắp có kết quả.
12. Là người xem, tôi muốn đoạn cuối chạy chậm lại với viền tối và nhãn "CHẬM ×3", để kịp nhìn.
13. Là người xem, tôi muốn chớp trắng lúc con đầu chạm đích.
14. Là người xem, tôi muốn thanh "ĐỔI NGÔI · <tên> vượt lên dẫn đầu" khi con nhất đổi, nhưng không
    nhấp nháy liên tục.
15. Là người xem, tôi muốn nhận ra ngay con đang dẫn đầu nhờ vương miện, làn sáng vàng và tên vàng.
16. Là người xem, tôi muốn thấy thứ hạng hiện tại của từng mèo ngay ở cột tên.
17. Là người xem, tôi muốn đường đua có bối cảnh giang hồ (trời, núi, chùa, đèn lồng, khán giả, cổng
    đích), để màn quay thưởng có không khí.
18. Là người xem, tôi muốn khán giả nhún mạnh dần khi tới nước rút và lúc về đích.
19. Là người xem, tôi muốn thấy cờ mốc 25/50/75% để ước lượng còn bao xa.
20. Là người xem, tôi muốn mèo chạy có nhịp chân, nhún người, bụi sau chân và vệt gió khi bứt tốc, để
    thấy tốc độ.
21. Là người xem, tôi muốn mèo mỗi phái mang phụ kiện riêng, để phân biệt phái không chỉ bằng màu.
22. Là người xem, tôi muốn bảng xếp hạng trượt mượt khi đổi chỗ, có ▲▼ và khoảng cách tới con nhất
    tính bằng thân mèo.
23. Là người xem, tôi muốn top 3 trên bảng có màu huy chương vàng, bạc, đồng.
24. Là người xem, tôi muốn thanh "TRỰC TIẾP" nhấp nháy và đồng hồ chạy trong lúc đua.
25. Là người xem, tôi muốn thấy hạng mục, bậc giải, số người và số vé ngay trên đường đua.
26. Là người thắng, tôi muốn tên mình hiện thật to trên thẻ kết quả.
27. Là người xem, tôi muốn thẻ kết quả ghi tỉ lệ thắng, để biết thắng khó cỡ nào.
28. Là người xem, tôi muốn tem "KÈO DƯỚI" khi người thắng có ít vé hơn mức trung bình.
29. Là người xem, tôi muốn thấy hạng 2 và hạng 3 trên thẻ kết quả.
30. Là admin, tôi muốn giải Đặc biệt có confetti hoành tráng hơn giải Thường.
31. Là admin, tôi muốn "Bỏ qua" vẫn nhảy thẳng tới thẻ kết quả, kể cả lúc đang đếm ngược hay xem ảnh
    đích.
32. Là người dùng bật giảm chuyển động, tôi muốn vẫn thấy kết quả ngay, không chạy đua (như cũ).
33. Là admin, tôi muốn 240 mèo vẫn chạy mượt khoảng 60fps trên laptop phổ thông.
34. Là admin trên điện thoại, tôi muốn sân khấu vẫn đủ chỗ cho tên (dải trời thấp hơn).
35. Là admin, tôi muốn xáo trộn làn và nhập thời lượng như cũ.
36. Là người xem lúc chưa đua, tôi muốn thấy mèo đứng ở vạch xuất phát trên sân khấu, đèn lồng đung đưa
    và khán giả nhún nhẹ.

## Implementation Decisions

### 1. Kịch bản chạy (thay dao động đều)

- Mỗi mèo có một **đường tiến độ** qua 8 mốc thời gian chuẩn hoá `0, 0.12, 0.3, 0.5, 0.7, 0.85, 0.94,
  1`. Giá trị ở mỗi mốc = mốc + độ lệch. Nội suy giữa các mốc bằng **monotone cubic
  (Fritsch-Carlson)** nên tiến độ không bao giờ giảm. Sau khi cộng độ lệch, mỗi mốc ép lớn hơn mốc
  trước ít nhất 0.01.
- Con thắng kết thúc đúng 1. Mọi con khác kết thúc tối đa 0.9985, nên tại lúc con thắng chạm đích
  không con nào ≥ nó (giữ quy tắc spec trước).
- **Kịch bản** là một type alias `RaceScenario = "comeback" | "duel" | "photo"`. Mỗi vòng chọn ngẫu
  nhiên phía client (server chỉ chọn người thắng, D4 spec gốc). Tên kịch bản không hiện cho người xem.
- Vai: con thắng `W`; con đầu tiên trong đàn đã xáo là `R` (á quân); con thứ hai là `X` (ngựa ô của
  lội ngược dòng / con bám thứ ba của photo finish); ba con tiếp theo là "bám đuôi"; còn lại là đàn.
  Độ lệch của các vai (trừ mốc cuối) nhân chung một hệ số ngẫu nhiên `0.85-1.15` cho cả vòng, để các
  vòng không giống hệt nhau mà vẫn giữ thứ tự đổi ngôi.
- Bảng độ lệch, lấy từ prototype (mốc cuối = tiến độ cuối trừ 1):

  ```ts
  comeback: W [0, -0.015, -0.04, -0.05, -0.02, 0.02, 0.012, 0]
            R [0, 0, 0.01, 0.02, 0.055, 0.035, 0.009, -0.012]
            X [0, 0.03, 0.05, 0.055, 0.045, 0.03, 0.005, -0.02]
  duel:     W [0, 0.02, 0.04, 0.03, 0.045, 0.03, 0.012, 0]
            R [0, 0.025, 0.035, 0.045, 0.035, 0.04, 0.01, -0.012]
  photo:    W [0, 0.01, 0.02, 0.03, 0.03, 0.02, 0.006, 0]
            R [0, 0.012, 0.025, 0.028, 0.033, 0.022, 0.007, -0.0025]
            X [0, 0.005, 0.015, 0.025, 0.028, 0.018, 0.004, -0.008]
  ```

- Độ lệch của đàn và con bám đuôi (từ prototype): tiến độ cuối của đàn `-(0.035..0.205)`, con bám đuôi
  `-(0.012..0.037)`. Ở mỗi mốc giữa: bước ngẫu nhiên `z = 0.6 z + U(-0.9, 0.9)`,
  `spread = 0.01 + 0.03u`, `cap = 0.012 + 0.018u`, độ lệch thô `cap · tanh(z · spread / cap)`, rồi
  trộn dần về tiến độ cuối với trọng số `smoothstep(0.55, 1, u)`. Đàn nhờ vậy bám sát tới khoảng 60%
  và chỉ tách ra ở cuối.
- Thứ hạng tại một thời điểm vẫn là một hàm dùng chung cho đường đua, bảng xếp hạng và ảnh đích:
  sắp theo tiến độ giảm dần; tiến độ bằng nhau thì theo khoá.
- Số đo kiểm chứng trên prototype (200 vòng/kịch bản, 30 và 240 mèo): 0 vi phạm đơn điệu, người thắng
  luôn nhất; số lần đổi ngôi trung bình: lội ngược dòng 2.0, song mã 5.0, photo finish khoảng 3.2.
- Interface: `buildRaceScript` nhận thêm `scenario` (tuỳ chọn; thiếu thì chọn ngẫu nhiên bằng
  `random`) và trả về kịch bản mang `scenario` và đường tiến độ của từng mèo thay cho `CatMotion`.
  Hàm tiến độ nhận thời điểm đua chuẩn hoá `u ∈ [0, 1]`.

### 2. Dòng thời gian một vòng

Một module thuần mới quy đổi thời gian thật (từ lúc bắt đầu đếm ngược) ra pha và thời điểm đua.

- **Đếm ngược**: 3 bước × 0.8 giây = 2.4 giây (thay 1.5 giây). Bước `i` hiện số `3 - i` và thắp đèn
  lồng thứ `0..i`; đèn thứ ba màu vàng.
- **Chạy**: thời gian thật `f = t / duration`. Với `f < 0.74`: `u = f / 0.74 · 0.9`; từ `0.74`:
  `u = 0.9 + (f - 0.74) / 0.26 · 0.1`. Đoạn `u ∈ [0.9, 1]` chiếm 26% cuối thời gian thật, tức chậm
  khoảng ×3. Con thắng chạm đích đúng `duration` giây sau "CHẠY!" (giữ R3).
- **Nước rút**: lần đầu `u ≥ 0.84` thì hiện banner "NƯỚC RÚT".
- **Slow-mo**: trong lúc `u ≥ 0.9` thì có viền tối và nhãn "CHẬM ×3".
- **Về đích** (`u = 1`): chớp trắng. Nếu á quân cách đích dưới **0.004** tiến độ thì vào **ảnh đích**
  2.6 giây, ngược lại giữ 0.9 giây; xong thì hiện thẻ kết quả.
- **Đổi ngôi**: khi con nhất đổi và `u > 0.08` thì đếm một lần đổi ngôi. Thanh "ĐỔI NGÔI" hiện 1.5
  giây; hai lần hiện cách nhau ít nhất 1.3 giây.
- **Bỏ qua** ở bất kỳ pha nào trước thẻ kết quả: nhảy thẳng tới thẻ kết quả, không chớp, không ảnh đích.
- **Giảm chuyển động**: như cũ, hiện kết quả ngay.
- Đường đua báo cho màn đua các **sự kiện** dưới dạng union có tag, xử lý bằng switch kết thúc
  `assertNever`: đếm ngược (bước), xuất phát, đổi ngôi (khoá mèo), nước rút, bật/tắt slow-mo, về đích
  (có ảnh đích hay không). Lớp phủ DOM do màn đua vẽ theo các sự kiện này; canvas không còn tự vẽ đếm
  ngược.

### 3. Sân khấu (canvas)

- **Bảng màu cố định**, giống nhau ở cả hai theme (`display.md` cho phép màu cố định khi thứ đó giống
  hệt ở hai theme). Màu lấy từ prototype: đêm `#1b1424`, giấy `#f3e9d2`, giấy mờ `#b9ab90`, sơn mài
  `#c8372d`, vàng `#e8b84a`, ngọc `#4fae8c`, gỗ `#2b1f1a`, đất `#6a4a35`/`#5e4130`. Canvas đọc chúng
  từ một bảng hằng trong `lib/`; lớp phủ DOM đọc từ các biến CSS khai báo một lần trong `globals.css`
  dưới một scope riêng của sân khấu. Canvas thôi đọc token theme và thôi theo dõi đổi theme.
- **Dải trời** cao 94px (66px khi rộng < 600px), vẽ sẵn ra canvas phụ khi đổi kích thước: gradient
  hoàng hôn, trăng, hai lớp núi, chùa ba tầng. Mỗi khung hình vẽ thêm: dây đèn lồng đung đưa (mỗi
  140px một đèn, có quầng sáng); khán giả hai hàng sau hàng rào gỗ, nhún theo **độ phấn khích**: chờ
  0.5, đếm ngược 1.6, đang chạy 1.2, nước rút 3.2, về đích và sau đó 4 (từ 3 trở lên thì giơ tay);
  cờ mốc 25/50/75% có nhãn; cột xuất phát; cổng tam quan tại đích với biển "ĐÍCH"; bảng gỗ trên cột
  tên ghi "ĐUA MÈO" và "n mèo · m người".
- **Làn**: đất xen hai tông, đốm đất cố định theo làn, vạch chia làn nét đứt, nét đứt dọc ở mốc
  25/50/75%, làn của con dẫn đầu phủ gradient vàng, vạch xuất phát màu giấy, vạch đích ca-rô 3 cột ô
  6px. Chiều cao làn `22..56px`. Cột tên 20% chiều rộng, kẹp `108..196px`. Lề sau đích 46px.
- **Cột tên** nền gỗ, viền vàng mờ: ô màu phái, tên (con dẫn đầu: vàng, đậm), và khi đang đua thì số
  hạng ở mép phải (top 3 màu vàng).
- Vẫn chỉ vẽ những làn đang trong khung nhìn; vẫn có `?fps`.
- Chữ hiển thị trên sân khấu dùng **Bungee** (nạp bằng `next/font` ngay trong feature, chỉ trang đua
  mèo tải); chữ thường dùng Be Vietnam Pro sẵn có.

### 4. Mèo

- Sprite 14 × 10 ô: 2 hàng phụ kiện theo phái ở trên, 6 hàng thân (có 3 sọc vằn màu thân tối hơn
  28%), 2 hàng chân. 4 frame chân (duỗi, giữa, gom, giữa). Phụ kiện: Cửu Linh quả cầu, Huyết Hà lông
  vũ đỏ, Long Ngâm sừng vàng, Thần Tướng nón lá, Thiết Y mũ sắt, Toái Mộng trăng khuyết, Tố Vấn hoa, Huyền Cơ ngôi sao.
  Bản vẽ từng ô lấy đúng từ prototype.
- Nhịp chân theo thời gian đua (nên chậm lại trong slow-mo); frame chẵn thân nhún lên. Lúc chờ: đứng
  frame 0.
- Con dẫn đầu đội vương miện pixel vàng có viên đỏ.
- Vệt gió khi tốc độ tức thời > 1.12 lần tốc độ đều. Bụi sau chân, tối đa 420 hạt, tỉ lệ sinh giảm
  theo số mèo để 240 mèo vẫn mượt.
- Bộ nhớ đệm sprite theo (phái, chiều rộng, frame) như cũ.

### 5. Thanh truyền hình và bảng xếp hạng

- **Thanh trên sân khấu** (thay dòng "Hạng mục: … · n người"): nhãn "TRỰC TIẾP" (nhấp nháy khi đang
  đua, xám khi không), tên hạng mục kèm icon và màu bậc, "n người · m vé" (chế độ Vé) hoặc "n người",
  đồng hồ giây chạy trong lúc đua.
- **Bảng xếp hạng**: hàng trượt tới chỗ mới trong 280ms (FLIP, chỉ `transform`); ▲ ngọc / ▼ sơn mài
  so với lần cập nhật trước; khoảng cách tới con nhất "-1,2" tính bằng thân mèo (một chữ số thập phân,
  dấu phẩy); số hạng top 3 nền vàng, bạc, đồng; hàng dẫn đầu nền ấm. Cập nhật mỗi 300ms. Đường đua
  gửi kèm khoảng cách theo thân vì nó phụ thuộc chiều rộng canvas. Bảng dùng màu sân khấu.

### 6. Thẻ kết quả

- Lớp phủ tối trên sân khấu; thẻ viền và quầng sáng theo màu bậc (Đặc biệt vàng, Lớn ngọc, Thường
  giấy mờ). Các dòng hiện lần lượt (60, 260, 520, 680, 900, 1100ms); tên người thắng "đập" vào (phóng
  từ 2.2 về 1).
- Thứ tự dòng: bậc + hạng mục ("GIẢI ĐẶC BIỆT · <tên giải>", icon bậc của R5); avatar Discord và tên
  người thắng (Bungee, cỡ lớn); phái (kèm "mèo #n" khi người đó có nhiều vé); tỉ lệ ("Thắng với x/y vé
  · tỉ lệ z%" chế độ Vé, "Thắng giữa n người · tỉ lệ z%" chế độ thường, z một chữ số thập phân); hạng
  2 và 3; nút "Đua tiếp".
- Tem "KÈO DƯỚI" khi tỉ lệ thắng < 1 / số người và số người > 2.
- Confetti theo bậc: Đặc biệt 140 hạt giữa + 2 pháo 90 hạt từ hai bên sau 350ms, màu vàng/kem/sơn mài;
  Lớn 140 hạt màu ngọc/kem; Thường 70 hạt màu giấy. Giảm chuyển động: không confetti (như cũ).

### 7. Quy ước bị nới, ghi vào rule

- `interaction.md` §Motion chỉ cho 4 token thời lượng và cấm `scale`. Sân khấu đua mèo là màn trình
  diễn, nên lớp phủ của nó (đếm ngược, banner, thanh đổi ngôi, chớp, ảnh đích, thẻ kết quả, FLIP bảng
  xếp hạng) **được có keyframe và thời lượng riêng**, khai báo một lần trong `globals.css`. Ngoại lệ
  này ghi thành một gạch đầu dòng trong `interaction.md`, lý do ghi trong `docs/frontend.md`.
  Giảm chuyển động vẫn do quy tắc chung cuối `globals.css` xử lý.
- Bảng màu sân khấu là màu cố định hợp lệ theo `display.md` (giống nhau ở hai theme); ghi một dòng
  vào `display.md`.

### Khác với prototype (cố ý)

- Người thắng do server chọn; prototype bốc ngẫu nhiên trong trang.
- Thẻ kết quả giữ avatar Discord (prototype không có dữ liệu avatar) và icon bậc của R5 (prototype
  dùng ký tự ♛ ◆ ✦ thay tạm).
- Khu điều khiển (thời lượng, xáo trộn, ĐUA, Bỏ qua, danh sách) giữ component của app; prototype có
  ô chọn số mèo và kịch bản chỉ để thử.
- Khung "Trạng thái prototype" không lên bản thật; `?fps` vẫn còn.

## Testing Decisions

- Test hành vi nhìn thấy được, không test chi tiết vẽ. Lớp `lib/` thuần test trước (`tests.md`).
- **Kịch bản**: với nhiều seed, mọi kịch bản, 2/8/30/240 mèo: tiến độ không giảm; bắt đầu 0; người
  thắng đúng 1 và nhất tại `u = 1`; không con nào ≥ người thắng tại `u = 1`; mỗi kịch bản có ít nhất
  số lần đổi ngôi mong đợi (lội ngược dòng ≥ 1, song mã ≥ 3, photo finish ≥ 2); photo finish luôn
  dưới ngưỡng ảnh đích, hai kịch bản kia luôn trên. Prior art: `race-script.test.ts`.
- **Dòng thời gian**: quy đổi thời gian thật → pha và `u` ở các mốc biên (0, 2.4 giây, 74%, đúng
  `duration`, giữ 0.9 / 2.6 giây). Test thuần.
- **Đường đua**: sự kiện phát đúng thứ tự (đếm ngược 3 bước → xuất phát → nước rút → slow-mo → về
  đích) và đúng một lần; bỏ qua vẫn kết thúc một lần; chỉ vẽ làn trong khung nhìn với 240 mèo. Prior
  art: `race-canvas.test.tsx` với context 2D giả và `requestAnimationFrame` chạy tay. Test "đọc lại
  bảng màu khi đổi theme" bỏ vì sân khấu không theo theme nữa.
- **Màn đua**: lớp phủ phản ứng theo sự kiện (đèn lồng, banner, thanh đổi ngôi, slow-mo, ảnh đích),
  bỏ qua nhảy tới thẻ, giảm chuyển động hiện thẻ ngay. Prior art: `race-stage.test.tsx`.
- **Bảng xếp hạng**: thứ tự, ▲▼, khoảng cách theo thân, top 3. **Thẻ kết quả**: tỉ lệ ở hai chế độ,
  tem kèo dưới đúng ngưỡng, hạng 2-3, confetti theo bậc. Prior art: `winners-and-result.test.tsx`.
- Kiểm bằng mắt trên trình duyệt thật: 2, 30, 80, 240 mèo; 360px và 1440px; theme sáng và tối (sân
  khấu phải giống hệt); đối chiếu với prototype.

## Out of Scope

- Âm thanh (vẫn như spec gốc Q15).
- Camera bám theo, zoom, loại dần (R1 giữ nguyên).
- Hiện tên kịch bản cho người xem; cho admin chọn kịch bản.
- Thay đổi API, dữ liệu, cách server chọn người thắng.
- Bảng người thắng dưới màn đua (R7) và khu điều khiển: giữ nguyên.

## Further Notes

- Prototype nằm cạnh spec để người đọc PR sau này mở được; nó là code vứt đi, không import ở đâu.
- Ngưỡng 0.004 cho ảnh đích tính theo tiến độ, không theo thân mèo: số thân phụ thuộc chiều rộng màn
  hình, làm cùng một vòng có ảnh đích trên laptop mà không có trên điện thoại.
