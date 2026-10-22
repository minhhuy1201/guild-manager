# Thiết kế lại giao diện web - "Thuỷ mặc hiện đại"

Status: approved

Ngày: 2026-10-22 · Base: `8fc92ca` · Phạm vi: `apps/web`, trừ đua mèo

## Problem Statement

Bang thấy giao diện hiện tại nhạt. Ảnh chụp ngày 2026-10-22 (1440px và 420px, cả hai theme) cho thấy:

- Mọi trang chung một khuôn: một dải banner thấp, cảnh game gần như không đọc được, rồi các card
  trắng giống hệt nhau trên nền be. App trông như bảng tính admin, không như trang của một bang
  wuxia.
- Một `Card` duy nhất cho mọi khối. Không có cấp nổi, không có tiêu đề section có chất, không có
  điểm nhấn. Chỉ trang landing có bo lớn, thẻ tông vàng/ngọc và tiêu đề serif.
- Bố cục bỏ trống nhiều. Ô "Tuần này của bạn" chiếm một góc card, phần còn lại trống. Bảng điểm danh
  một trận trải ngang cả màn hình. Card biểu đồ lịch sử nằm lẻ trong lưới ba cột.
- Thứ bậc yếu ở trang xếp team. Tab trận, toolbar, banner đội hình và nhóm đội chồng nhau cùng một
  khoảng cách.
- Theme tối có chỗ lệch tông. Tab trận đang chọn là một khối xanh nhạt lớn.
- Chuyển động chỉ có "dữ liệu đang đến". Hover, nhấn và chuyển trang gần như phẳng.

## Solution

Thiết kế lại toàn bộ web theo hướng **"Thuỷ mặc hiện đại"**: vẫn là app làm việc, dữ liệu vẫn dễ đọc
nhất, nhưng không khí giang hồ được nâng lên rõ rệt. Cân bằng mới là **55% app / 30% wuxia / 15% Nghịch
Thuỷ Hàn**, thay cho 70/20/10.

- Banner trang cao hơn, kiểu điện ảnh. Cảnh zoom chậm một lần khi vào trang.
- Bề mặt có vân giấy và mực. Divider kiểu nét cọ.
- Card có ba cấp: nổi bật, thường, lõm.
- Header kính mờ.
- Glow ngọc/vàng đặt đúng vài điểm nhấn.
- Tiêu đề section dùng serif, như landing.
- Hover và nhấn có cảm giác vật lý. Thanh nav trượt giữa các mục. Chuyển trang mượt.
- Bố cục từng trang được sắp lại để hết khoảng trống chết và có thứ bậc rõ.

Business logic không đổi: hooks, stores, API, query, server action, quy tắc nghiệp vụ (chu kỳ bấm ô
điểm danh, khoá hạn, undo...) giữ nguyên. Được đổi cấu trúc JSX và bố cục.

Giao làm 5 PR, mỗi PR tự đứng được và đổi diện mạo thấy ngay.

## User Stories

### Chung

1. As a member, I want the app to feel like it belongs to the world of Nghịch Thuỷ Hàn, so that opening it feels like part of guild life rather than filling a form.
2. As a member, I want every page to share one visual language, so that I always know where I am and what I can press.
3. As a member, I want data (tables, the formation grid, forms) to stay on plain, calm surfaces, so that atmosphere never gets in the way of reading.
4. As a member, I want the light theme to stay the default, so that the app looks the way I already know it until I choose otherwise.
5. As a member who picked the dark theme, I want every surface and accent to sit in one consistent night palette, so that nothing looks out of place.
6. As a member who prefers reduced motion, I want every animation turned off, so that the app stays comfortable to use.
7. As a member on a phone (360-430px wide), I want every redesigned page to fit without sideways scrolling and with 44px touch targets, so that it works one-handed.
8. As a member on a slow connection, I want the banner pictures to fade in over their dominant colour, so that I never see a white box pop.

### Khung app (header, nav, footer)

