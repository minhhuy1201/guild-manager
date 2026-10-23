# Đua mèo toàn màn hình (focus mode)

Status: approved

## Problem Statement

Admin chạy đua mèo rồi chia sẻ màn hình lên Discord cho cả bang xem. Trang đua hiện có rất nhiều
thứ chỉ dành cho admin: header đợt đua, nút kết thúc đợt, chip hạng mục có nút sửa/xoá, ô thời
lượng, nút sửa danh sách đua, bảng người thắng phía dưới. Đường đua chỉ cao `70dvh` và bị bao bởi
header của trang và trình duyệt. Người xem trên Discord thấy một trang quản trị có một khung đua ở
giữa, chữ nhỏ, khó tập trung vào cuộc đua.

## Solution

Màn đua có thêm nút **"Toàn màn hình"** (phím tắt `F`), giống màn xếp đội ở PR 219. Bấm vào thì
cuộc đua phủ kín màn hình và trình duyệt cũng vào chế độ toàn màn hình, như một buổi phát sóng:

- Trên cùng là thanh phát sóng (TRỰC TIẾP, hạng mục, số người/vé, đồng hồ), to hơn bản thường. Tên
  hạng mục trên thanh là một ô chọn, để đổi hạng mục mà không phải thoát.
- Bên dưới: đường đua chiếm gần hết bề ngang và toàn bộ chiều cao còn lại. Bảng xếp hạng nằm bên
  phải, cao hết màn hình.
- Các nút Xáo trộn / ĐUA / Bỏ qua nằm trên một tấm nổi ở đáy đường đua. Khi đang đua mà chuột đứng
  yên thì tấm này và con trỏ chuột ẩn đi, để người xem chỉ thấy cuộc đua.

Thoát bằng `Esc` hoặc nút ✕. Cuộc đua đang chạy vẫn chạy tiếp khi vào hoặc thoát.

## User Stories

1. Là admin, tôi muốn một nút "Toàn màn hình" ngay trên màn đua, để vào chế độ trình chiếu bằng
   một cú bấm.
2. Là admin, tôi muốn bấm `F` để vào chế độ toàn màn hình, để khỏi phải tìm nút.
3. Là admin, tôi muốn phím `F` không có tác dụng khi tôi đang gõ trong ô thời lượng hay trong một
   hộp thoại, để gõ chữ "f" không bật nhầm chế độ.
4. Là admin, tôi muốn nút hiện cap phím `F`, để biết có phím tắt.
5. Là admin, tôi muốn trình duyệt cũng ẩn thanh địa chỉ và tab, để người xem Discord chỉ thấy
   cuộc đua.
6. Là admin, tôi muốn chế độ này vẫn chạy khi trình duyệt từ chối toàn màn hình thật, để không gặp
   lỗi chỉ vì một quyền của trình duyệt.
7. Là người xem trên Discord, tôi muốn đường đua lớn nhất có thể, để nhìn rõ từng con mèo dù
   stream bị nén.
8. Là người xem, tôi muốn thấy thanh TRỰC TIẾP, tên hạng mục, số người và đồng hồ ở trên cùng, để
   biết đang đua giải gì.
9. Là người xem, tôi muốn chữ trên thanh phát sóng và bảng xếp hạng to hơn bản thường, để đọc được
   trên stream.
10. Là người xem, tôi muốn bảng xếp hạng cao hết màn hình bên phải, để thấy được cả đoàn đua.
11. Là người xem, tôi muốn đếm ngược, banner, ảnh về đích và thẻ người thắng hiện như bản thường,
    để không bỏ lỡ khoảnh khắc nào.
12. Là người xem, tôi muốn không thấy các nút quản trị (sửa, xoá, kết thúc đợt, thời lượng), để
    màn hình giống một buổi phát sóng.
13. Là admin, tôi muốn đổi hạng mục ngay trên thanh trên, để đua nhiều hạng mục liên tiếp mà không
    phải thoát ra.
14. Là admin, tôi muốn hạng mục không đua được vẫn có trong ô chọn nhưng bị làm mờ kèm lý do, để
    biết vì sao không chọn được.
15. Là admin, tôi muốn ô chọn hạng mục bị khoá khi đang rút hoặc đang đua, giống chip hạng mục ngoài
    trang thường.
