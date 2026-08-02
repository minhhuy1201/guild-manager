# Production

Cách build, đưa lên môi trường thật và vận hành Guild Manager.

> **Trạng thái hiện tại (2026-08-03):** database đã chạy thật trên Supabase (region
> `ap-northeast-1`, gói free). `apps/api` và `apps/web` **chưa chọn nơi host** — chưa có
> `Dockerfile`, `vercel.json` hay pipeline CI nào trong repo. Phần "Deploy ứng dụng" dưới đây mô tả
> yêu cầu và các lựa chọn, không phải quy trình đã chạy.

## 1. Kiến trúc triển khai

```
người dùng ──► apps/web (Next.js)  ──HTTP──►  apps/api (NestJS)  ──►  Postgres (Supabase)
                     │                              │
              AUTH_SECRET (verify JWT)     AUTH_SECRET (ký JWT)
```

Ba điều quyết định mọi thứ còn lại:

- **Web không chạm database.** Chỉ gọi API qua `NEXT_PUBLIC_API_URL`. Không có
  `NEXT_PUBLIC_SUPABASE_*`, connection string là bí mật của server.
- **Hai app dùng chung một `AUTH_SECRET`.** API ký JWT, web verify. Lệch giá trị là đăng nhập
  được nhưng route quản trị đá về trang chủ.
- **API là process chạy dài hạn**, giữ sẵn một pg pool (mặc định 10 kết nối). Đây là lý do chọn
  session pooler chứ không phải transaction pooler — xem mục 5.

## 2. Build

```bash
pnpm install --frozen-lockfile

pnpm --filter api build     # webpack → apps/api/dist/main.js
pnpm --filter web build     # → apps/web/.next
```

Chạy bản build:

```bash
pnpm --filter api start:prod   # node dist/main
pnpm --filter web start        # next start
```

Lưu ý khi build ở môi trường CI/hosting:

- `postinstall` của `apps/api` chạy `prisma generate`, cần `DATABASE_URL` **tồn tại và đúng định
  dạng URL** (không cần kết nối được).
- Đây là pnpm workspace: hosting phải cài từ thư mục gốc, không cài riêng trong `apps/*`.
  `packages/shared` được import bằng source TypeScript, không có bước build riêng.
- `apps/web` build cần `NEXT_PUBLIC_API_URL` vì biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build,
  không đọc lại lúc chạy.

## 3. Biến môi trường production

### `apps/api`

| Biến | Giá trị production |
|---|---|
| `NODE_ENV` | `production` — tắt Swagger |
| `PORT` | Theo yêu cầu của nhà cung cấp (thường là biến `PORT` họ tự cấp) |
| `DATABASE_URL` | Session pooler Supabase, cổng `5432` |
| `DIRECT_DATABASE_URL` | Cùng giá trị, **thêm `?connect_timeout=30`** — chỉ Prisma CLI đọc |
| `AUTH_SECRET` | `openssl rand -hex 32`, khác hẳn khóa dev, trùng với web |
| `ADMIN_USERNAMES` | Danh sách tài khoản quản trị thật |
| `ADMIN_PASSWORD` | Mật khẩu thật, **không** để `testne` |
| `WEB_ORIGIN` | Origin thật của web (`https://…`) — CORS chặn theo đúng giá trị này |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |

Biến `POSTGRES_*` chỉ dành cho `docker-compose.yml` ở dev, production không cần.

### `apps/web`

| Biến | Giá trị production |
|---|---|
| `AUTH_SECRET` | Trùng đúng giá trị của API |
| `NEXT_PUBLIC_API_URL` | `https://<domain-api>/api` |

### Danh sách bí mật cần đổi trước khi mở cho người ngoài

- [ ] `AUTH_SECRET` mới (cả hai app)
- [ ] `ADMIN_PASSWORD` mới
- [ ] Mật khẩu database Supabase không trùng bất kỳ chỗ nào khác
- [ ] Mật khẩu nhân vật: seed đang dùng `pass<id>` — dữ liệu thật phải đặt lại

## 4. Deploy ứng dụng

Chưa chốt nhà cung cấp. Ràng buộc để chọn:

| | Yêu cầu |
|---|---|
| `apps/web` | Next.js 16 App Router, có `proxy.ts` (middleware) và server action. Vercel là đường ít ma sát nhất; nơi khác cần Node runtime, không dùng static export được. |
| `apps/api` | **Process Node chạy dài hạn.** Đưa lên serverless sẽ đảo ngược quyết định pooler ở mục 5 và làm hỏng pg pool. Phù hợp: VPS, Render, Railway, Fly.io — thứ chạy `node dist/main` liên tục. |

Việc phải làm khi dựng lần đầu, bất kể chọn nơi nào:

1. Đặt đủ biến môi trường ở mục 3.
2. Cài từ thư mục gốc repo (`pnpm install --frozen-lockfile`), build đúng app cần deploy.
3. Chạy migration lên database thật (mục 5) **trước** khi khởi động bản build mới.
4. Trỏ `WEB_ORIGIN` và `NEXT_PUBLIC_API_URL` vào domain thật của nhau.
5. Xác nhận `GET /api/health` trả `db: "up"`.

Chưa có CI: build và deploy hiện là thao tác tay.

## 5. Database production (Supabase)

Supabase ở đây chỉ là **một Postgres được host sẵn**: không cài `@supabase/supabase-js`, không
PostgREST, không Supabase Auth/Storage/Realtime. Lập luận đầy đủ và cả những chỗ suy luận sai lúc
thiết kế: [spec host database](superpowers/specs/2026-08-02-supabase-hosting-design.md).

### Chọn kiểu kết nối

