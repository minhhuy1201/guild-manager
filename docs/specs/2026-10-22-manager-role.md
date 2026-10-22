# Vai Quản lý và quyền cấp riêng từng người

Status: approved

Ngày: 2026-10-22 · Base: `97e922d`

Thuật ngữ theo [`GLOSSARY.md`](../../GLOSSARY.md) (mục Access): **Admin**, **Manager**, **Member**,
**Capability**, **Grant**.

## Problem Statement

Hôm nay app chỉ có hai vai: Admin làm được mọi thứ, Member chỉ lo điểm danh và nghỉ phép của chính
mình. Mọi quyền quản lý đi qua một ranh giới duy nhất (`canManageGuild`). Bang muốn giao một phần
việc cho người tin cậy, ví dụ một người chỉ xếp team, một người chỉ lo đua mèo. Muốn vậy thì hiện
tại chỉ có cách nâng họ lên Admin, tức là trao luôn quyền xóa thành viên, đổi vai và cấu hình kênh
Discord. Không có mức nào nằm giữa hai vai.

Bang cũng không muốn quản lý theo nhóm quyền rồi gán nhóm cho người. Bang nhỏ, mỗi người được giao
việc khác nhau, nên quyền phải gắn thẳng vào từng người.

## Solution

Thêm vai thứ ba là **Manager** (UI: "Quản lý"). Nhãn Admin trên UI đổi từ "Quản trị" thành "ADMIN".
Nhãn Member giữ "Bang chúng".

- Admin vẫn toàn quyền, như hôm nay. Rescue admin (Discord ID trong env) vẫn là Admin.
- Member giữ đúng quyền hôm nay.
- Manager khởi đầu bằng đúng quyền của Member. Ngoài ra Manager có thêm những **Grant** mà Admin tick
  cho riêng người đó, gồm hai nhóm:
  - **Chức năng**: 6 Capability, mỗi cái bao trọn cả việc xem lẫn ghi trong vùng của nó:
    | Capability | Bao gồm |
    |---|---|
    | Xếp team | `/xep-team`, đăng Formation announcement, gửi Team notice |
    | Lịch trận | Tab Lịch trận trong Thiết lập: tạo/sửa/xóa trận, mở lại điểm danh, giảm số trận |
    | Thành viên | Tab Thành viên trong Thiết lập, giới hạn như mục "Manager và thành viên" bên dưới |
    | Điểm danh & nghỉ phép | Điểm danh hộ, sửa bảng điểm danh, bỏ qua deadline, xin nghỉ hộ và nghỉ ngày đã qua, tab Nghỉ phép trong Thiết lập |
    | Đua mèo | `/dua-meo`: tạo sự kiện, đua, thông báo |
    | Sửa chiến thuật | Tạo, sửa, xóa chiến thuật (trang chiến thuật vẫn mở cho mọi người xem) |
  - **Command Discord**: checklist 5 command chỉ Admin dùng được hôm nay: `/diem-danh-ho`,
    `/chao-mung`, `/cau-hinh-kenh`, `/thong-bao`, `/nhac-diem-danh`. Hai nhóm độc lập: tick
    `/diem-danh-ho` là đủ, không cần thêm Capability "Điểm danh & nghỉ phép". `/ping` và
    `/diem-danh` vẫn mở cho mọi người.
- Chỉ Admin cấp được Grant và đổi được vai. Hai việc này không bao giờ là Capability.
- Admin cấp Grant ngay trong dialog sửa thành viên. Khi chọn vai Quản lý, dialog hiện hai nhóm
  checklist "Chức năng" và "Command Discord", mặc định không tick gì.
- Grant thay đổi thì có hiệu lực từ request kế tiếp, không phải chờ đăng nhập lại.
- Hạ Manager xuống vai khác thì xóa sạch Grant. Lên lại Manager thì cấp lại từ đầu.
- Capability hoặc command admin thêm vào sau này mặc định không cấp cho Manager nào.

### Manager và thành viên

Manager có Capability "Thành viên" được:

- thêm thành viên mới. Người mới luôn là Member.
- sửa tên, class, Discord ID của một **Member**.

Manager không được:

- xóa bất kỳ ai. Chỉ Admin xóa được.
- sửa hàng của Manager khác hoặc của Admin. Các hàng đó chỉ xem được.
- đổi vai hoặc Grant của bất kỳ ai, kể cả chính mình.

