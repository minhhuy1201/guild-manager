# Deploy cả hai app lên Vercel — Design

Ngày: 2026-08-16 · Phạm vi: `apps/api` (Prisma pool, CORS), `apps/web` (biến build-time), biến môi
trường production, tài liệu vận hành.
**Chưa triển khai.** Mới xong bước xoay secret.

## Bối cảnh

Database đã chạy thật trên Supabase từ 2026-08-03 (`ap-northeast-1`, gói free). Hai app thì chưa
chọn nơi host: repo không có `Dockerfile`, không có `vercel.json`, không có CI.

`docs/production.md` mục 4 đang ghi `apps/api` **cần một process Node sống dài hạn**, và liệt kê
VPS/Render/Railway/Fly. Spec này lật lại kết luận đó.

## Quyết định

### 1. Cả `apps/web` lẫn `apps/api` đều lên Vercel

`apps/web` là Next.js 16 App Router có `proxy.ts` (middleware) và server action — Vercel là đường
ít ma sát nhất, chỗ khác đều cần Node runtime, static export không phải lựa chọn.

`apps/api` lên Vercel dưới dạng một Vercel Function. Hai điều làm việc này khả thi mà tài liệu cũ
không tính tới:

- **Zero-config NestJS detection.** Vercel nhận ra NestJS và build bằng chính `nest build`. Giữ
  nguyên `src/main.ts` với `app.listen(process.env.PORT)`; **không** cần `vercel.json`, không cần
  `api/index.ts`, không cần viết lại thành serverless handler. Đây là điểm quan trọng: một entry
  kiểu `@vercel/node` sẽ build bằng esbuild và làm hỏng DI, vì `apps/api` bật
  `emitDecoratorMetadata`.
- **Fluid compute.** Instance không bị huỷ giữa các request, nên singleton ở module scope — cụ thể
  là pg pool — sống qua nhiều lần gọi và được chia sẻ giữa các request đồng thời.

Hai project Vercel riêng, cùng một repo, khác Root Directory (`apps/web` và `apps/api`).

Đánh đổi đã cân nhắc: hosting `apps/api` ở Render/Railway/Fly thì mô hình process quen thuộc hơn,
nhưng thêm một nhà cung cấp, thêm một chỗ phải nhớ xoay secret, đổi lấy thứ Fluid compute đã cho
sẵn.

### 2. Giữ session pooler `:5432`, không quay lại transaction pooler

Spec hosting 2026-08-02 (dòng 96–97) viết: quay lại transaction pooler **chỉ khi** `apps/api`
chuyển sang serverless. Câu đó ra đời trước Fluid compute và **tiền đề của nó không còn đúng**.

Lý do transaction pooling tồn tại là **nhiều client sống ngắn** — mỗi request một process, pool
không tái dùng được. Fluid compute phá đúng tiền đề đó: instance không tear down, pg pool được tái
dùng. Còn cái giá của transaction pooler thì vẫn nguyên: mất prepared statement, advisory lock,
`SET` kéo dài.

| | Chọn | Vì |
|---|---|---|
| Direct `db.<ref>…:5432` | ❌ | Chỉ IPv6 nếu không mua add-on IPv4 |
| Transaction pooler `:6543` | ❌ | Trả giá mất prepared statement để đổi lấy lợi ích không cần tới |
| **Session pooler `:5432`** | ✅ | Pool tái dùng được, tải của bang quá nhỏ |

Đổi sang `:6543` (kèm `?pgbouncer=true`) **chỉ khi** số connection thực sự trèo, đo được chứ không
đoán.

**Rủi ro đã biết, chưa xử lý:** Supabase discussion #40671 báo cáo số client connection trên
Supavisor tăng dần khi dùng Vercel Fluid + `attachDatabasePool`. Nếu gặp, đây là chỗ nhìn đầu tiên.

### 3. `PrismaService` tự dựng `pg.Pool` và đăng ký với Vercel

Hiện tại `PrismaService` đưa thẳng connection string cho `PrismaPg`, tức là pool nằm trong bụng
adapter, không cầm được tham chiếu.

Đổi thành: tự `new Pool(...)`, gọi `attachDatabasePool(pool)` từ `@vercel/functions`, rồi truyền
Pool vào `new PrismaPg(pool)` — constructor của `PrismaPg` nhận `pg.Pool | pg.PoolConfig | string`
nên không cần lách gì.

`attachDatabasePool` đóng các connection nhàn rỗi bằng `waitUntil` **trước khi** Vercel suspend
instance. Không có nó, connection treo lại ở phía Supavisor cho tới khi timeout.

Cấu hình pool theo đúng khuyến nghị của Vercel:

- `idleTimeoutMillis` ngắn (~5s) — nhả connection sớm.
- **Không** đặt `max: 1`. Vercel nói rõ đừng làm vậy: Fluid compute chạy nhiều request đồng thời
  trên một instance, pool một connection biến chúng thành hàng đợi.
- Giữ `min: 1` để request kế tiếp không phải bắt tay lại từ đầu.

`onModuleDestroy` vẫn `$disconnect()` như cũ.

### 4. CORS phải nhận preview deployment

