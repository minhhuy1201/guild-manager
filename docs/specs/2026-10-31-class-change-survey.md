# Khảo sát lưu phái

Status: approved

Ngày: 2026-10-31 · Thuật ngữ mới: **Class survey** (UI: "Khảo sát lưu phái"), **Class outlook** (UI:
"Lực lượng lưu phái") - thêm vào `GLOSSARY.md` khi spec được duyệt · Tiền lệ: Tự động điểm danh
([`2026-10-27-auto-attend.md`](2026-10-27-auto-attend.md)) cho bảng riêng trên Discord. Prototype giao
diện đã được duyệt hướng B (trang riêng) và luồng Discord.

## Problem Statement

Game sắp ra bản update ngày 06/11. Một phần bang định đổi lưu phái, nhưng không phải ai cũng chắc
chắn. Admin không biết sau update bang còn bao nhiêu người mỗi phái. Nếu nhiều người cùng dồn sang một
phái mới, đội hình Guild War sẽ lệch: thừa phái này, thiếu phái kia (ví dụ thiếu Tố Vấn). Hiện admin
chỉ có cách hỏi từng người trên Discord và tự đếm.

## Solution

Một **đợt khảo sát lưu phái** có tên và hạn chót, mở bằng lệnh Discord. Bot đăng tin ping role bang,
kèm nút "Điền khảo sát". Mỗi thành viên chọn "Giữ nguyên" hoặc "Chuyển sang <phái>". Nếu chuyển, họ
chọn thêm "Chắc chắn" hoặc "Đang cân nhắc". Câu trả lời sửa được đến hạn chót.

Trên web có trang riêng **"Lực lượng lưu phái"** trong thanh điều hướng, cả bang xem được. Trang có
form của chính mình và kết quả công khai: cơ cấu phái trước và sau update (phần "đang cân nhắc" vẽ
khác phần "chắc chắn"), cùng danh sách từng người. Ngoài đợt khảo sát, trang vẫn hiện cơ cấu phái
hiện tại.

Khảo sát chỉ để xem lực lượng. Nó **không** đổi lưu phái trong hồ sơ thành viên; admin tự sửa tay sau
update.

## User Stories

