# Lưu ý thêm cho thông báo đội hình

Status: approved

Ngày: 2026-10-24 · Base: `7eba593`

Thuật ngữ theo [`GLOSSARY.md`](../../GLOSSARY.md): **Formation announcement** là tin đăng vào channel
bang chiến; **Team notice** là DM gửi một thành viên cho một trận; **Announcement note** (UI: "Lưu ý
thêm") là đoạn chữ admin viết cho một lần gửi, hiện đầu tiên trong Formation announcement và trong
mọi Team notice của lần gửi đó.

## Problem Statement

Khi bấm "Gửi Discord" ở màn xếp team, admin chỉ gửi được nội dung cố định: tiêu đề trận, bốn dòng
luật tập hợp, ảnh đội hình, và (nếu bật) một DM cho từng người. Điều riêng của ngày hôm đó (đổi map,
đổi giờ tập trung, một người đổi vai) phải nhắn tay sau, trong tin khác, và hay bị trôi dưới tin đội
hình. DM riêng từng người không có chỗ nào để nói thêm. Admin cũng không thấy trước tin trên Discord
trông thế nào trước khi bấm gửi, trong khi gửi xong là khoá điểm danh.

## Solution

Dialog xác nhận gửi có thêm ô "Lưu ý thêm" và khung xem trước giống Discord. Admin gõ lưu ý, xem ngay
tin trong kênh và một DM mẫu, rồi gửi. Lưu ý là phần ưu tiên: trong tin kênh nó nằm ngay dưới tiêu
đề, trên các dòng luật; trong mỗi DM nó nằm ngay dưới tiêu đề. Để trống thì tin y như hiện tại.

## User Stories

1. Là admin, tôi muốn có ô "Lưu ý thêm" trong dialog gửi, để nói điều riêng của ngày đánh ngay trong tin đội hình.
2. Là admin, tôi muốn lưu ý nằm ngay dưới tiêu đề tin kênh, để thành viên đọc nó trước các dòng luật.
3. Là admin, tôi muốn lưu ý có trong mọi Team notice, để người chỉ đọc DM vẫn nhận được.
4. Là admin, tôi muốn lưu ý nằm ngay dưới tiêu đề DM, trên dòng "Bạn ở Team X", để đó là thứ đầu tiên thành viên đọc.
5. Là admin, tôi muốn cùng một lưu ý cho DM của cả hai trận, để chỉ viết một lần.
6. Là admin, tôi muốn lưu ý hiện thành khung quote của Discord, để tách khỏi phần chữ cố định.
7. Là admin, tôi muốn viết nhiều dòng, để liệt kê nhiều ý.
8. Là admin, tôi muốn dùng markdown Discord (đậm, nghiêng) trong lưu ý, để nhấn một chữ.
9. Là admin, tôi muốn lưu ý trống thì tin giữ nguyên như hiện tại, để tính năng không đổi gì khi không cần.
10. Là admin, tôi muốn lưu ý chỉ có dấu cách hay xuống dòng được tính là trống, để một phím lỡ tay không thêm khung quote rỗng.
11. Là admin, tôi muốn có bộ đếm ký tự với giới hạn 500, để biết còn bao nhiêu chỗ và tin không vượt giới hạn của Discord.
12. Là admin, tôi muốn ô nhập dừng nhận chữ ở 500 ký tự, để không gửi thứ server sẽ từ chối.
13. Là admin, tôi muốn xem trước live tin kênh, để thấy đúng thứ cả bang sẽ thấy trước khi khoá điểm danh.
14. Là admin, tôi muốn xem trước một DM mẫu, để biết mỗi người sẽ nhận gì.
15. Là admin, tôi muốn preview DM chỉ hiện khi bật "Nhắn riêng từng người", để preview khớp với thứ thật sự được gửi.
16. Là admin, tôi muốn preview đổi theo từng phím gõ, để không phải bấm gì mới thấy kết quả.
17. Là admin, tôi muốn preview render tiêu đề, đậm, nghiêng, quote như Discord, để đánh giá bố cục thật chứ không phải markdown thô.
18. Là admin, tôi muốn mention kênh và role hiện thành pill trong preview, để nhận ra đó là link và ping.
19. Là admin, tôi muốn ô giữ chỗ ở vị trí ảnh đội hình và card team, để biết bao nhiêu ảnh đi kèm mà không phải chờ chụp.
20. Là admin, tôi muốn chữ trong preview đến từ cùng code dựng tin thật, để preview và tin không bao giờ lệch nhau.
21. Là admin, tôi muốn mọi `@everyone`, mention role hay người gõ trong lưu ý không ping ai, để lưu ý không lỡ báo cả server.
22. Là admin, tôi muốn "Nhắn lại người lỗi" gửi cùng lưu ý, để người được nhắn lại nhận DM giống mọi người.
23. Là admin, tôi muốn lưu ý bị xoá khi đóng dialog, để ngày đánh sau không thừa hưởng lưu ý hôm trước.
24. Là admin, tôi muốn ô nhập bị khoá khi đang gửi, để thứ được gửi đúng là thứ tôi đã thấy.
25. Là admin trên điện thoại, tôi muốn dialog một cột, preview dưới ô lưu ý và tự cuộn bên trong, để không gì tràn ở 360px.
26. Là admin trên màn rộng, tôi muốn form bên trái, preview bên phải, để thấy cả hai khi gõ.
27. Là thành viên, tôi muốn lưu ý ở đầu DM, để thấy thay đổi tối nay mà không cần mở kênh.
28. Là thành viên, tôi muốn DM không có lưu ý trông y như trước, để không có gì mới khi không có gì để nói.

## Implementation Decisions

### Hình dạng của lưu ý

- Một chuỗi `note` không bắt buộc cho mỗi lần gửi. Trim hai đầu; rỗng sau khi trim nghĩa là "không
  có lưu ý". Tối đa 500 ký tự sau khi trim (`ANNOUNCEMENT_NOTE_MAX_CHARS`, đặt tên trong shared).
  Giữ xuống dòng.
- Lưu ý không lưu vào database. Nó chỉ sống trong state của dialog cho một lần mở.

### Phần chữ nằm ở `packages/shared`

- Các hàm thuần dựng chữ chuyển từ module `discord-bot` của API sang `packages/shared/lib`: nội dung
  Formation announcement, nội dung Team notice, ba mốc giờ tập hợp, tiêu đề trận, và các hàm format
  giờ Việt Nam chúng dùng. Nơi khác ở API đang dùng hàm format giờ (attendance announcement) cũng
  import từ shared.
- Hàm shared chỉ trả **chuỗi content**. API bọc chuỗi đó vào `MessagePayload` của mình và giữ
  `allowed_mentions` ở đó: thứ gì được ping vẫn là quyết định của server, và kiểu payload Discord
  không lọt vào shared.
- Các link nội dung cần (id role guild, id channel `#báo-bận`, id channel `#bang-chiến`) là tham số,
  như hiện nay. API truyền id thật; web truyền id giữ chỗ cố định mà preview nhận ra và vẽ thành pill.
- Cả hai input nội dung thêm `note: string | null`. Có lưu ý thì mỗi dòng thêm tiền tố `> ` (dòng
  trống trong lưu ý thành `>` để quote vẫn là một khối) và khối đó chèn ngay sau dòng tiêu đề. Không
  có lưu ý thì content giống hệt từng byte như hiện tại.

### Mention

- `allowed_mentions` không đổi: tin kênh vẫn chỉ mở role guild, Team notice vẫn không mở gì. Mention
  gõ trong lưu ý được Discord hiển thị nhưng không ping ai.

### Hợp đồng API

- Body `POST /team-builder/formations/:sessionId/announce` thêm `note` (không bắt buộc).
- Body `POST /team-builder/formations/:sessionId/notify-members` thêm `note` (không bắt buộc).
- Một Zod schema cho lưu ý trong `packages/shared`, dùng lại cho cả hai body, để trim và giới hạn 500
  là một luật. Server chỉ dựng tin từ giá trị đã validate.
- Response không đổi.

### Web

- Hook gửi thông báo giữ lưu ý, gửi nó trong request announce và mọi request notify-members (lần đầu
  và lần nhắn lại), và reset khi dialog đóng.
- Bố cục dialog:
  - Từ `lg`: `lg:max-w-4xl`, hai cột. Trái (2/5): số slot từng trận (`tabular-nums`), ô "Lưu ý
    thêm", checkbox "Nhắn riêng từng người", dòng ngắn về khoá điểm danh, cảnh báo thay đổi chưa lưu.
    Phải (3/5): preview.
  - Dưới `lg`: một cột, preview dưới ô lưu ý, giới hạn `max-h-80` và tự cuộn bên trong. Dialog tự
    cuộn bên trong (`max-h-[calc(100dvh-2rem)]`).
  - Footer trải hết hai cột.
- Ô "Lưu ý thêm": `FieldLabel` với icon `Pin`, `Textarea` của `components/ui`, placeholder là một câu
  ví dụ thật, `maxLength` 500, bộ đếm `n/500` bên phải dưới ô (`tabular-nums`, muted), và một dòng phụ
  nói lưu ý mở đầu tin kênh và mọi DM. Khoá khi đang gửi.
- Preview:
  - `Tabs` (variant default): "Kênh bang chiến" và "Nhắn riêng (mẫu)"; tab thứ hai chỉ có khi
    checkbox bật. Đổi tab fade opacity với `--duration-base`.
  - Khung tin bọc `className="dark"` để trông như client tối của Discord mà vẫn dùng token của app:
    avatar bot (`GuildSeal`), tên bot, giờ, rồi nội dung.
  - Một renderer nhỏ cho tập markdown Discord mà các tin dùng: tiêu đề `#` và `##`, `**` đậm, `*`
    nghiêng, `>` quote (vạch trái 4px), mention kênh và role thành pill (`bg-primary/15
    text-primary`) với nhãn `#🤒│báo-bận`, `#bang-chiến`, `@Bang`.
  - Ảnh là ô giữ chỗ, không chụp thật: một ô mỗi trận (`doi-hinh-N.webp`) dưới tin kênh, một ô
    (`team-1-tran-1.webp`) dưới DM mẫu, trên nền inset với icon `Image`.
  - DM mẫu là Team notice của team 1, trận 1, như thể team đó có card. Nội dung đến từ cùng hàm shared
    mà API dùng.
  - Preview render lại mỗi phím gõ; hàm chữ là hàm thuần nên không cần debounce.
- Màn kết quả (sau khi gửi) không đổi.

## Testing Decisions

- Test kiểm thứ caller nhìn thấy: chuỗi content của tin, body server gửi cho Discord, request web gửi
  đi, thứ dialog hiển thị. Không test helper nội bộ.
- **Chữ (qua API).** `packages/shared` chưa có test runner, nên spec chữ hiện có của Formation
  announcement và Team notice ở API ở nguyên chỗ, tiếp tục gọi hàm bọc của API (hàm này gọi hàm
  content ở shared) và giữ nguyên mọi case hiện tại; chúng phủ cả code đã chuyển sang shared. Thêm:
  lưu ý nằm ngay sau tiêu đề dạng quote; lưu ý nhiều dòng vẫn là một khối quote, kể cả dòng trống;
  không có lưu ý thì giống hệt hiện tại. Prior art: spec chữ `formation-announcement` và
  `team-notice` hiện có.
- **Schema (shared).** Trim, rỗng sau trim là không có lưu ý, 501 ký tự bị từ chối, giữ xuống dòng.
  Prior art: spec schema announce-formation hiện có.
- **Service API.** Announcer đăng content có lưu ý và giữ `allowed_mentions` chỉ mở role guild;
  notice service gửi lưu ý trong mọi DM, kể cả lần nhắn lại thu hẹp bằng `notices`. Prior art: spec
  service formation-announcer và team-notice hiện có.
- **Hook web.** Lưu ý đi trong request announce và mọi request notify-members; nhắn lại dùng lại nó;
  đóng dialog thì xoá. Prior art: test `use-formation-announce` hiện có.
- **Dialog web.** Gõ thì bộ đếm và preview kênh đổi theo; tab DM chỉ hiện khi bật checkbox; lưu ý
  render thành quote dưới tiêu đề; ô nhập khoá khi đang gửi. Prior art: test dialog announce-formation
  hiện có.

## Out of Scope

- Lưu lưu ý, mẫu lưu ý, lịch sử lưu ý.
- Lưu ý khác nhau theo trận, theo team hay theo người.
- Sửa hay xoá tin đã đăng lên Discord.
- Lưu ý cho thông báo đua mèo hay thông báo điểm danh.
- Chụp ảnh đội hình thật cho preview.
- Màu Discord chính xác từng pixel; preview dùng token tối của app.
- Mở mention từ lưu ý.
- Preview của markdown gõ trong lưu ý ngoài đậm, nghiêng và quote (tiêu đề, danh sách, mention thật):
  Discord vẽ chúng, preview hiện chữ thô.

## Further Notes

- Kích thước: content tin kênh hiện khoảng 500 ký tự; thêm lưu ý 500 ký tự và tiền tố quote vẫn xa
  dưới giới hạn 2000 ký tự content của Discord. Team notice còn ngắn hơn.
- Nhãn pill `#bang-chiến` là giữ chỗ; nếu tên kênh thật khác thì chỉ đổi nhãn trong preview.
- Đầu vào thiết kế đến từ audit `redesign-skill`, trong khuôn `docs/design-direction.md` và
  `.claude/rules/web/`: không đổi font, bộ icon hay bảng màu.