16. Là admin, tôi muốn bấm Xáo trộn và ĐUA ngay trong chế độ này, như ngoài trang thường.
17. Là admin, tôi muốn dòng lý do khoá (vd. đã đủ giải) hiện dưới nút ĐUA, để biết vì sao nút bị
    khoá.
18. Là admin, tôi muốn bấm Bỏ qua hoặc phím `S` khi đang đua, để nhảy thẳng tới thẻ người thắng.
19. Là admin, tôi muốn phím `S` chạy cả ở trang thường và nút Bỏ qua hiện cap `S`.
20. Là admin, tôi muốn phím `S` không có tác dụng khi tôi đang gõ, khi có phím bổ trợ, hoặc khi
    không có cuộc đua nào đang chạy.
21. Là admin, tôi muốn không có phím tắt cho ĐUA, vì bấm nhầm là mất một vòng rút thật.
22. Là admin, tôi muốn tấm nút và con trỏ chuột tự ẩn sau 2 giây chuột đứng yên khi đang đua, để
    người xem không thấy chúng.
23. Là admin, tôi muốn tấm nút và con trỏ hiện lại ngay khi tôi rê chuột, để bấm được Bỏ qua.
24. Là admin, tôi muốn tấm nút luôn hiện khi chưa đua và khi đang rút, để bấm được ĐUA. Khi đang
    hiện kết quả thì tấm nút rút đi, để thẻ người thắng (có sẵn nút "Đua tiếp") không bị che.
25. Là admin, tôi muốn nút ✕ cũng ẩn và hiện cùng tấm nút khi đang đua.
26. Là admin, tôi muốn vào hoặc thoát chế độ này giữa lúc đang đua mà cuộc đua không bị chạy lại từ
    đầu.
27. Là admin, tôi muốn bấm `Esc` hoặc nút ✕ để thoát, và nút ✕ có cap `Esc`.
28. Là admin, tôi muốn `Esc` khi đang gõ hoặc khi một hộp thoại đang mở chỉ đóng thứ đó chứ không
    thoát chế độ toàn màn hình.
29. Là admin, tôi muốn thoát toàn màn hình của trình duyệt (`Esc`, `F11`) thì cũng thoát luôn chế độ
    này, để hai thứ không lệch nhau.
30. Là admin, tôi muốn sau khi thoát, focus quay về nút "Toàn màn hình".
31. Là admin dùng bàn phím hoặc trình đọc màn hình, tôi muốn chế độ này được công bố là một hộp
    thoại có tên và focus không thoát ra ngoài nó.
32. Là admin, tôi muốn toast lỗi (vd. "Không đua được vòng này.") vẫn hiện phía trên chế độ này.
33. Là admin trên điện thoại hoặc tablet hẹp, tôi muốn không thấy nút này, vì đây là tính năng
    trình chiếu từ máy tính.
34. Là admin, tôi muốn không thấy nút này khi đợt đua đã kết thúc, vì lúc đó không còn đua nữa.
35. Là admin, tôi muốn chế độ này hiện ra bằng một lần mờ dần ngắn, không nhảy bụp.
36. Là admin, tôi muốn reload trang thì quay về trang thường, vì chế độ này không cần nhớ.
37. Là admin xếp đội, tôi muốn chế độ toàn màn hình của màn xếp đội vẫn chạy y như trước sau khi
    phần chung được tách ra.

## Implementation Decisions

- **Đổi khung tại chỗ, không mount lại.** Canvas đua bắt đầu vòng `requestAnimationFrame` khi
  mount, và `RaceStage` giữ đồng hồ, bảng xếp hạng và overlay trong state cục bộ. Nếu mount lại thì
  cuộc đua đang chạy sẽ chạy lại từ đầu. Vì vậy khi bật chế độ, chính khu vực đua đổi bố cục sang
  lớp phủ toàn màn hình. Cây component giữ nguyên: cùng loại element ở cùng vị trí, chỉ đổi class,
  thuộc tính và các phần chỉ có trong một chế độ. Đây là điểm khác với màn xếp đội (màn xếp đội mount
  grid và pool ở trong lớp phủ hoặc ngoài trang).
- **Trạng thái bật/tắt nằm cục bộ trong màn đua** (state React ở thân màn đua đang mở), không đưa vào
  `race-store` và không lưu qua reload. Không có thay đổi API, schema hay `packages/shared`.