1. As an Admin, I want to open a Class survey from Discord with a name and a deadline date, so that I can collect plans before a game update.
2. As an Admin, I want the deadline to be the end of the date I type (23:59 Vietnam time), so that "hạn 06/11" means the whole day of 06/11.
3. As an Admin, I want opening a survey to post a message that pings the guild role, so that everyone is notified at once.
4. As an Admin, I want opening a second survey while one is still open to be refused with a clear message, so that the guild never has two surveys competing.
5. As an Admin, I want a deadline in the past to be refused, so that I do not open a survey nobody can answer.
6. As an Admin, I want to grant the survey command to a Manager, so that a Manager can run the survey without being an Admin.
7. As a Member without the grant, I want the command to refuse me with a clear message, so that I know it is not for me.
8. As an Admin, I want a reminder mode of the command that pings only the members who have not answered yet, so that I can chase them without pinging everyone again.
9. As an Admin, I want the reminder to carry the same "Điền khảo sát" button, so that the people pinged can answer straight from it.
10. As an Admin, I want the reminder to say so when everyone has answered, so that I do not post an empty ping.
11. As a Member, I want a "Điền khảo sát" button on the survey message, so that I can answer without opening the website.
12. As a Member, I want the button to open a panel only I can see, so that my answer is not posted in the channel.
13. As a Member, I want the panel to show my current class, so that I know what I am changing from.
14. As a Member, I want the panel to show my saved answer when I open it again, so that I can check or change it.
15. As a Member, I want to pick "Giữ nguyên", so that the guild knows I stay on my class.
16. As a Member, I want to pick the class I will move to from a list that leaves out my current class, so that I cannot pick a "change" to the same class.
17. As a Member, I want to say whether I am sure or still considering, so that the Admin can tell firm plans from maybes.
18. As a Member, I want a confirmation in the panel after I answer, so that I know my answer was saved.
19. As a Member, I want to change my answer as many times as I like before the deadline, so that I can decide late.
20. As a Member, I want answering after the deadline to be refused with a clear message, so that I know the survey is closed.
21. As a Member, I want pressing an old survey's button to tell me that survey is closed, so that a stale message does not confuse me.
22. As a Discord user not linked to a Character, I want a clear message that my account is not linked, so that I know to ask an Admin.
23. As a Member, I want a "Lực lượng lưu phái" entry in the header navigation and the phone tab bar, so that I can find the page.
24. As a Member, I want the page to show the survey name and its deadline, so that I know how long I have.
25. As a Member, I want to answer the survey on the page with the same choices as on Discord, so that I can use whichever is at hand.
26. As a Member, I want the page form to start from my saved answer, so that I see what I picked.
27. As a Member, I want the form to be read-only after the deadline, so that I do not try to answer a closed survey.
28. As a Member, I want to see how many people answered out of the whole guild, so that I know how complete the picture is.
29. As a Member, I want to see for each class how many people it has now and how many it would have after the update, so that I can see which classes grow or shrink.
30. As a Member, I want the "after" figure split into sure and considering, so that I can see how firm a change is.
31. As a Member, I want each class's change shown as +N or -N, so that I can read the shift at a glance.
32. As a Member undecided between classes, I want to see which class is short, so that I can pick one that keeps the guild balanced.
33. As a Member, I want a list of every member with current class and planned class, so that I can see who plans what.
34. As a Member, I want members who have not answered marked as such in the list, so that "not answered" is not read as "staying".
35. As an Admin, I want the results to stay visible after the deadline, so that I can plan the first week after the update.
36. As an Admin, I want the "before" figure to use each member's class at the time they answered, so that editing a member's class during the survey does not change the result behind my back.
37. As an Admin, I want a member's answer to disappear when the member is deleted, so that the results only count people still in the guild.
38. As a Member, I want the page to show the current class line-up when no survey has ever run, so that the page is never empty.
39. As an Admin, I want to open a new survey for a later update without code changes, so that the tool is reusable.


## Implementation Decisions

### Domain và model dữ liệu

- Domain backend mới `class-survey`, module riêng cạnh `attendance`. Discord gọi vào qua
  `class-survey.public.ts`, giống cách đang gọi `attendance`.
- Hai bảng mới:
  - `ClassSurvey`: `id` (cuid), `title`, `closesAt` (thời điểm), `createdAt` (ghi bằng `Clock`),
    `createdById` (id thuần, không relation, cùng lý do `createdByCharacterId` của Nghỉ phép).
  - `ClassSurveyAnswer`: `surveyId`, `characterId`, unique theo cặp; `fromClass` (lưu phái của
    thành viên lúc trả lời); `targetClass` (nullable); `confidence` (nullable); `answeredAt`.
    Cascade theo cả đợt khảo sát lẫn nhân vật.
- "Giữ nguyên" là `targetClass = null` và `confidence = null`. "Chuyển" có cả hai cột và
  `targetClass ≠ fromClass`. Một check constraint trong DB bắt hai cột cùng null hoặc cùng có.
- Enum Prisma mới `ClassChangeConfidence` (`SURE`, `CONSIDERING`), mirror trong
  `packages/shared/enums` kèm nhãn "Chắc chắn", "Đang cân nhắc".
- Thêm `GrantableCommand.KHAO_SAT_LUU_PHAI` ở cả Prisma lẫn shared enum, kèm nhãn.
- Đợt **đang mở** khi `now < closesAt`. Mỗi lúc tối đa một đợt mở: lệnh mở chạy trong transaction,
  kiểm tra đợt đang mở trước khi tạo.
- `fromClass` ghi lại từ `guildClass` hiện tại mỗi lần lưu; trả lời lại thì cập nhật luôn.
- Migration chỉ thêm bảng và giá trị enum, không có gì phá huỷ. Bật RLS cho hai bảng mới cùng mẫu các
  bảng trước (`migration-rls.spec.ts` bắt nếu thiếu), rồi kiểm tra grant Data API theo
  `production.md` §5.

