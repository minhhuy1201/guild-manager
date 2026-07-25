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
| `pnpm db:up` / `pnpm db:down` | Bật/tắt container PostgreSQL |
| `pnpm db:reset` | Xóa sạch volume và dựng lại DB trống (chạy lại `prisma:migrate` + `db:seed` sau đó) |

## Database dev

`docker-compose.yml` dựng `postgres:17-alpine` (container `guild-manager-db`), dữ liệu nằm ở volume
`guild-manager-db-data` nên tắt container không mất dữ liệu — muốn xóa hẳn thì dùng `pnpm db:reset`.

Thông tin kết nối đọc từ `.env` (`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT`),
mặc định khớp với `DATABASE_URL` trong `.env.example`. Đổi user/password/port thì **phải sửa cả hai chỗ**.

> Máy dùng Podman thay Docker: đặt `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` trước lệnh
> `pnpm db:up` (hoặc export sẵn trong shell).

## Tài liệu

- [`docs/structure.md`](docs/structure.md) — cây thư mục thực tế và quy tắc theo tầng
- [`docs/nestjs-folder-structure.md`](docs/nestjs-folder-structure.md) — lý thuyết kiến trúc feature-based
- Đặc tả nghiệp vụ điểm danh: `apps/web/docs/attendance-time-rules.md`
