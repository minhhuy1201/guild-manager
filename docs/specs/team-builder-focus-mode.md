# Xếp đội hình toàn màn hình (focus mode)

Status: approved

## Problem Statement

Admin xếp 10 đội cho một trận bang chiến trên một trang dài. Grid 10 đội nằm trên, danh sách thành
viên chưa xếp nằm dưới trong một khung cao cố định, xung quanh còn header, chọn tuần, tab buổi,
thanh công cụ và các banner. Muốn kéo một người từ pool lên một đội ở hàng dưới thì phải cuộn qua
lại, và rất khó thấy cùng lúc cả 10 đội lẫn những người còn lại. Admin muốn một chế độ chỉ để xếp
đội: không còn gì khác trên màn hình, giống như xem phim.

## Solution

Màn xếp đội có thêm nút **"Toàn màn hình"** (phím tắt `F`). Bấm vào thì việc xếp đội phủ kín màn
hình và trình duyệt cũng vào chế độ toàn màn hình:

- Bên trái, chiếm phần lớn bề ngang: 2 hàng đội (`Đội 1-5`, `Đội 6-10`), mỗi hàng 5 cột, luôn mở.
- Bên phải: cột "Thành viên chưa xếp" cao hết màn hình. Ô tìm kiếm và chip lớp phái ghim ở đầu,
  danh sách tự cuộn, và cả cột là vùng thả để gỡ người ra.
- Trên cùng là một thanh mỏng: tên trận, chọn trận 1/2, dòng báo người vắng (nếu có), nút thoát.
- Có thay đổi chưa lưu thì thanh lưu quen thuộc (Đặt lại / Hoàn tác / Lưu) ghim ở đáy cột đội hình.

Thoát bằng `Esc` hoặc nút ✕. Draft vẫn giữ nguyên khi thoát.

## User Stories

1. Là admin, tôi muốn một nút "Toàn màn hình" ngay trên thanh công cụ xếp đội, để vào chế độ tập
   trung bằng một cú bấm.
2. Là admin, tôi muốn bấm `F` để vào chế độ toàn màn hình, để khỏi rời tay khỏi bàn phím.
3. Là admin, tôi muốn phím `F` không có tác dụng khi tôi đang gõ tên đội, ghi chú hay ô tìm kiếm,
   để gõ chữ "f" không bật nhầm chế độ.
4. Là admin, tôi muốn nút hiện cap phím `F`, để biết có phím tắt.
5. Là admin, tôi muốn trình duyệt cũng ẩn thanh địa chỉ và tab khi vào chế độ này, để có trọn màn
   hình cho đội hình.
6. Là admin, tôi muốn chế độ này vẫn chạy khi trình duyệt từ chối toàn màn hình thật, để không
   gặp lỗi chỉ vì một quyền của trình duyệt.
7. Là admin, tôi muốn thấy cả 10 đội cùng lúc ở bên trái, để so sánh và cân đối các đội.
8. Là admin, tôi muốn cả 2 hàng đội luôn mở trong chế độ này, để không phải mở lại hàng đã gập.
9. Là admin, tôi muốn grid đội hình tự cuộn bên trong khi màn hình thấp, để thanh trên và pool
   không bị đẩy đi.
10. Là admin, tôi muốn danh sách thành viên chưa xếp cao hết màn hình ở bên phải, để thấy được
    nhiều người hơn cái khung thấp hiện tại.
11. Là admin, tôi muốn ô tìm kiếm và chip lớp phái luôn ghim ở đầu pool, để lọc được mà không phải
    cuộn lên.
12. Là admin, tôi muốn kéo một người từ pool vào bất kỳ slot nào, kể cả đội ở hàng dưới, mà không
    phải cuộn trang.
13. Là admin, tôi muốn kéo một người từ slot thả lại vào pool để gỡ họ ra, giống như ngoài trang
    thường.
14. Là admin, tôi muốn đổi chỗ, sửa ghi chú, đổi tên đội ngay trong chế độ này, giống hệt ngoài
    trang thường.
15. Là admin, tôi muốn chuyển giữa trận 1 và trận 2 ngay trên thanh trên, để xếp cả hai trận mà
    không phải thoát ra.
16. Là admin, tôi muốn thấy tên trận trên thanh trên, để biết mình đang xếp cho buổi nào và trận
    nào.
17. Là admin, tôi muốn thấy dòng báo người đã xếp nhưng báo vắng, kèm nút gỡ họ ra, để không bỏ sót
    người nghỉ.
18. Là admin, tôi muốn thanh lưu hiện ở đáy cột đội hình khi có thay đổi, để lưu ở đúng chỗ quen
    thuộc.