### Hợp đồng chung (`packages/shared`)

- Body câu trả lời là union có discriminant, nên "giữ nguyên" không bao giờ mang mức độ chắc chắn:

  ```ts
  type ClassSurveyAnswerInput =
    | { kind: "KEEP" }
    | { kind: "CHANGE"; targetClass: GuildClass; confidence: ClassChangeConfidence };
  ```

- Shape đọc gồm đợt khảo sát (`id`, `title`, `closesAt`, `isOpen`) và một dòng cho mỗi `Character`:
  tên, lưu phái hiện tại, câu trả lời (`null` nếu chưa điền, ngược lại là `fromClass` cộng union ở
  trên). `isOpen` do server tính, web không tự so đồng hồ.
- Bảng đếm trước/sau theo phái là hàm thuần trong `packages/shared/lib`, Discord và web dùng chung
  nên cùng ra một con số. "Trước" đếm `fromClass` của người đã trả lời và lưu phái hiện tại của
  người chưa trả lời. "Sau" dời các câu "chắc chắn" và "đang cân nhắc", đếm riêng hai phần.

### API

- `GET /class-surveys/current`: đợt đang mở, nếu không có thì đợt đóng gần nhất, nếu chưa từng có
  thì `null` (trang chỉ hiện cơ cấu hiện tại). Mọi người đã đăng nhập.
- `PUT /class-surveys/:id/answers/me`: lưu câu trả lời của chính người gọi. Trả 400 tiếng Việt khi
  đợt đã đóng, 404 khi không có đợt đó, 404 khi người gọi không có `Character`, 400 khi
  `targetClass` trùng lưu phái hiện tại. Không ai trả lời hộ người khác.
- Không có endpoint mở đợt; lệnh Discord là lối duy nhất.
- Danh sách trong `GET` là mọi `Character`, mọi role, giống bảng điểm danh.

### Discord

- Một lệnh `/khao-sat-luu-phai` với hai subcommand, chặn bằng `requireCommand` với
  `KHAO_SAT_LUU_PHAI`:
  - `mo ten:<chữ> han:<dd/mm[/yyyy]>`: mở đợt. Ngày đọc bằng parser ngày của Nghỉ phép đang có;
    `closesAt` là 23:59:59.999 giờ VN của ngày đó. Ngày đã qua bị từ chối. Tin trả lời công khai
    mention role bang (`allowed_mentions` chỉ mở role đó, giống `/thong-bao`), có embed (tên, hạn
    chót, "Sửa lại được đến hạn chót"), nút "Điền khảo sát" và nút link tới trang.
  - `nhac`: ping từng thành viên đã liên kết Discord mà chưa điền đợt đang mở, kèm cùng nút. Mention
    cắt theo giới hạn tin nhắn bằng helper sẵn có, tin trả lời ghi số người bị bỏ ra. Không còn ai
    chưa điền thì tin trả lời nói vậy và không ping ai.
- `custom_id` mới trong `custom-id.ts`, có cả encode và decode, mỗi id mang id đợt khảo sát:
  - Nút "Điền khảo sát": mở bảng ephemeral có lưu phái hiện tại, câu trả lời đã lưu, và một string
    select ("Giữ nguyên" cộng mọi phái trừ phái hiện tại).
  - Select: chọn "Giữ nguyên" thì lưu ngay. Chọn một phái thì viết lại bảng tại chỗ với hai nút
    "Chắc chắn" và "Đang cân nhắc"; id của nút mang id đợt và phái đã chọn, nên không cần lưu trạng
    thái tạm.
  - Nút mức độ: lưu câu trả lời và viết lại bảng với dòng xác nhận.
- Router thêm loại component string select; hiện tại chỉ xử lý button và modal submit.
- Mọi lần lưu đi qua cùng service mà web gọi, nên luật hạn chót và luật "không trùng phái hiện tại"
  giống hệt nhau ở hai nơi. Id của đợt đã đóng hoặc không tồn tại được trả lời bằng tin ephemeral rõ
  ràng, không crash.

### Web

