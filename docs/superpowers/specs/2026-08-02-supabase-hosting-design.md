# Host database trên Supabase — Design

Ngày: 2026-08-02 · Phạm vi: `apps/api` (cấu hình kết nối), biến môi trường, quy trình migrate.
**Đã triển khai 2026-08-03.** Project chạy ở region `ap-northeast-1`.

> **Ba quyết định dưới đây đã bị thực tế phản chứng lúc triển khai.** Phần lập luận gốc giữ nguyên
> để thấy chỗ suy luận hụt, kèm đính chính ngay tại chỗ:
> - **Quyết định 1** — bỏ RLS là **sai**: Data API là một đường vào thứ hai mà spec không tính tới.
> - **Quyết định 2** — runtime **không** cần transaction pooler; session pooler mới đúng.
> - **Quyết định 3** — **tách được** bằng cấu hình, chỉ là không qua `directUrl`.

## Bối cảnh

Database hiện chạy Postgres local. Chủ dự án dự định host trên **Supabase gói free** vì không có
ngân sách cho hạ tầng trả phí.

Việc này **không** ảnh hưởng tới thiết kế bảng hay code nghiệp vụ: `apps/api` nói chuyện với
Postgres qua Prisma bằng connection string tiêu chuẩn, nên đổi nơi host chỉ là đổi biến môi trường.
Những gì spec này ghi lại đều là bẫy vận hành, không phải quyết định kiến trúc.

Tách khỏi [2026-08-02-per-session-formation-design.md](./2026-08-02-per-session-formation-design.md)
vì hai việc độc lập nhau: đội hình theo trận làm được ngay trên Postgres local, còn việc chuyển host
xảy ra lúc nào cũng được.

## Quyết định

### 1. Kết nối qua Postgres, không dùng Supabase client

Không cài `@supabase/supabase-js`, không dùng PostgREST, không bật Row Level Security.

Supabase ở đây chỉ đóng vai **một Postgres được host sẵn**. Toàn bộ quyền truy cập đã do NestJS
quyết định (`JwtAuthGuard`, kiểm tra mật khẩu nhân vật trong `AttendanceService`); thêm một tầng
phân quyền nữa ở database sẽ tạo ra hai nguồn sự thật cho cùng một câu hỏi.

Hệ quả trực tiếp: connection string là bí mật của server, không bao giờ lộ ra client. Không có
`NEXT_PUBLIC_SUPABASE_*` nào cả.

> **Đính chính (2026-08-03).** Phần "không bật Row Level Security" **sai**, và sai ở chỗ tiền đề:
> lập luận "quyền truy cập đã do NestJS quyết định" chỉ đúng nếu NestJS là đường duy nhất vào
> database. Không phải. Supabase expose schema `public` qua Data API (PostgREST) và cấp sẵn
> `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` cho `anon` và `authenticated` trên mọi bảng — kiểm chứng
> bằng `information_schema.role_table_grants` sau khi migrate. Anon key theo thiết kế của Supabase
> là thứ công khai, nên đó là toàn quyền đọc/ghi/xoá dữ liệu bang hội, vòng qua `JwtAuthGuard`.
>
> Tệ hơn, default privileges của schema `public` cấp lại quyền đó cho **mọi bảng tạo về sau**, nên
> `REVOKE` một lần không giữ được: migration Prisma tiếp theo sẽ mở lại lỗ hổng.
>
> Đã xử lý bằng migration `20260802185500_chan_data_api_truy_cap_bang`: bật RLS trên 4 bảng (không
> tạo policy nào — bật RLS mà không có policy là từ chối tất cả), `REVOKE` quyền hiện có, và
> `ALTER DEFAULT PRIVILEGES` để bảng mới không được cấp nữa. Runtime không ảnh hưởng vì role
> `postgres` có `rolbypassrls = true`.
>
> Lưu ý còn lại: default ACL do `supabase_admin` đặt vẫn cấp quyền cho `anon`/`authenticated`, và
> role `postgres` không sửa được nó. Bảng do Prisma tạo thuộc sở hữu `postgres` nên không dính,
> nhưng bảng tạo bằng đường khác thì có — RLS là lớp chặn còn lại. Tắt hẳn Data API trong dashboard
> là cách dứt điểm.
>
> Phần còn lại của quyết định 1 (không dùng `@supabase/supabase-js`, không PostgREST, không
> `NEXT_PUBLIC_SUPABASE_*`) vẫn đúng.

### 2. Hai cổng cho hai mục đích

Supabase cấp hai đường vào cùng một database:

| | Cổng | Dùng cho |
|---|---|---|
| Direct | `5432` | `prisma migrate`, `prisma db seed`, Prisma Studio |
| Pooler (Supavisor) | `6543` | Runtime của `apps/api` |

