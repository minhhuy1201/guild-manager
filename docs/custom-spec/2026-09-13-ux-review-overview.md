# Rà soát UX/UI từ góc nhìn người dùng khó tính - Tổng quan

Ngày: 2026-09-13 · Phạm vi: `apps/web` tại commit `0a8b359` · Nguồn: đọc code toàn bộ các màn
(Điểm danh, Lịch sử điểm danh, Xếp team, Thiết lập, Đăng nhập) dưới vai một người dùng thật, khó
tính, dùng hằng ngày.

**Giới hạn của bản rà soát:** chưa kiểm chứng bằng mắt. Bước tạo phiên đăng nhập local và chụp
màn hình bằng Chromium headless bị chặn quyền, nên mọi nhận xét dựa trên code (class Tailwind,
thứ tự component, hành vi sự kiện). Các con số chiều cao tính từ `--spacing: 0.24rem` và
`font-size: 120%` ở `app/globals.css`. Trước khi làm từng mục, cần mở màn hình thật để xác nhận.

Khác với loạt `flow-audit` (lỗi luồng), loạt này là **chỗ vướng khi dùng**: bố cục, số lần bấm, khả
năng phát hiện, mobile. Không đổi hành vi nghiệp vụ, không đổi API, không đổi quy tắc hạn chót.

## Ràng buộc chung

- Tuân thủ `docs/design-direction.md` (binding): palette navy/jade/gold, emerald/đỏ/amber chỉ cho
  trạng thái điểm danh, một cảnh mỗi trang, không đặt dữ liệu lên ảnh, motion ≤ 320ms.
- Tuân thủ `apps/web/CLAUDE.md` và `apps/web/docs/frontend.md` §6: `components/ui/` là output của
  shadcn CLI, biến thể mới đặt ở `components/shared/`; state UI vào Zustand, dữ liệu server vào
  TanStack Query; `isDeadlinePassed` luôn lấy từ API.
- Mọi function hiện có phải giữ nguyên hoạt động; test `pnpm --filter web test` phải xanh sau mỗi
  mục.
- Mục nào đụng nhiều file thì vào Plan mode, duyệt plan rồi mới sửa.

## Quy ước mã số

| Tiền tố | Màn |
|---|---|
| `TB` | Xếp team (`/xep-team`) |
| `AT` | Điểm danh (`/`) |
| `HS` | Lịch sử điểm danh (`/lich-su-diem-danh`) |
| `ST` | Thiết lập (`/thiet-lap`) |
| `GL` | Toàn app |

## Bảng tóm tắt

| | Vấn đề | Tác động | Rủi ro khi sửa |
|---|---|---|---|
| **TB1** | Kho thành viên nằm dưới cùng, kéo thả xuyên cả trang; nút Lưu không dính theo | Rất cao | Trung bình |
| **AT1** | WeekTimeline và card điểm danh cá nhân lặp nhau; việc chính nằm ở block thứ 3 | Cao | Thấp |
| **AT2** | Ô lý do vắng chỉ lưu bằng Enter, click ra ngoài là mất âm thầm | Cao | Thấp |
| **AT3** | Bảng điểm danh 10 người/trang, không có tổng mỗi cột, không lọc nhanh "Chưa điểm danh" | Cao | Thấp |
| **GL1** | Mobile: nav chỉ còn 4 icon không chữ | Cao | Thấp |
| **AT4** | Admin điểm danh hộ: nhiều bước, một hàng một lúc, nút chỉ hiện chữ khi hover | Cao | Trung bình |
| **HS1** | Bộ lọc đặt chung phía trên cả biểu đồ lẫn bảng, nhưng biểu đồ bỏ qua một nửa bộ lọc | Trung bình | Thấp |
| **HS2** | Biểu đồ phải hover mới đọc được số; nút "Xoá bộ lọc" chiếm nguyên một hàng | Thấp | Thấp |
| **GL2** | Banner quá cao cho công cụ dùng hằng ngày | Trung bình | Thấp |
| **GL3** | Hạn chót chỉ ghi giờ tuyệt đối, không có đếm ngược | Trung bình | Thấp |
| **GL4** | Bộ lọc nằm ở card tách rời khỏi bảng mà nó lọc | Thấp | Thấp |
| **GL5** | Chưa có trang 404 và trang lỗi riêng | Thấp | Thấp |
| **TB2** | Kho thành viên không đếm theo lưu phái; cột đội không hiện số người | Trung bình | Thấp |
| **TB3** | 60 ô ghi chú luôn hiện, chiếm 2/5 chiều rộng, cắt tên nhân vật | Trung bình | Thấp |
| **TB4** | Đổi tên đội bằng double-click, khó phát hiện | Thấp | Thấp |
| **TB5** | "Gửi Discord" bấm được khi chưa lưu, mở dialog mới báo chặn | Thấp | Thấp |
| **TB6** | Người đã báo nghỉ còn trong đội hình chỉ có viền đỏ và tooltip | Trung bình | Thấp |
| **TB7** | Banner vàng phía trên lưới lặp thông tin của tab ngày | Thấp | Thấp |
| **ST1** | Tab Thiết lập không nằm trên URL, reload là về tab đầu | Thấp | Thấp |
| **ST2** | Tên tab lặp lại ngay ở h2 bên trong card | Thấp | Thấp |

