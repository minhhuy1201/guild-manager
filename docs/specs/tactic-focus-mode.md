# Chiến thuật toàn màn hình (focus mode)

Status: approved

## Problem Statement

Trang một chiến thuật (`/chien-thuat/[id]`) bị bao bởi header của trang web, breadcrumb và chrome
của trình duyệt. Bản đồ chỉ dài theo bề ngang của khung trang, nên trên màn hình rộng nó nhỏ hơn
mức có thể.

- Admin vẽ chiến thuật phải làm việc trong một khung bị bó lại, giữa nhiều thứ không liên quan tới
  việc vẽ.
- Member (hoặc admin) trình chiếu chiến thuật khi họp bang chiến hoặc share lên Discord thì người
  xem thấy cả một trang web, chứ không chỉ bản đồ, giai đoạn và ghi chú.

Màn xếp đội (PR 219) và màn đua mèo (PR 220) đã có **Focus mode**. Màn chiến thuật thì chưa.

## Solution

Trang chiến thuật có thêm nút **"Toàn màn hình"** (phím tắt `F`), ở cả editor lẫn viewer, chỉ từ
`lg` trở lên. Bấm vào thì màn chiến thuật phủ kín cửa sổ, và trình duyệt cũng vào chế độ toàn màn
hình. Chỉ còn lại tính năng của chính màn này:

- **Editor (admin vẽ):** thanh trên mỏng có tên chiến thuật, chữ "Chưa lưu" khi có thay đổi chưa
  lưu, và nút ✕. Bên dưới là toolbar vẽ, rồi tới palette, bản đồ và ghi chú. Dưới cùng là thanh
  giai đoạn. Mọi công cụ vẽ vẫn dùng được.
- **Viewer (member, hoặc admin không vẽ):** thanh trên có tên chiến thuật, tab giai đoạn, nút
  play / onion-skin và nút ✕. Thân màn hình chỉ có bản đồ và cột ghi chú thu gọn được.

Ở cả hai, bản đồ được thu phóng vừa trọn vùng còn lại theo cả chiều rộng lẫn chiều cao, giữ đúng tỉ
lệ. Vùng thừa hai bên là nền lưới, và bản đồ có viền để thấy rõ mép. Thoát bằng `Esc` hoặc nút ✕.
Zoom, giai đoạn đang mở, việc đang phát và các thay đổi chưa lưu không bị mất khi vào hoặc thoát.

## User Stories

1. Là admin, tôi muốn một nút "Toàn màn hình" trên toolbar của editor, để vào chế độ vẽ tập trung
   bằng một cú bấm.
2. Là member, tôi muốn một nút "Toàn màn hình" ở hàng điều khiển của viewer, để trình chiếu chiến
   thuật cho cả bang.
3. Là member xem một chiến thuật chỉ có một giai đoạn, tôi muốn vẫn thấy nút "Toàn màn hình", dù
   viewer không có tab giai đoạn nào.
4. Là admin hoặc member, tôi muốn bấm `F` để vào chế độ này, để khỏi phải tìm nút.
5. Là admin, tôi muốn phím `F` không có tác dụng khi tôi đang gõ (đổi tên giai đoạn, ghi chú, chữ
   trên bản đồ) hoặc khi một hộp thoại đang mở, để gõ chữ "f" không bật nhầm chế độ.
6. Là admin, tôi muốn nút hiện cap phím `F`, để biết có phím tắt.
7. Là admin, tôi muốn nút trên toolbar chỉ còn icon và cap `F` khi màn hình hẹp hơn `xl`, để
   toolbar không bị tràn, và tên đầy đủ vẫn được đọc cho trình đọc màn hình.
8. Là người dùng, tôi muốn trình duyệt cũng ẩn thanh địa chỉ và tab, để chỉ còn chiến thuật trên
   màn hình.
9. Là người dùng, tôi muốn chế độ này vẫn chạy khi trình duyệt từ chối toàn màn hình thật.
10. Là admin, tôi muốn trong chế độ này vẫn dùng đủ công cụ: chọn công cụ, màu, nét, kích thước
    token, hoàn tác, làm lại, lưu, xuất ảnh, palette, quản lý preset, thêm, nhân bản, đổi tên và xoá
    giai đoạn, play, onion-skin, ghi chú.
11. Là admin, tôi muốn mọi phím tắt của editor (`1`-`6`, `[` `]`, `Delete`, Ctrl+Z, Ctrl+Shift+Z,
    Ctrl+S) chạy y như ngoài trang thường.