### Nav và Thiết lập

- Mỗi mục nav chỉ hiện khi người xem có Capability tương ứng. Admin thấy hết, Member thấy như hôm nay.
- Mục "Thiết lập" hiện khi Manager có ít nhất một trong Lịch trận, Thành viên, Điểm danh & nghỉ phép.
  Trong trang chỉ hiện các tab được cấp, mở sẵn tab đầu tiên được cấp. `?tab=` trỏ vào tab không
  được cấp thì rơi về tab được cấp đầu tiên.
- Mục Đua mèo trong user menu hiện khi có Capability Đua mèo.
- Mở thẳng một route không được cấp thì bị đưa về trang điểm danh, như Member hôm nay.

### Discord

Command admin không khai báo `default_member_permissions`, nên Discord đã hiện mọi command cho mọi
người. Việc chặn nằm hoàn toàn ở bot. Ai gọi command admin mà không có Grant (Member, hoặc Manager
chưa được tick) đều nhận cùng một câu ephemeral: "Bạn chưa được cấp quyền dùng lệnh này". Câu
"chưa liên kết nhân vật" vẫn đi trước, như hôm nay.

Bot đọc Grant của người gọi từ hàng thành viên ở mỗi tương tác. `/diem-danh-ho` là Grant để điểm danh
hộ qua bot: người có nó bấm nút hộ người khác được mà không cần Capability "Điểm danh & nghỉ phép"
(chỉ ở đường điểm danh của bot, các kiểm tra khác giữ Grant thật). Câu từ chối chung là
`NOT_GRANTED` trong `require-command.ts`; mô tả "(chỉ admin)" của command trên Discord giữ nguyên tới
lần chạy `pnpm discord:register` kế tiếp.

## User Stories

1. Là Admin, tôi muốn đặt một thành viên làm Manager, để giao bớt việc mà không trao toàn quyền.
2. Là Admin, tôi muốn tick chính xác những Capability một Manager có, để mỗi người chỉ nhận đúng việc tôi tin giao.
3. Là Admin, tôi muốn tick chính xác những command Discord admin một Manager được chạy, để quyền trên bot theo cùng quy tắc từng người.
4. Là Admin, tôi muốn checklist Grant nằm ngay trong dialog thành viên, để đặt vai và Grant ở cùng một chỗ.
5. Là Admin, tôi muốn Manager mới không có Grant nào, để không ai nhận quyền tôi chưa chọn.
6. Là Admin, tôi muốn thay đổi Grant có hiệu lực ở thao tác kế tiếp của Manager, để thu quyền là thu ngay.
7. Là Admin, tôi muốn hạ Manager thì xóa sạch Grant, để lần nâng sau không âm thầm trả lại quyền cũ.
8. Là Admin, tôi muốn giữ mọi quyền hôm nay, để vai mới không lấy mất gì của tôi.
9. Là Admin, tôi muốn UI ghi vai của tôi là "ADMIN", để phân biệt rõ với "Quản lý".
10. Là Admin, tôi muốn chỉ Admin đổi được vai và Grant, để không Manager nào tự nâng quyền mình hay người khác.
11. Là Admin, tôi muốn chỉ Admin xóa được thành viên, để Manager không xóa nhầm hay cố ý xóa ai.
12. Là Admin, tôi muốn chốt chặn "Admin cuối cùng" vẫn chạy khi hạ một Admin xuống Manager, để bang không bao giờ mất Admin cuối.
13. Là Admin, tôi muốn command admin và Capability thêm sau này mặc định không cấp, để thêm tính năng không bao giờ nới quyền Manager.
14. Là Manager có "Xếp team", tôi muốn vào `/xep-team`, xếp team, đăng Formation announcement và gửi Team notice, để tự lo đội hình.
15. Là Manager có "Lịch trận", tôi muốn chỉ thấy tab Lịch trận trong Thiết lập, để quản lý trận mà không thấy tab không dùng được.
16. Là Manager có "Thành viên", tôi muốn thêm thành viên mới, để đón người mới vào bang.
17. Là Manager có "Thành viên", tôi muốn sửa tên, class và Discord ID của một Member, để sửa dữ liệu danh sách.
18. Là Manager có "Thành viên", tôi muốn hàng của Manager và Admin chỉ xem được, để biết vì sao không sửa được.
19. Là Manager có "Điểm danh & nghỉ phép", tôi muốn điểm danh và xin nghỉ hộ người khác, kể cả ngày đã qua, để đỡ cho người quên.
20. Là Manager có "Điểm danh & nghỉ phép", tôi muốn thấy tab Nghỉ phép trong Thiết lập, để xem và hủy nghỉ phép của thành viên.
21. Là Manager có "Đua mèo", tôi muốn thấy mục đua mèo trong user menu và dùng trọn `/dua-meo`, để tự tổ chức đua.
22. Là Manager có "Sửa chiến thuật", tôi muốn tạo, sửa, xóa chiến thuật, để giữ sổ chiến thuật cập nhật.
23. Là Manager được cấp `/thong-bao`, tôi muốn chạy nó mà không cần Capability nào trên web, để việc trên bot tách khỏi việc trên web.
24. Là Manager chưa được cấp một command, tôi muốn nhận câu từ chối ephemeral rõ ràng, để biết cần hỏi Admin.
25. Là Manager, tôi muốn nav chỉ hiện những gì tôi mở được, để không bị đưa vào trang rồi bị đẩy ra.
26. Là Manager chưa có Grant nào, tôi muốn app chạy y hệt như với Member, để vai không tự cho thêm gì.
27. Là Manager, tôi muốn mở route không được cấp thì bị đưa về trang điểm danh, để gõ URL không lách được quy tắc.
28. Là Member, tôi muốn mọi thứ chạy như hôm nay, để thay đổi này vô hình với tôi.
29. Là Member gọi command admin, tôi muốn nhận đúng câu từ chối mà Manager chưa được cấp nhận, để thông báo nhất quán.
30. Là thành viên xem danh sách thành viên, tôi muốn Manager có badge "Quản lý", để biết ai lo việc gì.