## Thứ tự thực hiện đề nghị

```
TB1 ──► TB2 · TB3 · TB4 · TB5 · TB6 · TB7   (cùng màn, gom sau khi bố cục mới đã chốt)
 │
AT1 ──► AT2
 │
AT3 ──► AT4                                  (AT4 đổi luồng lưu, cần bàn trước)
 │
GL1
 │
HS1 ──► HS2
 │
(độc lập, gom một PR nhỏ) GL2 · GL3 · GL4 · GL5 · ST1 · ST2
```

- **TB1 trước hết:** đây là chỗ đau nhất của admin, và mọi mục TB khác phụ thuộc bố cục mới.
- **AT1 trước AT2:** AT2 sửa ô lý do nằm bên trong card mà AT1 gộp lại.
- **AT3 trước AT4:** AT3 là thay đổi nhỏ, rủi ro thấp; AT4 đổi luồng lưu của admin nên cần chốt
  hành vi trước khi viết code.

## Những gì giữ nguyên

Palette silk/jade/navy, Be Vietnam Pro + Noto Serif, motion ngắn có tôn trọng
`prefers-reduced-motion`, cột sticky trên mobile, skeleton khớp layout. Không đề xuất đổi font, đổi
màu hay thêm hiệu ứng, vì đó không phải chỗ yếu.

---

## TB1 - Kho thành viên nằm dưới cùng, nút Lưu không dính theo

**Tác động: rất cao. Rủi ro: trung bình.**

### Hiện trạng

`features/team-builder/components/team-builder-screen.tsx:152-263` xếp từ trên xuống: `PageHeader`,
`SessionTabs`, `MatchTabs`, toolbar, `PrefillBanner`, `FormationGrid` (banner + 10 đội, 2 hàng x 5
cột, mỗi đội 6 ô), rồi mới đến `MemberPool`. Muốn kéo một người từ kho lên đội 1 phải kéo xuyên
khoảng hai hàng đội, dựa vào auto-scroll của dnd-kit. Nút "Lưu" nằm trong `FormationToolbar` ở
phía trên, không dính khi cuộn xuống kho.

### Đề xuất

- ~~Từ `lg` trở lên: bố cục hai cột, `MemberPool` sticky bên phải.~~ **Bỏ (2026-09-13, theo quyết
  định của chủ bang sau khi xem bản dựng):** cột kho bên phải làm lưới đội hình hẹp lại, tên nhân
  vật bị co và khó đọc. `MemberPool` giữ nguyên chỗ cũ, dưới `FormationGrid`. Quãng kéo ngắn đi nhờ
  lưới thấp hơn (TB3 thu gọn ghi chú, TB7 thu gọn banner).
