# API — Guild Manager

Backend NestJS cho ứng dụng điểm danh bang hội.

## Stack

- **NestJS 11** (Express) — HTTP layer
- **Prisma 7 + PostgreSQL** — dữ liệu (kết nối qua driver adapter `@prisma/adapter-pg`)
- **Zod + nestjs-zod** — validate env và DTO; schema dùng chung với frontend ở `packages/shared/schemas`
- **Swagger** — tài liệu API tự sinh, bật ở mọi môi trường trừ production

## Chạy dev

```bash
cp .env.example .env      # điền AUTH_SECRET (openssl rand -hex 32)
pnpm install              # postinstall tự chạy `prisma generate`
pnpm db:up                # dựng PostgreSQL bằng Docker (docker-compose.yml)
pnpm prisma:migrate       # tạo bảng
pnpm db:seed              # nạp 25 nhân vật mẫu
pnpm dev                  # http://localhost:3001/api
```

- Health check: `GET /api/health`
- Swagger UI: `http://localhost:3001/docs` (spec JSON: `/docs-json`) — tắt khi `NODE_ENV=production`

`AUTH_SECRET` phải trùng giá trị với `apps/web` vì hai bên dùng chung cookie phiên đăng nhập.

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy watch mode |
| `pnpm build` / `pnpm start:prod` | Build (webpack, ra `dist/main.js`) và chạy bản build |
| `pnpm lint` | ESLint + Prettier, kèm luật chặn import xuyên tầng |
| `pnpm test` / `pnpm test:e2e` | Unit test / e2e test |
| `pnpm prisma:generate` | Sinh lại Prisma Client vào `src/generated/prisma` (không commit) |
| `pnpm prisma:studio` | Mở Prisma Studio |
| `pnpm migrate:prod` | Áp migration lên database thật qua `DIRECT_DATABASE_URL` (xem [Database production](#database-production)) |
| `pnpm db:up` / `pnpm db:down` | Bật/tắt container PostgreSQL |
| `pnpm db:reset` | Xóa sạch volume và dựng lại DB trống (chạy lại `prisma:migrate` + `db:seed` sau đó) |

## Database dev

`docker-compose.yml` dựng `postgres:17-alpine` (container `guild-manager-db`), dữ liệu nằm ở volume
`guild-manager-db-data` nên tắt container không mất dữ liệu — muốn xóa hẳn thì dùng `pnpm db:reset`.

Thông tin kết nối đọc từ `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT`),
mặc định khớp với `DATABASE_URL` trong `.env.example`. Đổi user/password/port thì **phải sửa cả hai chỗ**.

> Máy dùng Podman thay Docker: đặt `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` trước lệnh
> `pnpm db:up` (hoặc export sẵn trong shell).

## Database production

Đang host trên **Supabase gói free**, dùng như một Postgres thường: không cài
`@supabase/supabase-js`, không PostgREST. Chi tiết lập luận:
[spec host database](../../docs/superpowers/specs/2026-08-02-supabase-hosting-design.md).

### Chọn kiểu kết nối

Supabase cho ba đường vào. Dự án dùng **session pooler** (`…pooler.supabase.com:5432`) cho cả
runtime lẫn migrate:

| | Chọn | Vì |
|---|---|---|
| Direct (`db.<ref>…:5432`) | ❌ | Chỉ IPv6 nếu không mua add-on IPv4 |
| Transaction pooler (`:6543`) | ❌ | Dành cho client sống ngắn (serverless); đổi lại mất prepared statement và advisory lock |
| **Session pooler (`:5432`)** | ✅ | `apps/api` là một process chạy dài hạn giữ sẵn pool, không cần transaction pooling |

Đổi sang transaction pooler **chỉ khi** deploy `apps/api` lên serverless — lúc đó mỗi request là
một client mới và lập luận đảo ngược.

### Hai biến, hai vai trò

Prisma 7 bỏ `directUrl`, nhưng vẫn tách được vì `prisma.config.ts` **chỉ CLI đọc**, còn
`PrismaService` đọc `DATABASE_URL` qua `ConfigService`:

- `DATABASE_URL` → runtime.
- `DIRECT_DATABASE_URL` → `pnpm migrate:prod` và `pnpm db:seed`, qua fallback trong
  `prisma.config.ts` và `prisma/seed.ts`. Hiện trùng giá trị với `DATABASE_URL`.

> Đừng viết script kiểu `DATABASE_URL=$DIRECT_DATABASE_URL prisma migrate deploy`: shell expand
> biến trước khi `dotenv` chạy, mà `dotenv` **không ghi đè** biến đã tồn tại kể cả khi rỗng — kết
> quả là migrate chạy với connection string rỗng.

### Data API bị chặn

Supabase expose schema `public` qua Data API và cấp sẵn toàn quyền cho `anon` / `authenticated`.
Migration `20260802185500_chan_data_api_truy_cap_bang` bật RLS (không policy = từ chối tất cả) và
thu hồi quyền, kể cả default privileges cho bảng tạo về sau. App không bị ảnh hưởng vì role
`postgres` có `rolbypassrls`.

Nếu sau này có bảng lọt lưới, kiểm tra bằng:

```sql
select grantee, table_name from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
```

> **Project bị tạm dừng khi không hoạt động.** Supabase tạm dừng project gói free sau khoảng 7 ngày
> không có truy vấn. Bang nghỉ dài ngày thì lần vào sau sẽ lỗi kết nối cho tới khi khôi phục thủ công
> trong dashboard — không phải app hỏng. Kiểm tra bằng `GET /api/health`: `db` trả về `"down"`.

## Tài liệu

- [`docs/structure.md`](docs/structure.md) — cây thư mục thực tế và quy tắc theo tầng
- [`docs/nestjs-folder-structure.md`](docs/nestjs-folder-structure.md) — lý thuyết kiến trúc feature-based
- Đặc tả nghiệp vụ điểm danh: `apps/web/docs/attendance-time-rules.md`