9. As a member, I want the header to be a translucent ink band that lets the page show through when I scroll, so that it frames the page without feeling heavy.
10. As a member, I want the active-page marker in the nav to slide to the page I pick, so that the move from one page to another is visible.
11. As a member, I want moving between pages to cross-fade smoothly, so that the app feels like one place rather than separate screens.
12. As a member on a phone, I want the bottom tab bar to match the header and show the active tab clearly, so that navigation looks the same on every screen size.
13. As a visitor, I want the footer to still credit NetEase and say the site is not affiliated, so that the guild stays honest about the artwork.

### Tiêu đề trang

14. As a member, I want each page to open on a taller, cinematic banner of its own game scene, so that each page has a clear identity.
15. As a member, I want the banner scene to drift in slowly once when the page opens, so that the page feels alive without anything looping.
16. As a member, I want the page title to be large and set in the new heading serif, so that I know at a glance which page I am on.
17. As a member on the attendance page or its history on a phone, I want the banner to stay compact (text only, as today), so that my answers start near the top of the screen.
18. As a member, I want page-wide controls (week picker, create button) to sit clearly inside the banner, so that I find them where I expect.

### Bề mặt và thành phần

19. As a member, I want important blocks (my week, the formation headline) to stand out from ordinary ones, so that my eye goes to what matters first.
20. As a member, I want section titles inside cards to read as titles (serif, with a small ornament), so that a long page is easy to scan.
21. As a member, I want clickable cards to lift slightly and light their edge under my cursor, so that I can tell what is clickable on a computer.
22. As a member, I want buttons to respond to hover and press with a short, physical motion, so that every press feels acknowledged.
23. As a member, I want tables to have a calmer header and lighter row stripes, so that long rosters are easier to read.
24. As a member, I want empty states to feel designed (seal, short line, way forward) rather than an inbox icon on white, so that "nothing here" does not feel broken.
25. As a member, I want the 404 and error pages to carry the guild's identity, so that even a dead end feels like part of the app.
26. As a member, I want dialogs to open on a softly blurred, tinted backdrop, so that the dialog clearly sits above the page.

### Điểm danh

27. As a member, I want "my week" to show my matches as a row of large tiles that fill the width, so that the block does not leave most of its space empty.
28. As a member, I want each match tile to show its state (Có / Không / not answered) through its surface and a clear icon, so that I can read my week at a glance.
29. As a member, I want the Có / Không buttons on a tile to be large and to respond clearly when pressed, so that answering is quick and certain.
30. As a member, I want the guild-wide attendance table to fit its width to the number of matches, so that a one-match week does not stretch across the screen.
31. As a member, I want the totals row of the table to stand out from member rows, so that I see the guild's count without searching.
32. As a member, I want the totals to count up when they load, so that the arrival of the numbers is visible.
33. As a member on leave, I want my leave banner to look like a notice rather than a plain box, so that I notice it.

### Lịch sử điểm danh

34. As a member, I want the week and match pickers to sit in a compact filter strip, so that the charts start higher on the page.
35. As a member, I want summary chart cards to fill the row whatever their count, so that a single card does not sit alone in a three-column grid.
36. As a member, I want a guild-war chart card to be marked by an accent edge, not a muddy grey background, so that the chart stays easy to read.

### Xếp team (admin)

37. As an admin, I want the session tabs, the match tabs and the toolbar to form one clear control area above the formation, so that the page has a visible hierarchy.
38. As an admin, I want the formation headline to look like a banner of the battle, so that the formation reads as the main subject of the page.
39. As an admin, I want team columns to have a clear header, calmer slot cells and their team colour as an accent, so that ten columns side by side stay readable.
40. As an admin, I want the selected session tab in the dark theme to use the same palette as the rest of the page, so that it does not jump out as a bright block.
41. As an admin, I want the member pool to read as a tray under the formation, so that I understand where unplaced members come from.
42. As an admin, I want dragging a member to feel smooth and the drop target to be clearly lit, so that I place people without mistakes.