12. Là admin, tôi muốn thấy chữ "Chưa lưu" trên thanh trên khi bản vẽ hoặc ghi chú còn thay đổi
    chưa lưu, để không quên lưu.
13. Là admin, tôi muốn kéo token từ palette thả vào bản đồ trong chế độ này và token rơi đúng chỗ
    tôi thả.
14. Là admin, tôi muốn các hộp thoại (chữ trên bản đồ, preset token, xuất ảnh, xoá giai đoạn) mở và
    dùng được ngay trong chế độ này.
15. Là admin, tôi muốn vào hoặc thoát chế độ này mà không mất zoom, giai đoạn đang mở, việc đang
    phát và thay đổi chưa lưu.
16. Là admin, tôi muốn thoát chế độ này mà không bị hỏi lưu, vì tôi vẫn ở trang đó.
17. Là admin, tôi muốn rời trang khi chưa lưu thì vẫn bị hỏi như trước.
18. Là người dùng, tôi muốn bản đồ to nhất có thể mà vẫn nằm trọn trên màn hình, không cần cuộn, dù
    cửa sổ rộng hay cao.
19. Là người dùng, tôi muốn thấy rõ mép bản đồ khi hai bên có khoảng trống.
20. Là người dùng, tôi muốn vẫn zoom bằng con lăn, kéo bằng chuột giữa và dùng các nút zoom trong
    chế độ này.
21. Là member, tôi muốn tab giai đoạn, phím `←` `→`, play và onion-skin nằm trên thanh trên, để
    thân màn hình chỉ còn bản đồ và ghi chú.
22. Là member, tôi muốn đọc ghi chú chiến thuật ở cột bên phải và thu gọn được cột đó, để bản đồ
    to hơn khi cần.
23. Là admin, tôi muốn panel ghi chú và palette vẫn thu gọn được như ngoài trang thường.
24. Là người dùng, tôi muốn bấm `Esc` hoặc nút ✕ để thoát, và nút ✕ có cap `Esc`.
25. Là người dùng, tôi muốn `Esc` khi đang gõ hoặc khi có hộp thoại mở chỉ đóng thứ đó (vd. huỷ đổi
    tên giai đoạn), không thoát chế độ.
26. Là người dùng, tôi muốn thoát toàn màn hình của trình duyệt (`Esc`, `F11`) thì cũng thoát luôn
    chế độ này.
27. Là người dùng, tôi muốn sau khi thoát, focus quay về nút "Toàn màn hình".
28. Là người dùng bàn phím hoặc trình đọc màn hình, tôi muốn chế độ này được công bố là một hộp
    thoại có tên, và focus không thoát ra ngoài.
29. Là admin, tôi muốn toast (vd. lưu thất bại) vẫn hiện phía trên chế độ này.
30. Là người dùng trên điện thoại hoặc tablet hẹp, tôi muốn không thấy nút này.
31. Là admin, tôi muốn khi cửa sổ thu nhỏ dưới `lg` và editor nhường chỗ cho viewer, chế độ này tự
    thoát, vì cây nội dung đã đổi.
32. Là member, tôi muốn thu nhỏ cửa sổ khi đang bật mà chế độ không tự thoát, giống đua mèo.
33. Là người dùng, tôi muốn chế độ này hiện ra bằng một lần mờ dần ngắn.
34. Là người dùng, tôi muốn reload trang thì quay về trang thường.
35. Là admin xếp đội và admin đua mèo, tôi muốn focus mode của hai màn đó vẫn chạy y như trước.

## Implementation Decisions

- **Phạm vi:** cả editor và viewer của trang một chiến thuật. Trang danh sách chiến thuật không có.
  Không đổi API, schema hay `packages/shared`. Không thêm quyền mới: ai mở được trang thì dùng được.
- **Dùng lại phần chung:** hook focus mode và `FocusModeShell` dùng chung (đã tách ở PR 220). Không
  thêm logic fullscreen, phím hay focus trap riêng cho chiến thuật.
- **Đổi khung tại chỗ, không mount lại.** Canvas Konva, zoom, playback, onion-skin và stage ref
  dùng để xuất ảnh đều là state cục bộ. Vì vậy shell bọc nội dung với `active` đổi tại chỗ, giống
  màn đua mèo. Các phần chỉ có trong một chế độ (thanh trên, hàng tab của viewer ở trang thường)
  được render có điều kiện tại vị trí cố định, để canvas không đổi vị trí trong cây.
