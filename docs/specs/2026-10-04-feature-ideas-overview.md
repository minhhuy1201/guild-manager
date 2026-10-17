# Ý tưởng feature mới cho Guild Manager - Tổng quan

Ngày: 2026-10-04 · Trạng thái: **bản nháp ý tưởng, chưa có quyết định nào**. Đây không phải spec
thiết kế: mỗi ý cần một vòng phỏng vấn (design tree) trước khi viết spec chi tiết và plan.

Nguồn đầu vào: ba agent nghiên cứu song song

1. Kiểm kê code hiện tại (`docs/architecture.md`, `apps/api/prisma/schema.prisma`, module API, route web).
2. Nghiên cứu hệ thống bang hội Nghịch Thủy Hàn (bản Trung 逆水寒手游 và bản VNG).
3. Khảo sát tool quản lý guild của MMO khác (Raid-Helper, Apollo, Warcraft Logs, Guild Order,
   Albion Battle Hub, hệ DKP/EPGP).

Nhãn độ tin cậy: **[đã kiểm]** = đọc thấy trong code/docs repo; **[có nguồn]** = có link web (xem
mục Nguồn); **[suy luận]** = ý kiến của người viết, chưa có bằng chứng.

## 1. Lưu ý trước khi đọc

- **Nguồn tiếng Việt về bang hội gần như không có.** Số liệu chủ yếu từ bản Trung, chưa đối chiếu với
  bản VNG. Ví dụ bản Trung có 3 trận bang chiến/tuần (T6 20:00, T6 21:00, T7 20:00) [có nguồn],
  còn repo cố định Guild War T7 20:00 [đã kiểm, `docs/architecture.md` §6]. Repo phản ánh thực tế
  bản VN, nên không đề xuất sửa theo bản Trung.
- **Số môn phái lệch.** Repo có 7 giá trị `GuildClass` (CUU_LINH, HUYET_HA, LONG_NGAM, THAN_TUONG,
  THIET_Y, TOAI_MONG, TO_VAN) [đã kiểm]. Bài ldplayer liệt kê 6 phái, một bài khác nói "10 phái"
  [có nguồn, mâu thuẫn]. Cần chủ bang xác nhận.
- **Không có API game công khai, không có tool riêng cho game** [có nguồn, tìm không thấy]. Mọi dữ
  liệu game (chiến lực, cấp, thưởng) phải nhập tay.
- **"Điểm đau" của bang chủ là [suy luận].** Không tìm thấy bài viết nói thẳng; chỉ có hướng dẫn
  chung trên taptap: đốc thúc thành viên, phân quyền rõ, giữ độ hoạt động.
- Ràng buộc bản Trung có thể hữu ích nếu bản VN giống [có nguồn, chưa kiểm bản VN]: bang chiến tối
  đa 120 người, mỗi nghề tối đa 30, dưới 10 người bị hạ cấp; điều kiện cấp 50 và vào bang trên 72 giờ;
  học đồ không dự liên đấu.

## 2. Hiện trạng (đã có, không đề xuất lại)

[đã kiểm, chi tiết trong `docs/architecture.md`]

- Điểm danh Có/Không theo trận, lý do khi vắng, deadline, admin ghi hộ; lịch sử + dashboard tổng hợp.
- Thiết lập lịch: Guild War cố định + scrim do admin tạo; quản lý thành viên.
- Xếp team kéo thả (tối đa 10 team, 2 trận/ngày), ghi chú slot, ảnh roster, announce lên Discord.
- Bảng chiến thuật Konva nhiều stage.
- Bot Discord: điểm danh, nhắc nhở (cron 09:00 VN), thông báo lịch tuần thủ công.
- Đăng nhập chỉ qua Discord OAuth; admin phải nhập `Character.discordId` bằng tay trước.

Ràng buộc kỹ thuật ảnh hưởng mọi ý: không có worker, việc định kỳ phải là cron Vercel gọi GET sau
`CronSecretGuard` (`@nestjs/schedule` bị cấm, architecture.md §7); cron Hobby chỉ đảm bảo theo giờ;
kênh thông báo duy nhất là Discord; UI toàn tiếng Việt không i18n.

