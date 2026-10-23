# Thu gọn trận đã đánh trong tuần

Status: approved

## Problem Statement

Một tuần có tới 6-7 ngày đánh. Trên màn Điểm danh, card "Tuần này của bạn" xếp mỗi ngày một tile;
trên điện thoại các tile chồng thành một cột, nên vào thứ 7 member phải cuộn qua các tile của những
trận đã đánh từ đầu tuần mới thấy trận còn phải trả lời. Bảng cả bang cũng vậy: mỗi trận một cột,
member và admin phải vuốt ngang qua các cột đã xong. Màn Lịch sử điểm danh ở tuần này lặp lại vấn đề
đó với các card biểu đồ theo từng trận. Những trận đã đánh vẫn cần xem lại được, nhưng không nên
đứng chắn trước trận sắp tới.

## Solution

Trong tuần đang mở, **trận đã đánh** (giờ đánh đã qua) được thu gọn để trận sắp tới luôn ở trên:

- **Card "Tuần này của bạn"**: chỉ hiện tile các trận sắp tới. Cuối card có một thanh bấm
  "Đã đánh · N trận" kèm icon câu trả lời của member cho từng trận đó. Bấm vào thì các tile đã đánh
  hiện ra bên dưới, hơi mờ, badge "Đã đánh"; bấm lần nữa thì thu lại. Mỗi lần vào trang thanh đều
  đóng.
- **Bảng cả bang**: mặc định ẩn cột các trận đã đánh. Cạnh nút "Chưa điểm danh" có nút bật/tắt
  "Đã đánh (N)" để hiện lại các cột đó (admin cần để sửa câu trả lời cũ). Hàng tổng "Cả bang" theo
  các cột đang hiện.
- **Màn Lịch sử, tuần này**: các card biểu đồ của trận đã đánh thu vào cùng kiểu thanh "Đã đánh ·
  N trận" dưới các card trận sắp tới. Tuần cũ hiện đầy đủ như trước. Chọn một trận cụ thể ở ô
  "Ngày đánh" thì luôn hiện trận đó.

Một trận đã khoá (hết hạn hoặc admin đã thông báo đội hình) nhưng chưa tới giờ đánh **không** bị
thu gọn. Khi trang đang mở mà tới giờ đánh, trận đó tự chuyển sang nhóm đã đánh, không cần tải lại.

## User Stories

1. Là member dùng điện thoại, tôi muốn các trận sắp tới nằm trên cùng card "Tuần này của bạn", để trả lời trận kế tiếp mà không phải cuộn qua các trận đã xong.
2. Là member, tôi muốn các trận đã đánh gom vào một thanh ở cuối card, để card vẫn ngắn vào cuối tuần.
3. Là member, tôi muốn thanh thu gọn ghi số trận đã đánh và câu trả lời của tôi cho từng trận, để nhìn qua là biết tuần của mình mà không cần mở.
4. Là member, tôi muốn mở thanh ra và thấy lại các tile đã đánh, để đọc lại lý do tôi đã ghi khi chọn "Không".
5. Là member, tôi muốn tile đã đánh hơi mờ và có badge "Đã đánh", để không nhầm với trận sắp tới.
6. Là member, tôi muốn trận đã khoá nhưng chưa đánh vẫn nằm trong nhóm sắp tới, để vẫn thấy trận tối nay và câu trả lời của mình.
7. Là member, tôi muốn thanh không hiện khi chưa có trận nào đã đánh, để card không có một nút rỗng.
8. Là member xem card sau trận cuối tuần, tôi muốn mọi tile hiện như bình thường, để card không trống.
9. Là member, tôi muốn thanh luôn đóng mỗi lần vào trang, để trang luôn mở ra ở việc còn phải làm.
10. Là member để trang mở, tôi muốn một trận tự chuyển vào nhóm thu gọn khi tới giờ đánh, để card đúng mà không cần tải lại.
11. Là member chưa được gán nhân vật, tôi muốn các tile chỉ xem cũng được thu gọn như vậy, để lịch tuần đọc giống nhau.
12. Là member dùng điện thoại, tôi muốn bảng cả bang mặc định ẩn cột các trận đã đánh, để vuốt ít hơn tới các ngày sắp tới.
13. Là admin, tôi muốn có nút "Đã đánh (N)" cạnh "Chưa điểm danh", để hiện lại cột đã đánh khi cần sửa câu trả lời cũ.
14. Là admin, tôi muốn nút ghi số cột đang ẩn, để biết dữ liệu đang được ẩn chứ không phải bị mất.
15. Là admin, tôi muốn nút vẫn bật khi tôi chuyển trang trong app, để không phải bật lại sau mỗi lần chuyển trang.
16. Là người xem, tôi muốn hàng tổng "Cả bang" theo đúng các cột đang hiện, để mỗi con số nằm dưới đúng ngày của nó.
17. Là người xem, tôi muốn nút không hiện khi chưa có trận nào đã đánh, để hàng bộ lọc gọn.
18. Là người xem, tôi muốn bộ lọc "Chưa điểm danh" giữ nguyên cách lọc, để việc ẩn cột không đổi ai bị tính là chưa điểm danh.
19. Là người xem dùng điện thoại, tôi muốn hai nút lọc nhanh nằm chung một hàng, để dải bộ lọc không cao thêm.
20. Là người dùng trình đọc màn hình, tôi muốn thanh báo đang mở hay đóng và nút báo đang bật hay tắt, để biết mỗi điều khiển làm gì.
21. Là member xem màn Lịch sử ở tuần này, tôi muốn card biểu đồ của trận đã đánh thu gọn dưới các trận sắp tới, để trang mở ra ở các trận còn lại.
22. Là member xem màn Lịch sử, tôi muốn tuần cũ hiện đầy đủ, để một tuần đã xong không bị thu gọn hết.
23. Là member xem màn Lịch sử, tôi muốn trận tôi chọn ở ô "Ngày đánh" luôn hiện, để chọn một trận đã đánh không ra trang trống.