### Chiến thuật

43. As a member, I want tactics shown as a grid of cards with their name, stage count and last edit, so that the list does not look like plain rows.
44. As an admin, I want the edit and delete actions to stay on each tactic card, so that managing tactics stays as quick as today.
45. As an admin, I want the tactic editor's frame and toolbar to match the new surfaces, with tool groups visibly separated, so that the editor feels part of the same app.

### Thiết lập (admin)

46. As an admin, I want the settings tabs to look like the rest of the app's tabs, so that the page is not a different style.
47. As an admin, I want session rows to be cards with a clear accent for guild-war matches, so that scrims and guild wars are easy to tell apart.
48. As an admin, I want the members and leave tables to use the same table skin as attendance, so that every table reads the same way.

### Landing và đăng nhập

49. As a visitor, I want the landing hero, pillars, leadership and join steps to use the new surfaces and motion, so that the public page shows the guild at its best.
50. As a visitor, I want the join steps to read as a numbered path with a connecting line, so that the way in is obvious.
51. As a visitor, I want the login card to look like a seal-stamped invitation over the scene, so that signing in feels like entering the guild.

## Implementation Decisions

### Hướng và tài liệu

- Viết lại brief `docs/design-direction.md` theo hướng "Thuỷ mặc hiện đại", cân bằng 55/30/15. Mục
  "Avoid" mới vẫn cấm: ảnh sau dữ liệu, animation lặp vô hạn (trừ shimmer của skeleton), hạt bay,
  sương/mây động, HUD kiểu game, font thư pháp cho chữ UI. Được phép: viền vàng mảnh ở vài điểm nhấn
  (headline đội hình, card nổi bật, login), glow ngọc/vàng, vân giấy/mực tĩnh.
- Cập nhật rule `display.md`, `interaction.md` và `frontend.md` §6 trong cùng PR với thay đổi chúng
  mô tả. Rule và code phải khớp ở mỗi PR.

### Token và nền tảng (PR 1)

- Giữ cấu trúc token hiện tại: `:root` sáng, `.dark` tối, jade, gold, primary navy, emerald/đỏ/amber
  chỉ cho trạng thái điểm danh.
- Chỉnh giá trị: nền sáng giữ tông đá ấm, thêm vân mực nhạt bên cạnh vân giấy. Theme tối giữ navy mực.
  Thêm token cho glow (jade, gold), viền sáng trong của card nổi, và `--radius` lớn hơn cho khối
  chứa (bo trong nhỏ, bo ngoài lớn).
- Font tiêu đề đổi từ Noto Serif sang **Playfair Display** (Google Fonts, có subset `vietnamese`, đã
  kiểm tra trong `font-data.json` của `next/font`). Body giữ Be Vietnam Pro. `font-heading` thêm cho
  tiêu đề section trong card (h2), không chỉ h1.
- Card có ba cấp, thêm vào `components/ui/card.tsx` bằng một prop biến thể. Mặc định không đổi hành vi
  gọi hiện có:
  - `default`: bề mặt thường.
  - `raised`: nổi bật, có viền sáng trong và glow nhẹ.
  - `inset`: lõm, cho khối phụ như filter.
- Thêm một tiêu đề section dùng chung (serif, kèm divider nét cọ ngắn), thay `CardTitle` sans ở các
  card cấp section.
- Button: hover sáng lên và nhích 1px, nhấn lún. Transition dùng token hiện có.
- Tabs: giữ biến thể `default` (track `bg-card`, tab chọn `bg-primary`), chỉnh bo, bóng và chuyển màu.
  Rule "không sửa biến thể default" được sửa thành "sửa ở `tabs.tsx`, không override từng chỗ".
- `TABLE_SKIN`: header bảng tách hẳn khỏi thân, sọc nhẹ hơn, dòng tổng là một dải nổi riêng.
- `PageHeader`: cao hơn (giữ thấp ở `isPlainOnPhone`), tiêu đề lớn hơn, scrim mới, cảnh zoom chậm một
  lần (Ken Burns bằng `transform`, không lặp). API của component (`banner`, `title`, `description`,
  `actions`, `isPlainOnPhone`) không đổi.
