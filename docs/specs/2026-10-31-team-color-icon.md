# Màu đội và biểu tượng đội

Status: approved

Ngày: 2026-10-31 · Base: `050ba66c`

Thuật ngữ theo [`GLOSSARY.md`](../../GLOSSARY.md): **Team color** ("Màu đội") và **Team icon**
("Biểu tượng đội"), mục `## Teams`; **Formation announcement**, **Team notice**, **Manager**,
**Member**, **Capability**.

## Problem Statement

Trên màn xếp team, mười card đội có màu cố định theo số đội: đội 1-5 jade, 6-7 stone, 8 navy,
9-10 gold. Manager không đổi được màu này. Khi bang chia đội theo vai trò (đội công, đội thủ, đội
trụ, các lane), người xem phải đọc tên đội mới biết đội làm gì. Màu cũng không nói lên vai trò, vì
năm đội cùng một màu jade.

## Solution

Mỗi đội có thêm hai thuộc tính global, giống tên đội: một **Team color** chọn từ bảng 8 màu cố định,
và một **Team icon** tuỳ chọn, chọn từ bộ biểu tượng vai trò. Trên header card, chấm màu đứng trước
tên đội trở thành một nút. Bấm vào nút này mở popover gồm lưới màu (có ô "Mặc định") và lưới biểu
tượng (có ô "Không biểu tượng"). Đội có biểu tượng thì biểu tượng thay chỗ chấm màu và mang Team
color. Thay đổi vào draft. Nút Save của màn hình lưu chúng cùng tên đội.

Team color đi theo đội ở mọi nơi đội xuất hiện: card trên lưới đội hình, ảnh Formation announcement,
ảnh Team notice, và token "Đội N" trên mọi map chiến thuật. Token trên map vẫn hiện số đội, chỉ đổi
màu.

## User Stories

1. As a Manager có `TEAM_BUILDER`, I want bấm vào chấm màu trên header card để mở bảng chọn, so that tôi đổi màu đội mà không rời lưới.
2. As a Manager, I want chọn một trong 8 màu có sẵn, so that màu nào cũng hợp theme và dễ phân biệt.
3. As a Manager, I want thấy card đổi màu ngay khi chọn, so that tôi xem kết quả trước khi lưu.
4. As a Manager, I want chọn ô "Mặc định", so that đội quay về màu nhóm cũ khi tôi đổi ý.
5. As a Manager, I want chọn một biểu tượng vai trò (Trụ, Công, Thủ, Cơ động, Trinh sát, Bảo tiêu, Top lane, Mid lane, Bot lane), so that ai nhìn card cũng biết đội làm gì.
6. As a Manager, I want chọn "Không biểu tượng", so that đội không có vai trò rõ ràng chỉ hiện chấm màu.
7. As a Manager, I want biểu tượng mang màu của đội, so that màu và vai trò đọc được cùng lúc.
8. As a Manager, I want lưu màu, biểu tượng và tên đội bằng cùng một nút Save, so that không có hai cách lưu cho cùng một header.
9. As a Manager, I want rời màn hình mà không Save thì mất thay đổi màu và biểu tượng, như tên đội, so that hành vi draft nhất quán.
10. As a Manager, I want thấy dialog xung đột khi Manager khác đã lưu tên, màu hoặc biểu tượng trước tôi, so that tôi không ghi đè thay đổi của họ.
11. As a Manager, I want màu và biểu tượng giữ nguyên ở mọi tuần và mọi trận, so that tôi chỉ chọn một lần.
12. As a Manager xem tuần cũ hoặc trận đã đánh, I want thấy màu và biểu tượng nhưng không mở được popover, so that tôi không sửa nhầm ở chế độ chỉ xem.
13. As a Manager, I want đội chưa chọn màu giữ màu nhóm hiện tại, so that giao diện không đổi cho tới khi có người chọn.
14. As a Manager dùng điện thoại, I want nút mở popover đủ lớn để chạm, so that tôi chọn được bằng ngón tay.
15. As a Manager dùng bàn phím, I want mở popover bằng Enter hoặc Space và chọn bằng phím mũi tên hoặc Tab, so that không cần chuột.
16. As a Member, I want thấy Team color và Team icon trong ảnh Formation announcement, so that tôi nhận ra đội và vai trò.
17. As a Member, I want thấy Team color và Team icon trong ảnh Team notice, so that tin nhắn riêng khớp với ảnh chung.
18. As a Member xem map chiến thuật, I want token "Đội N" mang Team color đã chọn, so that map khớp với lưới đội hình.
19. As a Member xem chiến thuật cũ, I want token đội hiện màu hiện tại của đội, so that một đội luôn mang một màu ở mọi nơi.
20. As a Member, I want token "Đội N" vẫn hiện số đội, so that tôi phân biệt được các đội cùng vai trò.
21. As a Manager chỉ có `TACTICS`, I want map hiện đúng Team color, so that tôi vẽ chiến thuật với màu đúng mà không cần `TEAM_BUILDER`.
22. As a Manager không có `TEAM_BUILDER`, I want không sửa được màu và biểu tượng, so that chỉ người xếp team quyết định nhận diện đội.
23. As a Manager dùng dark mode, I want 8 màu vẫn rõ và chữ trên header vẫn đọc được, so that card dễ đọc ở cả hai theme.
24. As a screen reader user, I want nút mở popover đọc ra màu và biểu tượng hiện tại của đội, so that tôi biết trạng thái mà không cần nhìn.

