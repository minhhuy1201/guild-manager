# Đăng nhập Discord OAuth2 và điểm danh theo tài khoản — Design

Ngày: 2026-08-24 · Phạm vi: `apps/api` (module `auth` viết lại, `characters`, `attendance`,
`battle-sessions`, `team-builder`), `apps/web` (feature `auth`, `attendance`, `members`, `proxy.ts`),
`packages/shared`, `prisma/schema.prisma`, biến môi trường hai môi trường.

**Chưa triển khai.** Đây là thiết kế đã được duyệt, chưa có dòng code nào.

## Bối cảnh

Hệ thống hiện tại không có khái niệm "người dùng":

- **Xác thực** chỉ phục vụ quản trị viên. `AuthService` so tên đăng nhập với `ADMIN_USERNAMES` và
  mật khẩu với `ADMIN_PASSWORD` — cả hai đọc từ biến môi trường, không có bảng người dùng nào trong
  database. JWT mang `{ sub: <username>, role: 'admin', type }`.
- **Điểm danh hoàn toàn công khai.** `POST /attendance` chạy sau `OptionalJwtAuthGuard`: bất kỳ ai
  mở web đều bấm Có/Không được cho **bất kỳ** `Character` nào. Token hợp lệ chỉ có tác dụng bỏ qua
  deadline và sửa được tuần khác.
- **`Character` không có chủ.** Bảng chỉ có tên và phái; không có gì nối một nhân vật với một con
  người thật.

Hệ quả: không ai chịu trách nhiệm cho một lượt điểm danh, và không có cách nào biết ai vừa đổi câu
trả lời của người khác.

Spec này gắn danh tính Discord vào từng nhân vật, khoá quyền ghi theo danh tính đó, và đóng cửa hệ
thống với người ngoài bang.