- Thanh hành động dính đáy màn hình, chỉ hiện khi `dirty`: "N thay đổi chưa lưu · Đặt lại · Lưu".
  Toolbar trên cùng giữ Copy và Gửi Discord.
- Phím tắt Ctrl+S (Cmd+S trên macOS) gọi cùng hàm `handleSave`, chặn hộp thoại lưu trang của trình
  duyệt. Đang mở dialog thì vẫn chặn nhưng không lưu (bổ sung 2026-09-14): đội hình nằm khuất sau
  dialog.
- **Bổ sung (2026-09-14, theo yêu cầu của chủ bang):** Ctrl+Z (Cmd+Z) hoàn tác thao tác gần nhất trên
  đội hình của ngày đang mở: kéo thả, ghi chú, thêm/xoá trận 2, copy, dọn sạch, gỡ người báo nghỉ.
  Gõ liền một ghi chú là một bước. Mỗi ngày một lịch sử riêng, mất khi Lưu, Đặt lại hoặc đổi tuần.
  Tên đội không nằm trong lịch sử. Đang gõ trong ô nhập thì Ctrl+Z là hoàn tác chữ của trình duyệt;
  đang mở dialog thì Ctrl+Z không đụng đội hình phía sau; Ctrl+Shift+Z không phải hoàn tác. Thao tác
  không đổi gì (dọn sạch ngày đã trống, copy đúng đội hình đang có) không thành một bước.

### Tiêu chí chấp nhận

- ~~Ở 1440px, kéo một người từ kho vào bất kỳ ô nào của 10 đội mà không cần cuộn trang.~~ Bỏ cùng
  bố cục hai cột.
- Khi có thay đổi chưa lưu, nút Lưu luôn nhìn thấy dù đang cuộn ở đâu.
- Ctrl+Z trả ngày đang mở về đúng trạng thái trước thao tác gần nhất và mở lại trận vừa sửa; hoàn
  tác hết thì ngày không còn "chưa lưu".
- `DragOverlay` vẫn bám con trỏ đúng: thanh sticky và cột sticky không được tạo containing block cho
  phần tử `position: fixed` (xem ghi chú `backwards` trong `globals.css`).
- `FormationCaptureSheet` vẫn chụp ra đúng layout 5 cột cố định (`fixedColumns`), không bị ảnh
  hưởng bởi bố cục hai cột.
- Test hiện có của team-builder vẫn xanh.

---

## AT1 - Hai lưới ô ngày lặp nhau, việc chính nằm ở block thứ 3

**Tác động: cao. Rủi ro: thấp.**

### Hiện trạng

`features/attendance/components/attendance-screen.tsx:34-35` vẽ `WeekTimeline` rồi
`MemberAttendanceCard`. Cả hai dùng cùng lưới `sm:grid-cols-2 lg:grid-cols-3`, cùng `SessionLabel`,
cùng phụ đề. Timeline thêm hạn chót và badge "Còn hạn / Đã khóa"; card cá nhân thêm nút Có/Không.
Member mở trang thấy banner, một lưới ô ngày, rồi mới đến lưới ô ngày thứ hai có nút bấm.

### Đề xuất

- Gộp làm một card "Tuần này của bạn". Header card: khoảng tuần (từ timeline). Mỗi ô ngày có nhãn,
  phụ đề, hạn chót, trạng thái mở/khoá, nút Có/Không (hoặc "Đã khoá" + lý do đã lưu).
- Dòng tóm tắt dưới tiêu đề: "Bạn còn **N trận** chưa điểm danh" (N = số trận chưa khoá chưa có
  câu trả lời). Khi N = 0: "Bạn đã điểm danh đủ tuần này".
- Tài khoản chưa gán nhân vật vẫn cần thấy lịch tuần: khi đó card hiện các ô ngày ở chế độ chỉ đọc
  kèm thông báo liên hệ quản trị viên (hiện tại timeline đang gánh việc này).

### Tiêu chí chấp nhận