## Implementation Decisions

- **Bảng màu**: enum `TeamColor` trong `packages/shared/enums` gồm 8 giá trị: 4 màu theme hiện có
  (jade, stone, navy, gold) và 4 màu mới (đỏ, tím, cam, xanh trời). Prisma enum đi cùng, giữ khớp bằng
  test `prisma-enum-sync`. Mỗi màu có class Tailwind viết đầy đủ cho header và marker, token CSS cho
  light/dark mode, và một mã hex cho canvas map. Ba thứ này ở một bảng tra duy nhất phía web, thay
  cho bảng `TeamColorGroup` hiện tại.
- **Màu mặc định**: đội chưa chọn màu lấy màu nhóm hiện tại theo số đội (1-5 jade, 6-7 stone, 8 navy,
  9-10 gold). Bảng mặc định này nằm ở một chỗ, và card lẫn token map đều đọc từ đó. Hiện chỉ có 4
  nhóm, đều thuộc `TeamColor`, nên màu mặc định là một giá trị `TeamColor`.
- **Bộ biểu tượng**: enum `TeamIcon` trong `packages/shared/enums` gồm 9 giá trị: Trụ, Công, Thủ, Cơ
  động, Trinh sát, Bảo tiêu, Top lane, Mid lane, Bot lane. Sáu biểu tượng đầu dùng đúng artwork Lucide
  của nhóm "Quân hiệu" trên map (castle, swords, shield, footprints, eye, truck). Ba lane dùng mũi tên
  Lucide theo bản đồ MOBA: Top `ArrowUpLeft`, Mid `MoveDiagonal`, Bot `ArrowDownRight`. Không tự vẽ
  SVG. Map `TeamIcon` → component được khai báo đủ `Record`, để thêm giá trị enum mà thiếu icon là lỗi
  compile.
- **Dữ liệu global**: màu và biểu tượng là dữ liệu global theo số đội, như tên đội, không gắn với tuần
  hay trận. Đội không có giá trị thì không có key, cùng luật với tên đội. Tên, màu và biểu tượng dùng
  chung một optimistic lock (version hiện tại của tên đội), nên một lần Save là một version.
- **Hợp đồng API**:
  - `GET` và `PUT /team-builder/team-names` được thay bằng `GET` và `PUT /team-builder/team-settings`:
    ngoài `names` có thêm `colors` (số đội → `TeamColor`) và `icons` (số đội → `TeamIcon`). Ba record
    song song, cùng luật key, cùng version. PUT ghi đè toàn bộ cả ba, version cũ trả 412 như hiện tại.
    Quyền giữ nguyên `TEAM_BUILDER`. Path cũ bị bỏ, không giữ alias (xem bản thiết kế).
  - Một endpoint `GET` mới chỉ trả `colors`, mở cho mọi người đã đăng nhập (`JwtAuthGuard`, không cần
    Capability), cùng mức quyền với `GET /tactics`. Map chiến thuật dùng endpoint này.
  - Mọi shape là schema Zod trong `packages/shared/schemas`, bọc thành DTO phía API. Giá trị lạ bị Zod
    từ chối ở biên.
