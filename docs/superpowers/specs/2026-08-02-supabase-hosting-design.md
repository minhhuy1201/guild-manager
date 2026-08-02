# Host database trên Supabase — Design

Ngày: 2026-08-02 · Phạm vi: `apps/api` (cấu hình kết nối), biến môi trường, quy trình migrate.
**Chưa triển khai.** Spec này ghi lại quyết định để lúc chuyển sang Supabase không phải dò lại từ đầu.

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

1. Tạo project Supabase, lấy cả hai connection string.
2. Đặt `DATABASE_URL` (pooler) vào `.env` của môi trường chạy thật.
3. Chạy `prisma migrate deploy` với direct connection.
4. Chạy seed nếu cần dữ liệu khởi tạo, cũng qua direct connection.
5. Xác nhận app kết nối được: `GET /api/health`.
6. Ghi chú vào README về chuyện project bị tạm dừng.

Ít việc tới mức không cần file plan riêng — đây là danh sách thao tác, không phải chuỗi thay đổi
code cần review từng bước.

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