## 3. Danh sách ý tưởng

Giá trị / công sức là ước lượng [suy luận].

### A. Điểm danh và độ hoạt động

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 1 | **Chế độ nghỉ phép**: thành viên khai vắng một khoảng ngày, hệ thống tự ghi "Không" kèm lý do | Cao | Thấp | [suy luận] |
| 2 | **Đăng ký vs có mặt thật**: sau trận admin tick người thật sự đến; tính tỷ lệ no-show mỗi người | Cao | Trung bình | [có nguồn] WCL, Albion |
| 3 | **Danh sách "cần chú ý"**: vắng / không phản hồi N trận liên tiếp, có thể DM qua Discord | Trung bình | Thấp | [có nguồn] Guild Order |

### B. Xếp đội

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 4 | **Đội hình mục tiêu + cảnh báo thiếu vai trò**: map phái sang vai trò (Thiết Y tank, Tố Vấn heal), quota mỗi team, cảnh báo trong `/xep-team` | Cao | Thấp-TB | [có nguồn] Albion, Lost Ark Raid Board |
| 5 | **Chiến lực nhân vật**: nhập tay, hiện tổng chiến lực mỗi team để cân đội | Trung bình | Thấp | [suy luận] |
| 6 | **Gợi ý xếp đội tự động** theo quota + chiến lực (phụ thuộc 4, 5) | Trung bình | Cao | [suy luận] |
| 7 | **Gắn chiến thuật vào trận**: liên kết `Tactic` với `FormationMatch`, đăng kèm khi announce | Trung bình | Thấp | [suy luận] |

### C. Phần thưởng và cống hiến

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 8 | **Sổ điểm công khai (DKP rút gọn)**: tự cộng khi đi trận, admin cộng/trừ tay có lý do, ai cũng xem được | Cao | Trung bình | [có nguồn] Guild Order, EPGP |
| 9 | **Lịch sử chia thưởng**: ai nhận gì, ngày nào (phụ thuộc 8) | Trung bình | Thấp | [có nguồn] WoWAudit, ThatsMyBIS |

### D. Tuyển người

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 10 | **Đơn xin vào bang qua Discord OAuth**: người lạ đăng nhập thấy form thay vì bị chặn; đơn vào hàng duyệt; duyệt thì tự tạo `Character` với `discordId` có sẵn | Cao | Trung bình | [có nguồn] Guild Order; luồng OAuth [đã kiểm] |

### E. Lịch và sự kiện

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 11 | **Loại sự kiện mới** (liên đấu, boss bang, phó bản) kèm giới hạn chỗ theo vai trò; lịch phải cấu hình được vì chưa rõ bản VN | Cao | Cao | [có nguồn] Raid-Helper, Apollo |
| 12 | **Lịch ICS**: một endpoint để thêm lịch bang vào Google Calendar / điện thoại | Trung bình | Thấp | [có nguồn] Apollo |

### F. Vận hành

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 13 | **Báo lỗi cron nhắc nhở** (fail hoặc gửi rỗng) vào kênh admin; thêm purpose mới cho `BotChannel` | Trung bình | Thấp | [đã kiểm] lỗ hổng ghi trong architecture.md §8 |
| 14 | **Chống ghi đè roster** (optimistic locking) khi 2 admin cùng sửa | Thấp-TB | Trung bình | [đã kiểm] architecture.md §8 |

### G. Game hóa

| # | Ý tưởng | Giá trị | Công sức | Nhãn |
|---|---|---|---|---|
| 15 | **Huy hiệu chuyên cần, bảng xếp hạng tham gia** (dựa trên dữ liệu ý 2) | Thấp-TB | Thấp-TB | [có nguồn] Guild Order, AGM |

## 4. Đề xuất ưu tiên

Top 5 theo giá trị / công sức [suy luận]:

1. **Nghỉ phép (1)** - rẻ, mọi thành viên dùng.
2. **Cảnh báo thiếu vai trò (4)** - đánh vào việc tốn công nhất mỗi tuần của admin.
3. **Đơn xin vào bang (10)** - bỏ bước nhập Discord ID bằng tay.
4. **Có mặt thật / no-show (2)** - nền dữ liệu cho 3, 8, 15.
5. **Báo lỗi cron (13)** - nhỏ, vá lỗ hổng có thật.