## Implementation Decisions

- **Từ vựng chung** (`packages/shared`): `GuildRole` thêm `MANAGER`. Hai enum mới: `Capability`
  (`TEAM_BUILDER`, `SCHEDULE`, `MEMBERS`, `ATTENDANCE`, `CAT_RACE`, `TACTICS`) và `GrantableCommand`
  (mỗi command admin một giá trị), mỗi enum kèm map nhãn tiếng Việt theo thứ tự hiển thị. Nhãn vai:
  `ADMIN` "ADMIN", `MANAGER` "Quản lý", `MEMBER` "Bang chúng".
- **Một hàm quyết định** trong `packages/shared/lib` thay `canManageGuild`: `can(actor, capability)`
  và `canRunCommand(actor, command)`, actor mang vai và Grant của mình. Admin luôn true, Member luôn
  false, Manager đọc Grant. Mỗi chỗ đang gọi `canManageGuild` ứng với đúng một Capability. Không chỗ
  nào giữ kiểm tra vai trần, trừ ba việc chỉ Admin làm: đổi vai, đổi Grant, xóa thành viên.
- **Schema**: `Character` thêm hai cột mảng enum, `capabilities` và `grantedCommands`, mặc định rỗng.
  Mảng nằm trên hàng thành viên vì Grant thuộc về một người và không gì khác tham chiếu tới nó. Enum
  Prisma giữ khớp với enum chung (test enum-sync hiện có đã phủ). Migration chỉ thêm, không phá. Kiểm
  tra Data API grants theo `production.md` §5.
- **Bất biến**: hàng không phải Manager luôn có hai mảng rỗng. Member service giữ bất biến này ở mọi
  lần ghi: rời vai Manager thì xóa mảng, và chỉ lần ghi của Admin mới đặt được mảng.
- **Nguồn sự thật là DB, đọc mỗi request.** JWT vẫn chỉ mang vai. Trên API, `JwtAuthGuard` đọc Grant
  của người gọi khi vai là Manager và gắn vào `request.user`; guard Capability (thay `AdminGuard`,
  dùng dạng `@RequireCapability(...)` hoặc `@RequireAdmin()` sau `JwtAuthGuard`) và các service như
  điểm danh hộ cùng đọc từ đó, nên chỉ một lần đọc cho mỗi request. Admin và Member không tốn thêm
  lần đọc nào. Nhờ vậy thu quyền có hiệu lực ngay request kế tiếp, thay vì trễ tới một vòng đời
  token (1 ngày). Vai thì vẫn lấy từ token tới khi token làm mới.
