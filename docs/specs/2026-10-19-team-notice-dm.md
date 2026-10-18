# Nhắn riêng đội hình (Team notice) qua Discord DM

Ngày: 2026-10-19 · Trạng thái: **approved** · Lát 1 (chỉ text). Lát ảnh từng team làm sau, spec riêng.

Thuật ngữ theo [`GLOSSARY.md`](../../GLOSSARY.md): **Formation announcement** là tin đăng vào channel
bang chiến; **Team notice** là DM gửi một thành viên cho một trận, nói người đó ở team nào.

## Problem Statement

Admin bấm "Gửi Discord" ở `/xep-team` thì cả bang thấy một Formation announcement kèm ảnh 10 team.
Mỗi thành viên phải tự dò trong ảnh xem mình ở team nào, đứng cạnh ai, ô mình có note gì. Ảnh lớn,
tên bị cắt, đọc trên điện thoại khó; người lướt channel dễ bỏ sót. Kết quả: hỏi lại trong chat,
vào trận nhầm team.

## Solution

Ngay sau khi Formation announcement đăng thành công, bot gửi cho từng thành viên được xếp một
Team notice cho **mỗi trận** họ có tên: tiêu đề trận, tên team, giờ cần online, và 6 vị trí của team
đó kèm note. Admin chọn có gửi hay không bằng một checkbox trong dialog gửi (mặc định bật). Gửi xong,
dialog hiện báo cáo: bao nhiêu người đã nhận, ai không nhận được và vì sao, kèm nút nhắn lại cho
những người lỗi tạm thời. Lỗi DM không bao giờ làm hỏng Formation announcement đã đăng.

## User Stories

1. Là admin, tôi muốn sau khi bấm "Gửi Discord" mỗi thành viên được xếp tự nhận DM nói họ ở team nào, để không phải trả lời từng người hỏi lại.
2. Là admin, tôi muốn một checkbox "Nhắn riêng từng người" trong dialog gửi, mặc định bật, để lần gửi đầu chỉ cần một cú bấm.
3. Là admin, tôi muốn tắt checkbox đó khi gửi lại Formation announcement chỉ vì sửa chữ, để không làm phiền cả bang lần nữa.
4. Là admin, tôi muốn Team notice chỉ bắt đầu sau khi Formation announcement đã đăng thành công, để không ai nhận DM về một đội hình bang chưa thấy.
5. Là admin, tôi muốn Formation announcement đã đăng vẫn giữ nguyên dù Team notice lỗi, để một người chặn DM không làm hỏng thông báo cho cả bang.
6. Là admin, tôi muốn dialog hiện báo cáo ngay sau khi gửi, để đọc kịp tên những người không nhận được.
7. Là admin, tôi muốn báo cáo cho biết số Team notice đã gửi trên tổng số, để biết nhanh mọi thứ có ổn không.
8. Là admin, tôi muốn thấy danh sách người chặn DM từ bot, để nhắn họ bằng cách khác.
9. Là admin, tôi muốn thấy danh sách người chưa có Discord ID, để vào màn thành viên gán ID cho họ.
10. Là admin, tôi muốn thấy danh sách người được xếp nhưng chưa điểm danh "Có", để biết họ không nhận Team notice và cân nhắc gỡ họ ra.
11. Là admin, tôi muốn thấy danh sách người chưa nhắn được vì lỗi tạm thời (Discord giới hạn tốc độ, lỗi mạng), để biết cần nhắn lại.
12. Là admin, tôi muốn nút "Nhắn lại người lỗi" chỉ gửi cho người lỗi tạm thời, để không ai nhận trùng tin.
13. Là admin, tôi muốn mỗi nhóm trong báo cáo ghi tên nhân vật và trận, để biết người đó thiếu tin của trận nào.
14. Là admin, tôi muốn không gửi được Team notice cho một ngày chưa đóng điểm danh, để không ai lỡ gửi DM trước khi đội hình được công bố.
15. Là admin, tôi muốn Team notice đọc từ đội hình đã lưu, để DM khớp đúng ảnh đã đăng channel.
16. Là admin, tôi muốn nút gửi vẫn quay trong lúc đang nhắn, để biết việc chưa xong và không bấm hai lần.
17. Là thành viên, tôi muốn nhận một DM cho mỗi trận mình có tên, để ngày 2 trận ở 2 team khác nhau không bị lẫn.
18. Là thành viên, tôi muốn DM ghi tiêu đề trận giống tin channel (loại trận, giờ, ngày, trận mấy), để biết DM nói về trận nào.
19. Là thành viên, tôi muốn DM ghi tên team, hoặc "Team N" khi team chưa đặt tên, để tìm đúng team trong game.
20. Là thành viên, tôi muốn DM nhắc giờ phải online, để không vào trễ.
21. Là thành viên, tôi muốn thấy đủ 6 vị trí của team theo thứ tự, để biết mình đứng cạnh ai.
22. Là thành viên, tôi muốn tên của mình được in đậm và đánh dấu, để nhìn ra ngay vị trí của mình.
23. Là thành viên, tôi muốn thấy note của từng ô, để biết nhiệm vụ của mình và đồng đội.
24. Là thành viên, tôi muốn ô trống hiện "(trống)" kèm note nếu có, để biết vị trí đó đang giữ chỗ cho ai.
25. Là thành viên đã điểm danh "Không" hoặc chưa điểm danh "Có", tôi muốn không nhận DM xếp team, để không hiểu nhầm là mình phải vào trận.
26. Là thành viên, tôi muốn DM không thể ping cả server, để nội dung admin gõ vào note không thành `@everyone`.