Để sau: 8 (sổ điểm) và 11 (sự kiện mới) - giá trị lớn nhưng phụ thuộc 2 và cần xác nhận cơ chế
game bản VN. Bỏ qua cho guild nhỏ: đấu giá kín, regear tự động, import log chiến đấu (không có
nguồn dữ liệu).

## 5. Câu hỏi mở (vòng phỏng vấn đầu tiên)

Câu hỏi cho chủ bang, theo từng ý top 5. Câu sau một ý chỉ hỏi khi ý đó được chọn.

**Chung**
- Q0. Chọn 1-3 ý nào để đào sâu trước?
- Q0b. Số môn phái đúng của bản VN là bao nhiêu, `LONG_NGAM` có còn không? Vai trò của từng phái?

**Ý 1 - Nghỉ phép**
- Ai được khai nghỉ: thành viên tự khai, hay chỉ admin? (đề xuất: tự khai, admin xem được)
- Nghỉ có áp cho cả Guild War không, hay Guild War bắt buộc phản hồi riêng?
- Trận đã chốt đội hình (`attendanceClosedAt`) trong khoảng nghỉ thì xử lý sao?
- Khai qua web, qua bot Discord, hay cả hai?

**Ý 4 - Cảnh báo thiếu vai trò**
- Bảng phái sang vai trò cố định trong code (`packages/shared`) hay admin cấu hình?
- Quota đặt theo team, theo trận, hay một mẫu chung? Cảnh báo chỉ hiển thị hay chặn announce?

**Ý 10 - Đơn xin vào bang**
- Form hỏi những gì (tên nhân vật, phái, chiến lực, lời nhắn)?
- Người bị từ chối có được nộp lại không, sau bao lâu?
- Báo đơn mới cho admin qua Discord không?
- Rủi ro bảo mật: hiện người lạ không vào được gì; mở form nghĩa là có route mới cho người chưa là
  thành viên - cần rate limit và chỉ cho một đơn đang chờ mỗi Discord ID.

**Ý 2 - Có mặt thật**
- Ai tick (admin, hay đội trưởng mỗi team)? Tick lúc nào, có hạn chót không?
- No-show có bị phạt tự động (gắn với ý 8) hay chỉ là số liệu?

**Ý 13 - Báo lỗi cron**
- Kênh admin riêng hay dùng kênh nhắc nhở hiện có? Báo cả khi "không có gì để nhắc" hay chỉ khi lỗi?

## Nguồn

- `docs/architecture.md` (§6 lịch và deadline, §7 nơi đặt behavior mới, §8 những gì cố ý chưa có)
- `apps/api/prisma/schema.prisma` (data model, enum `GuildClass`)
- Bang chiến bản Trung: https://www.233leyuan.com/post-detail/1955625355720371176
- Liên đấu bang hội: https://www.taptap.cn/moment/427595527530481173
- Liên đấu liên server: https://www.ithome.com/0/980/577.htm
- Hướng dẫn bang chủ: https://www.taptap.cn/moment/427852455837960025
- Môn phái và vai trò: https://vnm.ldplayer.net/blog/huong-dan-chon-luu-phai-nghich-thuy-han.html
- Apollo: https://apollo.fyi/
- Raid-Helper: https://discord.bots.gg/bots/579155972115660803
- Albion Battle Hub: https://www.albionbattlehub.com/en/features
- Lost Ark Raid Board: https://guildorder.com/plugins/lost-ark-raid-board
- Hệ thống loot DKP/EPGP: https://guildorder.com/games/wow/wiki/loot-systems
- Guild Order: https://www.capterra.com/p/10049503/Guild-Order/
- Warcraft Logs roster attendance: https://wowutils.com/viserio-cooldowns/news/v4.32.0-raid-logs-and-roster-report
- ThatsMyBIS: https://www.curseforge.com/wow/addons/thatsmybis-whishlist-viewer
