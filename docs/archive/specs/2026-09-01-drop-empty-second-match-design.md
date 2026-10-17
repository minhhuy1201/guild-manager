# Trận 2 không có ai thì không tồn tại — Design

Ngày: 2026-09-01 · Phạm vi: `apps/web/features/team-builder/lib` (không đụng `apps/api`,
`packages/shared`, database).

Hai thay đổi của cùng một luật: **một trận chỉ tồn tại khi có người đứng trong đó.**

1. Ngày hai trận mà trận 2 không còn ai thì được lưu và đọc lại như ngày **một trận** — tab Trận 2
   tự biến mất.
2. Nguồn copy (nút "Copy từ …" và cơ chế điền tự động) xét đúng **trận sẽ được chép**, thay vì xét
   "ngày này có ai đó ở đâu đó".

## Bối cảnh

- [two-matches-per-day](./2026-08-07-two-matches-per-day-design.md) §3 tuyên bố ngược lại: *"một
  trận 2 rỗng là trạng thái hợp lệ… nó vẫn phải còn đó sau khi tải lại trang"*. **Spec này thay thế
  câu đó.** Phần còn lại của spec kia (hai bảng, lưu cả ngày, gửi mảng một phần tử là xoá) vẫn đúng
  nguyên vẹn — chính cơ chế "gửi mảng một phần tử là xoá" là thứ luật mới dùng để xoá.
- [copy-formation-between-sessions](./2026-09-01-copy-formation-between-sessions-design.md) §2 — nút
  copy lấy nguồn là ngày liền trước.

## Quyết định thiết kế

### 1. "Có người" là điều kiện duy nhất, ghi chú không cứu được trận 2

Trận 2 không còn ai thì bị bỏ, **kể cả khi các ô của nó còn ghi chú**.

Lý do: luật phải phát biểu được bằng một câu người dùng đọc là hiểu — "trận không có ai thì không
phải một trận". Thêm vế "trừ khi còn ghi chú" biến nó thành một luật không ai đoán được, và tạo ra
một trận 2 vô hình chỉ chứa chữ, đúng thứ mà tab Trận 2 không dùng để làm.

**Hệ quả phải chấp nhận:** ghi chú của một trận 2 đã lưu mà không có ai sẽ mất khi ngày đó được lưu
lần kế tiếp. Đây là dữ liệu đã tồn tại từ trước luật này, nên nó là mất mát thật, không phải giả
định.

### 2. Xoá ở **cả hai chiều của wire**, không phải ở tầng nháp

`toWireMatches` bỏ trận 2 rỗng trước khi gửi; `fromWireMatches` bỏ nó khi đọc về.

- **Không xoá ngay khi trận 2 hết người.** Người dùng kéo nốt người cuối ra khỏi trận 2 mà tab biến
  mất tại chỗ là mất phương hướng giữa lúc đang sắp xếp. Nháp giữ nguyên những gì đang thấy, đúng mô
  hình "một nút Lưu chốt tất cả" của màn hình.
- **Bỏ cả lúc đọc**, không chỉ lúc ghi: những ngày đã lưu trước luật này vẫn còn trận 2 rỗng trong
  database, và chúng phải thôi hiện tab thứ hai ngay lần mở kế tiếp chứ không đợi ai đó bấm Lưu.

Đặt ở `wire.ts` vì đó là **cửa duy nhất** dữ liệu đội hình đi qua theo cả hai chiều: không writer nào
lách được, và hai chiều dùng chung một hàm nên không thể lệch nhau.

### 3. Nguồn copy xét trận sẽ được chép, không xét cả ngày

Trước: "ngày này có trận nào có người không?" rồi lấy trận cuối. Một ngày có trận 1 đầy người và
trận 2 vừa bị dọn sạch sẽ được chấm là nguồn hợp lệ, nhưng thứ chép sang lại là trận 2 — rỗng. Nút
nói "Copy từ Thứ 3", bấm vào được một đội hình trắng, toast vẫn báo "Đã copy".

Sau: `lastLineUp(matches)` trả về trận cuối **khi và chỉ khi** có người đứng trong đó. Câu hỏi và
câu trả lời giờ là một.

Luật này dùng chung cho cả nút copy lẫn điền tự động — cùng lý do §7 của spec copy dựng ra
`copy-match.ts`: hai đường đi mà người dùng coi là một thứ thì không được cho ra hai kết quả.

Sau §2, trạng thái này không còn lưu được xuống database nữa; nó vẫn xảy ra trong **nháp** của một
ngày đang mở dở, và đó chính là ngày mà một tab khác có thể đang lấy làm nguồn.

## Ngoài phạm vi

- Không đụng backend: `PUT /formations/:sessionId` nhận mảng một phần tử là đã xoá trận 2, đúng như
  spec 2026-08-07 §4 thiết kế.
- Không dọn dữ liệu cũ bằng migration — luật đọc ở §2 làm việc đó dần dần, không cần chạm database.
- Trận **1** rỗng không bị đụng tới: ngày chưa xếp gì vẫn là một trận rỗng, đúng luật chuẩn hoá `[]`
  → `[{}]` sẵn có.
- "Tạo trận 2" giữ nguyên: vẫn clone nguyên trận 1.