- Trang `/` chỉ còn một lưới ô ngày.
- Mọi thông tin của cả hai component cũ vẫn có mặt: khoảng tuần, hạn chót, trạng thái, nút trả lời,
  lý do.
- Tài khoản không có nhân vật vẫn thấy lịch tuần.
- Test `member-attendance-card.test.tsx` được cập nhật theo hành vi mới trong cùng commit.

---

## AT2 - Ô lý do vắng mất dữ liệu âm thầm

**Tác động: cao. Rủi ro: thấp.**

### Hiện trạng

`features/attendance/components/member-attendance-card.tsx:360-397`: `AbsenceReasonInput` chỉ gửi
khi bấm Enter; blur không làm gì, và cũng không có dấu hiệu nào cho biết chữ trong ô chưa được lưu.
Người dùng gõ xong rồi click chỗ khác sẽ tưởng đã lưu.

### Đề xuất

Khi giá trị khác `savedReason`: hiện nút "Lưu" nhỏ cạnh ô và chữ "chưa lưu" màu muted. Enter vẫn
lưu, Esc vẫn khôi phục. Không tự lưu khi blur, vì blur là chuyện vô tình và mỗi lần lưu là một
request (lý do đã ghi trong comment hiện tại).

### Tiêu chí chấp nhận

- Gõ vào ô rồi click ra ngoài: chữ vẫn còn, nút Lưu và chữ "chưa lưu" vẫn hiện.
- Bấm Lưu hoặc Enter: gửi request, toast thành công, nút và chữ "chưa lưu" biến mất.
- Bấm Enter khi chữ trong ô (sau khi trim) trùng với lý do đã lưu: không gửi request, không toast.
- Lưu lỗi: chữ đã gõ được giữ nguyên (như hiện tại).

---

## AT3 - Bảng điểm danh: phân trang, tổng mỗi cột, lọc nhanh

**Tác động: cao. Rủi ro: thấp.**

### Hiện trạng

- `components/shared/page-size-select.tsx:15`: mặc định 10 dòng/trang cho mọi bảng. Bang có vài
  chục người, nên admin phải lật trang liên tục trên bảng điểm danh.
- `features/attendance/components/attendance-grid.tsx`: không có tổng theo cột. Câu hỏi quan trọng
  nhất của admin ("trận này bao nhiêu người đi?") chỉ trả lời được ở biểu đồ bên trang Lịch sử.
- Bộ lọc trạng thái chỉ có ở trang Lịch sử; trang Điểm danh không lọc được "Chưa điểm danh".

### Đề xuất

- `AttendanceGrid` truyền `initialPageSize: 50` vào `useTablePagination`. Các bảng khác giữ 10.
- Thêm một hàng tổng (trong `tfoot`, hoặc ngay dưới tiêu đề cột) cho mỗi ngày: số Có, Không, Chưa
  điểm danh, dùng `AttendanceStatusIcon` cho thống nhất. Tính trên danh sách đã lọc hay toàn bang
  cần chốt khi làm; đề nghị toàn bang, vì đó là số admin cần.
- Thêm chip lọc nhanh "Chưa điểm danh" cạnh ô tìm kiếm: chỉ giữ người còn ít nhất một trận chưa khoá
  chưa trả lời. Lưu trong scope `attendance` của `attendance-filter-store`.

### Tiêu chí chấp nhận

- Bảng điểm danh mở ra hiện 50 dòng; đổi page size vẫn hoạt động.
- Tổng mỗi cột khớp với dữ liệu, và cập nhật ngay sau khi lưu.
- Chip lọc bật/tắt được, kết hợp đúng với tìm kiếm và lọc lưu phái.

---

## AT4 - Admin điểm danh hộ quá nhiều bước

**Tác động: cao. Rủi ro: trung bình. Cần chốt hành vi trước khi viết code.**

### Hiện trạng

`features/attendance/components/attendance-grid.tsx` và `attendance-row.tsx`: bấm bút chì, bấm từng
ô, bấm dấu tick; mỗi lần chỉ sửa được một hàng. Nút Có/Không lúc bình thường chỉ là icon, chữ chỉ
hiện khi hover (`attendance-row.tsx:186-224`). Trên thiết bị cảm ứng không có hover nên chỉ còn dấu
X và thanh kiếm.