| | Chọn | Vì |
|---|---|---|
| Direct (`db.<ref>…:5432`) | ❌ | Chỉ IPv6 nếu không mua add-on IPv4 |
| Transaction pooler (`:6543`) | ❌ | Dành cho client sống ngắn; mất prepared statement và advisory lock |
| **Session pooler (`:5432`)** | ✅ | API là process chạy dài hạn giữ sẵn pool |

Đổi sang transaction pooler **chỉ khi** `apps/api` chuyển lên serverless.

### Hai biến, hai vai trò

Prisma 7 bỏ `directUrl`, nhưng vẫn tách được vì `prisma.config.ts` **chỉ CLI đọc**, còn
`PrismaService` đọc `DATABASE_URL` qua `ConfigService`:

- `DATABASE_URL` → runtime.
- `DIRECT_DATABASE_URL` → `pnpm migrate:prod` và `db:seed`. Hiện trùng giá trị với `DATABASE_URL`.

`DIRECT_DATABASE_URL` phải có `?connect_timeout=30`: Prisma CLI mặc định bỏ cuộc sau 5 giây, mà kết
nối nguội từ VN sang region Tokyo đo được 3,7–9,5 giây. Không đặt thì `prisma migrate status` lúc
chạy lúc báo `P1001`. Runtime không dính vì `@prisma/adapter-pg` không đặt timeout ngắn như vậy.

> **Đừng** viết script kiểu `DATABASE_URL=$DIRECT_DATABASE_URL prisma migrate deploy`: shell expand
> biến trước khi `dotenv` chạy, mà `dotenv` không ghi đè biến đã tồn tại kể cả khi rỗng — kết quả là
> migrate chạy với connection string rỗng.

### Chạy migration

```bash
cd apps/api
pnpm exec prisma migrate status   # xem lệch bao nhiêu migration
pnpm migrate:prod                 # prisma migrate deploy
```

`migrate deploy` chỉ áp migration đã có sẵn trong repo, không tự sinh và không hỏi lại. Migration
mới luôn được tạo ở local bằng `prisma:migrate` rồi commit, không bao giờ sinh trực tiếp trên
database thật.

Seed (`pnpm db:seed`) là upsert theo id, chạy lại nhiều lần được — nhưng nó ghi **dữ liệu mẫu**,
đừng chạy lên database đang có dữ liệu thật.

### Data API bị chặn

Supabase expose schema `public` qua Data API và cấp sẵn toàn quyền cho `anon`/`authenticated` —
anon key theo thiết kế là thứ công khai, tức toàn quyền đọc/ghi vòng qua `JwtAuthGuard`. Tệ hơn,
default privileges cấp lại quyền đó cho **mọi bảng tạo về sau**, nên `REVOKE` một lần không giữ được.

Migration `20260802185500_chan_data_api_truy_cap_bang` bật RLS (không policy = từ chối tất cả), thu
hồi quyền hiện có và `ALTER DEFAULT PRIVILEGES` cho bảng tương lai. App không ảnh hưởng vì role
`postgres` có `rolbypassrls`.

Sau mỗi lần thêm bảng mới, kiểm tra lại:

```sql
select grantee, table_name from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
```

Kết quả rỗng là đúng. **Việc còn tồn:** tắt hẳn Data API trong dashboard (Settings → API) — RLS đã
chặn rồi nhưng tắt thứ mình không dùng vẫn hơn.

### Hạn mức gói free

- **500 MB database.** Ước lượng dữ liệu thật của bang (giữ 4 tuần) dưới 150 KB — dung lượng không
  phải mối lo, đừng lấy nó làm lý do cho quyết định thiết kế nào.
- **Project bị tạm dừng sau ~7 ngày không có truy vấn.** Bang nghỉ dài ngày thì lần vào sau sẽ lỗi
  kết nối cho tới khi khôi phục thủ công trong dashboard. Đây là hành vi đã biết và **chấp nhận**,
  không phải app hỏng.

## 6. Vận hành

### Kiểm tra sức khỏe

```bash
curl https://<domain-api>/api/health
```

```json
{ "status": "ok", "uptime": 1234, "db": "up", "timestamp": "..." }
```

`status` vẫn là `ok` khi database chết — chỉ `db` chuyển thành `"down"`. Cứ giám sát thì đọc trường
`db`, đừng đọc mỗi HTTP status.

### Log

Mọi response đều có header `x-request-id`, `LoggingInterceptor` ghi cùng id đó vào log. Người dùng
báo lỗi kèm id là truy được đúng request.

Format response: thành công `{ data }`; lỗi `{ statusCode, message, errors?, path, requestId, timestamp }`
với `message` đã là tiếng Việt, hiển thị thẳng lên UI được.

### Rollback

Không có cơ chế rollback tự động. Thực tế:

- **Code:** deploy lại commit trước.
- **Migration:** Prisma không sinh down-migration. Muốn lùi thì viết một migration mới đảo lại thay
  đổi. Vì vậy migration phá dữ liệu (drop column, đổi kiểu) cần soi kỹ trước khi merge.
- **Dữ liệu:** gói free có giới hạn backup riêng; chưa có quy trình khôi phục nào được thử.

### Chưa có

Ghi lại cho khỏi tưởng là đã có: CI/CD, môi trường staging, backup có kiểm chứng, giám sát/cảnh báo,
rate limit ở tầng ứng dụng.

## Xem thêm

- [`development.md`](development.md) — chạy local
- [`apps/api/README.md`](../apps/api/README.md) — chi tiết backend
- [spec host database](superpowers/specs/2026-08-02-supabase-hosting-design.md) — vì sao chọn như vậy
