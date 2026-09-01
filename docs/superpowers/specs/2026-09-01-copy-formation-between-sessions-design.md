# Copy đội hình từ ngày này sang ngày khác — Design

Ngày: 2026-09-01 · Phạm vi: `apps/web/features/team-builder` (không đụng `apps/api`,
`packages/shared`, database).

Màn hình Xếp team đã có sẵn cơ chế **điền tự động** (`lib/prefill.ts` + `PrefillBanner`): một ngày
chưa có đội hình nào thì được điền sẵn từ ngày gần nhất trước đó **trong cùng tuần**, bỏ người không
điểm danh "Có". Cơ chế đó chỉ chạy đúng một lần, chỉ với ngày còn trống, và không bao giờ vượt qua
ranh giới tuần.

Spec này thêm **nút "Copy đội hình"** — bản thủ công của cùng logic đó: bấm được bất cứ lúc nào, ghi
đè được đội hình đang có, và biết lùi sang tuần trước để nối tuần mới với trận bang chiến Thứ 7 của
tuần cũ.

## Bối cảnh

- [per-session-formation](./2026-08-02-per-session-formation-design.md) — mỗi ngày đánh có đội hình
  riêng; bố cục lưới (10 đội × 6 ô) là dữ liệu tĩnh ở frontend.
- [two-matches-per-day](./2026-08-07-two-matches-per-day-design.md) — một ngày giữ 1 hoặc 2 trận;
  "Tạo trận 2" clone nguyên trận 1.
- [formation-slot-notes](./2026-08-08-formation-slot-notes-design.md) — ghi chú từng ô đi vào nháp
  Zustand, chỉ chạm API khi bấm "Lưu".

Mô hình của màn hình này: *server state ở TanStack Query, mọi chỉnh sửa vào nháp Zustand, một nút Lưu
chốt tất cả.* Spec này bám mô hình đó — copy chỉ ghi vào **nháp**.

## Quyết định thiết kế

### 1. Nguồn copy là **tự động**, không cho chọn

Bấm nút là copy ngay từ ngày liền trước ngày đang mở. Không dropdown, không danh sách.

Lý do: thứ tự các ngày trong tuần đã mang sẵn ý nghĩa "đội hình mới nhất". Người xếp team gần như
luôn muốn tiếp nối trận vừa rồi, nên bắt họ chọn là bắt họ xác nhận lại điều hiển nhiên. Nút vẫn nói
rõ nguồn của nó (xem §5) nên không có chuyện copy nhầm mà không biết.

**Hệ quả phải chấp nhận:** không copy ngược được — không thể lấy đội hình Thứ 7 xếp vào Thứ 3. Đổi
sang dropdown sau này chỉ là đổi phần UI; phần tìm nguồn và phần ghi vào nháp không phải viết lại.

### 2. Nguồn là **ngày liền trước**, không nhảy qua ngày trống

```
Ngày B đứng giữa tuần  ⇒ nguồn là ngày ngay trước nó trong tuần
Ngày B là ngày đầu tuần ⇒ nguồn là ngày CUỐI CÙNG của tuần liền trước
Ngày nguồn đó chưa xếp đội hình ⇒ nút disabled
```

Chỉ xét đúng **một** ngày. Ngày liền trước còn trống thì không có gì để chép, và nhảy qua nó để lấy
một đội hình cũ hơn sẽ khiến nút chỉ vào một ngày người dùng không nghĩ tới — Thứ 7 bỗng nói "Copy
từ Thứ 5" chỉ vì Thứ 6 chưa ai mở ra xếp.

Nhánh lùi tuần tồn tại cho đúng một tình huống, và là tình huống hay gặp nhất: **trận đầu tiên của
tuần mới**. Nó không có ngày nào trước nó trong tuần, nên nguồn của nó là ngày cuối cùng của tuần
vừa kết thúc — trong lịch bang hội đó chính là trận bang chiến Thứ 7.

**Chỉ lùi đúng một tuần.** Tuần trước không có trong danh sách, hoặc ngày cuối của nó còn trống, thì
nút khoá. Đội hình cách hai tuần đã đủ cũ để việc chép lại nó gây hại nhiều hơn lợi.

Trong một ngày nguồn thì lấy **trận cuối** của ngày đó — đúng luật `buildPrefill` đang dùng: đó là
đội hình gần với hiện tại nhất.

"Có đội hình" xét theo **vị trí người**, không xét ghi chú: một ngày chỉ có note thì không có gì để
chép sang.

### 3. Nguồn là bản **đang hiển thị**, không phải bản đã lưu

Nếu ngày nguồn đang có nháp chưa lưu thì copy lấy đúng cái nháp đó.