- **Mỗi nửa (editor, viewer) có focus mode riêng.** Editor và viewer là hai cây khác nhau, nên mỗi
  bên tự gọi hook và tự bọc shell của mình. Khi admin đổi giữa editor và viewer (cửa sổ qua lại mốc
  `lg`), focus mode của nửa cũ tắt theo `enabled` của hook. Viewer không tự thoát khi cửa sổ nhỏ
  lại.
- **Nút vào:**
  - Editor: nút `ghost` `sm` ở cụm phải của toolbar, trước "Xuất ảnh". Gồm icon `Maximize2`, chữ
    "Toàn màn hình" (ẩn dưới `xl`, `aria-label` luôn có tên đầy đủ) và cap `Kbd` `F`. Nút ẩn trong
    chế độ toàn màn hình, và ẩn dưới `lg`.
  - Viewer: luôn có một hàng điều khiển, kể cả khi chỉ có một giai đoạn. Hàng gồm tab, gợi ý `←` `→`
    và play / onion-skin khi có từ hai giai đoạn trở lên, cùng nút "Toàn màn hình" (`outline`
    `sm`, cap `F`) căn phải, giống nút của màn xếp đội.
- **Thanh trên (shell, kính tối mặc định):**
  - Editor: tên chiến thuật (`h2`, cắt bớt nếu dài) và chữ "Chưa lưu" khi bản vẽ hoặc ghi chú còn
    thay đổi chưa lưu, cùng điều kiện với leave guard. Toolbar vẽ vẫn ở một hàng riêng ngay dưới.
  - Viewer: tên chiến thuật, rồi hàng tab, gợi ý phím và play / onion-skin. Hàng tab ở thân trang
    không render khi đang bật.
- **Bố cục thân:**
  - Editor: bỏ viền, bo góc và bóng của khung editor. Các hàng là toolbar, phần giữa (palette | vùng
    bản đồ | ghi chú) chiếm hết chiều cao còn lại, và thanh giai đoạn.
  - Viewer: vùng bản đồ `1fr` và một cột ghi chú bên phải (khi chiến thuật có ghi chú). Cột này là
    một `aside` chỉ đọc, thu gọn được giữa `w-72` và `w-12`, cùng dáng với panel ghi chú của editor.
    Mặc định mở, không nhớ qua reload. Ngoài chế độ toàn màn hình, khối ghi chú của viewer giữ
    nguyên.
  - Nền là `bg-background` theo theme, không dùng nền đêm của sân khấu đua mèo.
- **Bản đồ vừa khung theo cả hai chiều (chỉ khi bật):**
  - Trang thường giữ nguyên: chiều cao theo chiều rộng.
  - Khi bật, vùng bản đồ đo cả chiều rộng lẫn chiều cao. Bề ngang bản đồ là
    `min(rộng, cao × TACTIC_MAP_WIDTH / TACTIC_MAP_HEIGHT)`, và bản đồ được căn giữa. Phép tính này là
    một hàm thuần đặt cạnh các hàm tỉ lệ sẵn có.
  - Zoom, pan, điểm thả token từ palette và vị trí thanh hành động của vùng chọn đều tính theo hộp
    bản đồ đã fit, không theo vùng chứa bên ngoài. Nếu tính theo vùng chứa thì token thả xuống sẽ lệch
    đúng bằng phần viền trống.
  - Vùng thừa giữ nền lưới, thêm vignette nhẹ như cột grid của màn xếp đội. Bản đồ có
    `ring-1 ring-border` và `rounded-inner`. Không thêm noise hay grain.
- **Phím:** `F` bật, `Esc` tắt, theo quy tắc bỏ qua sẵn có của hook. `Esc` trong ô đổi tên giai đoạn
  là đang gõ, nên chỉ huỷ đổi tên. Không có phím tắt mới nào khác. `F` không trùng với phím nào của
  editor.
- **Lưu và rời trang:** thoát chế độ không lưu và không hỏi. Leave guard vẫn chạy như cũ khi chuyển
  trang.
- **Lớp z:** lớp phủ `z-40`. Hộp thoại, toast và preview kéo token (`fixed z-50`) vẫn ở trên. Không
  thêm bậc z mới.
- **A11y:** tên hộp thoại là "Vẽ chiến thuật toàn màn hình" (editor) và "Xem chiến thuật toàn màn
  hình" (viewer). Focus được giữ bên trong và quay về nút vào khi đóng.