### Đề xuất

- Bấm thẳng vào ô (ngày chưa khoá với member, mọi ngày với admin) để xoay vòng: chưa điểm danh →
  Có → Không → Có. Ô đã đổi so với dữ liệu server được đánh dấu (viền hoặc chấm).
- Draft nằm ở mức cả bảng, không phải một hàng. Thanh dính đáy: "N ô đã đổi · Huỷ · Lưu". Lưu gửi
  các ô đã đổi song song như `handleConfirm` hiện tại.
- Bỏ cột thao tác sticky bên phải, trả chỗ cho các cột ngày.

### Câu hỏi cần chốt

- Có cho phép quay về "chưa điểm danh" không? Đã xác minh: module attendance của API chỉ có một
  endpoint ghi (`POST`, `apps/api/src/modules/attendance/attendance.controller.ts:69`), không có
  endpoint xoá bản ghi. Không thêm endpoint thì vòng xoay chỉ đi giữa Có và Không sau lần bấm đầu;
  muốn quay về "chưa điểm danh" phải thêm endpoint xoá ở API (nằm ngoài phạm vi spec này).
- Rời trang khi còn draft: cảnh báo `beforeunload` như màn Xếp team?
- Lưu lỗi một phần (vài ô thành công, vài ô lỗi): giữ lại các ô lỗi trong draft và báo lỗi.

### Tiêu chí chấp nhận

- Điểm danh cho 5 người ở 2 ngày chỉ cần 10 lần bấm ô và 1 lần Lưu.
- Trên màn cảm ứng, trạng thái mỗi ô đọc được mà không cần hover.
- Test `attendance-grid.test.tsx` và `attendance-row.test.tsx` cập nhật theo hành vi mới.

---

## GL1 - Nav trên mobile chỉ còn icon

**Tác động: cao. Rủi ro: thấp.**

### Hiện trạng

`components/shared/main-nav.tsx:79`: dưới `sm` chữ bị ẩn, còn 4 icon. "Điểm danh"
(`ClipboardCheck`) và "Lịch sử điểm danh" (`History`) khó phân biệt. Thành viên chủ yếu mở web từ
link Discord trên điện thoại.

### Đề xuất

Dưới `sm`: thanh tab cố định ở đáy màn hình, mỗi mục có icon kèm chữ ngắn (Điểm danh / Lịch sử /
Xếp team / Thiết lập), mục đang mở dùng jade như nav hiện tại. Header mobile chỉ còn con dấu và
avatar. Chừa `padding-bottom` cho `main` và footer bằng chiều cao thanh tab cộng
`env(safe-area-inset-bottom)`.

### Tiêu chí chấp nhận

- Ở 390px, thấy được chữ của mọi mục nav mà không cần bấm.
- Mục admin vẫn chỉ hiện với admin (vẫn là việc hiển thị; chặn quyền vẫn do proxy và API).
- Không nội dung nào bị thanh tab che mất, kể cả thanh Lưu dính đáy của TB1 và AT4.

---

## HS1 - Bộ lọc Lịch sử đặt sai phạm vi

**Tác động: trung bình. Rủi ro: thấp.**

### Hiện trạng

`app/lich-su-diem-danh/page.tsx` xếp `AttendanceHistoryFilters` (tìm kiếm, lưu phái, tuần, ngày
đánh, trạng thái) phía trên cả `AttendanceSummaryDashboard` lẫn `AttendanceLogTable`. Theo
`attendance-summary-dashboard.tsx:33-36`, biểu đồ cố ý bỏ qua lọc lưu phái và trạng thái. Người dùng
chọn một lưu phái, thấy biểu đồ không đổi, sẽ nghĩ là lỗi.

### Đề xuất

