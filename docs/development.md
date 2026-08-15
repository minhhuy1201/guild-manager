# Development

Hướng dẫn dựng và làm việc với Guild Manager ở máy local. Bản rút gọn "chạy cho được" nằm ở
[README gốc](../README.md); file này giải thích thêm phần cấu hình, lệnh và những chỗ hay vướng.

## 1. Yêu cầu môi trường

| | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22+ | đang dev trên 24.13 |
| pnpm | 10+ | `corepack enable pnpm` là đủ |
| Docker | bất kỳ bản còn hỗ trợ | chỉ để chạy PostgreSQL (Podman dùng được, xem mục 4) |
| `openssl` | | sinh `AUTH_SECRET` |

Monorepo không có root `package.json`. Chạy lệnh của một app theo một trong hai cách:

```bash
pnpm --filter api dev        # từ thư mục gốc
cd apps/api && pnpm dev      # hoặc vào thẳng app
```

Tên filter là `api`, `web`, `@guild/shared`.

## 2. Cài đặt lần đầu

```bash
pnpm install
```

`postinstall` của `apps/api` tự chạy `prisma generate` → sinh Prisma Client vào
`apps/api/src/generated/prisma` (thư mục này **không commit**).

Tạo hai file env từ mẫu:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Sinh khóa và điền vào **cả hai** file:

```bash
openssl rand -hex 32
```

## 3. Biến môi trường

### `apps/api/.env`

Validate bằng Zod lúc boot (`src/config/env.validation.ts`) — thiếu hoặc sai định dạng thì app
chết ngay với thông báo tiếng Việt, không chạy nửa vời.

| Biến | Bắt buộc | Mặc định | Việc |
|---|---|---|---|
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `PORT` | | `3001` | Port API (3000 để dành cho Next.js) |
| `DATABASE_URL` | ✅ | — | Connection string Postgres cho runtime **và** cho Prisma CLI |
| `DIRECT_DATABASE_URL` | | rỗng | Chỉ Prisma CLI đọc (`migrate:prod`, `db:seed`). Local để trống |
| `WEB_ORIGIN` | | `http://localhost:3000` | Origin được phép qua CORS |
| `AUTH_SECRET` | ✅ | — | Khóa ký JWT, tối thiểu 32 ký tự — **trùng với `apps/web`** |
| `ADMIN_USERNAMES` | ✅ | — | Tài khoản quản trị, phân tách bằng dấu phẩy |
| `ADMIN_PASSWORD` | ✅ | — | Mật khẩu dùng chung cho các tài khoản trên |
| `APP_TIMEZONE` | | `Asia/Ho_Chi_Minh` | Múi giờ tính deadline điểm danh |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | | postgres/postgres/guild_manager/5432 | Chỉ `docker-compose.yml` đọc — **phải khớp `DATABASE_URL`** |

`DIRECT_DATABASE_URL` cố tình **không** có trong `envSchema`: runtime không được phép đụng tới nó.

### `apps/web/.env.local`

| Biến | Việc |
|---|---|
| `AUTH_SECRET` | Verify JWT do API ký (HMAC-SHA256) — phải trùng giá trị bên API |
| `NEXT_PUBLIC_API_URL` | Base URL backend, mặc định `http://localhost:3001/api` |

Web **không** kết nối database. Không có biến Supabase nào ở phía web.

## 4. Database local

```bash
pnpm --filter api db:up          # dựng postgres:17-alpine (container guild-manager-db)
pnpm --filter api prisma:migrate # tạo bảng (prisma migrate dev)
pnpm --filter api db:seed        # 25 nhân vật mẫu, chạy lại nhiều lần được (upsert)
```

Dữ liệu nằm ở volume `guild-manager-db-data` nên `db:down` không mất dữ liệu. Muốn xóa sạch:

```bash
pnpm --filter api db:reset       # down -v && up  → chạy lại migrate + seed sau đó
```

Nhân vật mẫu có id `10001`–`10025`. Danh sách đầy đủ trong `apps/api/prisma/seed.ts`.

> **Runtime container:** các script `db:*` gọi `docker compose`. Máy nào dùng Podman thay Docker thì
> export `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` (podman socket phải đang chạy:
> `systemctl --user start podman.socket`), hoặc đổi ba script đó sang `podman compose` trong
> `apps/api/package.json` — file `docker-compose.yml` dùng chung, không phải sửa gì.
>
> Cài cả hai thì phải chọn một: mỗi runtime giữ container và volume riêng, nên `podman compose up`
> và `docker compose up` tạo ra hai database khác nhau và cái chạy sau sẽ báo
> `bind host port 0.0.0.0:5432: address already in use`.

## 5. Chạy dev

Hai terminal:

```bash
pnpm --filter api dev    # http://localhost:3001/api — watch mode
pnpm --filter web dev    # http://localhost:3000
```