- **Tách phần dùng chung khỏi màn xếp đội.** Hai thứ được chuyển ra chỗ dùng chung cho cả web app:
  - **Hook focus mode:** cờ bật/tắt, gọi Fullscreen API trên `document.documentElement` (từ chối thì
    bỏ qua), đồng bộ `fullscreenchange`, chỉ thoát toàn màn hình mà chế độ tự yêu cầu, phím `F` / `Esc`,
    trả focus về nút vào. Việc "`Esc` lúc đang kéo chỉ huỷ kéo" là riêng của màn xếp đội. Hook chung
    nhận một điều kiện chặn `Esc`, màn xếp đội truyền trạng thái kéo vào đó.
  - **Khung lớp phủ (shell):** `role="dialog"`, `aria-modal`, `aria-label`, giữ focus bên trong, đánh
    dấu "dialog chính là màn hình", `fixed inset-0 z-40`, fade opacity, thanh trên với nút ✕ có cap
    `Esc` ở cuối. Shell nhận nội dung thanh trên và phần thân. Shell phải dùng được tại chỗ: khi
    không bật, nó trả về khung bình thường mà không đổi cây con, để màn đua không mount lại canvas.
  - Màn xếp đội chuyển sang dùng hai phần này mà không đổi hành vi. Test hiện có của màn xếp đội là
    bằng chứng.
- **Fullscreen trên `document.documentElement`** như PR 219. Lý do giữ nguyên: hộp thoại và toast
  portal ra `body`.
- **Phím:**
  - `F` bật, `Esc` tắt, cùng quy tắc bỏ qua như màn xếp đội: đang gõ, có phím bổ trợ,
    `defaultPrevented`, có hộp thoại đang mở. `F` không chạy dưới `lg`.
  - `S` bấm Bỏ qua. Chỉ chạy khi đang đua, và chạy cả ở trang thường. `S` dùng cùng quy tắc bỏ qua.
    Nút Bỏ qua hiện cap `Kbd` `S`.
  - Không có phím cho ĐUA.
- **Điều kiện hiện nút:** chỉ khi đợt đua còn mở (màn đợt đã kết thúc không có nút), chỉ từ `lg`
  (ẩn bằng CSS). Nếu cửa sổ bị thu nhỏ dưới `lg` trong lúc đang bật thì không tự thoát. Không thêm
  quyền mới: ai vào được màn đua thì dùng được.
- **Trong chế độ toàn màn hình không hiện:** header đợt đua, nút kết thúc đợt, chip hạng mục (sửa,
  xoá, thêm), ô thời lượng, nút sửa danh sách đua và người tham gia, bảng người thắng. Các hộp thoại
  của các nút này vì vậy không mở được từ trong chế độ.
- **Ô chọn hạng mục** trên thanh trên thay cho nhãn hạng mục. Trigger trông giống nhãn hạng mục hiện
  tại (icon bậc, "Bậc · Tên"), nên người xem không thấy khác gì. Danh sách liệt kê mọi hạng mục. Hạng
  mục bị khoá thì disabled và kèm lý do (`PRIZE_LOCK_LABEL`). Cả ô bị khoá khi đang rút hoặc đang đua.
  Chọn hạng mục thì đi qua đúng hành động chọn của store như chip hạng mục.
- **Bố cục (từ `lg`):**
  - Lớp phủ dùng nền đêm của sân khấu (`--stage-night`), không dùng `bg-background`, để cả màn hình
    là một cảnh phát sóng và không đổi theo theme sáng/tối. Các biến `--stage-*` được khai báo thêm
    cho gốc của lớp phủ.
  - Thanh trên chính là thanh phát sóng, không có thêm một thanh kính thứ hai. Chữ to hơn bản thường.
  - Thân là CSS Grid hai cột: đường đua `1fr`, bảng xếp hạng có độ rộng kẹp (khoảng 16rem đến 22rem,
    chốt khi làm). Cả hai cột cao hết phần còn lại thay cho `70dvh`. Canvas tự vẽ lại theo khung
    (`ResizeObserver` đã có sẵn).
  - Tấm nút nổi ở giữa đáy đường đua, kính tối, đè lên canvas thay vì chiếm một hàng riêng.
- **Tự ẩn:**
  - Chỉ khi đang đua (`stage === "racing"`). Sau 2 giây chuột đứng yên, tấm nút và nút ✕ fade về
    opacity 0 và không nhận click. Con trỏ chuột ẩn trên lớp phủ.
  - Rê chuột hoặc focus bằng bàn phím vào tấm nút thì hiện lại ngay và đếm lại từ đầu.
  - Khi chưa đua và khi đang rút thì luôn hiện. Khi đang hiện kết quả thì tấm nút không có mặt, vì
    ĐUA đang bị khoá và thẻ người thắng đã có "Đua tiếp". Đặt thời gian 2 giây thành một hằng số có
    tên.