`app.enableCors({ origin: config.get('WEB_ORIGIN'), credentials: true })` khớp **chính xác** một
origin. Mỗi preview deployment của Vercel lại có một domain `*.vercel.app` ngẫu nhiên, nên mọi bản
preview của web sẽ bị chặn — mà preview là thứ dùng hằng ngày.

Đổi `origin` sang dạng hàm: nhận `WEB_ORIGIN`, **hoặc** domain preview của đúng project web. Không
nới thành `*.vercel.app` chung: `credentials: true` cộng với một origin quá rộng là mở cửa cho bất
kỳ ai deploy lên Vercel.

Không dùng cookie cross-site: auth đi qua header `Authorization: Bearer`, token do server dựng. Vì
vậy hai domain khác nhau không gây vấn đề SameSite — nhưng `apiFetch` vẫn để
`credentials: "include"`, nên ràng buộc CORS ở trên là thật.

### 5. Xoay secret trước khi deploy

`AUTH_SECRET` production trước đây dùng chung giá trị với dev. Đã sinh khoá riêng ngày 2026-08-16
bằng `openssl rand -hex 32` và thay trong `apps/api/.env.production`.

Khoá phải **trùng từng byte** giữa `apps/api` và `apps/web`: lệch nhau thì đăng nhập vẫn được nhưng
route quản trị đá về trang chủ — `proxy.ts` verify bằng khoá của web, api thì ký bằng khoá của nó.

Còn lại chủ dự án tự làm:

- [ ] Xoay mật khẩu database trong dashboard Supabase, cập nhật cả `DATABASE_URL` lẫn
      `DIRECT_DATABASE_URL`.
- [ ] Tắt hẳn Data API (Settings → API) — RLS đã chặn, nhưng tắt thứ không dùng vẫn hơn.

`ADMIN_PASSWORD` do chủ dự án tự đặt, giữ nguyên giá trị cũ nên **trên thực tế chưa xoay**. Ghi lại
ở đây để sau này không tưởng nhầm là đã xoay.

## Biến môi trường

Điền trên dashboard Vercel, không nằm trong repo. `apps/api/.env.production` chỉ để chạy lệnh
Prisma từ máy local — runtime không đọc file đó.

### Project `apps/api`

Y nguyên bảng ở `docs/production.md` mục 3, thêm hai lưu ý:

- `PORT` do Vercel tự tiêm. `envSchema` khai `z.coerce.number().int().positive().default(3001)` nên
  giá trị chuỗi Vercel truyền vào vẫn qua được validation.
- `WEB_ORIGIN` phải là domain production thật của project web, điền sau khi project web tồn tại.

### Project `apps/web`

| Biến | Giá trị |
|---|---|
| `AUTH_SECRET` | Đúng giá trị của api |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api` |

`NEXT_PUBLIC_*` được inline vào bundle **lúc build**, không đọc lại lúc chạy. Đổi giá trị này phải
build lại, không phải restart.

Vòng phụ thuộc phải phá bằng tay: web cần domain api để build, api cần domain web cho CORS. Deploy
một cái trước, lấy domain, điền cho cái kia, deploy lại.

## Quy trình deploy lần đầu

1. `npm install -g vercel`, rồi `vercel login` (chủ dự án tự chạy, cần trình duyệt).
2. `vercel link --repo --scope <team>` — repo có git remote nên dùng repo-based linking; nó tạo
   `.vercel/repo.json` map thư mục sang project id.
3. Tạo hai project, Root Directory là `apps/web` và `apps/api`.
4. Điền toàn bộ biến môi trường ở trên.
5. Deploy **preview** trước, không phải production.
6. Chạy migration lên database thật (`pnpm migrate:prod`) **trước khi** bản build mới nhận traffic.
7. Kiểm `GET /api/health` trả `db: "up"`.

Thêm `.vercel` vào `.gitignore` — hiện chưa có.

Cài đặt phải chạy từ gốc repo (`pnpm install --frozen-lockfile`): đây là pnpm workspace, và
`packages/shared` được import dưới dạng TypeScript nguồn, không có bước build riêng.

## Tài liệu phải sửa

- `docs/production.md` mục 4: bỏ "chưa chọn host", bỏ câu "`apps/api` cần process sống dài hạn",
  ghi lại thành Vercel cho cả hai.
- `docs/production.md` mục 5: sửa câu "chuyển sang transaction pooler chỉ khi đi serverless" cho
  khớp quyết định 2.
- `docs/superpowers/specs/2026-08-02-supabase-hosting-design.md` dòng 96–97: thêm đính chính rằng
  Fluid compute phá tiền đề của câu đó, trỏ sang spec này.

## Test

Không có gì mới cần test tự động: thay đổi nằm ở tầng khởi động (pool, CORS), không đổi hành vi
nghiệp vụ nào. Chạy lại `pnpm --filter api test` và `pnpm --filter web test` một lần ở cuối để chắc
việc dựng pool không làm hỏng test hiện có.

Kiểm bằng tay sau khi deploy preview:

- `GET /api/health` trả `db: "up"`.
- Đăng nhập từ domain web preview → gọi được api (CORS preview thật sự thông).
- Vào một route quản trị (`/thiet-lap`) → không bị đá về trang chủ (`AUTH_SECRET` khớp).