- **Motion:** chỉ fade opacity của shell. Thu gọn ghi chú dùng đúng cách panel ghi chú hiện có đang
  làm.
- **Không đổi font, bảng màu hay bộ icon.**
- **Quy ước:** mục focus mode trong `.claude/rules/web/interaction.md` thêm màn chiến thuật làm ví
  dụ cho trường hợp "một màn có hai nửa, mỗi nửa một focus mode" và "bản đồ fit theo cả hai chiều
  khi bật".

## Testing Decisions

- Chỉ test hành vi nhìn thấy được qua DOM: có nút, bấm thì gì xuất hiện, phím nào làm gì, canvas có
  bị mount lại không. Không test class CSS, độ rộng cột hay opacity.
- **Seam chính: test component `TacticEditorScreen`** (đã có `tactic-editor-screen.test.tsx`, mở rộng
  file đó). Đây là seam cao nhất phủ được cả editor và viewer. Harness sẵn có đã mock lớp request
  API, canvas Konva, `matchMedia` và `ResizeObserver`. Thêm vào: đếm số lần canvas mount, và stub
  Fullscreen API như `team-builder-screen.test.tsx`.
  - Editor (quyền ghi, desktop): có nút "Toàn màn hình". Bấm vào hoặc nhấn `F` thì có dialog "Vẽ
    chiến thuật toàn màn hình", chứa toolbar và thanh giai đoạn. Header trang không còn trong dialog.
  - `F` khi focus đang ở ô đổi tên giai đoạn hoặc ô ghi chú thì không bật.
  - `Esc` hoặc ✕ tắt chế độ và focus quay về nút. `Esc` trong ô đổi tên giai đoạn chỉ huỷ đổi tên.
  - Có thay đổi chưa lưu thì thanh trên ghi "Chưa lưu".
  - Bật, rồi tắt: stub canvas không mount lại.
  - Phím tắt editor (vd. `2` chọn công cụ token) vẫn chạy trong dialog.
  - Desktop chuyển sang mobile khi đang bật (editor): dialog biến mất.
  - Viewer (không quyền ghi): có nút kể cả khi chỉ có một giai đoạn. Khi bật, dialog "Xem chiến
    thuật toàn màn hình" chứa tab giai đoạn. Cột ghi chú thu gọn và mở lại được. Canvas không mount
    lại.
  - `requestFullscreen` được gọi trên `documentElement`. Nếu nó reject thì chế độ vẫn bật.
    `fullscreenchange` khi không còn `fullscreenElement` thì tắt chế độ.
- **Seam phụ: unit test hàm fit bản đồ** (thuần), cùng kiểu với `zoom.test.ts`: cửa sổ rộng thì bị
  chặn bởi chiều cao, cửa sổ cao thì bị chặn bởi chiều rộng, và kích thước 0 thì không ra số âm hay
  NaN.
- **Hồi quy:** test hiện có của màn xếp đội, đua mèo và `focus-mode-shell` phải xanh mà không sửa
  assertion.
- Prior art: `team-builder-screen.test.tsx`, `cat-race-event-screen.test.tsx`,
  `focus-mode-shell.test.tsx`, `zoom.test.ts`.

## Out of Scope

- Focus mode cho trang danh sách chiến thuật.
- Một chế độ "trình chiếu" riêng trong editor, ẩn công cụ vẽ (member viewer đã làm việc đó).
- Tự ẩn điều khiển khi chuột đứng yên (`useIdleChrome`) cho viewer.
- Fit bản đồ theo chiều cao ở trang thường.
- Focus mode trên điện thoại hoặc tablet hẹp, và chế độ vẽ bằng cảm ứng.
- Nhớ trạng thái bật hoặc trạng thái thu gọn ghi chú qua reload.
- Đổi font, bảng màu hay bộ icon.

## Further Notes

- Map ảo là 1920×1071. Trên màn 1080p có toolbar, thanh giai đoạn và thanh trên, bản đồ sẽ bị chặn
  bởi chiều cao, nên phần fit theo hai chiều là bắt buộc chứ không phải trang trí.
- Bố cục được chốt theo `redesign-skill`, trong giới hạn của `display.md` và `interaction.md`. Gợi ý
  chung của skill như đổi font hay icon set bị bỏ qua vì trái với quy ước của dự án.
- `tactic-editor-screen.test.tsx` đã có sẵn harness cho `TacticEditorScreen`; ticket đầu tiên chỉ
  bổ sung bộ đếm mount canvas và stub Fullscreen API vào đó.
