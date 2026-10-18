# Kế hoạch: Nhắn riêng đội hình (Team notice) - lát 1, chỉ text

Spec: [`docs/specs/2026-10-19-team-notice-dm.md`](../specs/2026-10-19-team-notice-dm.md)

Năm ticket, làm theo thứ tự cạnh chặn. 01 và 02 là prefactor, không đổi hành vi, có thể làm song
song. 03 là tracer bullet chạy được từ nút bấm tới DM. 04 và 05 hoàn thiện xử lý lỗi và nhắn lại.

---

## 01: Định dạng slot id dùng chung

**What to build:** web và API cùng một cách tạo và đọc slot id ("team-N-pos-M"), cùng hằng số số
team và số ô mỗi team, đặt ở `packages/shared`. API từ nay đọc được số team và vị trí từ slot id.
Không đổi hành vi, không đổi dữ liệu.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Shared có hàm tạo slot id từ (team, vị trí) và hàm đọc ngược lại; đọc chuỗi sai định dạng thì trả về null, không ném.
- [x] Số team và số ô mỗi team là hằng số ở shared; web bỏ bản khai báo riêng của mình.
- [x] Test tạo/đọc hai chiều cho mọi ô của lưới, và test chuỗi sai.
- [x] `docs/architecture.md` §5 và comment của `FormationSlot.slotId` / `TeamName.team` nói backend đọc slot id qua shared.
- [x] Toàn bộ test, typecheck, lint của shared, api, web xanh.

---

## 02: Client Discord mở DM và đọc lỗi chi tiết

**What to build:** client REST của bot mở được DM channel với một người theo Discord ID, và lỗi
Discord trả về mang theo mã lỗi JSON và thời gian chờ khi bị giới hạn tốc độ, để tầng trên phân
biệt chặn DM, gửi quá nhanh và lỗi khác.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `openDm(userId)` gọi `POST /users/@me/channels` với `recipient_id` và trả về id channel.
- [x] `DiscordApiError` có `code` (mã JSON của Discord, null khi thân lỗi không phải JSON) và `retryAfter` (giây, null khi không có).
- [x] `isDiscordForbidden` và mọi nơi đang dùng nó chạy như cũ.
- [x] Test với `fetch` giả: mở DM thành công, lỗi `50007`, lỗi `429` có `retry_after`, thân lỗi không phải JSON.

---

## 03: Tracer bullet - Team notice text cho người đủ điều kiện

**What to build:** admin bấm "Gửi Discord" với checkbox "Nhắn riêng từng người" đang bật. Formation
announcement đăng xong, mỗi thành viên có điểm danh "Có" và có Discord ID nhận một Team notice cho
mỗi trận họ có tên. Dialog hiện báo cáo "Đã nhắn X/Y" cùng hai nhóm bị bỏ qua.

**Blocked by:** 01, 02.

**Status:** done (còn bước thử tay)

- [x] Schema shared cho báo cáo (`sentCount`, `totalCount`, bốn nhóm). Endpoint chưa có body; trường `notices` vào cùng ticket 05, nơi nó được dùng.
- [x] Hàm thuần dựng Team notice đúng mẫu ở spec: tiêu đề trận, tên team hoặc "Team N", giờ online dùng chung quy tắc với Formation announcement, 6 vị trí kèm note, ô trống ghi "(trống)", người nhận in đậm và đánh dấu, `allowed_mentions` đóng hết, luôn dưới 2000 ký tự.
- [x] `TeamBuilderService` có hàm đọc đội hình đã lưu của một ngày kèm tên team; `discord-bot` import `TeamBuilderModule`, test đồ thị module cập nhật và xanh.
- [x] Endpoint `POST team-builder/formations/:sessionId/notify-members`, admin JWT; 404 khi không có ngày; từ chối ngày chưa đóng điểm danh bằng câu tiếng Việt.
- [x] Bỏ qua người không có điểm danh "Có" (nhóm `notPresent`) và người chưa có Discord ID (nhóm `missingDiscordId`).
- [x] Gửi tuần tự; lỗi nào cũng chưa phân loại ở ticket này (ném lên như hiện tại).
- [x] Dialog có checkbox mặc định bật mỗi lần mở; tắt thì không gọi `notify-members`.
- [x] Có báo cáo thì dialog không tự đóng, hiện "Đã nhắn X/Y" và các nhóm không rỗng, mỗi người một dòng "tên - trận i".
- [ ] Thử thật trên server thử với 2-3 tài khoản. (Chưa làm: cần tài khoản Discord thật, người duyệt PR chạy.)

---

## 04: Xử lý lỗi Discord theo từng Team notice

**What to build:** một người chặn DM hay Discord giới hạn tốc độ không làm hỏng cả lượt gửi. Mỗi
Team notice lỗi được xếp vào đúng nhóm trong báo cáo, và dialog hiện đủ bốn nhóm.

**Blocked by:** 03.

**Status:** done (còn bước thử tay)

- [x] `50007` vào nhóm `blocked`, gửi tiếp người sau.
- [x] `429`: chờ đúng `retryAfter` rồi thử lại Team notice đó một lần; vẫn lỗi thì vào `unsent`.
- [x] `40003`: dừng hẳn; Team notice đó và mọi Team notice còn lại vào `unsent`.
- [x] Lỗi khác (5xx, mạng): vào `unsent`, ghi log kèm thân lỗi của Discord, gửi tiếp người sau.
- [x] Dialog hiện nhóm "Chặn tin nhắn từ bot" và "Chưa nhắn được" (component báo cáo dựng sẵn từ ticket 03).
- [x] Test service cho từng trường hợp trên, gồm thứ tự gửi và số lần gọi Discord.
- [ ] Thử thật với một tài khoản tắt DM từ thành viên server để thấy `50007`. (Chưa làm: cần tài khoản Discord thật, người duyệt PR chạy.)

---

## 05: Nhắn lại

**What to build:** admin nhắn lại cho đúng những Team notice chưa gửi được, không ai nhận trùng.
Khi cả request nhắn riêng lỗi, admin thử lại được mà không phải đăng lại Formation announcement.

**Blocked by:** 04.

**Status:** done

- [x] Endpoint lọc theo `notices` (cặp `characterId`, `matchIndex`) khi body có trường này, vẫn qua cùng điều kiện ở 03.
- [x] Nút "Nhắn lại người lỗi" ở nhóm "Chưa nhắn" gửi đúng các cặp đó và gộp kết quả vào báo cáo đang hiện (số đã nhắn cộng dồn, nhóm "chưa nhắn" chỉ còn người vẫn lỗi).
- [x] Request `notify-members` lỗi toàn bộ (mạng, 5xx, 400): dialog hiện câu lỗi, toast thành công của Formation announcement vẫn giữ, có nút thử lại cho tất cả.
- [x] Lỗi phiên đi qua `recoverSession` như các write khác.
- [x] Test web: nút nhắn lại gửi đúng các cặp; lỗi toàn bộ hiện câu lỗi và nút thử lại.