- **Bảng DB**: cách lưu cụ thể (thêm cột vào `TeamName` hay bảng mới, có đổi tên lock hay không) do
  bước `architect` chốt. Ràng buộc: không mất tên đội đang có, migration không phá huỷ dữ liệu, và
  một đội có màu nhưng không có tên vẫn lưu được.
- **UI header card**: chấm màu thành nút mở popover. Popover có lưới màu ở trên (ô "Mặc định" đầu
  tiên) và lưới biểu tượng ở dưới (ô "Không biểu tượng" đầu tiên). Chọn một ô thì ghi vào draft và
  card đổi ngay. Nút bút chì đổi tên giữ nguyên. Ở `readOnly`, chấm hoặc biểu tượng hiện như ảnh tĩnh,
  không phải nút. Trên điện thoại, nút cao ít nhất 44px như nút tên đội.
- **Ảnh Discord**: ảnh Formation announcement và ảnh Team notice chụp từ lưới `readOnly`, nên nhận màu
  và biểu tượng qua cùng props với card trên màn hình. Không thêm logic riêng cho ảnh.
- **Map chiến thuật**: token đội đọc Team color theo số đội ở thời điểm render. Chiến thuật cũ đổi màu
  theo, đây là chủ ý (Team color là nhận diện đội, không phải nội dung chiến thuật). Tên trên token
  vẫn là "Đội N" và không đổi theo tên đội như trước. Token vẫn hiện số, không hiện Team icon.
- **Làm UI**: ticket UI dùng skill `redesign-skill`, giới hạn trong header card và popover mới. Giữ token
  màu, quy ước trong `.claude/rules/web/` và các component shadcn đang dùng. Không thiết kế lại phần
  khác của màn hình.

## Testing Decisions

- Test chỉ kiểm tra hành vi nhìn thấy từ bên ngoài: payload gửi đi, thứ người dùng thấy trên màn hình,
  màu một token được vẽ. Không viết test mới cho state nội bộ của store hay popover. Test store tên
  đội đã có từ trước được giữ lại và đổi theo store mới, vì nó vẫn phủ luật "không có giá trị thì
  không có key" ở mức rẻ nhất.
- **API, `TeamBuilderService`**: lưu và đọc `colors` và `icons` cùng `names`; đội không có giá trị thì
  không có key; version cũ trả 412 và không ghi gì; đội có màu mà không có tên vẫn lưu được; endpoint
  đọc màu trả đúng `colors`. Prior art: `team-name.service.spec.ts`, `team-builder.controller.spec.ts`.
- **Web, `TeamBuilderScreen`**: mở popover, chọn màu hoặc biểu tượng, card đổi ngay; Save gửi đúng ba
  record; "Mặc định" xoá key màu; "Không biểu tượng" xoá key biểu tượng; ở `readOnly` không có nút mở
  popover; xung đột version hiện dialog như tên đội. Prior art: `team-builder-screen.test.tsx`,
  `team-name-field.test.tsx`, `save-conflict-dialog.test.tsx`.
- **Web, màu token map**: token "Đội N" lấy Team color đã chọn; đội chưa chọn lấy màu nhóm mặc định;
  token không phải đội lấy màu riêng của token như cũ. Prior art: `features/tactics/__tests__/built-in-tokens.test.ts`,
  `palette-drag-preview.test.tsx`.
- Enum: `prisma-enum-sync.spec.ts` phủ `TeamColor` và `TeamIcon`.

## Out of Scope

- Màu tự do (color picker hoặc mã hex nhập tay).
- Màu hoặc biểu tượng theo từng tuần hay từng trận.
- Biểu tượng trên token map, và tên đội trên token map.
- Đổi màu thân card hoặc viền card. Chỉ header và marker mang màu, thân card giữ trung tính như hiện
  tại.
- Team color hoặc Team icon trong phần chữ của tin nhắn Discord (chỉ có trong ảnh).
- Thiết kế lại các phần khác của màn xếp team.

## Further Notes

- Các quyết định được chốt qua phiên `grill-with-docs` ngày 2026-10-31, câu Q1-Q10.
- Map chiến thuật đã tính màu token đội lúc render từ số đội, nên việc chiến thuật cũ đổi màu theo
  không phải hành vi mới. Chỉ nguồn màu thay đổi.