- **Chặn trên web**: `/auth/me` trả Grant của người gọi cùng nhân vật đã gắn. Proxy vẫn đẩy Member ra
  khỏi route quản lý chỉ dựa vào vai. Proxy cho Manager đi qua, rồi server component của trang kiểm
  tra Capability từ `/auth/me` và chuyển về trang điểm danh khi thiếu. Nav, tab bar điện thoại, user
  menu và các tab Thiết lập lọc theo cùng Capability. API vẫn là chốt chặn thật, chặn trên web chỉ để
  hiển thị và tiện dùng.
- **Endpoint thành viên**: tạo mới được phép với `MEMBERS`, ép vai Member. Sửa với `MEMBERS` chỉ nhận
  tên, class và Discord ID, và chỉ trên hàng Member. Trường vai và Grant, xóa, và mọi lần ghi lên hàng
  Manager hoặc Admin cần Admin. Chốt chặn Admin cuối cùng hiện có đã chạy khi vai đổi khỏi Admin, nên
  hạ xuống Manager cũng được phủ.
- **Discord**: `requireAdmin` thành kiểm tra command, nhận giá trị `GrantableCommand` của command và
  trả câu từ chối chung. Mỗi command admin truyền giá trị của chính nó.
- **Dialog thành viên**: ô chọn vai thêm "Quản lý". Chọn nó thì hiện hai checklist. Ô chọn vai và hai
  checklist chỉ render khi người xem là Admin.

## Testing Decisions

- Chỉ test hành vi bên ngoài: ai được làm gì, và thấy gì. Không test cách lưu hay đọc Grant.
- **Seam 1 - hàm quyết định chung** (cao nhất, nhiều case nhất): bảng vai × Grant ×
  Capability/command, gồm Admin luôn true, Member luôn false, Manager chưa có Grant, và Grant command
  độc lập với Grant Capability. Prior art: `apps/api/src/__tests__/permissions.spec.ts` (case "chỉ có
  hai vai" đổi có chủ đích thành ba).
- **Seam 2 - service và guard trên API**: luật của member service (Manager thêm Member, sửa Member, bị
  từ chối trên hàng Manager/Admin, trên trường vai hoặc Grant, và khi xóa; rời vai Manager thì xóa
  Grant; chốt chặn Admin cuối khi hạ xuống Manager). Test guard cho từng controller đòi đúng
  Capability, prior art `apps/api/src/__tests__/guards-of.ts`. Test command Discord cho được cấp, chưa
  được cấp, và chưa liên kết, prior art là các spec command hiện có.
- **Seam 3 - truy cập trên web**: `decideAccess` và bộ lọc nav cho Admin, Member và Manager có một
  phần Grant, prior art `apps/web/features/auth/core/__tests__/access.test.ts`. Một test component cho
  dialog thành viên chỉ hiện checklist khi chọn "Quản lý".

## Out of Scope

- Vai theo nhóm hoặc mẫu quyền. Grant luôn theo từng người.
- Grant cho Admin hoặc Member. Chỉ Manager có Grant.
- Nhật ký ai cấp gì.
- Ẩn command admin trên Discord client bằng `default_member_permissions`.
- Trang để Manager tự xem danh sách Grant của mình. Nav đã cho thấy.
- Grant mịn hơn bên trong một Capability (ví dụ "sửa trận nhưng không xóa").

## Further Notes

- `canManageGuild` có khoảng 29 chỗ gọi trong `apps/api` và `apps/web`. Đổi sang `can` chạm từng chỗ,
  nên tách thành một lát riêng chạy trước hành vi Manager.
- Kênh cảnh báo admin và luồng nhắc điểm danh không phải Grant. Chúng vẫn đi tới các kênh
  `/cau-hinh-kenh` cấu hình.
- **Rollout**: không có data migration đổi vai. Sau khi tính năng lên production, Admin tự đổi các
  Admin hiện tại sang Manager qua dialog thành viên, để trống Grant (tức quyền như Member), rồi cấp
  Grant sau. Tên và Discord ID thật không vào repo: chúng là dữ liệu thật của bang, giống
  `seed-data.json`.
