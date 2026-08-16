# Deploy cả hai app lên Vercel — Design

Ngày: 2026-08-16 · Phạm vi: `apps/api` (Prisma pool, CORS), `apps/web` (biến build-time), biến môi
trường production, tài liệu vận hành.
**Đã triển khai xong 2026-08-16.** Cả hai app đang chạy production. Phần "Quyết định" bên dưới giữ
nguyên như lúc thiết kế; những gì thực tế lệch với thiết kế nằm ở mục
[Thực tế khi triển khai](#thực-tế-khi-triển-khai) cuối file.

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

Đã làm xong 2026-08-16:

- [x] `docs/production.md` mục 4: bỏ "chưa chọn host", bỏ câu "`apps/api` cần process sống dài hạn",
      ghi lại thành Vercel cho cả hai.
- [x] `docs/production.md` mục 5: sửa câu "chuyển sang transaction pooler chỉ khi đi serverless" cho
      khớp quyết định 2.
- [x] `docs/superpowers/specs/2026-08-02-supabase-hosting-design.md` dòng 96–97: thêm đính chính rằng
      Fluid compute phá tiền đề của câu đó, trỏ sang spec này.

Phát sinh thêm, cũng đã làm:

- [x] `docs/production.md` mục 2: `packages/shared` giờ build ra JS, không còn là "TypeScript nguồn,
      không có bước build riêng".
- [x] `docs/production.md` mục 3: thêm biến `WEB_PREVIEW_PROJECT`, và cảnh báo không đánh sensitive
      cho `NEXT_PUBLIC_*`.
- [x] `docs/production.md` mục 4: ghi hai ràng buộc build của Vercel (không alias, không `.ts` qua
      ranh giới package) và cách kiểm chứng một bản deploy.

## Test

Không có gì mới cần test tự động: thay đổi nằm ở tầng khởi động (pool, CORS), không đổi hành vi
nghiệp vụ nào. Chạy lại `pnpm --filter api test` và `pnpm --filter web test` một lần ở cuối để chắc
việc dựng pool không làm hỏng test hiện có.

Kiểm bằng tay sau khi deploy preview:

- `GET /api/health` trả `db: "up"`.
- Đăng nhập từ domain web preview → gọi được api (CORS preview thật sự thông).
- Vào một route quản trị (`/thiet-lap`) → không bị đá về trang chủ (`AUTH_SECRET` khớp).

## Thực tế khi triển khai

Ghi lại ngày 2026-08-16, sau khi deploy xong. Bốn thứ thiết kế không lường trước, và hai chỗ quy
trình đi khác kế hoạch.

### 1. Vercel build NestJS cứng nhắc hơn mô tả ở quyết định 1

Quyết định 1 nói đúng rằng không cần `vercel.json` và không cần viết serverless handler, nhưng
thiếu mất phần quan trọng: preset NestJS của Vercel **không** dùng `dist/main.js` do webpack sinh
ra. Nó hardcode entrypoint `src/main.ts`, tự biên dịch TypeScript bằng `tsc` của nó, phát `.js`
nằm cạnh từng `.ts`, rồi dùng nft trace các lời gọi `require` trong output. Trường `"main"` trong
`package.json` bị bỏ qua hoàn toàn (đã thử, không ăn thua).

Hệ quả là hai thứ trong repo trở nên không tương thích, và cả hai chỉ lộ ra **lúc chạy trên
production**, không phải lúc build.

### 2. Alias `@/…` của `apps/api` phải bỏ

Vercel không đọc `paths` trong `tsconfig.json`, nên `@/config` sống sót nguyên xi vào JavaScript
đã phát ra. Function chạy lên là chết: `Cannot find module '@/config'` tại
`/var/task/apps/api/src/app.module.js`, và bundle chỉ có 2 file vì nft không trace nổi.

Đã đổi **38 import trong 23 file** sang đường dẫn tương đối, bỏ `paths` khỏi `apps/api/tsconfig.json`,
bỏ `moduleNameMapper` khỏi cấu hình jest (cả `package.json` lẫn `test/jest-e2e.json`). Sau đó nft
trace được 47 file. **Không được đưa alias trở lại.**

Việc này kéo theo một hệ quả không thấy ngay: hai luật `no-restricted-imports` trong
`eslint.config.mjs` khớp theo `@/modules/*`, nên sau khi bỏ alias chúng **không còn bắt được gì**.
Đã viết lại theo đường dẫn tương đối (dùng `regex` thay `group`, khoá theo từng độ sâu thư mục) —
xem `apps/api/docs/backend.md` mục 4.

### 3. `packages/shared` phải build ra JavaScript

Lỗi kế tiếp, cùng gốc:
`Cannot find module '/var/task/apps/api/node_modules/@guild/shared/lib/battle-session.ts'`.
`exports` map trỏ thẳng runtime vào file `.ts`, mà Vercel xoá `.ts` sau khi biên dịch.

Type stripping của Node 24 không cứu được: `enums/attendance.enum.ts` dùng `export enum`, là cú
pháp riêng của TypeScript, không chạy được.

Đã thêm `packages/shared/tsconfig.json` (commonjs, `outDir: dist`) và script `prepare: tsc`. Dùng
`prepare` chứ không chỉ `build` để `pnpm install` tự sinh `dist` — khỏi phải nhớ thứ tự ở bất kỳ
môi trường nào. `exports` giờ trỏ `types` vào `.ts` nguồn, còn `default` vào `dist/*.js`. `apps/web`
không import `@guild/shared` nên không bị ảnh hưởng.

Câu "`packages/shared` được import dưới dạng TypeScript nguồn, không có bước build riêng" ở cuối mục
"Quy trình deploy lần đầu" bên trên vì vậy **không còn đúng**.

### 4. Từ chối CORS bằng `throw` làm API trả 500

Quyết định 4 không nói rõ cách từ chối. Bản đầu ném `Error` trong callback `origin`, và Nest biến
nó thành **HTTP 500 cho mọi request từ origin lạ** — bot quét cũng tính.

Đã đổi sang `callback(null, false)`: không gắn header CORS, trình duyệt tự chặn, request không qua
trình duyệt vẫn đi được như trước. CORS không phải lớp xác thực; chặn truy cập là việc của
`JwtAuthGuard`.

### 5. Biến `NEXT_PUBLIC_*` không được đánh "Sensitive"

Không nằm trong thiết kế, và là thứ làm web production hỏng hoàn toàn sau khi deploy.

`NEXT_PUBLIC_API_URL` bị tạo với `type: "sensitive"`. Vercel không cho giá trị sensitive lọt vào
build, nên Next inline **đúng chuỗi `[SENSITIVE]`** vào bundle:

```js
await fetch(`[SENSITIVE]${e}`, { ...r, credentials: "include", ... })
```

Đó là đường dẫn tương đối, nên mọi lời gọi đi vào chính domain web và trả **404 do Next.js**, nhìn
y hệt lỗi backend trong khi API hoàn toàn khoẻ. Đã tạo lại biến ở dạng `encrypted` thường và build
lại. Biến `NEXT_PUBLIC_*` nằm công khai trong bundle client theo định nghĩa, không có gì để giấu.

### 6. Hai chỗ quy trình đi khác kế hoạch

- **Không dùng repo-based linking.** `vercel link --repo --yes` báo "No Projects were selected"
  (cờ alpha, không chọn được ở chế độ non-interactive). Đã tạo project và chỉnh `rootDirectory`
  bằng REST API (`POST /v11/projects`, `PATCH /v9/projects/{id}`), rồi deploy bằng
  `vercel deploy --project <tên>` **từ gốc repo**. Chạy `vercel link --cwd apps/api` là sai: nó lấy
  `apps/api` làm project root nên chỉ upload thư mục đó, npm chạy ngay tại đấy và gãy với
  `Unsupported URL Type "workspace:"`.
- **Deploy thẳng production, không qua preview.** Bước 5 của quy trình nói deploy preview trước.
  Thực tế Deployment Protection (SSO) chặn preview nên không kiểm bằng tay được; chủ dự án chọn đi
  thẳng production.
- Hai project Vercel **chưa nối vào GitHub** (cần cài Vercel GitHub App). Push không deploy gì cả;
  mọi lần deploy đều chạy tay bằng CLI.

`vercel link` còn tự tạo `apps/api/.gitignore` chứa `.env*`, sẽ đè `!.env.example` của root trong
phạm vi thư mục đó. Đã xoá file này, chỉ thêm `.vercel/` vào `.gitignore` gốc.