Lý do: người dùng copy cái họ **nhìn thấy**. Lấy bản đã lưu sẽ cho ra kết quả khác với những gì đang
hiện trên tab bên cạnh mà không giải thích được. Đây cũng đúng với "Tạo trận 2" đang chạy — nó clone
trận 1 như đang hiển thị, nháp hay không.

Tuần liền trước không nằm trên màn hình nên không có nháp: đổi tuần là xoá sạch `drafts`
(`formation-store.setWeek`). Nguồn ở tuần trước vì vậy luôn là bản đã lưu, và đó là điều duy nhất
đúng ở đó.

### 4. Ghi vào **trận đang mở**, ghi đè toàn bộ, hỏi trước khi đè

- Copy ghi vào đúng trận (match) đang được chọn của ngày B. Trận còn lại không bị đụng tới.
- Chép cả **vị trí người lẫn ghi chú** của từng ô.
- Người có mặt trong đội hình nguồn nhưng **không điểm danh "Có"** cho ngày B thì bị bỏ; ô đó thành
  trống. Note của ô vẫn ở lại — note mô tả vị trí, không mô tả người (luật này `buildPrefill` đã
  dùng).
- Trận đang mở còn người ⇒ hiện dialog xác nhận, nêu tên ngày nguồn. Trận trống ⇒ copy thẳng.
- Kết quả chỉ là **nháp**. Chưa lưu gì cả, và "Đặt lại" hoàn tác được.

Ghi đè cả trận thay vì "chỉ lấp ô trống": trộn hai đội hình cho ra một đội hình thứ ba mà không ai
cố ý xếp. Muốn giữ vài người thì kéo lại vài người, dễ hình dung hơn nhiều so với đoán xem ô nào
vừa bị lấp.

### 5. Nút nói rõ nguồn của nó; kết quả báo bằng toast

- Nút nằm trong `FormationToolbar`, cạnh "Đặt lại" / "Lưu", chỉ hiện khi ngày đang mở còn sửa được
  (`editable`) — cùng luật với hai nút kia.
- Nhãn nút: **"Copy từ {tên ngày nguồn}"**, ví dụ `Copy từ Thứ 5` hoặc `Copy từ Thứ 7 · Bang Chiến`.
  Nguồn tự động thì nút phải tự khai nó là ngày nào, nếu không người dùng chỉ biết sau khi đã bấm.
- Không có nguồn ⇒ nút hiện chữ **"Copy đội hình"** và disabled.
- Copy xong ⇒ toast: `Đã copy từ {nguồn} · bỏ {N} người không đánh trận này. Chưa lưu.` (bỏ vế giữa
  khi `N = 0`).

Dùng toast chứ không thêm banner thứ hai: `PrefillBanner` là banner của trạng thái "ngày này đang
hiện một đề xuất chưa ai đụng vào", còn copy là một **hành động vừa xảy ra**. Hai thứ khác nhau, và
xếp hai dải thông báo chồng nhau trên đầu lưới thì không ai đọc cái nào.

### 6. Không đụng backend

Dữ liệu tuần trước lấy qua `GET /team-builder/formations?weekStart=` đã có sẵn, thêm một
`useFormations(previousWeekStart)` với `enabled` — chỉ bắn khi ngày đang mở là **ngày đầu tiên**
của tuần. Mọi ngày khác không tốn thêm request nào.

`previousWeekStart` lấy từ danh sách `weeks` (`GET /team-builder/weeks`, mới nhất trước): phần tử
đầu tiên có `weekStart` nhỏ hơn tuần đang xem. Không tự tính "trừ 7 ngày" — danh sách đó mới là câu
trả lời cho "tuần nào còn dữ liệu".

Không endpoint mới, không migration, không biến môi trường ⇒ `docs/architecture.md` không đổi.

### 7. Tách logic dùng chung với prefill

Phần "chép một trận, bỏ người vắng, đếm số người bị bỏ" hiện nằm trong `buildPrefill`. Nó được tách
thành một hàm dùng chung, và `buildPrefill` gọi lại nó.

Nếu để hai bản: một hôm nào đó sửa luật bỏ-người-vắng ở một chỗ, điền tự động và nút copy sẽ cho ra
hai kết quả khác nhau trên cùng một ngày — mà người dùng thì coi chúng là một thứ.

## Ngoài phạm vi

- **"Tạo trận 2" giữ nguyên.** Nó đã clone nguyên trận 1 (người + note, kể cả người đã báo vắng) từ
  trước; không đổi gì ở đây.
- Không copy được ngược (ngày sau → ngày trước), không copy chéo quá một tuần.
- Không copy tên đội — tên đội là dữ liệu global, không thuộc ngày nào.
- Không tự động copy: nút này luôn do người dùng bấm. Điền tự động vẫn là việc của `buildPrefill`.
- Không lưu thẳng xuống server: copy dừng ở nháp, "Lưu" vẫn là nút duy nhất chạm API.