- Header: kính mờ trên nền mực, vẫn luôn `dark` ở cả hai theme. Thanh active trong `MainNav` trượt
  giữa các mục bằng một indicator chung thay vì mỗi link một `after:`. Tab bar điện thoại khớp header.
- Chuyển trang: dùng `<ViewTransition>` của React 19.3. Theo docs Next 16 (`view-transitions.md`),
  tính năng này "work[s] in the App Router with no configuration". Cross-fade nội dung `<main>`, giữ
  header đứng yên. Trình duyệt không hỗ trợ thì không có animation, app vẫn chạy bình thường.
- Spotlight: viền card bấm được sáng theo con trỏ. Dùng một hook client nhỏ ghi vị trí con trỏ vào
  CSS variable. Chỉ chạy với chuột hoặc bút (`event.pointerType`, theo từng lần nhập). Làm trong PR đầu tiên dùng nó (PR 4, danh sách chiến
  thuật), không làm sẵn ở PR 1.
- Đếm số chạy lên: một component client cho số tổng, chạy một lần khi dữ liệu đến. Reduced motion
  hiện số cuối ngay. Làm trong PR 2 (dòng tổng bảng điểm danh), nơi đầu tiên dùng nó.
- Empty state, 404 và error dùng con dấu bang, divider nét cọ và câu ngắn. Giữ các nội dung bắt buộc
  hiện có: nút "Thử lại", `digest`, đường về trang điểm danh.
- Motion tokens: giữ ba duration và `--ease-out-soft`. Thêm `--ease-spring` cho hover/nhấn và một
  duration dài cho Ken Burns. Các duration riêng của đua mèo không đụng.

### Theo trang (PR 2-5)

- **PR 2, điểm danh + lịch sử:**
  - "Tuần này của bạn" thành dải ô lớn lấp đủ chiều ngang, card cấp `raised`.
  - Bảng điểm danh co theo số trận, dòng tổng nổi riêng, số tổng đếm chạy lên.
  - Banner nghỉ phép thành dạng notice.
  - Lịch sử: filter thành dải `inset` gọn. Lưới card biểu đồ tự giãn theo số card. Tint guild war
    chuyển thành cạnh nhấn primary thay vì nền `bg-primary/5`.
- **PR 3, xếp team:**
  - Vùng điều khiển gồm tab trận, tab match và toolbar gom thành một khối.
  - Headline đội hình thành băng rôn có viền vàng mảnh.
  - Cột đội: header rõ, ô slot dịu, màu đội làm accent.
  - Sửa tab trận đang chọn ở theme tối.
  - Member pool thành khay. Drag overlay và vùng thả có highlight rõ.
  - Lưới đội hình vẫn không reveal. Bản `capture` (ảnh gửi Discord) không đổi bố cục: 5 cột, 10 đội,
    banner cao, không chip.
- **PR 4, chiến thuật + thiết lập:**
  - Danh sách chiến thuật thành lưới card, cả card vẫn là link, `RowActions` vẫn nằm trên overlay.
  - Khung editor và toolbar theo bề mặt mới, nhóm công cụ tách bằng nền.
  - Thiết lập: tab theo `tabs.tsx` mới, dòng trận thành card có cạnh nhấn guild war. Bảng thành viên
    và bảng nghỉ phép dùng `DataTable` skin chung. `LeavePanel` hiện dùng `Table` trần, chuyển sang
    skin chung mà không đổi dữ liệu và hành vi.
- **PR 5, landing + đăng nhập:**
  - Landing dùng bề mặt và motion mới.
  - Bước gia nhập thành chuỗi có số và đường nối.
  - Card đăng nhập kiểu thiệp mời có con dấu.

### Giữ nguyên