## Implementation Decisions

### Luồng hai request

- Web giữ nguyên request Formation announcement hiện tại (`POST team-builder/formations/:sessionId/announce`). Request đó thành công và checkbox đang bật thì web gọi tiếp endpoint mới `POST team-builder/formations/:sessionId/notify-members`.
- Lý do tách: endpoint announce đang chạy ổn không bị đụng; lỗi Team notice cô lập khỏi Formation announcement; body announce đã sát giới hạn 4MB (ảnh), lát ảnh team sau gắn vào endpoint mới mà không cộng dồn kích thước.
- Endpoint mới có guard giống announce: `JwtAuthGuard` + `AdminGuard`.
- Body: `{ notices?: { characterId, matchIndex }[] }`. Thiếu `notices` nghĩa là gửi cho mọi người đủ điều kiện. Có `notices` thì chỉ gửi đúng những Team notice đó (dùng cho "Nhắn lại người lỗi"), vẫn lọc qua cùng điều kiện.
- Từ chối khi ngày đó chưa đóng điểm danh (`isAttendanceClosed` của ngày), bằng câu tiếng Việt. Formation announcement tự đóng điểm danh, nên đây là dấu hiệu "đã thông báo" mà không cần thêm cột. Hai trường hợp lọt: admin tự đóng tay, và hạn điểm danh đã qua mà chưa ai đăng thông báo (cờ đóng cũng bật khi quá hạn). Cả hai chấp nhận vì endpoint chỉ admin gọi, có chủ đích, và DM vẫn đúng với đội hình đã lưu.
- Không gửi khi ngày không tồn tại (404 như announce).

### Ai nhận

- Mỗi cặp (thành viên, trận) mà thành viên có tên trong một ô của trận đó là một Team notice.
- Bỏ qua và đưa vào báo cáo:
  - **Chưa điểm danh "Có"**: không có bản ghi điểm danh `isPresent` cho ngày đó. Cùng quy tắc với viền đỏ trên màn `/xep-team`.
  - **Chưa có Discord ID**: `Character.discordId` là null.
- Ô chỉ có note, không có người: không sinh Team notice, chỉ hiện trong danh sách 6 vị trí của tin.

### Nội dung một Team notice

Hàm thuần, cùng kiểu với hàm dựng Formation announcement, nhận dữ liệu đã đọc sẵn và trả về `MessagePayload`:

```
**<BANG CHIẾN|SCRIM> HH:mm DD/MM - Trận i/n**
Bạn ở **<tên team>** (team N)
Online trước HH:mm.

1. <tên>[ - <note>]
2. **<tên người nhận>** ← bạn[ - <note>]
3. (trống)[ - <note>]
...
6. ...
```