- Health check: `curl http://localhost:3001/api/health` → `{"status":"ok","db":"up",...}`
- Swagger UI: <http://localhost:3001/docs> (spec JSON `/docs-json`) — tự tắt khi `NODE_ENV=production`
- Đăng nhập quản trị: tài khoản trong `ADMIN_USERNAMES`, mật khẩu `ADMIN_PASSWORD`

## 6. Lệnh hay dùng

### Backend (`pnpm --filter api …`)

| Lệnh | Việc |
|---|---|
| `dev` | Watch mode |
| `build` / `start:prod` | Build webpack ra `dist/main.js` / chạy bản build |
| `lint` | ESLint + Prettier, kèm luật chặn import xuyên tầng |
| `test` / `test:e2e` | Unit test / e2e test (Jest) |
| `prisma:generate` | Sinh lại Prisma Client |
| `prisma:migrate` | `migrate dev` — tạo migration mới từ thay đổi schema |
| `prisma:studio` | Mở Prisma Studio |
| `db:up` / `db:down` / `db:reset` | Vòng đời container Postgres |
| `db:seed` | Nạp nhân vật mẫu |

### Frontend (`pnpm --filter web …`)

| Lệnh | Việc |
|---|---|
| `dev` | Next.js dev server |
| `build` / `start` | Build production / chạy bản build |
| `lint` | ESLint (`eslint-config-next`) |
| `test` / `test:watch` | Vitest |

Thêm component shadcn (chạy trong `apps/web`):

```bash
pnpm dlx shadcn@latest add <tên-component>
```

## 7. Quy trình làm việc

### Đổi schema database

1. Sửa `apps/api/prisma/schema.prisma`.
2. `pnpm --filter api prisma:migrate` → đặt tên migration bằng tiếng Việt không dấu, kiểu
   `character_id_la_game_id`.
3. Enum trong schema phải **giữ khớp giá trị** với `packages/shared/enums` — `seed.ts` import
   trực tiếp enum dùng chung nên lệch giá trị là compile error, không phải bug lúc chạy.
4. Commit cả thư mục migration.

### Đổi type/schema dùng chung

`packages/shared` được import bằng source TypeScript (`@guild/shared/enums`, `@guild/shared/schemas`),
không có bước build. Sửa xong là cả hai app thấy ngay.

Backend bundle bằng webpack chính vì lý do này — builder `tsc` mặc định sẽ đẩy output thành
`dist/apps/api/src/main.js` do có file nằm ngoài `rootDir`.

### Thêm module backend

Xem [`apps/api/docs/structure.md`](../apps/api/docs/structure.md) mục "Khi thêm một module mới".
Luồng bắt buộc: Controller → Service → (Repository) → Prisma. Controller không đụng Prisma.

### Thêm feature frontend

Xem [`apps/web/docs/structure.md`](../apps/web/docs/structure.md). Tóm tắt: server data → TanStack
Query qua `features/<feature>/hooks`; UI state → Zustand; mọi lời gọi backend đi qua `apiFetch` của
`lib/api-client.ts`; `app/` chỉ routing.

Quy ước chung cho cả hai phía nằm ở [`AGENTS.md`](../AGENTS.md).

## 8. Trước khi commit

```bash
pnpm --filter api lint && pnpm --filter api test
pnpm --filter web lint && pnpm --filter web test
```

Không commit: `.env*` (trừ `.env.example`), `apps/api/src/generated/`, `dist/`, `.next/`.

## 9. Vướng thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Boot API báo `Biến môi trường không hợp lệ` | Đọc phần liệt kê ngay dưới thông báo — thường là thiếu `AUTH_SECRET` hoặc khóa ngắn hơn 32 ký tự |
| Đăng nhập được nhưng vào `/xep-team` lại bị đá về trang chủ | `AUTH_SECRET` của web khác của api → web verify JWT thất bại |
| `P1001 Can't reach database server` | Container chưa chạy (`db:up`), hoặc `POSTGRES_PORT` lệch với port trong `DATABASE_URL` |
| Prisma Client báo thiếu type sau khi đổi schema | Chạy `pnpm --filter api prisma:generate` |
| CORS chặn request từ web | `WEB_ORIGIN` phải khớp đúng origin đang mở (kể cả port) |
| Port 3000/3001 bận | Đổi `PORT` (api) và `NEXT_PUBLIC_API_URL` (web) cho khớp |
| `db:up` lỗi socket trên Podman | Thiếu `DOCKER_HOST` — xem mục 4 |

## Xem thêm

- [`production.md`](production.md) — build, deploy, database thật
- [`apps/api/README.md`](../apps/api/README.md) — chi tiết backend
- [`apps/web/README.md`](../apps/web/README.md) — chi tiết frontend
- `docs/superpowers/specs/` — spec thiết kế từng tính năng