## Implementation Decisions

- **Thuật ngữ**: "Fought battle" (UI "Đã đánh") - ngày đánh có giờ đánh đã qua; đã ghi vào
  glossary. Xác định bằng `dateTime`, không bằng `isAttendanceClosed`.
- **Một helper thuần** trong lib của feature attendance tách các trận trong tuần thành sắp tới và
  đã đánh tại một thời điểm, giữ nguyên thứ tự. Khi không còn trận sắp tới thì coi tất cả là sắp tới
  (không thu gọn). Ca biên nằm trong helper để mọi nơi gọi đều cho cùng kết quả.
- **Một hook đồng hồ** trả về thời điểm hiện tại và render lại đúng lúc giờ đánh kế tiếp trôi qua,
  cùng dạng với hook refresh theo deadline đang có: một `setTimeout` tới giờ đánh gần nhất trong
  tương lai. Không cần refetch, vì "đã đánh" tính ở client từ `dateTime`.
- **Một component disclosure dùng chung** cho thanh đã đánh, dùng ở card member và dashboard Lịch
  sử: nút ghost full-width, label "Đã đánh · N trận", một chỗ tuỳ chọn cho icon câu trả lời (card
  truyền vào, dashboard thì không), chevron xoay chỉ bằng transform, `aria-expanded` và
  `aria-controls`. State cục bộ `useState`, đóng khi mount. Nội dung mở ra dùng helper reveal sẵn
  có; không animate chiều cao (`interaction.md`).
- **Card member**: tile sắp tới trong dải tile như cũ, sau đó là đường kẻ và thanh. Tile đã đánh giữ
  màu câu trả lời, thêm `opacity-70`, hiện badge "Đã đánh" tone `muted` thay cho "Đã khoá" /
  "Còn hạn". Nút trả lời vốn đã không có vì trận đã đánh luôn đã khoá.
- **Bảng cả bang**: thêm boolean `showFought` vào attendance filter store (mặc định false, chỉ trong
  bộ nhớ, cùng vòng đời với `unansweredOnly`). Bảng lấy danh sách trận đang hiện từ helper và cờ
  này; header, hàng tổng, các hàng dữ liệu và số `columns` đều đọc chung danh sách đó. Nút nằm trong
  attendance filters, cùng kiểu "Chưa điểm danh" (outline `lg`, nền primary khi bật,
  `aria-pressed`). Trên điện thoại dùng label ngắn, `aria-label` đầy đủ "Hiện trận đã đánh". Nút chỉ
  hiện khi có ít nhất một trận đã đánh. Dưới `sm` hai nút lọc nhanh nằm chung một hàng.
- **Dashboard Lịch sử**: chỉ thu gọn khi tuần đang chọn là tuần này và chưa chọn trận cụ thể. Bảng
  log giữ nguyên.
- Không đổi API, schema hay package shared.

## Testing Decisions

- Test hành vi bên ngoài qua component đã render, mock các query hook và giả lập đồng hồ, như các
  test component attendance đang làm. Không assert class name.
- Unit test lib cho helper tách trận: giữ thứ tự; trận đã khoá nhưng chưa đánh vẫn là sắp tới; tất
  cả đã đánh thì trả hết về sắp tới; tuần rỗng.
- `MemberAttendanceCard`: tile đã đánh nằm sau thanh; thanh ghi số trận và câu trả lời; bấm thì mở
  và thu lại; không có thanh khi chưa có trận đã đánh; hiện hết khi tất cả đã đánh; một trận chuyển
  vào nhóm thu gọn khi đồng hồ giả vượt giờ đánh.
- `AttendanceGrid` / `AttendanceFilters`: mặc định không có cột đã đánh; nút ghi số cột ẩn; bấm thì
  cột và số tổng của chúng hiện lại; không có nút khi chưa có trận đã đánh.
- `AttendanceSummaryDashboard`: card đã đánh thu gọn ở tuần này; tuần cũ không thu gọn; trận đã đánh
  được chọn thì vẫn hiện.
- Prior art: `member-attendance-card.test.tsx`, `attendance-grid.test.tsx`,
  `attendance-filters.test.tsx`, `attendance-summary-dashboard.test.tsx`,
  `lib/__tests__/unanswered.test.ts`.

## Out of Scope

- Lưu trạng thái mở/đóng qua lần tải lại trang.
- Ẩn trận đã đánh trong bảng log Lịch sử hoặc trong ô chọn tuần.
- Thay đổi cách khoá, deadline, hay ai được sửa trận đã đánh.
- Thu gọn ở màn khác ngoài Điểm danh và Lịch sử điểm danh (xếp team, thiết lập).

## Further Notes

- Thiết kế theo `docs/design-direction.md` và `.claude/rules/web/{interaction,display}.md`: không
  animate chiều cao, màu attendance chỉ dùng cho câu trả lời, vùng bấm tối thiểu 44px trên điện
  thoại.
- Trận bị khoá sớm vài ngày do thông báo đội hình vẫn là sắp tới, có chủ đích: member vẫn cần thấy
  trận đó và câu trả lời của mình trước khi đánh.