- Trên cùng chỉ còn Tuần và Ngày đánh (áp dụng cho cả trang).
- Tiếp đến là biểu đồ.
- Tìm kiếm, lưu phái và trạng thái chuyển vào header của card bảng lịch sử.
- Chốt khi làm: tìm kiếm có còn áp dụng cho biểu đồ như hiện tại không. Nếu có thì giữ tìm kiếm ở
  thanh trên cùng.

### Tiêu chí chấp nhận

- Mọi bộ lọc hiển thị ở vị trí tác động đúng lên phần nội dung ngay dưới nó.
- Store `attendance-filter-store` giữ nguyên hình dạng; chỉ đổi chỗ render.
- Test `attendance-history-filters.test.tsx` cập nhật theo bố cục mới.

---

## HS2 - Biểu đồ phải hover mới đọc số; nút Xoá bộ lọc chiếm một hàng

**Tác động: thấp. Rủi ro: thấp.**

### Đề xuất

- `attendance-summary-card.tsx`: header mỗi card ghi rõ bằng chữ "Có X · Không Y · Chưa Z", thay
  cho "đã điểm danh a/b".
- `attendance-history-filters.tsx:264`: đưa nút "Xoá bộ lọc" lên cùng hàng với các ô lọc (sau HS1
  thì nằm trong header card bảng).

---

## GL2 - Banner quá cao

**Tác động: trung bình. Rủi ro: thấp.**

### Hiện trạng

`components/shared/page-header.tsx:42`: `min-h-44 sm:min-h-56`, tức khoảng 203px trên mobile và
258px từ `sm`. Cộng header thì trên điện thoại 844px, gần 1/3 màn hình là trang trí trước khi thấy
dữ liệu.

### Đề xuất

Thêm prop kích thước cho `PageHeader`: `tall` (giữ như hiện tại) cho trang Điểm danh, `compact`
(khoảng 120px, mobile khoảng 96px) cho Xếp team, Thiết lập và Lịch sử. Vẫn một cảnh mỗi trang,
đúng `design-direction.md`.

### Tiêu chí chấp nhận

- Tiêu đề và mô tả vẫn đọc rõ trên mọi cảnh ở cả hai kích thước.
- Nếu cách chia banner theo trang thay đổi cách hiểu mục "Imagery" của `design-direction.md` thì
  cập nhật tài liệu đó trong cùng PR.

---

## GL3 - Hạn chót không có đếm ngược

**Tác động: trung bình. Rủi ro: thấp.**

### Hiện trạng

`components/shared/session-label.tsx:95-101`: `SessionDeadline` chỉ ghi "Hạn chót: dd/MM HH:mm".

### Đề xuất