19. Là admin, tôi muốn `Ctrl/Cmd+S` và `Ctrl/Cmd+Z` vẫn chạy trong chế độ này.
20. Là admin, tôi muốn lớp phủ "Đang lưu đội hình..." vẫn che grid khi đang lưu, để không kéo thả
    nhầm lúc dữ liệu đang gửi đi.
21. Là admin, tôi muốn hộp thoại xung đột khi lưu vẫn hiện phía trên chế độ này, để xử lý được ngay
    tại chỗ.
22. Là admin, tôi muốn bấm `Esc` hoặc nút ✕ để thoát, và nút ✕ có cap `Esc`.
23. Là admin, tôi muốn `Esc` khi đang gõ trong một ô, hoặc khi một hộp thoại đang mở, chỉ đóng thứ
    đó chứ không thoát chế độ toàn màn hình.
24. Là admin, tôi muốn thoát toàn màn hình của trình duyệt (`Esc`, `F11`) thì cũng thoát luôn chế
    độ này, để hai thứ không bị lệch nhau.
25. Là admin, tôi muốn thoát mà không bị hỏi gì và không mất draft, vì thanh lưu ngoài trang vẫn
    còn đó.
26. Là admin, tôi muốn sau khi thoát, focus quay về nút "Toàn màn hình", để bàn phím không bị lạc.
27. Là admin dùng bàn phím hoặc trình đọc màn hình, tôi muốn chế độ này được công bố là một hộp
    thoại có tên và focus không thoát ra ngoài nó.
28. Là admin, tôi muốn không thấy nút này khi trận đã đánh (read-only), vì lúc đó không còn pool để
    xếp.
29. Là admin, tôi muốn chế độ này tự thoát nếu trận chuyển sang read-only trong lúc đang mở.
30. Là admin trên điện thoại hoặc tablet hẹp, tôi muốn không thấy nút này, vì màn hẹp đã hiện từng
    đội một.
31. Là admin, tôi muốn chế độ này hiện ra bằng một lần mờ dần ngắn chứ không nhảy bụp, và grid
    không có hiệu ứng xuất hiện riêng.
32. Là admin, tôi muốn thấy thanh trên, pool và grid tách lớp rõ ràng (thanh kính tối, pool nền
    lõm, grid ở giữa có viền tối nhẹ ở mép), để mắt dồn vào đội hình.
33. Là admin, tôi muốn reload trang thì quay về trang thường, vì chế độ này không cần nhớ.

## Implementation Decisions

- **Một cây, hai bố cục.** Grid và pool chỉ được mount một lần. Mỗi slot và pool là một droppable
  của dnd-kit, có id duy nhất, nên không được dựng thêm bản thứ hai cho chế độ toàn màn hình. Khi
  bật, màn xếp đội đổi khung bao quanh grid và pool sang bố cục toàn màn hình. Các banner, thanh
  công cụ và tab ngoài trang không hiện nữa. `DndContext` và `DragOverlay` giữ nguyên.
- **Trạng thái bật/tắt nằm cục bộ trong màn xếp đội** (state React), không đưa vào store và không
  lưu qua reload. Không có thay đổi API, schema hay `packages/shared`.
- **Fullscreen API trên `document.documentElement`, không trên một element con.** Dialog, popover,
  tooltip và toast đều portal ra `body`. Fullscreen trên root giữ chúng hiển thị được, còn trên một
  element con thì sẽ giấu chúng. Gọi API chỉ là "nếu được": nếu không có hoặc bị từ chối thì bỏ qua
  im lặng, chế độ vẫn chạy bằng lớp phủ. Đây là catch rỗng có lý do, phải ghi rõ trong code.
- **Đồng bộ với trình duyệt:** khi document rời toàn màn hình (`fullscreenchange` mà không còn
  `fullscreenElement`) thì chế độ tắt. Khi chế độ tắt bằng ✕ hoặc `Esc` mà document vẫn đang toàn
  màn hình thì gọi `exitFullscreen`.
- **Phím:** `F` bật, `Esc` tắt. Cả hai bỏ qua khi focus đang ở ô nhập (dùng helper `isTypingTarget`
  có sẵn), khi có phím bổ trợ, và khi sự kiện đã bị chặn trước (một hộp thoại đã xử lý `Esc`). Cap
  `Kbd` hiện trên nút, theo quy ước shortcut.
- **Điều kiện hiện nút:** chỉ khi trận còn sửa được, và chỉ từ breakpoint `lg` (ẩn bằng CSS). Nếu
  trận chuyển sang read-only trong lúc đang bật thì chế độ tắt. Dưới `lg` không có nút. Nếu cửa sổ
  bị thu nhỏ dưới `lg` trong lúc đang bật thì bố cục xếp chồng và cuộn trong lớp phủ, không tự
  thoát.
