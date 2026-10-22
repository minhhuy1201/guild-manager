# Team notice kèm ảnh team

Status: approved

Ngày: 2026-10-22 · Base: `73cfcb0` · Lát 2 của [`2026-10-19-team-notice-dm.md`](2026-10-19-team-notice-dm.md)
(lát 1, chỉ text). Spec này thay phần "Nội dung một Team notice" của lát 1; các phần khác của lát 1
(ai nhận, xử lý lỗi Discord, ngân sách thời gian, báo cáo, nhắn lại) giữ nguyên.

Thuật ngữ theo [`GLOSSARY.md`](../../GLOSSARY.md): **Formation announcement** là tin đăng vào channel
bang chiến; **Team notice** là DM gửi một thành viên cho một trận, nói người đó ở team nào.

## Problem Statement

Team notice hiện là một khối text: tiêu đề trận, tên team, giờ online, rồi 6 dòng vị trí kèm note.
Trên điện thoại khối này dài và khô, không giống card team thành viên đã quen trên web và trong ảnh
Formation announcement. Thành viên phải đọc từng dòng mới hình dung được đội mình, trong khi một ảnh
card team cho thấy ngay mọi thứ.

## Solution

Mỗi Team notice gửi kèm **ảnh chụp card team** của người nhận trong trận đó, đúng card đang hiện trên
`/xep-team`. Phần text rút gọn còn tiêu đề trận, tên team và giờ online:

```
**SCRIM 20:30 19/08 - Trận 1/2**
Bạn ở **Rồng Lửa** (team 3). Online trước 19:45.
```

Formation announcement luôn đi trước và là bước bắt buộc. Chụp ảnh team chỉ bắt đầu sau khi
announcement đã đăng thành công. Nếu không chụp được ảnh của một team, thành viên team đó vẫn nhận
Team notice bằng text, thêm một dòng trỏ về channel bang chiến để xem đội hình trong announcement.

## User Stories

1. Là thành viên, tôi muốn Team notice có ảnh card team của mình, để nhìn một lần là biết đội hình.
2. Là thành viên, tôi muốn ảnh trong DM giống hệt card team trên web, để không phải làm quen một kiểu hiển thị mới.
3. Là thành viên, tôi muốn ảnh có tên team, 6 vị trí, note của từng ô và dấu vắng, để có đủ thông tin như card trên web.
4. Là thành viên, tôi muốn text của DM ngắn, chỉ có loại trận, giờ, ngày, trận mấy, tên team và giờ online, để đọc nhanh ở phần xem trước thông báo.
5. Là thành viên, tôi muốn DM vẫn ghi "Trận i/n", để ngày 2 trận không lẫn hai DM với nhau.
6. Là thành viên, tôi muốn DM vẫn ghi giờ phải online, để không vào trễ.
7. Là thành viên, tôi muốn team chưa đặt tên hiện "Team N", để tìm đúng team trong game.
8. Là thành viên ở một team bị lỗi ảnh, tôi muốn vẫn nhận DM có tên team và giờ, kèm link tới channel bang chiến, để vẫn xem được đội hình trong announcement.
9. Là thành viên nhận DM có ảnh, tôi muốn DM không có thêm dòng link channel, để tin nhắn gọn.
10. Là thành viên, tôi muốn DM không thể ping cả server, để tên team admin gõ không thành `@everyone`.
11. Là admin, tôi muốn Formation announcement luôn đăng trước mọi việc liên quan đến Team notice, để cả bang chắc chắn thấy đội hình dù phần DM gặp lỗi.
12. Là admin, tôi muốn lỗi chụp ảnh team không chặn và không làm hỏng Formation announcement, để không phải gửi lại announcement.
13. Là admin, tôi muốn lỗi chụp ảnh team không làm ai bị sót DM, để mọi người được xếp vẫn biết đội và giờ.
14. Là admin, tôi muốn lỗi chụp ảnh trận vẫn dừng toàn bộ như hiện tại, để không đăng announcement thiếu ảnh.
15. Là admin, tôi muốn chỉ team có người nhận DM mới bị chụp, để không tốn thời gian và dung lượng cho team trống.
16. Là admin, tôi muốn nút "Nhắn lại người lỗi" gửi lại kèm ảnh team, để người nhận lại không bị kém hơn người nhận lần đầu.
17. Là admin, tôi muốn báo cáo và các nhóm lỗi giữ nguyên như lát 1, để không phải học lại màn kết quả.
18. Là admin, tôi muốn DM có ảnh bị Discord từ chối thì được tính là "chưa nhắn" như lỗi khác, để nhắn lại bằng nút đã có.
19. Là admin, tôi muốn ảnh team chụp từ đội hình đã lưu, để ảnh trong DM khớp với ảnh trong announcement.

## Implementation Decisions

### Thứ tự và cô lập lỗi