Pooler chạy **transaction mode**: một kết nối Postgres được phát lại cho nhiều request khác nhau,
nên mọi thứ cần nhớ trạng thái giữa các câu lệnh đều hỏng — prepared statement, advisory lock,
`SET` kéo dài.

`prisma migrate` cần đúng những thứ đó: nó lấy advisory lock để hai lần migrate không chạy chồng
nhau, và chạy DDL trong transaction. Trỏ vào cổng `6543` thì lệnh treo hoặc lỗi khó hiểu.

Chiều ngược lại, runtime **cần** pooler: gói free chỉ cho một số lượng kết nối trực tiếp hạn chế,
app mở thẳng sẽ hết sạch.

> **Đính chính (2026-08-03).** Có **ba** kiểu kết nối chứ không phải hai, và chọn nhầm ngay từ đầu.
>
> | | Dùng | Vì |
> |---|---|---|
> | Direct `db.<ref>…:5432` | ❌ | Chỉ IPv6 nếu không mua add-on IPv4 |
> | Transaction pooler `:6543` | ❌ | Dành cho client sống ngắn |
> | **Session pooler `:5432`** | ✅ | Giữ được prepared statement và advisory lock, đi qua IPv4 |
>
> Lập luận "runtime cần transaction pooler" giải một bài toán dự án không có. Transaction pooling
> sinh ra cho **nhiều client sống ngắn** — serverless, mỗi request một process. `apps/api` là một
> process NestJS chạy dài hạn, giữ sẵn một pg pool (mặc định 10 kết nối) và tái dùng suốt vòng đời.
> `apps/web` không chạm database. Mười kết nối ổn định thì direct hay session pooler đều thừa sức.
>
> Đổi lại, transaction pooler bắt trả giá thật — mất prepared statement, advisory lock, `SET` kéo
> dài — để đổi lấy lợi ích không cần tới.
>
> Session pooler dùng chung cho cả runtime lẫn migrate. Quay lại transaction pooler **chỉ khi**
> `apps/api` chuyển sang serverless.

### 3. Tách hai cổng bằng dòng lệnh, không bằng cấu hình

**Prisma 7 không có `directUrl`.** Kiểu `Datasource` của `@prisma/config@7.9.0` chỉ nhận:

```ts
export declare type Datasource = {
    url?: string;
    shadowDatabaseUrl?: string;
};
```

Cộng thêm hai điều: `datasource db` trong `schema.prisma` đã bỏ trống `url` (Prisma 7 chuyển sang
`prisma.config.ts`), và `PrismaService` lúc chạy cũng đọc đúng biến `DATABASE_URL` ấy. Migrate và
runtime **dùng chung một biến**, không tách được bằng cấu hình.

Vậy nên `.env` giữ cổng pooler cho runtime:

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
```

Và mọi lệnh Prisma CLI ghi đè ngay trên dòng lệnh:

```bash
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
  pnpm --filter api exec prisma migrate deploy