- **Bố cục** (từ `lg`): lớp phủ `fixed inset-0`, chia làm thanh trên và thân. Thân là CSS Grid hai
  cột: grid đội hình `1fr`, pool `clamp(280px, 22vw, 360px)`, mỗi cột tự cuộn. Pool có độ rộng kẹp
  thay vì theo % vì card thành viên cần một độ rộng tối thiểu. Ở 1440px grid còn khoảng 1080px,
  ngang bề rộng cột hiện tại.
- **`FormationGrid`** có thêm cách hiện "luôn mở". Ở chế độ toàn màn hình, các hàng đội không bọc
  trong `TeamRowGroup` gập được, nhưng nhãn hàng (`Đội 1-5 18/30`) vẫn còn. `layout` `capture` dành
  cho ảnh Discord không đổi.
- **`MemberPool`** có thêm cách hiện "cao hết cột": bộ lọc và chip ghim ở đầu, danh sách lấy phần
  cao còn lại thay cho `h-64`, card 2 cột. Vùng thả bao toàn bộ phần danh sách.
- **Thanh trên:** tên trận (cùng `buildBannerTitle`), `MatchTabs`, `AbsentBanner` thu gọn thành một
  dòng, nút ✕ có cap `Esc`. Kiểu kính tối giống site header. Không có Copy, Thông báo đội hình, chọn
  tuần, tab buổi, prefill banner.
- **Lưu:** dùng lại `UnsavedChangesBar` (đúng quy ước "Save trong `UnsavedChangesBar`, sticky"),
  sticky ở đáy cột grid trong lớp phủ, chỉ hiện khi có thay đổi. Không viết logic lưu mới.
- **Lớp z:** lớp phủ dùng `z-40`. Lớp phủ nằm sau site header trong DOM nên vẫn phủ được header.
  Dialog, popover và tooltip ở `z-50` vẫn nằm trên lớp phủ. Không thêm bậc z mới.
- **A11y:** lớp phủ có `role="dialog"`, `aria-modal`, `aria-label="Xếp đội hình toàn màn hình"`,
  giữ focus bên trong, và trả focus về nút vào khi đóng.
- **Motion:** lớp phủ chỉ fade opacity với `--duration-base`, `--ease-out-soft`. Grid không có hiệu
  ứng xuất hiện ("Never reveal the formation grid"). Vignette ở mép vùng grid là một gradient
  radial tĩnh trên nền `bg-background`.

## Testing Decisions

- Chỉ test hành vi nhìn thấy được qua DOM: có nút, bấm thì gì xuất hiện, phím nào thoát. Không test
  class CSS, không test tỉ lệ cột.
- **Seam duy nhất: test component `TeamBuilderScreen`**, mở rộng file test hiện có. File đó đã mock
  `useFormationScreen`, grid và pool. Các ca cần có:
  - Trận sửa được: có nút "Toàn màn hình". Bấm vào thì có dialog "Xếp đội hình toàn màn hình" chứa
    grid và pool.
  - Trận read-only: không có nút.
  - `F` bật chế độ. `F` khi focus đang trong ô nhập thì không bật.
  - `Esc` hoặc nút ✕ tắt chế độ, và focus quay về nút.
  - `requestFullscreen` được gọi trên `documentElement` khi bật. Nếu nó reject thì chế độ vẫn bật.
  - Sự kiện `fullscreenchange` khi không còn `fullscreenElement` thì tắt chế độ.
- Fullscreen API không có trong jsdom, nên test stub `requestFullscreen`, `exitFullscreen` và
  `fullscreenElement`.
- Prior art: `team-builder-screen.test.tsx` (mock hook màn hình), `formation-toolbar.test.tsx`
  (nút toolbar), và các test shortcut dùng `isTypingTarget`.

## Out of Scope

- Chế độ toàn màn hình trên điện thoại hoặc tablet hẹp.
- Copy đội hình, Thông báo đội hình, đổi tuần, đổi buổi khi đang ở chế độ này (phải thoát ra trước).
- Nhớ trạng thái bật qua reload hoặc giữa các buổi.
- Hiện hai trận song song.
- Đổi font, bảng màu hay bộ icon của app.

## Further Notes

- Ước tính một đội (header và 6 slot) cao khoảng 370px. Hai hàng cộng thanh trên khoảng 880px, vừa
  màn 1080p khi đã vào toàn màn hình thật. Đây là ước tính **chưa đo**: lúc làm ticket 02 môi trường không có trình duyệt
  để dựng trang xếp đội (cần đăng nhập admin và API), nên chưa có số thật. Cần đo một lần trên máy
  có trình duyệt. Nếu không vừa thì grid tự cuộn, không phải lỗi.
- Quy ước mới (lớp phủ toàn màn hình, phím `F`) được ghi thêm vào `.claude/rules/web/interaction.md`,
  mục team builder, cùng PR.