Thêm dòng tương đối "còn 5 giờ" / "còn 2 ngày" với các trận chưa khoá; đổi màu nhấn khi còn dưới
24 giờ. Chỉ để hiển thị: trạng thái khoá vẫn lấy từ `isDeadlinePassed` của API, còn
`useDeadlineRefresh` vẫn là cơ chế làm mới khi hết hạn. Màu nhấn không dùng amber (amber là "chưa trả
lời"); chốt màu khi làm.

### Tiêu chí chấp nhận

- Chữ đếm ngược cập nhật ít nhất mỗi phút mà không gây re-render cả bảng.
- Một trận quá hạn trên đồng hồ client nhưng API chưa báo khoá vẫn hiện là mở.

---

## GL4 - Bộ lọc tách rời khỏi bảng

**Tác động: thấp. Rủi ro: thấp.**

`features/attendance/components/attendance-filters.tsx` bọc `RosterFilterBar` trong một `Card`
riêng phía trên `AttendanceGrid`. Đưa thanh lọc vào `CardHeader` của card bảng để bớt một khối và
thấy rõ bộ lọc tác động lên đâu. Làm cùng chip lọc của AT3.

---

## GL5 - Chưa có trang 404 và trang lỗi

**Tác động: thấp. Rủi ro: thấp.**

`app/` chưa có `not-found.tsx` và `error.tsx`. Thêm cả hai theo phong cách app (con dấu, câu ngắn
tiếng Việt, nút về trang Điểm danh). `error.tsx` là client component, có nút thử lại gọi `reset()`.

---

## TB2 - Kho thành viên không đếm theo lưu phái

**Tác động: trung bình. Rủi ro: thấp.**

- `member-pool.tsx`: dãy chip đếm theo lưu phái ("Tố Vấn 4 · …"), bấm chip thì bật lọc lưu phái
  tương ứng trong `pool-filter-store`.
- ~~`team-column.tsx`: header mỗi đội hiện số người "4/6".~~ **Bỏ (2026-09-13, theo quyết định của
  chủ bang sau khi xem bản dựng).**

---

## TB3 - Ô ghi chú chiếm chỗ

**Tác động: trung bình. Rủi ro: thấp.**

`slot-cell.tsx:79`: mỗi ô dành `w-2/5` cho `SlotNoteInput`, nên 60 textarea luôn hiện và tên nhân
vật bị cắt. ~~Đề xuất: ô chưa có ghi chú chỉ hiện một nút icon nhỏ, bấm vào mới mở ô nhập; ô đã có
ghi chú thì hiện chữ (bấm vào để sửa). Chế độ chỉ đọc chỉ hiện ghi chú khi có.~~

**Bỏ (2026-09-13, theo quyết định của chủ bang sau khi xem bản dựng):** ghi chú phải đứng bên phải
thành viên tương ứng, không xuống hàng. Cột ghi chú `w-2/5` giữ nguyên như cũ, cả trên màn hình lẫn
trong ảnh gửi Discord.

---

## TB4 - Đổi tên đội khó phát hiện

**Tác động: thấp. Rủi ro: thấp.**

`team-name-field.tsx:74`: chỉ double-click, gợi ý duy nhất là `title`. Hiện icon bút chì khi hover
hoặc focus; cho phép click đơn vào icon để mở ô nhập. Double-click và Enter/Space giữ nguyên.

---

## TB5 - Gửi Discord bấm được khi chưa lưu

**Tác động: thấp. Rủi ro: thấp.**

`formation-toolbar.tsx:105-114`: nút chỉ disable khi đang lưu hoặc đang gửi; phải mở dialog mới
thấy báo chặn vì chưa lưu. Disable sẵn khi `dirty`, kèm tooltip "Lưu trước khi gửi". Dialog giữ
dòng báo chặn làm lớp bảo vệ thứ hai.

---

## TB6 - Người đã báo nghỉ còn trong đội hình

**Tác động: trung bình. Rủi ro: thấp.**

Hiện chỉ có viền đỏ và tooltip "Đã báo nghỉ trận này" trên `MemberCard`. Thêm banner kiểu
`PrefillBanner`: "N người đã báo nghỉ còn trong đội hình · Gỡ ra". Nút gỡ đưa họ về kho thành viên
trong draft (chưa lưu, như mọi thao tác khác).

---

## TB7 - Banner vàng lặp thông tin

**Tác động: thấp. Rủi ro: thấp.**

`formation-banner.tsx:37`: `min-h-24`, chữ serif 2xl, lặp nhãn trận và ngày đã có ở tab ngày. Thu
gọn chiều cao (bỏ `min-h-24`, giảm cỡ chữ). Giữ nguyên trong `FormationCaptureSheet`, vì ở ảnh gửi
Discord nó là tiêu đề duy nhất.

---

## ST1 - Tab Thiết lập không nằm trên URL

**Tác động: thấp. Rủi ro: thấp.**

`features/settings/components/settings-tabs.tsx`: `defaultValue` cục bộ, reload là về tab lịch
đánh. Lưu tab vào query `?tab=members` và đọc lại khi mở trang. Comment hiện tại ("nobody needs to
link straight to a tab") cần sửa theo.

---

## ST2 - Tiêu đề lặp

**Tác động: thấp. Rủi ro: thấp.**

`settings-tabs.tsx:56` và `settings-screen.tsx:53` có h2 trùng tên tab. Bỏ h2, giữ dòng mô tả.