- Feature mới `class-survey` và route `/luu-phai` (`ROUTES.classOutlook`). Mục nav "Lực lượng lưu
  phái", nhãn ngắn "Lưu phái", mở cho mọi người, có cả trên tab bar điện thoại.
- Bố cục theo prototype đã duyệt: banner trang (tên và hạn chót), bốn ô số (đã điền / tổng, định
  chuyển, trong đó chắc chắn, phái tăng mạnh nhất), rồi hai cột - form của mình bên trái, kết quả
  bên phải.
- Kết quả có hai tab: **Trước / sau** (hai thanh mỗi phái, thanh "sau" chia phần liền cho "chắc
  chắn" và phần sọc cho "đang cân nhắc", ghi `trước → sau` và ±N, sắp theo số "sau") và **Danh
  sách** (mọi thành viên, phái hiện tại, phái dự định kèm badge mức độ, "Chưa điền" cho người chưa
  trả lời). Tab Dòng chuyển (Sankey) và Ma trận trong prototype không làm.
- Màu và icon phái lấy từ `GUILD_CLASS_COLOR` và `GUILD_CLASS_IMAGE` sẵn có.
- Form gồm bộ chọn phái (bỏ phái hiện tại) và công tắc chắc chắn / cân nhắc, bị khoá khi chọn "Giữ
  nguyên". Form chỉ đọc khi đợt đã đóng, và ẩn với người xem không có `Character`.

## Testing Decisions

Test tốt chạy tính năng từ lối vào công khai và kiểm tra thứ người dùng thấy: câu trả lời đã lưu,
thông báo từ chối, payload trả về Discord, con số hiển thị. Không assert helper nội bộ hay thứ tự gọi
Prisma.

Các seam đề xuất, từ cao xuống:

1. **`ClassSurveyService`** (API): mở, trả lời, đọc, với `FixedClock` và `PrismaService` mock, theo
   kiểu `auto-attend.service.spec.ts`. Phủ hạn chót, một đợt mở mỗi lúc, luật trùng phái, snapshot
   `fromClass`, giữ nguyên với chuyển.
2. **Lệnh Discord và interaction router**: lệnh theo kiểu `thong-bao.command.spec.ts` và
   `nhac-diem-danh.command.spec.ts` (kiểm tra grant, danh sách mention, shape tin trả lời); luồng
   nút, select, nút mức độ qua `interaction-router.spec.ts`; `custom-id.spec.ts` cho encode/decode
   và id cũ.
3. **Hàm đếm trong shared**: hàm thuần, test dạng bảng cho số trước/sau.
4. **Màn web**: một test Vitest cho component trang, theo kiểu `attendance-screen.test.tsx` - đợt
   đang mở, đợt đã đóng, chưa từng có đợt, người xem không có `Character`.

Schema câu trả lời trong shared có spec nhỏ theo kiểu `create-leave.schema.spec.ts`.

## Out of Scope

- Áp lưu phái dự định vào hồ sơ thành viên. Admin tự sửa tay sau update.
- Trả lời hộ người khác, trên Discord hay web.
- Đóng đợt sớm, sửa tên hay hạn chót, xoá đợt. Đợt mở nhầm thì chờ hết hạn; nếu cần sửa thì làm spec
  sau.
- Mở đợt từ web.
- Tin khảo sát tự cập nhật số người đã điền.
- Mục tiêu số người mỗi phái ("thiếu 2", "thừa 3").
- Xem trước đội hình theo phái dự định ở `/xep-team`.
- So sánh các đợt, đối chiếu câu "chắc chắn" với phái thật sau update.
- Tab Dòng chuyển (Sankey) và Ma trận của prototype.
- Nhắc tự động theo lịch. Chỉ có subcommand `nhac` chạy tay.

## Further Notes

- Thời gian: đợt đầu phải mở sớm trước 06/11 (hôm nay 31/10), nên phạm vi đã cắt cho vừa.
- Sau khi merge, chạy `pnpm --filter api discord:register` để Discord hiện lệnh mới.
- Kết quả công khai toàn bộ theo lựa chọn của bang, giống bảng điểm danh.
