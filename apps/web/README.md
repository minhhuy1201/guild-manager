# Web — Guild Manager

Frontend Next.js cho ứng dụng điểm danh bang hội. Toàn bộ chữ hiển thị cho người dùng là **tiếng Việt**.

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS 4** + **shadcn/ui** (trên `@base-ui/react`)
- **TanStack Query** — server state
- **Zustand** — client/UI state
- **dnd-kit** — kéo thả ở màn xếp team
- **Vitest** — test

## Chạy dev

```bash
cp .env.example .env.local   # điền AUTH_SECRET, trùng giá trị với apps/api
pnpm install                 # chạy ở thư mục gốc monorepo
pnpm dev                     # http://localhost:3000
```

Cần `apps/api` chạy sẵn ở `http://localhost:3001/api` (xem [`apps/api/README.md`](../api/README.md)).

| Biến | Việc |
|---|---|
| `AUTH_SECRET` | Verify JWT do API ký (HMAC-SHA256) — **phải trùng** giá trị bên API |
| `NEXT_PUBLIC_API_URL` | Base URL backend, mặc định `http://localhost:3001/api` |

Web không kết nối database và không giữ tài khoản quản trị — mọi thứ đó nằm ở backend
(`ADMIN_USERNAMES` / `ADMIN_PASSWORD`), web chỉ verify token nhận được.

## Màn hình

| Route | Component | Quyền |
|---|---|---|
| `/` | `AttendanceScreen` — điểm danh tuần hiện tại | Mọi người |
| `/lich-su-diem-danh` | `AttendanceLogTable` — lịch sử điểm danh | Mọi người |
| `/xep-team` | `TeamBuilderScreen` — xếp đội hình theo trận | Chỉ quản trị |

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Build production / chạy bản build |
| `pnpm lint` | ESLint (`eslint-config-next`) |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm dlx shadcn@latest add <component>` | Thêm component shadcn vào `components/ui/` |

## Quy ước

Chi tiết ở [`docs/structure.md`](./docs/structure.md) và [`AGENTS.md`](../../AGENTS.md) mục Frontend.
Những luật hay bị vi phạm nhất:

- `app/` **chỉ** routing/layout — logic nằm trong `features/<feature>/`.
- Server data → TanStack Query trong `features/<feature>/hooks`. **Không** lưu response API vào Zustand.
- UI state (bộ lọc, modal) → Zustand trong `features/<feature>/store`.
- Mọi lời gọi backend đi qua `apiFetch` của `lib/api-client.ts`, gói trong `features/<feature>/api/` —
  không `fetch` trực tiếp trong component.
- Không sửa file trong `components/ui/` (do shadcn generate) — wrap ở `components/shared/`.
- Không import file nội bộ của feature khác, chỉ qua `index.ts` của feature đó.
- Ưu tiên Server Component; `"use client"` chỉ khi thật sự cần.

### Phân quyền

Phiên đăng nhập nằm ở **cookie httpOnly** chứa JWT do API ký, không lưu gì ở client. Ẩn/hiện nav chỉ
là UI — chặn thật nằm ở `proxy.ts` (chặn route admin, tự gia hạn token khi access token hết hạn) và
kiểm tra lại session trong server component của page.

## Tài liệu

- [`docs/structure.md`](./docs/structure.md) — cây thư mục và quy tắc cơ bản
- [`docs/ui-conventions.md`](./docs/ui-conventions.md) — quy ước giao diện
- [`docs/attendance-time-rules.md`](./docs/attendance-time-rules.md) — đặc tả luật deadline điểm danh
- [`docs/class.md`](./docs/class.md) — lưu phái (class) của nhân vật
- [`docs/setup.md`](./docs/setup.md) — nhật ký khởi tạo project (Next.js + Tailwind + shadcn)
- [`../../docs/development.md`](../../docs/development.md) — setup toàn monorepo
- [`../../docs/production.md`](../../docs/production.md) — build và deploy
