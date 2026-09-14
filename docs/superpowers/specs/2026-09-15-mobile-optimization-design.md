# Tối ưu web app cho điện thoại

Ngày: 2026-09-15 · Nhánh: `feat/web-mobile-foundation`, `feat/web-mobile-pages`,
`feat/web-mobile-team-builder` (ba PR, xem §8)

## 1. Vấn đề

Đợt UX review 2026-09-13 ([`2026-09-13-ux-review-overview.md`](../../custom-spec/2026-09-13-ux-review-overview.md),
GL1) đã đưa vào: thanh tab đáy dưới `sm`, banner gọn, phân trang ẩn số trang dưới `sm`, thanh Lưu dính
trên thanh tab, `viewport-fit=cover`. Nhưng dùng thật trên điện thoại vẫn còn nhiều chỗ khó.

Audit ngày 2026-09-15 render mọi route bằng Chromium headless (giả lập cảm ứng và `hover: none`), đăng
nhập admin, ở 420x930 DPR 3, 390x844, 360x800 và 915x412. Kết quả:

- **`/thiet-lap` tràn ngang ở mọi điện thoại.** `TabsList` có hai tab `whitespace-nowrap` ("Thiết lập
  lịch đánh", "Quản lý thành viên"), mép phải nằm ở 506px. Trang rộng thành 507px, tab thứ hai bị cắt,
  mục "Thiết lập" của thanh tab đáy lọt ra ngoài màn hình.
- **Máy xoay ngang (640-1000px) tràn ngang.** Số trang của phân trang hiện lại từ `sm`, làm `/` rộng
  945px và `/lich-su-diem-danh` rộng 971px ở 915x412.
- **Header vỡ ở 640-1000px.** Nav đầy đủ ép cột tên bang: "Mèo Mập Giang Hồ" bị cắt hết, chữ `逆水寒`
  (`tracking-[0.3em]`) rơi mỗi chữ một dòng, tràn khỏi header cao 56px.
- **Xếp team gần như không dùng được bằng tay.**
  - Chỉ có `PointerSensor` với `distance: 8`, và mọi thẻ đều mang `touch-none`, nên vuốt lên thẻ nào
    cũng thành kéo thả thay vì cuộn.
  - Dưới `md` lưới là một cột, trang cao khoảng 5.900px ở 420px, pool nằm tận đáy. Kéo một người vào
    team 1 nghĩa là kéo xuyên khoảng 4.000px.
  - Vùng cuộn `h-64` của pool phủ kín thẻ `touch-none`, nên chính pool cũng khó cuộn.
- **Dialog không cuộn được.** `DialogContent` căn giữa bằng `fixed top-1/2 -translate-y-1/2`, không có
  `max-h` hay `overflow-y-auto`. Khi xoay ngang, dialog tạo/sửa trận và dialog thành viên cao hơn màn
  hình, nên nút ở chân dialog không bấm tới được.
- **Thông tin nằm trong tooltip hoặc `title`, mà cảm ứng không mở được:**
  - Cảnh báo "Đã báo nghỉ trận này" và tên đầy đủ trên thẻ thành viên (`member-card.tsx`).
  - Lý do "Gửi Discord" bị khóa (`formation-toolbar.tsx`).
  - Lý do nghỉ bị cắt ở lưới điểm danh (`attendance-row.tsx`) và bảng log (`attendance-log-table.tsx`).
  - Gợi ý lưu của ô lý do nghỉ (`absence-reason-input.tsx`).
- **Hoàn tác chỉ có qua Ctrl+Z.** Lưu có thanh Lưu, còn hoàn tác không có nút nào để chạm.
- **Nhiều vùng chạm dưới 44px.** Bút sửa tên team 32px, ô nhập lý do 38px và nút "Lưu" của nó 34px,
  ô lưới điểm danh 41px, ô lịch 34px.
- **Chữ gốc 120% làm màn hẹp đi.** `html { font-size: 120% }` (`globals.css`) làm mọi `rem` thành
  19,2px. Màn 420px bố cục như 350px, màn 360px bố cục như 300px.

Không có lỗi: `/`, `/lich-su-diem-danh`, `/xep-team`, `/dang-nhap` không tràn ngang ở 360/390/420;
bảng cuộn trong khung riêng; safe area và `--app-bottom-inset` đúng; nút Có/Không của thẻ điểm danh
full width, cao 48px; mọi input từ 16px trở lên nên iOS không zoom khi focus.

Chưa kiểm được bằng render: thẻ điểm danh của thành viên (tài khoản test chưa gán nhân vật), các
dialog, tab thành viên của Thiết lập, bộ chọn ngày, 375/430px và 740x360.

## 2. Thiết bị mục tiêu

| Nhóm | Kích thước (CSS px) | Mức yêu cầu |
|---|---|---|
| Điện thoại dọc | 360-430 rộng. **420x930 DPR 3 là máy tham chiếu**, 360 là mức tối thiểu | Dùng tốt mọi trang |
| Điện thoại xoay ngang | 640-932 rộng, 360-430 cao | Không tràn, không che nội dung, dùng được |
| Tablet dọc | 768 | Không tràn, dùng được |
| Dưới 360 | 320 | Không vỡ bố cục, không cần tối ưu |

Ưu tiên theo cách dùng thật:

1. **Điểm danh** (`/`): thành viên chủ yếu vào từ link Discord trên điện thoại. Phải dùng tốt nhất.
2. **Lịch sử** và **Thiết lập**: dùng tốt, không tràn, không có thông tin nào chỉ nằm sau hover.
3. **Xếp team**: admin chủ yếu xếp trên máy tính. Trên điện thoại cần **xem tốt và sửa nhẹ**: đọc rõ
   đội hình, đổi vài ô, sửa tên team, gửi Discord. Không làm cách xếp mới ngoài kéo thả.

## 3. Phạm vi

Trong phạm vi:

- Nền tảng toàn app: cỡ chữ gốc, header ở 640-1023px, header ở màn thấp, phân trang, dialog, vùng
  chạm, quy ước "chạm không có hover" (§4.1).
- Từng trang: Điểm danh, Lịch sử, Thiết lập (§4.2).
- Xếp team dưới `md`: mỗi lúc một team, kéo thả trên cảm ứng, ghi chú gọn, nút Hoàn tác (§4.3).
- `apps/web/docs/frontend.md` §6 (§6 của spec này).

Ngoài phạm vi, cố ý không làm:

- Không đổi nghiệp vụ, API, `packages/shared`, quy tắc tuần và hạn chót.
- Không đổi bảng màu, font, banner, motion. `docs/design-direction.md` giữ nguyên.
- Không thêm cách xếp team không cần kéo (chạm ô trống để chọn người). Không thả người lên chip team.
- Không làm PWA, không làm cử chỉ vuốt để chuyển trang hay chuyển team.
- Không đổi layout `capture` (ảnh gửi Discord luôn 5 cột).
- Không đổi màn từ `md` trở lên của Xếp team, trừ nút Hoàn tác trên thanh Lưu.

## 4. Quyết định thiết kế

### 4.1 Nền tảng toàn app

**Cỡ chữ gốc: 110% dưới `sm`, 120% từ `sm`.** Toàn bộ kích thước của app tính bằng `rem`, nên cỡ chữ
gốc vẫn là điểm điều khiển duy nhất, giữ trong `globals.css`. Chọn 110% vì:

- Nút `h-10` bằng đúng 44px (17,6px × 2,5), là mức tối thiểu để chạm của Apple. Với 106%, nút rơi
  xuống 42px.
- Input vẫn khoảng 19px, nên iOS không zoom khi focus.
- Màn 420px bố cục như 382px thay vì 350px. Màn 360px như 327px thay vì 300px.

Breakpoint của Tailwind tính bằng `rem` nhưng media query luôn đọc `rem` theo cỡ chữ mặc định của
trình duyệt, nên đổi cỡ chữ gốc không làm dịch breakpoint. `sm` vẫn là 640px.

**Header ở 640-1023px.** Tên bang (chữ "Mèo Mập Giang Hồ" và `逆水寒`) chỉ hiện từ `lg`. Từ `sm` tới
dưới `lg`, header là con dấu, nav dùng `shortLabel` đã có trong `nav-items.ts`, và avatar. Tên bang vẫn
đọc được bằng screen reader (`sr-only`) như hiện nay dưới `sm`, để link về trang chủ luôn có tên.

**Header ở màn thấp.** Dưới `@media (max-height: 500px)` (máy xoay ngang), header thôi `sticky`, trả lại
khoảng 67px cho nội dung. Ở 412px chiều cao, header dính cộng thanh Lưu đang chiếm 38% màn hình. Thanh
Lưu vẫn dính, vì đó là nút cần trong tầm tay.

**Phân trang: ẩn số trang dưới `lg`.** Hiện số trang ẩn dưới `sm` (`PHONE_HIDDEN = "max-sm:hidden"`),
nên ở 915px chúng hiện lại và làm trang tràn. Đổi thành `max-lg:hidden`, đổi tên hằng cho đúng nghĩa
(`NARROW_HIDDEN`). Dòng "trang x/y" bên cạnh vẫn cho biết vị trí. Phải xác nhận không tràn ở 1024px.

**Dialog cuộn được.** `DialogContent` trong `components/ui/dialog.tsx` thêm
`max-h-[calc(100dvh-2rem)] overflow-y-auto`. Đây là sửa lỗi của chính component nền (mọi dialog của
app đều bị), không phải một variant, nên sửa ở `components/ui/` giống tiền lệ "thang kích thước là
design token, sửa trong `components/ui/`" của `frontend.md` §6. Dùng `dvh` để tính đúng khi thanh địa
chỉ của trình duyệt co giãn.

**Vùng chạm tối thiểu 44px.** Mọi control tương tác dưới `sm` phải từ 44px trở lên. Khi cần to hơn, dùng
biến thể có sẵn (`size="icon"`, `size="default"`), không viết `h-*` tay, đúng quy ước "Control sizes"
của §6. Riêng ô lịch (`calendar.tsx`, `--cell-size`) là token của component nền: nâng lên
`--spacing(10)` dưới `sm` (7 cột × 44px = 308px, vừa màn 360px).

**Quy ước mới "Chạm không có hover".** Thông tin cần để hiểu hoặc để làm tiếp phải thấy được mà không
cần hover:

- Cảnh báo, lý do một nút bị khóa, trạng thái chưa lưu: hiện bằng chữ, cạnh chỗ nó nói tới.
- Nội dung bị cắt (lý do nghỉ): bấm vào thì mở `Popover` ghi đủ.
- Tooltip chỉ để nhắc thêm điều đã thấy được bằng cách khác (icon phái có tooltip vẫn giữ, theo quy
  ước "Guild class" của §6).
- `title=""` không bao giờ là chỗ chứa thông tin.

### 4.2 Từng trang

**Điểm danh `/`**

- **Thẻ "Tuần này của bạn":**
  - Nút Có/Không giữ nguyên.
  - Ô nhập lý do nghỉ lên `h-11` (theo `Input`), nút "Lưu" của nó lên `size="default"`.
  - Gợi ý lưu, hiện chỉ nằm trong tooltip và `title`, thành một dòng chữ nhỏ `text-muted-foreground`
    ngay dưới ô.
- **Lưới điểm danh (admin):**
  - Ô bấm từ `size-9` lên `size-10` (44px).
  - Cột tên dính (`character-name.tsx`) từ `max-w-36` xuống `max-w-28` dưới `sm`, để màn 360px thấy
    được hơn một cột ngày.
  - Lý do nghỉ bị cắt thành một nút mở `Popover` ghi đủ lý do. Component dùng chung với bảng log:
    `features/attendance/components/absence-reason-text.tsx`.
- **Bộ lọc** (`attendance-filters.tsx`) giữ nguyên ba dòng dưới `sm`. Đã cân nhắc gộp chọn phái và nút
  "Chưa điểm danh" chung một dòng, nhưng ở 360px nút rộng khoảng 190px, ép ô chọn phái còn khoảng
  70px, tệ hơn hiện tại.
- **Banner cao** giữ nguyên theo design brief. Với chữ 110% nó tự thấp đi khoảng 20px.

**Lịch sử `/lich-su-diem-danh`**

- Lý do nghỉ trong bảng log dùng `absence-reason-text.tsx`: xuống dòng tối đa 2 dòng
  (`line-clamp-2`), bấm vào thì mở `Popover` ghi đủ. Thay cho `block truncate` + `title`.
- Phân trang theo §4.1.

**Thiết lập `/thiet-lap`**

- **Tab** (`settings-tabs.tsx`): dưới `sm`, `TabsList` full width, hai tab `flex-1`, nhãn ngắn "Lịch
  đánh" và "Thành viên". Từ `sm` giữ nhãn đầy đủ. Tên truy cập của tab luôn là nhãn đầy đủ.
- **Tìm kiếm và lọc thành viên** (`roster-filter-bar.tsx`, `layout="inline"`): `w-64` / `w-60` thành
  `w-full sm:w-64` / `w-full sm:w-60`.
- **Dialog tạo/sửa trận** (`date-time-field.tsx`): dưới `sm`, ô ngày và ô giờ xếp chồng, mỗi ô một dòng
  full width. Hiện ô giờ `w-32` đứng cạnh nút ngày `flex-1`, nên ở 360px nút ngày chỉ còn khoảng 100px.

**Đăng nhập `/dang-nhap`**: không đổi.

### 4.3 Xếp team `/xep-team` dưới `md`

Từ `md` trở lên giữ nguyên bố cục (2 cột ở `md`, 5 cột từ `lg`). Layout `capture` không đổi.

**Mỗi lúc một team.** Đội hình có 10 team, mỗi team 6 ô (`TEAM_COUNT`, `SLOTS_PER_TEAM` trong
`lib/mock-formation.ts`).

- Component mới `features/team-builder/components/team-switcher.tsx`: 10 chip xếp lưới 5 cột × 2
  hàng, chỉ hiện dưới `md`, nằm giữa banner đội hình và team.
  - Mỗi chip hai dòng: tên team (hoặc số team khi chưa đặt tên, cắt bớt nếu dài) và số ô đã có người
    trên 6 (ví dụ `4/6`).
  - Chip là nút bật/tắt (`aria-pressed`). Chip đang chọn dùng nền `primary` với chữ
    `primary-foreground`, đúng quy ước "Selected" của §6.
  - Lưới chip **không dính**: một team chỉ 6 ô, nên team và đầu pool đã nằm gần nhau, còn hai hàng
    chip dính sẽ chiếm thêm khoảng 110px của màn hình.
  - Lưới cột cố định nên không bao giờ làm trang tràn ngang.
- Team đang chọn là UI state, nên đặt trong một store Zustand nhỏ mới:
  `features/team-builder/store/team-view-store.ts` (`selectedTeam`, mặc định `1`). Tách khỏi
  `formation-store` vì store đó giữ bản nháp và các bước hoàn tác, còn team đang xem không phải một
  thay đổi và không được vào lịch sử hoàn tác. Đổi ngày, đổi trận vẫn giữ team đang chọn.
- Các team khác ẩn bằng CSS (`max-md:hidden` trên `TeamColumn` không được chọn), không bỏ khỏi cây
  render:
  - Không cần đọc kích thước màn hình bằng JS, nên không lệch hydration giữa server và client.
  - dnd-kit vẫn đăng ký đủ các ô, nên từ `md` trở lên không có gì khác.
  - Chỉ áp cho layout `screen`. Layout `capture` (ảnh gửi Discord) luôn hiện đủ 10 team và không có
    lưới chip.
- Pool nằm ngay dưới team, giữ vùng cuộn riêng `h-64`. Trang không còn 10 team xếp chồng (khoảng
  5.900px ở 420px), chỉ còn một team 6 ô.

**Kéo thả trên cảm ứng.**

- Trong `team-builder-screen.tsx`, thay `PointerSensor` bằng hai cảm biến:
  - `MouseSensor`, kéo 8px mới tính (giữ hành vi chuột như hiện nay).
  - `TouchSensor`, nhấn giữ 250ms, xê dịch tối đa 5px trong lúc giữ.
- Bỏ `touch-none` khỏi thẻ (`draggable-member.tsx`), để vuốt thường là cuộn trang và cuộn pool.
- Thêm `select-none` và `[-webkit-touch-callout:none]` trên thẻ, để nhấn giữ không mở menu hay bôi
  chọn chữ của trình duyệt.
- Đổi người giữa hai team: kéo về pool, chọn team kia, kéo ra.

**Hàng ô và ghi chú (dưới `sm`).**

- Hiện ô ghi chú chiếm `w-2/5`, làm tên chỉ còn khoảng 7-8 ký tự ở 360px. Dưới `sm`, ô ghi chú thu
  thành một nút `size="icon"` (44px):
  - Có chấm `jade` khi ô đã có ghi chú.
  - Bấm vào thì ô nhập mở ra ngay dưới hàng đó, full width. Bấm lần nữa hoặc bấm ra ngoài thì đóng.
- Ghi chú đã có hiện thành một dòng chữ `text-muted-foreground` dưới tên.
- Tên nhân vật (`member-card.tsx`) xuống tối đa 2 dòng (`line-clamp-2`) thay vì `truncate`.
- Từ `sm` trở lên, ô ghi chú giữ như hiện nay.

**Thông tin không phụ thuộc hover** (theo §4.1).

- Cảnh báo "Đã báo nghỉ trận này" hiện thành một dòng chữ kèm icon trên thẻ, không chỉ là viền đỏ
  cộng tooltip.
- Khi "Gửi Discord" bị khóa vì còn thay đổi chưa lưu, dòng "Lưu trước khi gửi" hiện cạnh nút, ở mọi
  kích thước màn.

**Thanh công cụ.** Dưới `sm`, hai nút "Copy" và "Gửi Discord" chia đôi một dòng full width
(`flex-1`), bỏ `mt-4`. Nút copy dùng nhãn ngắn "Copy đội hình"; tên truy cập vẫn là nhãn đầy đủ, và
nguồn copy đầy đủ vẫn hiện trong dialog xác nhận.

**Nút Hoàn tác trên thanh Lưu.**

- `UnsavedChangesBar` nhận thêm prop tùy chọn `onUndo`, kèm trạng thái có bước để hoàn tác hay không.
  Có `onUndo` thì thanh hiện nút "Hoàn tác" giữa "Đặt lại" và "Lưu", bị khóa khi không còn bước nào.
- Xếp team truyền vào đúng thao tác mà Ctrl+Z gọi, nên hai đường cho cùng một kết quả.
- Nút hiện ở mọi kích thước màn. Bảng điểm danh không truyền prop này nên không đổi.

**Sửa tên team.** Bút sửa tên (`team-name-field.tsx`) giữ `size="icon-xs"` cho chuột, và lên
`size-10` (44px) khi màn hình không có hover: `[@media(hover:none)]:size-10`, cùng kiểu với
`[@media(hover:none)]:opacity-100` đã có trên chính nút đó. Biến thể `size` của `Button` không đổi
theo loại thiết bị được, nên đây là ngoại lệ có ghi lý do cho quy ước "Control sizes" (không viết kích
thước tay), và §6 ghi lại ngoại lệ này: một control chỉ phóng to cho cảm ứng thì viết dưới
`[@media(hover:none)]`. Bút đã luôn hiện khi dùng cảm ứng, nên bút là đường sửa tên bằng tay; nhấn đúp
vẫn dùng được trên máy tính.

## 5. File thay đổi

| File | Thay đổi |
|---|---|
| `apps/web/app/globals.css` | Cỡ chữ gốc 110% dưới `sm` |
| `apps/web/components/shared/site-header.tsx`, `main-nav.tsx` | Tên bang từ `lg`, nav nhãn ngắn ở `sm`-`lg`, header thôi dính ở màn thấp |
| `apps/web/components/shared/table-pagination.tsx` | Ẩn số trang dưới `lg` |
| `apps/web/components/ui/dialog.tsx` | `max-h` theo `dvh`, cuộn bên trong |
| `apps/web/components/ui/calendar.tsx` | Ô lịch 44px dưới `sm` |
| `apps/web/components/shared/unsaved-changes-bar.tsx` | Prop `onUndo`, nút "Hoàn tác" |
| `apps/web/components/shared/roster-filter-bar.tsx` | Ô tìm và lọc full width dưới `sm` |
| `apps/web/features/settings/components/settings-tabs.tsx` | Tab full width, nhãn ngắn dưới `sm` |
| `apps/web/features/settings/components/date-time-field.tsx` | Ngày và giờ xếp chồng dưới `sm` |
| `apps/web/features/attendance/components/absence-reason-text.tsx` (mới) | Lý do nghỉ: `line-clamp`, bấm mở `Popover` |
| `apps/web/features/attendance/components/attendance-row.tsx`, `attendance-log-table.tsx` | Dùng `absence-reason-text`; ô lưới `size-10` |
| `apps/web/features/attendance/components/absence-reason-input.tsx` | Ô nhập và nút 44px, gợi ý lưu thành chữ |
| `apps/web/features/attendance/components/character-name.tsx` | `max-w-28` dưới `sm` |
| `apps/web/features/team-builder/components/team-switcher.tsx` (mới) | Hàng chip chọn team dưới `md` |
| `apps/web/features/team-builder/store/team-view-store.ts` (mới) | `selectedTeam` |
| `apps/web/features/team-builder/components/formation-grid.tsx`, `team-column.tsx` | Chèn hàng chip, ẩn team không được chọn dưới `md` |
| `apps/web/features/team-builder/components/team-builder-screen.tsx` | `MouseSensor` + `TouchSensor`, thanh công cụ, `onUndo` |
| `apps/web/features/team-builder/components/draggable-member.tsx`, `member-card.tsx` | Bỏ `touch-none`, chặn menu nhấn giữ, tên 2 dòng, cảnh báo thành chữ |
| `apps/web/features/team-builder/components/slot-cell.tsx`, `slot-note-input.tsx` | Nút ghi chú và ô nhập mở dưới hàng, dưới `sm` |
| `apps/web/features/team-builder/components/formation-toolbar.tsx` | Nhãn ngắn, chia đôi dòng, lý do khóa thành chữ |
| `apps/web/features/team-builder/components/team-name-field.tsx` | Bút sửa tên 44px khi dùng cảm ứng |
| `apps/web/docs/frontend.md` | §6 (xem §6 dưới đây) |

## 6. Tài liệu

`apps/web/docs/frontend.md` §6:

- Mục mới **"Touch has no hover"**: quy ước ở §4.1.
- Mục mới **"Phone layout"**:
  - Bảng thiết bị mục tiêu (§2).
  - Cỡ chữ gốc 110%/120% và lý do chọn 110%.
  - Vùng chạm 44px.
  - Header ở `sm`-`lg` và ở màn thấp.
  - Dialog cuộn bên trong.
- **"Tables"**: số trang ẩn dưới `lg`, không còn dưới `sm`, kèm lý do (máy xoay ngang).
- **"Unsaved work"**: nút Hoàn tác trên thanh Lưu, cùng thao tác với Ctrl+Z.
- **Xếp team**: mỗi lúc một team dưới `md`; `team-view-store` tách khỏi `formation-store`; ẩn bằng CSS
  chứ không bỏ khỏi cây render.

## 7. Kiểm thử và nghiệm thu

**Test tự động** (Vitest + Testing Library, test mô tả hành vi, tên test tiếng Việt):

- `team-switcher`: hiện đủ 10 chip với số ô đã xếp trên 6; bấm chip thì đổi `selectedTeam`; chip đang
  chọn mang `aria-pressed="true"`.
- `formation-grid`: layout `screen` ẩn dưới `md` mọi team trừ team đang chọn; layout `capture` không ẩn
  team nào và không có chip.
- `team-view-store`: mặc định team 1; đổi team không đụng tới bản nháp và lịch sử hoàn tác.
- `unsaved-changes-bar`: có `onUndo` thì có nút "Hoàn tác", bấm thì gọi đúng một lần, bị khóa khi không
  còn bước; không có `onUndo` thì không có nút.
- `settings-tabs`: tên truy cập của tab là nhãn đầy đủ.
- `absence-reason-text`: bấm vào thì thấy lý do đầy đủ.
- `formation-toolbar`: khi đang có thay đổi chưa lưu, dòng "Lưu trước khi gửi" hiện bằng chữ.
- `member-card`: cảnh báo đã báo nghỉ hiện bằng chữ.
- Các test hiện có vẫn xanh. Test nào đổi vì hành vi cố ý đổi (ví dụ phân trang ẩn dưới `lg`) thì
  đổi cùng commit, và commit message nói lý do.

**Nghiệm thu bằng render thật** (Chromium, giả lập cảm ứng và `hover: none`, như audit ở §1):

- 360x800, 390x844, 420x930 DPR 3, 915x412 và 1024x768, trên mọi route: `scrollWidth` bằng
  `innerWidth`.
- Không control tương tác nào dưới 44px dưới `sm`.
- Với tài khoản **đã gán nhân vật**: thẻ "Tuần này của bạn" trả lời Có/Không, nhập và lưu lý do nghỉ
  được ở 360 và 420.
- Mở dialog tạo/sửa trận và dialog thành viên ở 915x412: chân dialog bấm được.
- Xếp team ở 420x930: ô đầu tiên của team hiện ra ngay trong màn đầu tiên; chọn team 3 bằng chip.
- Ảnh gửi Discord (layout `capture`) giống hệt trước khi đổi.
- Ctrl+S và Ctrl+Z trên máy tính hoạt động như trước.

**Nghiệm thu trên máy thật** (Android Chrome, máy 420x930 của người dùng): vuốt trên thẻ là cuộn trang
và cuộn pool; nhấn giữ thẻ trong pool rồi kéo vào một ô trống thì xếp được; nhấn giữ không mở menu của
trình duyệt.

**Lệnh kiểm:** `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

## 8. Chia PR

Ba PR, mỗi PR một nhánh:

| PR | Nhánh | Nội dung | Tách từ |
|---|---|---|---|
| 1. Nền tảng | `feat/web-mobile-foundation` | Spec và plan này; §4.1; tab Thiết lập (§4.2, lỗi tràn nặng nhất); §6 phần nền tảng | `main` |
| 2. Các trang | `feat/web-mobile-pages` | Phần còn lại của §4.2 | PR 1 |
| 3. Xếp team | `feat/web-mobile-team-builder` | §4.3, gồm nút Hoàn tác của `UnsavedChangesBar`; §6 phần Xếp team và thanh Lưu | PR 1 |

- PR 1 đi trước vì cỡ chữ gốc đổi mọi kích thước, và mức 44px của PR 2 và PR 3 tính theo 110%.
- PR 2 và PR 3 không phụ thuộc nhau. Cả hai lấy PR 1 làm base; khi PR 1 merge, GitHub tự chuyển base
  của chúng về `main`.
- Mỗi PR tự xanh `test`, `lint`, `typecheck`, và tự qua nghiệm thu render cho phần của nó.