- **Lớp z:** lớp phủ `z-40`. Hộp thoại và toast ở `z-50` vẫn ở trên. Không thêm bậc z mới.
- **A11y:** `aria-label="Đua mèo toàn màn hình"`, giữ focus bên trong, trả focus về nút vào khi
  đóng. Khi tấm nút đang ẩn, nút vẫn focus được bằng bàn phím, và focus làm nó hiện lại.
- **Motion:** lớp phủ chỉ fade opacity với `--duration-base`, `--ease-out-soft`. Tấm nút fade opacity
  với cùng token. Các hiệu ứng `--stage-*` của sân khấu không đổi.
- **Không đổi font, bảng màu hay bộ icon.** Thanh phát sóng vẫn dùng font sân khấu (Bungee), icon
  vẫn là lucide như phần còn lại của app.

## Testing Decisions

- Chỉ test hành vi nhìn thấy được qua DOM: có nút, bấm thì gì xuất hiện, phím nào làm gì. Không test
  class CSS, tỉ lệ cột hay opacity.
- **Seam chính: test component `CatRaceEventScreen`**, mở rộng file test hiện có:
  - Đợt đang mở: có nút "Toàn màn hình". Bấm vào thì có dialog "Đua mèo toàn màn hình" chứa thanh
    phát sóng và nút ĐUA. Header đợt và bảng người thắng không còn trong dialog.
  - `F` bật chế độ. `F` khi focus đang trong ô thời lượng thì không bật.
  - `Esc` hoặc nút ✕ tắt chế độ, và focus quay về nút.
  - Ô chọn hạng mục đổi hạng mục đang chọn. Hạng mục bị khoá không chọn được.
  - `requestFullscreen` được gọi trên `documentElement`. Nếu nó reject thì chế độ vẫn bật.
    `fullscreenchange` khi không còn `fullscreenElement` thì tắt chế độ.
  - Đợt đã kết thúc: không có nút.
- **Seam phụ: test `RaceStage`** (đã mock canvas):
  - Bật hoặc tắt chế độ giữa lúc đang đua thì canvas giả không bị mount lại. Đếm số lần mount
    của mock.
  - `S` khi đang đua thì gọi Bỏ qua. `S` khi chưa đua hoặc khi đang gõ thì không có tác dụng.
  - Tự ẩn dùng fake timers: sau 2 giây không có chuột thì tấm nút và nút ✕ có `data-idle`.
    `pointermove` hoặc focus vào tấm nút thì hết `data-idle`. Test đọc `data-idle` vì `inert` hay
    `aria-hidden` sẽ làm nút không focus được bằng bàn phím.
- **Màn xếp đội:** test hiện có của `TeamBuilderScreen` và overlay phải xanh mà không sửa assertion.
  Đó là bằng chứng việc tách phần chung không đổi hành vi.
- Fullscreen API không có trong jsdom, nên test stub `requestFullscreen`, `exitFullscreen` và
  `fullscreenElement` như `team-builder-screen.test.tsx`.
- Prior art: `team-builder-screen.test.tsx`, `cat-race-event-screen.test.tsx`, `race-stage.test.tsx`.

## Out of Scope

- Toàn màn hình cho màn đợt đã kết thúc (bảng kết quả).
- Sửa, thêm, xoá hạng mục, đổi thời lượng, sửa danh sách đua từ trong chế độ (phải thoát ra trước).
- Phím tắt cho ĐUA hoặc Xáo trộn.
- Toàn màn hình trên điện thoại hoặc tablet hẹp.
- Nhớ trạng thái bật qua reload.
- Đổi font, bảng màu hay bộ icon của app.

## Further Notes

- Discord nén stream khá mạnh, nên chữ to hơn trên thanh phát sóng và bảng xếp hạng là quyết định có
  chủ ý. Cỡ chữ cụ thể chưa được đo trên một stream thật, cần thử một lần.
- Quy ước mới (phím `S`, hook và shell dùng chung, tự ẩn khi đang đua) được ghi thêm vào
  `.claude/rules/web/interaction.md` cùng PR. Mục focus mode của team builder được chuyển thành quy
  ước chung.