- "Trận i/n" dùng số trận theo lịch của ngày. Một đội hình dùng chung cho cả ngày 2 trận vẫn ghi theo quy tắc đã có của tiêu đề banner.
- Tên team rỗng thì ghi "Team N".
- Giờ online lấy từ cùng quy tắc giờ tập trung của Formation announcement (Guild War cố định, scrim lùi 45 phút); quy tắc đó được dùng chung, không viết lại.
- `allowed_mentions` đóng hết (`parse: []`), vì note và tên team do admin gõ.
- Nội dung luôn dưới 2000 ký tự: 6 dòng, tên và note đều đã có giới hạn độ dài. Test khẳng định điều này với tên và note dài nhất.

### Đọc đội hình và định dạng slot id

- Server phải biết ô nào thuộc team nào. Hiện backend coi `slotId` ("team-N-pos-M") là chuỗi mờ, bố cục lưới chỉ web biết (`docs/architecture.md` §5).
- Quyết định: chuyển định dạng slot id (tạo, đọc, số team, số ô mỗi team) vào `packages/shared`, web và API cùng dùng. `docs/architecture.md` §5 và comment của `FormationSlot.slotId` / `TeamName.team` được sửa theo. Không đổi dữ liệu, không migration.
- `TeamBuilderService` thêm một hàm đọc đội hình đã lưu của một ngày: mỗi trận gồm các ô (slot id, người, note) và tên team.
- Module `discord-bot` import thêm `TeamBuilderModule`. Không tạo vòng: `team-builder` chỉ import `battle-sessions` và `characters`. Test đồ thị module được cập nhật.
- Điểm danh đọc qua service public của `attendance`, module này `discord-bot` đã import sẵn.

### Gửi qua Discord

- `DiscordRestClient` thêm `openDm(userId)`: `POST /users/@me/channels` với `recipient_id`, trả về id DM channel. Không lưu DM channel id vào DB; Discord trả lại channel cũ nếu đã có.
- Gửi tin bằng `postMessage` đã có, vào DM channel vừa mở.
- Gửi tuần tự từng Team notice, không song song.
- Xử lý lỗi theo từng Team notice:
  - `50007` "Cannot send messages to this user": nhóm **chặn DM**, gửi tiếp người sau.
  - `429`: chờ đúng `retry_after` Discord trả về rồi thử lại Team notice đó một lần; vẫn lỗi thì nhóm **chưa nhắn**.
  - `40003` "You are opening direct messages too fast": dừng hẳn; Team notice này và mọi Team notice còn lại vào nhóm **chưa nhắn**.
  - Lỗi khác (5xx, mạng): nhóm **chưa nhắn**, gửi tiếp người sau, ghi log kèm thân lỗi của Discord.
- `DiscordApiError` cần mang được mã lỗi JSON của Discord (`code`) và `retry_after` để phân biệt các trường hợp trên.
- Thời gian: một ngày có tối đa 10 team × 6 ô × 2 trận = 120 Team notice, tức 240 lệnh gọi tuần tự (mỗi thành viên nhận một tin cho mỗi trận). Giới hạn mặc định của Vercel Function là 300 giây, nên service có ngân sách 240 giây: quá mức đó thì thôi bắt đầu tin mới và đưa phần còn lại vào `unsent` để nhắn lại, thay vì để function bị tắt giữa chừng (mất báo cáo, "Thử lại" sẽ gửi trùng). Mỗi lệnh gọi JSON tới Discord có timeout 15 giây. Không đổi `maxDuration`.

### Báo cáo trả về

Schema ở `packages/shared`:

```ts
// shape decided during grilling; names may change, groups may not
type TeamNoticeTarget = { characterId: string; name: string; matchIndex: number };
type TeamNoticeReport = {
  sentCount: number;
  totalCount: number;           // sent + every group below
  blocked: TeamNoticeTarget[];  // 50007
  missingDiscordId: TeamNoticeTarget[];
  notPresent: TeamNoticeTarget[];
  unsent: TeamNoticeTarget[];   // 429 after retry, 40003, 5xx, network
};
```

### Web