Discord Bot **không nằm trong phạm vi spec này** — thiết kế chỉ có nghĩa vụ không chặn đường Bot, xem
mục [Chừa đường cho Bot](#chừa-đường-cho-bot-chưa-triển-khai).

## Quyết định

### 1. `discordId` là một cột trên `Character`, không có bảng người dùng riêng

Quyết định nền, mọi thứ khác đi theo nó: **admin nhập tay Discord ID của từng thành viên vào chính
hàng `Character`**. Không có thực thể "tài khoản" tồn tại độc lập chờ được gán.

Đăng nhập vì thế là một phép tra cứu: Discord trả về `discordId`, API tìm `Character` có `discordId`
đó.

- **Tìm thấy** → người này là thành viên đó, phát phiên.
- **Không tìm thấy** → **cấm hoàn toàn**, không tạo phiên gì cả, không vào được trang nào.

Phương án đã cân nhắc và loại: bảng `User` riêng, người dùng tự đăng nhập trước rồi admin gán sau.
Nó cho phép hệ thống biết "ai đã gõ cửa mà chưa được nhận", nhưng đổi lại là một bảng, một module,
hai endpoint và một trạng thái trung gian ("đã đăng nhập, chưa có nhân vật") mà mọi màn hình đều phải
xử lý. Khi luật là *người lạ bị cấm tuyệt đối*, trạng thái trung gian đó không có lý do tồn tại.

Đánh đổi phải chấp nhận: người ngoài không tự "xin vào" được, admin phải chủ động lấy ID và nhập.
Với quy mô một bang hội, đó là việc vài chục dòng, làm một lần.

**Vận hành**: thành viên bật Developer Mode trong Discord, chuột phải avatar → *Copy User ID* (chuỗi
17–19 chữ số), gửi cho admin; admin dán vào cột Discord ID ở màn Thành viên. Nhập sai một chữ số thì
người đó bị chặn đăng nhập — hậu quả tệ nhất chỉ có vậy, vì `@unique` không cho hai thành viên trùng
ID.

### 2. Ba vai, cả ba nằm trên `Character.role`

| | MEMBER (Bang chúng) | LEADER (Cán bộ) | ADMIN (Quản trị) |
|---|:---:|:---:|:---:|
| Xem bảng điểm danh cả bang + filter bar | ✗ (chỉ hàng của mình) | ✓ | ✓ |
| Xem `/lich-su-diem-danh` của cả bang | ✗ (chỉ của mình) | ✓ | ✓ |
| Tự điểm danh cho nhân vật của mình, trong hạn | ✓ | ✓ | ✓ |
| Điểm danh hộ người khác, vượt deadline | ✗ | ✗ | ✓ |
| Quản lý thành viên, lịch đánh, xếp team, gán quyền | ✗ | ✗ | ✓ |

LEADER tồn tại để nhắc nhở: họ cần **nhìn thấy ai chưa điểm danh**, chứ không cần sửa hộ. Vì vậy vai
này chỉ nới quyền đọc, không nới quyền ghi.

Toàn bộ ma trận rút về đúng hai vị ngữ, đặt ở `packages/shared/lib/permissions.ts` để web và API
không mỗi bên suy diễn một kiểu:

- **`canViewAllAttendance(role)`** → `role !== MEMBER`. Quyết định `GET /attendance/characters`,
  `/records` và lịch sử trả cả bang hay chỉ một người, và web có hiện filter bar hay không.
- **`canManageGuild(role)`** → `role === ADMIN`. Chốt của `AdminGuard`, của `proxy.ts` và của mọi
  endpoint quản trị.

Rải `role === 'ADMIN'` khắp nơi thì thêm vai thứ tư là phải đi sửa từng chỗ; hai hàm này giữ nó ở
một chỗ.

### 3. API cầm toàn bộ OAuth flow, giao token cho web qua mã đổi dùng một lần

`apps/api` và `apps/web` là hai deployment Vercel ở hai domain khác nhau, nên API **không set được
cookie** cho domain của web. Có ba cách nối, và cách chọn quyết định phần lớn spec:

| Phương án | Chọn | Vì |
|---|---|---|
| Web cầm OAuth, API xác minh lại Discord access token | ❌ | `DISCORD_CLIENT_SECRET` phải có mặt ở cả hai app, luồng auth chẻ làm hai nơi, web bắt đầu chứa logic nghiệp vụ — ngược `architecture.md` mục 1 |
| Auth.js/NextAuth trên web | ❌ | Dựng hệ session thứ hai song song với JWT mà API đang ký: hai nguồn sự thật cho cùng một danh tính |
| **API cầm OAuth, redirect về web kèm mã đổi dùng một lần** | ✅ | Giữ nguyên bất biến "API là nơi duy nhất chạm DB và ký JWT, web chỉ giữ cookie"; secret Discord chỉ nằm ở API; token không bao giờ nằm trên URL |

Giá phải trả: một bảng nhỏ có TTL (`AuthExchange`) và một endpoint đổi mã.

#### Đường đi của một lần đăng nhập

1. **`GET /api/auth/discord?redirect=<path>`**
   Sinh `state` là **một JWT hạn 5 phút** ký bằng `AUTH_SECRET`, payload
   `{ nonce, redirect, type: 'oauth_state' }`. Không dùng cookie hay bảng để giữ `state`: API chạy
   serverless, còn cookie thì không đi được qua redirect cross-site. Sau đó 302 sang:

   ```
   https://discord.com/oauth2/authorize
     ?client_id=<DISCORD_CLIENT_ID>
     &response_type=code
     &scope=identify
     &redirect_uri=<DISCORD_REDIRECT_URI>
     &state=<state JWT>
   ```

   `redirect` phải được validate là **đường dẫn tương đối bắt đầu bằng `/`** trước khi ký vào state —
   một URL tuyệt đối ở đây là lỗ hổng open redirect.

   Scope chỉ `identify`. Không xin `email`, không xin `guilds`: tư cách thành viên được quyết định
   bởi bảng `Character`, không bởi Discord.

2. **`GET /api/auth/discord/callback?code&state`**
   Verify `state` (chữ ký, hạn, `type`). Đổi `code` tại `POST https://discord.com/api/oauth2/token`,
   đọc hồ sơ tại `GET https://discord.com/api/users/@me`, rồi **tra `Character` theo `discordId`**:

   - Tìm thấy → cập nhật `discordUsername`, `lastLoginAt`; `role` lấy từ `Character.role`.
   - Không tìm thấy, nhưng `discordId` nằm trong `DISCORD_ADMIN_IDS` → cho vào với `role = ADMIN`,
     không gắn nhân vật nào (xem mục 4).
   - Không tìm thấy và không trong danh sách → 302 về `/dang-nhap?error=khong-thuoc-bang`. Không ghi
     gì vào database, không phát mã.

   Vào được thì tạo một hàng `AuthExchange` (id là 32 byte ngẫu nhiên base64url, `expiresAt = now +
   60s`) và 302 về `${WEB_ORIGIN}/dang-nhap/discord?exchange=<mã>&redirect=<path>`.

   **Access token của Discord không được lưu lại.** Nó chỉ dùng đúng một lần để đọc hồ sơ; Bot sau
   này dùng bot token riêng nên không có lý do giữ token người dùng — giữ lại chỉ là thêm một thứ
   phải bảo vệ.

3. **`POST /api/auth/discord/exchange`** body `{ code }`
   Tiêu mã bằng một update nguyên tử (`updateMany where { id, usedAt: null, expiresAt: { gt: now } }`
   → chỉ đi tiếp khi `count === 1`), tra lại `Character` theo `discordId` của mã, ký cặp JWT và trả
   đúng shape token hiện có. Hai request đồng thời cùng một mã thì chỉ một request thắng.

   Mã hết hạn được dọn ngay trong lần exchange kế tiếp (`deleteMany where expiresAt < now`) — không
   dựng cron cho một bảng vài hàng.

#### Lỗi

Mọi lỗi trong callback kết thúc bằng 302 về `${WEB_ORIGIN}/dang-nhap?error=<mã>`; web tra mã ra câu
tiếng Việt. Không dùng shape `{ statusCode, message }` như các endpoint khác, vì trình duyệt đang ở
giữa một chuỗi redirect chứ không phải trong một lời gọi fetch.

| Mã | Khi nào | Câu hiển thị |
|---|---|---|
| `tu-choi` | Discord trả `error=access_denied` | "Bạn đã huỷ đăng nhập bằng Discord." |
| `khong-thuoc-bang` | `discordId` không khớp `Character` nào | "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên." |
| `phien-het-han` | `state` sai chữ ký, hết hạn, hoặc sai `type` | "Phiên đăng nhập đã hết hạn, vui lòng thử lại." |
| `discord-loi` | Đổi code hoặc gọi `/users/@me` thất bại | "Không kết nối được Discord, vui lòng thử lại sau." |

`POST /auth/discord/exchange` trả lỗi bình thường: mã sai, đã dùng hoặc hết hạn đều là **401** với
một câu duy nhất "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." — phân biệt ba ca là thông tin
thừa cho người dùng và là thông tin có ích cho kẻ dò.

### 4. Một đường đăng nhập duy nhất, cộng một chìa cứu hộ

- **`POST /auth/login`, `ADMIN_USERNAMES`, `ADMIN_PASSWORD` bị xoá hẳn**, cùng với `LoginDto`,
  `loginSchema` và login dialog ở web. Giữ đường username/password làm dự phòng nghe hợp lý, nhưng
  nó nhân đôi mọi nhánh xác thực để đổi lấy một tình huống (Discord sập) mà hệ quả chỉ là hoãn việc
  quản trị vài giờ.

- **`DISCORD_ADMIN_IDS` là chìa cứu hộ, không phải nơi quản lý quyền.** Nó tồn tại vì luật ở mục 1 tự
  khoá chính nó: database mới thì chưa `Character` nào có `discordId`, nên không ai đăng nhập được để
  vào gán ID cho ai. Ai có ID trong danh sách này **luôn vào được với `role = ADMIN`**, kể cả khi
  không khớp nhân vật nào — khi đó họ quản trị được nhưng không điểm danh được, vì không có nhân vật.
  Cơ chế này cũng cứu trường hợp admin lỡ tay xoá `discordId` của chính mình.

  Nó nằm trong env của project API, sửa xong phải redeploy — hợp làm chìa dự phòng, không hợp làm nơi
  quản lý quyền hằng ngày. Sau khi hệ thống chạy, Discord ID của admin nằm ở đúng chỗ như mọi người:
  cột `Character.discordId` của nhân vật họ, với `role = ADMIN`.

  Nếu `discordId` vừa khớp `Character` vừa nằm trong `DISCORD_ADMIN_IDS`, **`role` bị ép về `ADMIN`**
  ở mỗi lần đăng nhập, đè lên giá trị trong database.

- **JWT payload**: `{ sub: <discordId>, role, type }`.
  **`characterId` cố ý không nằm trong token**: admin đổi hoặc gỡ `discordId` phải có hiệu lực ngay,
  nên nhân vật của người dùng luôn được tra database tại thời điểm ghi.

- **TTL giữ nguyên** access 1 ngày / refresh 7 ngày. Hệ quả phải biết: `role` nằm trong token nên
  **hạ quyền có độ trễ tối đa 1 ngày**. Liên kết nhân vật thì không trễ, vì tra DB mỗi lần ghi. Nếu
  độ trễ đó thành vấn đề thật, cách sửa là rút access TTL — `proxy.ts` đã tự gia hạn nên người dùng
  không thấy khác biệt — chứ không phải nhét truy vấn vào guard.

- **`POST /auth/refresh`** tra lại `Character` theo `sub`: `discordId` đã bị gỡ khỏi mọi nhân vật (và
  không nằm trong `DISCORD_ADMIN_IDS`) thì phiên chấm dứt. Đây là chỗ việc đuổi một người khỏi hệ
  thống thực sự có hiệu lực, chậm nhất sau một ngày.

- **`GET /auth/me`** trả `{ discordId, discordUsername, role, character: { id, name, guildClass } |
  null }`. `character` là null đúng một trường hợp: admin cứu hộ chưa có nhân vật.

### 5. Quyền truy cập

`JwtAuthGuard` giữ nguyên vai trò "phải đăng nhập". Thêm **`AdminGuard`** trong `common/guards/`, đọc
`request.user.role` do `JwtAuthGuard` gắn vào và gọi `canManageGuild` — nên nó luôn đứng sau
`JwtAuthGuard`, không bao giờ đứng một mình.

`OptionalJwtAuthGuard` mất chỗ dùng cuối cùng khi `POST /attendance` yêu cầu đăng nhập → **xoá cả
file lẫn export**.

| Method | Path | Quyền | |
|---|---|---|---|
| `GET` | `/auth/discord` | Public | **mới** |
| `GET` | `/auth/discord/callback` | Public | **mới** |
| `POST` | `/auth/discord/exchange` | Public | **mới** |
| `POST` | `/auth/refresh` | Public | |
| `GET` | `/auth/me` | Bearer | đổi response |
| `POST` | `/auth/login` | — | **xoá** |
| `GET` | `/health` | Public | |
| `GET`/`POST`/`PATCH`/`DELETE` | `/characters…` | Admin | siết từ Bearer; `PATCH` nhận thêm `discordId`, `role` |
| `GET` | `/battle-sessions` | Bearer | **siết từ Public** |
| `GET` | `/battle-sessions/weeks`, `POST`/`PATCH`/`DELETE` | Admin | siết từ Bearer |
| `GET` | `/attendance/characters` | Bearer, lọc theo vai | **siết từ Public** |
| `GET` | `/attendance/records` | Bearer, lọc theo vai | **siết từ Public** |
| `GET` | `/attendance/summary` | Bearer | **mới** |
| `POST` | `/attendance` | Bearer bắt buộc | **siết từ Public** |
| `GET`/`PUT` | `/team-builder/…` | Admin | siết từ Bearer |

"Siết từ Bearer thành Admin" không phải mở rộng phạm vi tuỳ hứng: trước đây mọi token đều là token
admin, nên `JwtAuthGuard` **chính là** kiểm tra quyền admin. Từ khi token của bang chúng cũng hợp lệ,
mỗi endpoint quản trị còn dừng ở `JwtAuthGuard` là một lỗ hổng. Phải bịt trong cùng lần thay đổi này.

### 6. Schema database

```prisma
/// Vai trò trong bang. Giá trị phải khớp enum GuildRole ở packages/shared/enums.
enum GuildRole {
  ADMIN
  LEADER
  MEMBER
}

model Character {
  // …các trường hiện có giữ nguyên
  /// Discord ID (snowflake) do quản trị viên nhập tay. Null = thành viên chưa đăng nhập được.
  discordId       String?   @unique
  /// Tên Discord đọc lúc đăng nhập gần nhất — để quản trị viên xác nhận đã gán đúng người.
  discordUsername String?
  /// Null = chưa từng đăng nhập lần nào.
  lastLoginAt     DateTime?
  role            GuildRole @default(MEMBER)
}

/// Mã dùng một lần để web đổi lấy cặp JWT sau khi API xử lý xong OAuth callback.
model AuthExchange {
  /// 32 byte ngẫu nhiên base64url — chính là giá trị gửi cho web qua URL.
  id        String    @id
  /// Lưu discordId chứ không phải khoá ngoại: admin cứu hộ có thể không ứng với Character nào.
  discordId String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([expiresAt])
}

model AttendanceRecord {
  // …các trường hiện có giữ nguyên
  /// Ai bấm lượt điểm danh này. Null với dữ liệu ghi trước khi có đăng nhập.
  markedByCharacterId String?
}
```

Ba chi tiết có lý do:

- **`discordId` nullable nhưng `@unique`**: PostgreSQL cho nhiều `NULL` cùng tồn tại trong một unique
  index, nên "nhiều thành viên chưa gán ID" là hợp lệ, còn "hai thành viên cùng một ID" thì không.
- **`AuthExchange.discordId` không phải khoá ngoại** — nếu là FK thì admin cứu hộ (không có
  `Character`) không phát được mã.
- **`markedByCharacterId` không có quan hệ bắt buộc và không có cột `source`.** Biết ai bấm là có giá
  trị thật khi admin điểm danh hộ; còn `source` (WEB/BOT) thì chưa có gì để phân biệt, vì Bot dự kiến
  chỉ đọc.

Bảng `AuthExchange` phải được xử lý grant của Supabase Data API như `production.md` mục 5 quy định —
mặc định là chặn.

### 7. Luồng điểm danh

**Lọc ở service, không phải ẩn ở giao diện** — chỉ ẩn ở web thì mở DevTools là đọc được cả bảng.

| Endpoint | `canViewAllAttendance` (LEADER, ADMIN) | MEMBER |
|---|---|---|
| `GET /attendance/characters` | Cả bang | Mảng đúng một phần tử: nhân vật của mình |
| `GET /attendance/records` | Toàn bộ tuần đang mở | Chỉ record của nhân vật mình |
| Lịch sử điểm danh | Cả bang | Chỉ của mình |
| `GET /attendance/summary` | `[{ sessionId, coCount, khongCount }]` | Giống hệt |

`GET /attendance/summary` tồn tại để bù lại thứ mà việc giấu bảng làm mất: cảm giác "trận này đang
thiếu người". Nó trả **số đếm, không trả danh tính**, nên không rò rỉ ai đăng ký trận nào.

`AttendanceService.mark`, theo thứ tự guard clause:

1. Không có token hợp lệ → `JwtAuthGuard` chặn ngay ở controller (401).
2. Không phải ADMIN và `characterId` khác nhân vật của mình (kể cả trường hợp admin cứu hộ chưa có
   nhân vật) → **403** "Bạn chỉ điểm danh được cho nhân vật của mình."
3. Luật tuần đang mở và deadline giữ **nguyên như hiện tại**; ADMIN bỏ qua cả hai.
4. Ghi record kèm `markedByCharacterId`.

Chỉ ADMIN điểm danh hộ được — LEADER nhìn thấy để nhắc, không sửa thay. Deadline khoá cứng với
MEMBER và LEADER, không có cơ chế tự sửa muộn: cả ý nghĩa của deadline là nó không co giãn theo người
bấm.

### 8. Frontend

**Route mới**

- **`/dang-nhap`** — trang duy nhất khách chưa đăng nhập vào được. Một nút "Đăng nhập bằng Discord"
  trỏ tới `${NEXT_PUBLIC_API_URL}/auth/discord?redirect=…`, cộng chỗ hiển thị `?error=`.
- **`/dang-nhap/discord`** — Server Component đọc `?exchange=`, gọi `POST /auth/discord/exchange`,
  `createSession()`, rồi redirect tới `redirect` (hoặc trang điểm danh). Mã đổi nằm trên URL chỉ sống
  60 giây và chết sau lần dùng đầu tiên.

**`proxy.ts` đảo mặc định.** Hiện tại là "mọi trang công khai, trừ `ADMIN_PATH_PREFIXES`". Sau thay
đổi: **mọi trang yêu cầu phiên hợp lệ**, whitelist là `/dang-nhap` và `/dang-nhap/discord`; khách bị
đẩy về `/dang-nhap?redirect=<path đang vào>`. `ADMIN_PATH_PREFIXES` giữ nguyên nhưng điều kiện đổi từ
"có token" sang **`canManageGuild(role)`** — nếu không, token của bang chúng mở được `/xep-team`.
`getSession()` trong từng trang quản trị cũng phải kiểm `role`, không chỉ kiểm "có phiên".

**Màn điểm danh — hai giao diện tách hẳn, cùng một route.**

| | MEMBER | LEADER | ADMIN |
|---|---|---|---|
| Bảng | Đúng một hàng: nhân vật của mình × các trận trong tuần | Toàn bộ thành viên | Toàn bộ thành viên |
| Filter bar | Không hiện — một hàng thì lọc vô nghĩa | Hiện (`RosterFilterBar` dùng chung) | Hiện |
| Số người đã đăng ký mỗi trận | Từ `/attendance/summary` | Tự có từ dữ liệu đầy đủ | Tự có |
| Ô điểm danh | Của mình, khi còn hạn | Của mình, khi còn hạn | Mọi ô, kể cả quá hạn |

Tách thành hai component (`MemberAttendanceCard` cho MEMBER / `GuildAttendanceBoard` cho LEADER và
ADMIN) chứ **không** nhồi `if (isAdmin)` vào bảng hiện tại: hai bên khác nhau cả bố cục lẫn dữ liệu,
gộp lại sẽ ra một component vừa là thẻ vừa là bảng. Khác biệt giữa LEADER và ADMIN thì nhỏ và đúng
kiểu điều kiện — cùng một bảng, chỉ khác ô nào bấm được — nên hai vai này dùng chung component.

**Màn Thành viên (`MembersPanel`, tab của `/thiet-lap`) là nơi quản lý danh tính.** Vì quan hệ 1-1
nằm ngay trên `Character`, mỗi hàng thành viên đã là đúng một con người:

- Cột **Discord ID**: ô nhập (17–19 chữ số), kèm `discordUsername` và `lastLoginAt` đọc được sau lần
  đăng nhập đầu tiên — đó là cách admin xác nhận đã gán đúng người.
- Cột **Quyền**: dropdown `Bang chúng / Cán bộ / Quản trị`, chỉ bật khi hàng đó đã có Discord ID.
- Admin **không tự hạ quyền chính mình** (dropdown khoá ở hàng của mình), cùng lý do với
  `DISCORD_ADMIN_IDS`: không để một cú bấm nhầm khoá cửa từ bên trong.

Gán một Discord ID đã thuộc thành viên khác → **409** "Discord ID này đã được gán cho thành viên
khác."; ràng buộc `@unique` là chốt chặn cuối.

### 9. `packages/shared`

- `enums/role.enum.ts` — `ADMIN_ROLE` hiện tại thay bằng enum `GuildRole` (`ADMIN`, `LEADER`,
  `MEMBER`), giữ **cùng giá trị** với enum Prisma.
- `lib/permissions.ts` (mới) — `canViewAllAttendance`, `canManageGuild`.
- `schemas/auth.schema.ts` — bỏ `loginSchema`; thêm `discordExchangeSchema` (`{ code }`); mở rộng
  `authUserSchema` thành `sessionUserSchema` (`discordId`, `discordUsername`, `role`, `character`).
- `schemas/character.schema.ts` — thêm `discordId`, `discordUsername`, `lastLoginAt`, `role` vào
  response; `updateCharacterSchema` nhận thêm `discordId` (regex 17–19 chữ số, cho phép null để gỡ)
  và `role`.
- `schemas/attendance.schema.ts` — thêm `attendanceSummarySchema`.

## Chừa đường cho Bot (chưa triển khai)

Bot nhắc điểm danh không nằm trong spec này. Hai điều kiện đủ cho nó đã có sẵn nhờ các quyết định
trên: `Character.discordId` là khoá định danh bền vững nối thẳng người chơi với nhân vật, và quyền
không còn phụ thuộc biến môi trường nên Bot không cần biết gì về `ADMIN_USERNAMES`.

Khi làm Bot, phần thêm vào đúng bằng:

- một module `bot` xác thực **máy-máy** bằng `BOT_API_KEY` qua header riêng — không mượn JWT của
  người dùng, vì Bot không hành động thay ai;
- một endpoint đọc, kiểu `GET /attendance/pending?sessionId=`, trả `[{ discordId, characterName }]`
  cho những ai chưa trả lời trước deadline.

Nếu sau này Bot cần **ghi** thay người dùng, lúc đó mới thêm cột `source` (WEB/BOT) vào
`AttendanceRecord`. Thêm bây giờ là đoán.

## Rollout

Một migration Prisma duy nhất: enum `GuildRole`; cột `Character.discordId`, `discordUsername`,
`lastLoginAt`, `role`; bảng `AuthExchange`; cột `AttendanceRecord.markedByCharacterId`.

**Không có backfill.** Mọi `Character.discordId` bắt đầu bằng null và mọi `role` mặc định `MEMBER`;
không có cách đáng tin nào ghép tên nhân vật trong game với tài khoản Discord. Ngay sau khi deploy,
**không ai đăng nhập được ngoài `DISCORD_ADMIN_IDS`** — đó là trạng thái đúng, admin gán ID dần cho
từng người.

Biến môi trường `apps/api`:

| Biến | |
|---|---|
| `DISCORD_CLIENT_ID` | thêm |
| `DISCORD_CLIENT_SECRET` | thêm |
| `DISCORD_REDIRECT_URI` | thêm — phải khớp từng ký tự với giá trị khai trong Discord Developer Portal |
| `DISCORD_ADMIN_IDS` | thêm — danh sách Discord ID cứu hộ, phân tách bằng dấu phẩy |
| `ADMIN_USERNAMES` | **bỏ** |
| `ADMIN_PASSWORD` | **bỏ** |

Kèm theo: `config/env.validation.ts`, `.env.example`, bảng ở `development.md` mục 3 và
`production.md` mục 3. `apps/web` không thêm biến nào — link đăng nhập dựng từ `NEXT_PUBLIC_API_URL`
đã có.

Thứ tự triển khai: chạy migration → set env trên project API → deploy API → deploy web. Giữa hai lần
deploy, web bản cũ gọi `POST /auth/login` đã biến mất, nên API giữ tạm route đó trả **410** với câu
"Cách đăng nhập đã thay đổi, vui lòng tải lại trang." và xoá ở lần dọn sau.

**Mọi phiên đang mở sẽ mất hiệu lực** — `sub` đổi từ username sang `discordId`. Chấp nhận: tất cả
đăng nhập lại bằng Discord, đó chính là mục đích.

## Test

`apps/api` (Jest):

- `state` sai chữ ký, hết hạn, sai `type` → redirect kèm `error=phien-het-han`.
- `redirect` là URL tuyệt đối → bị từ chối (chống open redirect).
- `discordId` không khớp `Character` nào và không trong `DISCORD_ADMIN_IDS` → redirect
  `error=khong-thuoc-bang`, **không** ghi gì vào database.
- `discordId` trong `DISCORD_ADMIN_IDS` → vào được với `role = ADMIN` kể cả khi không có `Character`;
  và ép `role` về `ADMIN` kể cả khi `Character.role` đang là `MEMBER`.
- Mã exchange dùng lần thứ hai → 401; mã quá 60 giây → 401.
- Đăng nhập cập nhật `discordUsername` và `lastLoginAt` của đúng `Character`.
- `mark`: MEMBER và LEADER điểm danh hộ người khác → 403; tự điểm danh trong hạn → OK; quá hạn → 409;
  ADMIN vượt deadline → OK; `markedByCharacterId` được ghi đúng.
- `GET /attendance/records` với MEMBER chỉ trả record của nhân vật mình; với LEADER trả cả bang.
- `PATCH /characters/:id` gán `discordId` đã thuộc thành viên khác → 409.
- `refresh` với `discordId` đã bị gỡ khỏi mọi nhân vật → 401.

`apps/web` (Vitest):

- `proxy` với khách → redirect `/dang-nhap?redirect=…`.
- `proxy` với MEMBER và với LEADER vào `/xep-team` → redirect về trang điểm danh.
- `proxy` với ADMIN vào `/xep-team` → đi tiếp.

## Để ngỏ

- **Rời bang / xoá thành viên.** Xoá `Character` là đủ để cắt quyền truy cập; chưa cần luồng riêng.
- **Đồng bộ tên Discord** chỉ xảy ra lúc đăng nhập. Nếu cần tươi hơn thì đó là việc của Bot.
- **Độ trễ tối đa 1 ngày khi hạ quyền** — đã nêu ở mục 4, chấp nhận có ý thức.
- **Người ngoài không tự xin vào được.** Cố ý; nếu số lượng thành viên mới tăng đến mức việc nhập tay
  thành gánh nặng, lúc đó mới tính tới hàng chờ.