- Hook gửi chạy: chụp ảnh trận → announce → (nếu bật "Nhắn riêng từng người") chụp ảnh team → notify-members.
- Chụp ảnh trận lỗi: dừng, không gửi gì, như hiện tại.
- Chụp ảnh team lỗi (toàn bộ hoặc một team): không phải lỗi của request. Team lỗi không có ảnh trong body, server gửi Team notice bằng text cho thành viên team đó. Không toast lỗi riêng; báo cáo vẫn như lát 1.
- Mọi lỗi từ bước chụp ảnh team trở đi chỉ hiện trong dialog kết quả, cạnh toast thành công của announcement. Đây là quy tắc đã có của lát 1, áp dụng thêm cho bước chụp ảnh team.

### Chụp ảnh team (web)

- Chụp ở browser bằng snapDOM, cùng cách và cùng thông số với ảnh trận (webp, scale cố định, dpr 1, nhúng font). Không render ở server: render ở server cần dependency native trên Vercel, phải nhúng font và vẽ lại card lần thứ hai.
- Node để chụp là card team trong sheet chụp off-screen đã có, đánh dấu bằng một data attribute mang số trận và số team. Không mount thêm sheet mới; card trong sheet đã có chiều rộng cố định nên ảnh giống nhau trên mọi máy.
- Chỉ card, không kèm banner tiêu đề trận: text đã có thông tin trận.
- Mỗi cặp (trận, team) một ảnh, gửi chung cho mọi người nhận trong team đó. Không đánh dấu người nhận trong ảnh: đánh dấu từng người cần tới 120 ảnh, vượt giới hạn body.
- Chỉ chụp các cặp (trận, team) có ít nhất một người được xếp. Khi nhắn lại, chỉ chụp các cặp chứa người trong `notices`.
- Ảnh nào dài hơn giới hạn một ảnh team thì bỏ khỏi body, team đó nhận text. Body hợp lệ không bao giờ bị từ chối vì một ảnh quá cỡ.
- Ảnh trùng một cặp (trận, team) là lỗi lập trình: hàm chụp đếm node như `readCaptureNodes` đang làm với ảnh trận, sai số thì bỏ hết ảnh team và mọi người nhận text.

### Hợp đồng API

- Endpoint giữ nguyên: `POST team-builder/formations/:sessionId/notify-members`, guard giữ nguyên.
- Body thêm trường tuỳ chọn, schema ở `packages/shared`:

  ```ts
  // shape decided during grilling; names may change, fields may not
  type NotifyMembersInput = {
    notices?: { characterId: string; matchIndex: number }[];
    teamImages?: { matchIndex: number; team: number; image: string }[]; // image: data:image/webp;base64,…
  };
  ```

- `image` dùng cùng regex định dạng webp với ảnh announcement, giới hạn độ dài riêng (`TEAM_IMAGE_MAX_CHARS`). `teamImages` tối đa `TEAM_COUNT × 2` phần tử, `team` trong `1..TEAM_COUNT`, `matchIndex` trong `1..2`, không trùng cặp (trận, team).
- Giới hạn ảnh team chọn sao cho `TEAM_IMAGE_MAX_CHARS × TEAM_COUNT × 2` cộng phần `notices` lớn nhất vẫn dưới `JSON_BODY_LIMIT`. Test giới hạn body hiện có được mở rộng để giữ bất đẳng thức này. Con số cụ thể chốt khi đo ảnh thật lúc implement; nếu ảnh thật vượt giới hạn thì giảm quality hoặc scale của ảnh team, không nâng `JSON_BODY_LIMIT`.
- Thiếu `teamImages`, hoặc thiếu ảnh của một cặp: hợp lệ, team đó nhận text. Đây không phải cấu hình sai mà là đường fallback đã thống nhất.
- Báo cáo trả về không đổi.

### Nội dung một Team notice

Hàm dựng thuần giữ vai trò như lát 1, nhận thêm cờ có ảnh hay không và id channel bang chiến.

Có ảnh:

```
**<BANG CHIẾN|SCRIM> HH:mm DD/MM - Trận i/n**
Bạn ở **<tên team>** (team N). Online trước HH:mm.
```

Không có ảnh:

```
**<BANG CHIẾN|SCRIM> HH:mm DD/MM - Trận i/n**
Bạn ở **<tên team>** (team N). Online trước HH:mm.
Xem đội hình trong <#<channel bang chiến>>.
```

- Team chưa đặt tên: `Bạn ở **Team N**.`, như lát 1.
- Bỏ danh sách 6 vị trí và note khỏi text: ảnh đã có. Danh sách vị trí cũng không quay lại trong bản không có ảnh, vì link channel đã đủ để xem.
- Tiêu đề, "Trận i/n" và giờ online dùng lại hàm đã có (`battleHeading`, `timesOf`).
- `allowed_mentions` vẫn đóng hết. Link channel `<#id>` không phải mention gây ping nên không cần mở.
- Id channel lấy từ `DISCORD_BANG_CHIEN_CHANNEL_ID` đã có, không thêm biến env.

### Gửi qua Discord