- Dialog "Gửi Discord" thêm checkbox "Nhắn riêng từng người", mặc định bật mỗi lần mở dialog.
- Hook gửi chạy: chụp ảnh → announce → (nếu bật) notify-members. Toast thành công của announce giữ nguyên.
- Khi có báo cáo, dialog không tự đóng mà chuyển sang màn kết quả: dòng "Đã nhắn X/Y", rồi các nhóm không rỗng, mỗi người một dòng "tên - trận i". Nhóm "chưa nhắn" có nút "Nhắn lại người lỗi", gửi lại đúng các cặp đó và gộp kết quả vào báo cáo đang hiện: số đã nhắn cộng dồn, các nhóm khác giữ nguyên, nhóm "chưa nhắn" chỉ còn người vẫn lỗi. Thay hẳn báo cáo sẽ làm mất những người đã nhận được ở lần đầu.
- Request notify-members lỗi toàn bộ (mạng, 5xx, 400 vì chưa đóng điểm danh): dialog hiện câu lỗi, Formation announcement được coi là đã gửi (toast thành công vẫn hiện), có nút thử lại gọi lại notify-members cho tất cả.
- Theo quy ước `MutationForm` / `recoverSession` của web cho lỗi phiên.

## Testing Decisions

- Test hành vi nhìn từ ngoài, không test chi tiết bên trong: đầu vào là đội hình đã lưu và phản hồi của Discord, đầu ra là các tin đã gửi và báo cáo.
- **Seam chính, API:** service gửi Team notice, với `DiscordRestClient` giả và dữ liệu đội hình / điểm danh giả. Khẳng định: ai nhận, mỗi người bao nhiêu tin, nội dung tin, từng nhóm báo cáo, dừng khi `40003`, thử lại một lần khi `429`, từ chối ngày chưa đóng điểm danh, lọc theo `notices`. Tiền lệ: `formation-announcer.service.spec.ts`, `reminder.service.spec.ts`.
- **Hàm dựng nội dung:** test thuần như `formation-announcement.spec.ts`: tiêu đề, "Team N", in đậm người nhận, ô trống, note, `allowed_mentions`, dưới 2000 ký tự.
- **`DiscordRestClient.openDm` và việc đọc `code` / `retry_after`:** mở rộng `discord-rest.spec.ts` với `fetch` giả.
- **Định dạng slot id ở shared:** test tạo/đọc hai chiều và từ chối chuỗi sai.
- **Web:** mở rộng `announce-formation-dialog.test.tsx`: checkbox mặc định bật, tắt thì không gọi notify-members, màn báo cáo hiện đúng nhóm, nút nhắn lại gửi đúng các cặp.
- Không có test end-to-end (repo đã bỏ). Kiểm tra thật: gửi vào server thử với 2-3 tài khoản, một tài khoản tắt DM từ thành viên server để thấy `50007`.

## Out of Scope

- Ảnh cắt từng team trong DM (lát 2, spec riêng).
- Chỉ nhắn người có thay đổi so với lần gửi trước (cần lưu lịch sử gửi).
- Lưu DM channel id hoặc lịch sử Team notice vào DB.
- Gửi nền sau khi request trả lời (`waitUntil`, queue).
- Cho thành viên tự chọn tắt nhận Team notice.
- Nhắn cho người dự bị không có tên trong đội hình.

## Further Notes

- Discord khuyến cáo không dùng DM để nhắn cả server và nói bot mở DM quá nhanh có thể bị giới hạn hoặc chặn mở DM mới. Team notice do admin bấm, mỗi tin có nội dung riêng cho người nhận, gửi tuần tự và dừng ngay ở `40003`. Nguồn: [User - Create DM](https://docs.discord.com/developers/resources/user).
- "Chưa điểm danh Có" rộng hơn "đã báo nghỉ": gồm cả người chưa trả lời. Đây là đúng quy tắc viền đỏ trên `/xep-team`, nên admin thấy cùng một danh sách ở hai chỗ.

## Sources

- Discord, Create DM: https://docs.discord.com/developers/resources/user - "You should not use this endpoint to DM everyone in a server about something."
- Discord, JSON error codes: https://docs.discord.com/developers/topics/opcodes-and-status-codes - "50007 Cannot send messages to this user", "40003 You are opening direct messages too fast".
- Discord, rate limits: https://docs.discord.com/developers/topics/rate-limits - "All bots can make up to 50 requests per second to our API."
- Vercel, function duration: https://vercel.com/docs/functions/configuring-functions/duration - Hobby default and maximum 300s.