```

**Đừng "sửa" bằng cách thêm `directUrl` vào `prisma.config.ts`** — Prisma sẽ lờ nó đi, và người
sửa sẽ mất thời gian tìm xem tại sao không có tác dụng.

> **Đính chính (2026-08-03).** Kết luận "không tách được bằng cấu hình" **sai**, và cách ghi đè
> trên dòng lệnh ở trên **không chạy**.
>
> Không chạy vì: shell expand `$DIRECT_DATABASE_URL` trước khi `dotenv` kịp nạp `.env`, nên biến
> thành rỗng; và `dotenv` **không ghi đè** biến đã tồn tại trong `process.env` — kể cả khi rỗng.
> Kết quả là `prisma migrate deploy` chạy với connection string rỗng. Cùng lý do đó, script
> `"migrate:prod": "DATABASE_URL=$DIRECT_DATABASE_URL prisma migrate deploy"` ở cuối phần này cũng
> hỏng, đừng chép lại.
>
> Tách được vì: `prisma.config.ts` **chỉ Prisma CLI đọc**, runtime không đụng tới (`PrismaService`
> lấy `DATABASE_URL` qua `ConfigService`). Không cần `directUrl` — chỉ cần trỏ `datasource.url`
> sang biến khác:
>
> ```ts
> url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
> ```
>
> `prisma/seed.ts` theo cùng thứ tự ưu tiên. `pnpm migrate:prod` rút gọn còn `prisma migrate deploy`.
> Dùng `process.env` thay vì `env()` cho biến direct vì `env()` ném lỗi khi biến trống, mà trống là
> trường hợp hợp lệ (dev local).

Nếu thấy cách này dễ quên, đặt một script trong `apps/api/package.json`
(`"migrate:prod": "DATABASE_URL=$DIRECT_DATABASE_URL prisma migrate deploy"`) và thêm biến
`DIRECT_DATABASE_URL` vào `.env`. Biến đó **chỉ** cho CLI đọc; `PrismaService` không được động tới
nó, nếu không runtime sẽ lặng lẽ bỏ qua pooler.

### 4. Dự án free bị tạm dừng khi không hoạt động

Supabase tạm dừng project gói free sau khoảng **7 ngày** không có truy vấn. Lần vào sau sẽ lỗi kết
nối cho tới khi khôi phục thủ công trong dashboard.

Công cụ bang hội dùng theo tuần nên thường sẽ chạm database đều. Nhưng bang nghỉ một tuần là dính.
Không có cách nào tránh trên gói free ngoài việc ping định kỳ — và một cron ping chỉ để giữ project
sống là thứ nên cân nhắc kỹ chứ không làm mặc định, vì nó biến một vấn đề hiển nhiên (project ngủ)
thành một vấn đề ẩn (hoá đơn hoặc job chạy mãi không ai nhớ).

Khuyến nghị: **chấp nhận**, và ghi chú trong README rằng lần đầu vào sau kỳ nghỉ dài có thể phải
khôi phục project.

### 5. Dung lượng không phải mối lo

Gói free cho 500 MB database. Ước lượng dữ liệu thật của bang:

| Bảng | Số hàng (giữ 4 tuần) | Dung lượng |
|---|---|---|
| `Character` | ~60 | vài KB |
| `BattleSession` | 3/tuần → ~12 | vài KB |
| `AttendanceRecord` | 60 × 12 = ~720 | ~70 KB |
| `Formation` | 3/tuần → ~12 | ~30 KB |

Tổng dưới **150 KB**, tức khoảng 0,03% hạn mức. Dung lượng không được dùng làm lý do cho bất kỳ
quyết định thiết kế nào.

### 6. Không dùng cron của Supabase

Việc dọn đội hình quá 28 ngày đã xử lý trong `GET /team-builder/weeks` (xem spec đội hình theo
trận). Không bật `pg_cron`, không tạo Edge Function cho việc đó — thêm một nơi có thể hỏng mà không
ai nhìn.

## Việc cần làm khi triển khai

1. ~~Tạo project Supabase, lấy connection string.~~ Xong — region `ap-northeast-1`.
2. ~~Đặt `DATABASE_URL` (session pooler) vào `.env`.~~ Xong.
3. ~~Chạy `pnpm migrate:prod`.~~ Xong — 3 migration gốc + migration chặn Data API.
4. ~~Chạy seed.~~ Xong — 25 nhân vật.
5. ~~Xác nhận app kết nối được: `GET /api/health`.~~ Xong — trả `db: "up"`.
6. ~~Ghi chú vào README.~~ Xong — mục "Database production" trong `apps/api/README.md`.
7. **Còn lại:** tắt Data API trong dashboard (Settings → API). RLS đã chặn rồi nên đây là lớp thứ
   hai, nhưng tắt hẳn thứ mình không dùng vẫn hơn.

Ít việc tới mức không cần file plan riêng — đây là danh sách thao tác, không phải chuỗi thay đổi
code cần review từng bước.

**Nhìn lại:** đánh giá đó đúng về khối lượng nhưng bỏ sót rủi ro. Ba quyết định sai ở trên đều là
*quyết định thiết kế*, không phải thao tác — và không cái nào lộ ra cho tới lúc chạm database thật.
Cái đắt nhất (Data API mở toang) chỉ phát hiện được bằng cách query `information_schema` sau khi
migrate. Bài học không phải "lẽ ra nên viết plan", mà là: spec dựa trên hiểu biết chung về một dịch
vụ chưa từng dùng thì phần "chưa đối chiếu tài liệu" cần được coi là việc bắt buộc, không phải ghi
chú cuối trang.

## Cần kiểm chứng lại lúc triển khai

Số cổng, ngưỡng tạm dừng và hạn mức dung lượng ở trên lấy từ hiểu biết chung về Supabase, **chưa
đối chiếu tài liệu tại thời điểm viết**. Chúng thay đổi theo thời gian. Đọc lại dashboard và tài
liệu hiện hành trước khi làm theo; phần lập luận (tại sao migrate cần direct connection, tại sao
runtime cần pooler) thì không phụ thuộc con số cụ thể.

## Ngoài phạm vi

- **Chuyển dữ liệu từ Postgres local sang.** Dữ liệu hiện tại là dữ liệu thử; khi chuyển thật thì
  chạy seed lại, không cần dump/restore.
- **Backup và khôi phục.** Gói free có giới hạn riêng, xử lý khi nào dữ liệu thật sự đáng giá.
- **Môi trường staging.** Một project là đủ cho dự án cá nhân.
- **Row Level Security, Supabase Auth, Storage, Realtime.** Không dùng — xem quyết định 1.