- Mọi hook, store, query key, fetch, server action, schema, route, quyền admin.
- Vai trò màu: emerald/đỏ/amber chỉ cho trạng thái điểm danh. Gold không bao giờ là trạng thái.
- Kích thước control và sàn 44px trên điện thoại. Root font 115%/120%.
- Không ảnh sau dữ liệu. Không cuộn ngang trang. Save bar vẫn `sticky`.
- Mọi thứ thuộc đua mèo: `features/cat-race`, khối `--stage-*` và `.race-*` trong `globals.css`.
  Hai trang đua mèo giữ banner thấp như cũ (prop `isCompact` của `PageHeader`), để banner cao
  không đẩy stage xuống. Card, Button, EmptyState và header dùng chung nên vẫn đổi theo.

## Testing Decisions

- Test tốt kiểm hành vi thấy được: nội dung, vai trò ARIA, trạng thái, sự kiện. Không kiểm class trang
  trí. Thiết kế lại không đổi hành vi, nên mọi test hành vi phải xanh mà không cần sửa.
- **Seam chính: test component và screen hiện có** (`components/shared/__tests__`, `features/*/__tests__`,
  `app/__tests__`), chạy bằng Vitest + Testing Library. Không thêm seam mới cho phần trang trí.
- Khoảng 30 test đang assert class trang trí (sub-agent liệt kê ngày 2026-10-22, ví dụ `empty-state`,
  `page-header`, `tactic-list-screen`, `member-attendance-card`). Khi class đổi:
  - Assertion mã hoá một luật còn giữ (ví dụ `max-sm:hidden` của `isPlainOnPhone`, `max-md:hidden`
    của cột đội trên điện thoại, header mang `dark`) thì cập nhật sang class mới. Commit nói rõ vì sao.
  - Assertion chỉ khoá giao diện cũ (ví dụ đúng bộ class của empty state) thì đổi sang kiểm
    `data-slot`/vai trò, hoặc bỏ. Commit nói rõ vì sao.
- Test mới, chỉ cho phần có hành vi:
  - Card biến thể: `variant` cho ra `data-variant` tương ứng, mặc định không đổi.
  - Đếm số chạy lên: hiện đúng số cuối, và hiện ngay khi `prefers-reduced-motion`.
  - Indicator nav: đánh dấu đúng mục theo route hiện tại.
  - Prior art: `main-nav.test.tsx`, `status-icon.test.tsx`.
- Kiểm thị giác (không tự động trong CI): mỗi PR chụp ảnh trước/sau ở 1440px và 420px, theme sáng và
  tối, bằng script chụp headless trong scratchpad. Thêm 360px cho trang đổi bố cục. Đính ảnh vào PR.
- Mỗi PR chạy `pnpm --filter web typecheck`, `lint`, `test`.

## Out of Scope

- Đua mèo (`/dua-meo`, `features/cat-race`, token `--stage-*`, class `.race-*`), vừa làm ở PR #206.
- Mọi thay đổi backend, schema, API, shared package.
- Đổi framework, đổi thư viện styling, thêm thư viện animation. Dùng CSS, Tailwind 4 và
  `ViewTransition` có sẵn của React.
- Đổi canvas Konva của editor chiến thuật (màu token, hình vẽ trên sân).
- Ảnh banner mới. Dùng bộ ảnh hiện có trong `public/img/bg/`.
- Đổi copy tiếng Việt, trừ câu trong empty state, 404 và error nếu cần cho bố cục mới.

## Further Notes

- Mô hình: spec và plan chạy trên Opus 5.5. Phần code nên chuyển sang Sonnet 5.5 (theo luật routing của
  user) trước khi bắt đầu PR 1.
- Kiến trúc màu và theme (next-themes, header luôn `dark`, light mặc định) giữ nguyên. Không cần ADR mới.
  Brief `design-direction.md` là nơi ghi quyết định đổi cân bằng 55/30/15.
- Ảnh hiện trạng ngày 2026-10-22 nằm trong scratchpad của session, không commit. Ảnh trước/sau của
  từng PR đính vào PR.