- Team notice có ảnh gửi bằng `postMessageWithFiles` vào DM channel; không có ảnh thì `postMessage` như cũ.
- Một tên file cố định cho mỗi ảnh, ví dụ `team-<N>-tran-<i>.webp`.
- `postMessageWithFiles` thêm cùng timeout 15 giây như các lệnh gọi JSON. Thiếu timeout, một upload treo giữ cả function tới khi bị tắt và mất báo cáo, đúng lý do timeout đã có ở lát 1.
- Mọi xử lý lỗi (`50007`, `429` thử lại một lần, `40003` dừng, lỗi khác vào `unsent`) và ngân sách 220 giây giữ nguyên. DM có ảnh bị từ chối vào `unsent`, không tự gửi lại bằng text.
- Server kiểm tra ảnh thuộc đúng đội hình đã lưu theo cặp (trận, team), không tin số người trong ảnh. Ảnh của cặp không có người nhận bị bỏ qua.

### Nhắn lại

- "Nhắn lại người lỗi" chụp lại ảnh team từ sheet đang mount (dialog còn mở thì sheet còn mount), chỉ cho các cặp chứa người trong `notices`, rồi gửi `notices` + `teamImages`.
- "Thử lại" sau khi request lỗi toàn bộ: chụp lại mọi cặp có người, như lần đầu.
- Chụp lại lỗi: gửi không ảnh, người nhận lại nhận text.

## Testing Decisions

- Test hành vi nhìn từ ngoài: đầu vào là đội hình đã lưu, ảnh trong body và phản hồi của Discord; đầu ra là tin đã gửi (có file hay không, text gì) và báo cáo.
- **Seam chính, API: `TeamNoticeService.notifyMembers`** với `DiscordRestClient` giả, như `team-notice.service.spec.ts` hiện có. Khẳng định: người nhận ở team có ảnh được gửi qua upload kèm đúng ảnh của cặp (trận, team) của họ; team thiếu ảnh nhận text có link channel; ảnh của team không người nhận bị bỏ qua; lỗi upload vào `unsent`; nhắn lại với `notices` + `teamImages` gửi đúng ảnh.
- **Hàm dựng nội dung:** test thuần như `team-notice.spec.ts`: hai biến thể có ảnh / không ảnh, "Team N", không còn danh sách vị trí, `allowed_mentions`.
- **Schema ở shared:** ảnh sai định dạng, quá dài, trùng cặp, `team` ngoài khoảng đều bị từ chối; thiếu `teamImages` hợp lệ.
- **Giới hạn body:** mở rộng `body-limit.spec.ts` với bất đẳng thức của ảnh team.
- **`DiscordRestClient.postMessageWithFiles`:** mở rộng `discord-rest.spec.ts` để khẳng định có timeout.
- **Web, seam `useFormationAnnounce`** (`use-formation-announce.test.ts`): announce luôn chạy trước chụp ảnh team; chụp ảnh team lỗi vẫn gọi notify-members không ảnh; chỉ chụp cặp có người; ảnh quá cỡ bị bỏ; nhắn lại chụp đúng các cặp cần.
- **Web, hàm chụp** (`announce-capture.test.ts`): đọc node card theo data attribute, đếm sai số thì báo lỗi.
- Không có test end-to-end. Kiểm tra thật: gửi vào server thử với 2-3 tài khoản ở hai team khác nhau, xem ảnh trên Discord desktop và điện thoại, đo dung lượng ảnh thật để chốt `TEAM_IMAGE_MAX_CHARS`.

## Out of Scope

- Đánh dấu người nhận ngay trong ảnh (cần một ảnh cho mỗi người).
- Render ảnh ở server.
- Gửi lại bằng text khi Discord từ chối DM có ảnh.
- Kèm banner tiêu đề trận trong ảnh team.
- Mọi phần ngoài phạm vi của lát 1 (lưu lịch sử gửi, gửi nền, thành viên tự tắt nhận...).

## Further Notes

- Ảnh team đi trong request notify-members, tách khỏi request announce, đúng như lát 1 đã dự tính ("lát ảnh team sau gắn vào endpoint mới mà không cộng dồn kích thước").
- Tối đa 20 ảnh (10 team × 2 trận) trong một body. Nếu đo thật cho thấy không vừa giới hạn body ở chất lượng đọc được, phương án dự phòng là tách notify-members thành một request cho mỗi trận. Phương án này đổi luồng web, nên phải cập nhật spec trước khi làm.

## Sources

- Lát 1: [`2026-10-19-team-notice-dm.md`](2026-10-19-team-notice-dm.md).
- Code tại `73cfcb0`: `apps/web/features/team-builder/lib/announce-capture.ts` (snapDOM, webp, dpr 1), `apps/api/src/modules/discord-bot/team-notice.service.ts` (luồng gửi), `apps/api/src/modules/discord-bot/discord-rest.ts` (`postMessageWithFiles` chưa có timeout), `apps/api/src/config/__tests__/body-limit.spec.ts` (giới hạn 4.5MB của Vercel), `packages/shared/lib/slot-id.ts` (`TEAM_COUNT = 10`).
