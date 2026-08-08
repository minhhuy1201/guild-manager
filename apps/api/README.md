# API — Guild Manager

Backend NestJS cho ứng dụng điểm danh bang hội.

## Stack

- **NestJS 11** (Express) — HTTP layer
- **Prisma 7 + PostgreSQL** — dữ liệu (kết nối qua driver adapter `@prisma/adapter-pg`)
- **Zod + nestjs-zod** — validate env và DTO; schema dùng chung với frontend ở `packages/shared/schemas`
- **JWT** (`@nestjs/jwt`) — access token 1 ngày, refresh token 1 tuần
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

Danh sách biến môi trường đầy đủ và cách xử lý lỗi thường gặp: [`docs/development.md`](../../docs/development.md).

## Endpoint

Tất cả nằm sau prefix `/api`. Response thành công `{ data }`, lỗi
`{ statusCode, message, errors?, path, requestId, timestamp }` — `message` đã là tiếng Việt.

| Method | Đường dẫn | Việc | Quyền |
|---|---|---|---|
| `GET` | `/health` | Trạng thái API + database | Công khai |
| `POST` | `/auth/login` | Đăng nhập quản trị | Công khai |
| `POST` | `/auth/refresh` | Đổi refresh token lấy cặp token mới | Công khai |
| `GET` | `/auth/me` | Tài khoản của access token hiện tại | Bearer |
| `GET` | `/attendance/characters` | Danh sách nhân vật | Công khai |
| `GET` | `/attendance/week` | Tuần điểm danh đang mở | Công khai |
| `GET` | `/attendance/sessions` | Các trận của tuần đang mở kèm deadline | Công khai |
| `GET` | `/attendance/records` | Lượt điểm danh của tuần đang mở | Công khai |
| `POST` | `/attendance` | Điểm danh một nhân vật ở một trận | Công khai (Bearer thì được miễn deadline) |
| `GET` | `/team-builder/weeks` | Các tuần còn dữ liệu đội hình | Bearer |
| `GET` | `/team-builder/formations?weekStart=` | Đội hình các trận của một tuần | Bearer |
| `PUT` | `/team-builder/formations/:sessionId` | Ghi đè đội hình một trận | Bearer |

Luật deadline (chốt sổ 17h Thứ 5, mở tuần kế sau 22h Thứ 7…) nằm ở
`src/modules/attendance/attendance-schedule.ts`, tính theo UTC+7 cố định. Đặc tả:
[`apps/web/docs/attendance-time-rules.md`](../web/docs/attendance-time-rules.md).

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy watch mode |
| `pnpm build` / `pnpm start:prod` | Build (webpack, ra `dist/main.js`) và chạy bản build |
| `pnpm lint` | ESLint + Prettier, kèm luật chặn import xuyên tầng |
| `pnpm test` / `pnpm test:e2e` | Unit test / e2e test |
| `pnpm prisma:generate` | Sinh lại Prisma Client vào `src/generated/prisma` (không commit) |
| `pnpm prisma:migrate` | Tạo migration mới từ thay đổi schema (`migrate dev`) |
| `pnpm prisma:studio` | Mở Prisma Studio |
| `pnpm migrate:prod` | Áp migration lên database thật qua `DIRECT_DATABASE_URL` |
| `pnpm db:up` / `pnpm db:down` | Bật/tắt container PostgreSQL |
| `pnpm db:reset` | Xóa sạch volume và dựng lại DB trống (chạy lại `prisma:migrate` + `db:seed` sau đó) |
| `pnpm db:seed` | Nạp 25 nhân vật mẫu (upsert, chạy lại được) |

## Database dev

`docker-compose.yml` dựng `postgres:17-alpine` (container `guild-manager-db`), dữ liệu nằm ở volume
`guild-manager-db-data` nên tắt container không mất dữ liệu — muốn xóa hẳn thì dùng `pnpm db:reset`.

Thông tin kết nối đọc từ `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT`),
mặc định khớp với `DATABASE_URL` trong `.env.example`. Đổi user/password/port thì **phải sửa cả hai chỗ**.

> Máy dùng Podman thay Docker: đặt `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` trước lệnh
> `pnpm db:up` (hoặc export sẵn trong shell).

## Database production

Đang host trên **Supabase gói free** (region `ap-northeast-1`), dùng như một Postgres thường: không
cài `@supabase/supabase-js`, không PostgREST. Toàn bộ phần vận hành — chọn kiểu kết nối, vai trò của
`DATABASE_URL` vs `DIRECT_DATABASE_URL`, quy trình migrate, chặn Data API, hạn mức gói free — nằm ở
[`docs/production.md`](../../docs/production.md).

Ba điểm dễ mất thời gian nhất, nhắc lại ở đây:

- Dùng **session pooler** (`…pooler.supabase.com:5432`), không phải transaction pooler (`:6543`).
- `DIRECT_DATABASE_URL` phải có `?connect_timeout=30`, nếu không `P1001` sẽ xuất hiện ngẫu nhiên.
- **Project bị tạm dừng sau ~7 ngày không có truy vấn** — phải khôi phục thủ công trong dashboard.
  Kiểm tra bằng `GET /api/health`: `db` trả `"down"`.

## Tài liệu

- [`docs/structure.md`](docs/structure.md) — cây thư mục thực tế và quy tắc theo tầng
- [`docs/nestjs-folder-structure.md`](docs/nestjs-folder-structure.md) — lý thuyết kiến trúc feature-based
- [`../../docs/development.md`](../../docs/development.md) — setup local, biến môi trường, lệnh
- [`../../docs/production.md`](../../docs/production.md) — build, deploy, vận hành
