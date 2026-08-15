# Guild Manager

Công cụ điểm danh và xếp đội hình cho bang hội: mỗi tuần có vài trận, thành viên tự điểm danh
"Có/Không" trước deadline, quản trị viên xem lịch sử và xếp team cho từng trận.

## Cấu trúc

```
guild-manager/
├── apps/
│   ├── api/        # NestJS 11 + Prisma 7 + PostgreSQL  → http://localhost:3001/api
│   └── web/        # Next.js 16 (App Router) + Tailwind + shadcn/ui → http://localhost:3000
├── packages/
│   └── shared/     # Enum + Zod schema dùng chung FE/BE (@guild/shared)
└── docs/           # Tài liệu chung (development, production, spec/plan)
```

Monorepo pnpm workspace, không có root `package.json` — mọi lệnh chạy qua `pnpm --filter <app>`
hoặc `cd` vào thư mục app.

## Yêu cầu

| | Phiên bản |
|---|---|
| Node.js | 22+ (đang dev trên 24) |
| pnpm | 10+ |
| Docker | để chạy PostgreSQL local |

## Chạy local

```bash
# 1. Cài dependency (postinstall của apps/api tự chạy `prisma generate`)
pnpm install

# 2. Tạo file env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Sinh AUTH_SECRET và điền vào CẢ HAI file (phải trùng giá trị)
openssl rand -hex 32

# 4. Dựng database + tạo bảng + nạp 25 nhân vật mẫu
pnpm --filter api db:up
pnpm --filter api prisma:migrate
pnpm --filter api db:seed

# 5. Chạy — mở hai terminal
pnpm --filter api dev     # http://localhost:3001/api  (Swagger: /docs)
pnpm --filter web dev     # http://localhost:3000
```

Đăng nhập quản trị bằng tài khoản trong `ADMIN_USERNAMES` + `ADMIN_PASSWORD` của `apps/api/.env`
(mặc định `huy` / `testne`). Màn điểm danh không cần đăng nhập: ai vào cũng điểm danh được cho
mọi thành viên, miễn còn trong hạn.

Kiểm tra nhanh: `curl http://localhost:3001/api/health` phải trả `"db": "up"`.

Chi tiết hơn (biến môi trường, lệnh hay dùng, cách xử lý lỗi thường gặp): [`docs/development.md`](docs/development.md).

## Màn hình

| Route | Việc | Quyền |
|---|---|---|
| `/` | Điểm danh tuần hiện tại | Mọi người |
| `/lich-su-diem-danh` | Lịch sử điểm danh | Mọi người |
| `/xep-team` | Xếp đội hình theo từng trận | Chỉ quản trị |
| `/thiet-lap` | Hai tab: "Thiết lập trận đánh" (lịch đánh trong tuần) và "Quản lý thành viên" (thêm/sửa/xoá thành viên) | Chỉ quản trị |

## Tài liệu

| File | Nội dung |
|---|---|
| [`docs/development.md`](docs/development.md) | Setup local, biến môi trường, lệnh, quy trình làm việc |
| [`docs/production.md`](docs/production.md) | Build, deploy, migrate database thật, vận hành |
| [`apps/api/README.md`](apps/api/README.md) | Backend: stack, endpoint, database |
| [`apps/web/README.md`](apps/web/README.md) | Frontend: stack, cấu trúc feature |
| [`AGENTS.md`](AGENTS.md) | Quy ước code cho người và cho AI agent |
| [`apps/web/docs/attendance-time-rules.md`](apps/web/docs/attendance-time-rules.md) | Đặc tả luật deadline điểm danh |
| `docs/superpowers/specs/` | Spec thiết kế từng tính năng |
