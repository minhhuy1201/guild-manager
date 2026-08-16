# Chạy migration trong CI/CD — Design

Ngày: 2026-08-16 · Phạm vi: `.github/workflows/ci.yml`, `apps/api/package.json` (script), secret của
repo, tài liệu vận hành.
**Chưa triển khai.** Spec này mô tả thiết kế đã thống nhất; phần code chưa viết.

## Bối cảnh

Pipeline hiện tại (`.github/workflows/ci.yml`, dựng ngày 2026-08-16) đã làm được: push lên `main` →
4 job kiểm thử (`backend-test`, `frontend-test`, `quality`, `build`) → `deploy-api` → `deploy-web`.
Vercel không tự deploy nữa (`git.deploymentEnabled = false`), nên đây là đường duy nhất lên
production.

Nhưng pipeline **chỉ deploy code, không đụng schema**. `docs/production.md` mục "Not in place yet"
ghi đúng rủi ro này: một bản deploy mà code trông chờ cột chưa ai migrate sẽ chết **lúc chạy**, không
phải trong CI. Hiện chủ dự án phải nhớ chạy `pnpm migrate:prod` bằng tay trước mỗi lần push — một
bước thủ công nằm giữa một quy trình đã tự động hoàn toàn.

## Quyết định

### 1. Một job `migrate` chen giữa test và deploy

```
backend-test ┐
frontend-test├→ migrate → deploy-api → deploy-web
quality      │
build        ┘
```

`migrate` giữ nguyên điều kiện của các job deploy hiện tại:
`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`. Pull request không bao giờ
chạm database thật.

`deploy-api` đổi `needs` từ danh sách 4 job kiểm thử sang `needs: [migrate]`. Xích phụ thuộc vẫn
nguyên vẹn vì `migrate` đã `needs` cả 4 job đó, và cơ chế skip của `needs` là thứ chặn deploy: job
`needs` bị bỏ qua nếu bất kỳ dependency nào fail.

Hệ quả mong muốn: **migration hỏng thì code mới không lên**. Production tiếp tục chạy code cũ với
schema cũ — trạng thái nhất quán, không phải trạng thái nửa vời.

`concurrency` của workflow không đặt `cancel-in-progress` trên `main`, nên các run xếp hàng và
migration chạy đúng thứ tự commit. Không cần thêm gì để tránh hai `migrate deploy` chồng nhau; kể cả
có, advisory lock của Prisma vẫn chặn.

### 2. Truyền connection string qua `.env.production`, không qua `env:` của job

Đây là chỗ dễ vấp nhất, và là lý do spec này tồn tại thay vì chỉ một dòng "thêm job".

`.github/actions/setup-workspace` copy `apps/api/.env.example` → `apps/api/.env` (vì `postinstall`
chạy `prisma generate`, mà `prisma.config.ts` gọi `loadPrismaEnv()` — hàm này cần có file). Còn
`loadPrismaEnv()` nạp file với **`override: true`**. Nghĩa là:

> Đặt `DATABASE_URL` ở cấp job trong YAML sẽ **bị file `.env` localhost đè lên**. Migration im lặng
> trỏ vào `localhost:5432` chứ không phải production.

Đường đi đúng là `PRISMA_ENV_FILE` — đúng cơ chế các lệnh `:prod` local vẫn dùng: job ghi
`apps/api/.env.production` từ secret, rồi gọi `pnpm --filter api migrate:prod` (script đã có sẵn,
`PRISMA_ENV_FILE=.env.production prisma migrate deploy`). `loadPrismaEnv()` nạp **đúng một file**,
không trộn với `.env`, nên không có đường nào lẫn connection string local vào.

Không viết `DATABASE_URL=$SECRET prisma migrate deploy` — cảnh báo ở `docs/production.md` mục 5 áp
dụng y nguyên: shell expand biến trước khi `dotenv` chạy.

Chỉ cần ghi `DATABASE_URL` vào file đó. `prisma.config.ts` fallback `env('DATABASE_URL')` khi
`DIRECT_DATABASE_URL` trống, mà giá trị ta đưa vào vốn đã là đường dành cho CLI.

### 3. Một secret: `PROD_DIRECT_DATABASE_URL`

Thêm ở Settings → Secrets and variables → Actions. Giá trị: **y hệt `DIRECT_DATABASE_URL` trong
`apps/api/.env.production`** hiện tại, tức session pooler `aws-*.pooler.supabase.com:5432` kèm
`?connect_timeout=30`.

Ba ràng buộc về giá trị này, không cái nào bỏ được:

- **Không dùng direct `db.<ref>.supabase.co:5432`.** Cổng đó chỉ có IPv6 (xem spec hosting
  2026-08-02), mà runner GitHub Actions không có IPv6 — biểu hiện là `P1001`.
- **Không dùng transaction pooler `:6543`.** `migrate deploy` cần advisory lock và DDL trong
  transaction, thứ transaction pooler không giữ được — đúng như comment trong `prisma.config.ts`.
- **Giữ `?connect_timeout=30`.** Prisma CLI bỏ cuộc sau 5 giây; kết nối nguội từ runner sang region
  Tokyo có thể lâu hơn thế.

Session pooler thoả cả ba: có IPv4, giữ session.

Đặt secret ở cấp repo là đủ cho dự án một người. Nếu sau này muốn một chốt chặn người thật trước mỗi
lần chạm database, chuyển nó vào GitHub **Environment `production`** có required reviewer và thêm
`environment: production` vào job — không đổi gì khác trong thiết kế.

### 4. Kiểm tra secret rỗng trước khi chạy

Cùng lý do với `deploy-vercel`: secret chưa đặt thì `prisma migrate deploy` báo lỗi theo kiểu không
gợi ý gì về nguyên nhân. Job fail sớm với thông báo chỉ thẳng vào chỗ cần sửa.

### 5. Không seed, không `migrate dev`, không sinh migration trong CI

CI chỉ chạy `migrate deploy` — lệnh này chỉ áp dụng migration **đã có trong repo**, không bao giờ
sinh mới và không bao giờ hỏi. Migration vẫn được tạo ở local bằng `pnpm prisma:migrate` rồi commit,
như `docs/production.md` mục 5 đã quy định.

Seed vẫn chạy tay. Nó ghi dữ liệu nghiệp vụ (roster), không phải schema; chạy tự động mỗi lần push là
một loại tác dụng phụ không ai muốn bất ngờ.

## Phác thảo job

```yaml
  # Migration chạy sau khi test xanh và TRƯỚC khi deploy code mới. Migration hỏng thì deploy-api bị
  # skip theo cơ chế needs, production giữ nguyên code cũ + schema cũ.
  migrate:
    name: Migrate database
    needs: [backend-test, frontend-test, quality, build]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: ./.github/actions/setup-workspace

      # Không đặt DATABASE_URL ở cấp job: setup-workspace dựng apps/api/.env từ template, và
      # loadPrismaEnv() nạp file đó với override: true — biến của job sẽ bị đè bằng localhost.
      # PRISMA_ENV_FILE (script migrate:prod) là đường duy nhất chỉ định đúng một file.
      - name: Write the production env file
        env:
          DIRECT_DATABASE_URL: ${{ secrets.PROD_DIRECT_DATABASE_URL }}
        run: |
          if [ -z "$DIRECT_DATABASE_URL" ]; then
            echo "::error::secrets.PROD_DIRECT_DATABASE_URL rỗng hoặc chưa được đặt." >&2
            echo "Dùng session pooler (aws-*.pooler.supabase.com:5432) kèm ?connect_timeout=30." >&2
            exit 1
          fi
          printf 'DATABASE_URL=%s\n' "$DIRECT_DATABASE_URL" > apps/api/.env.production

      - run: pnpm --filter api migrate:prod

  deploy-api:
    name: Deploy API
    needs: [migrate]        # thay cho [backend-test, frontend-test, quality, build]
    ...
```

Không tách thành composite action: chỉ có một job dùng nó.

## Đánh đổi đã cân nhắc

**Migration chạy trước code mới**, nên có một khoảng vài chục giây code cũ sống với schema mới. Đây
là thứ tự đúng — ngược lại thì code mới chạy với schema cũ, hỏng ngay lập tức và hỏng lâu hơn. Nhưng
nó đặt ra một luật:

> Migration phá vỡ (drop cột, đổi tên, đổi kiểu) phải tách làm **hai lần deploy**: thêm thứ mới +
> code đọc được cả hai → deploy → migration sau mới xoá thứ cũ.

Repo đã có hai migration thuộc loại này (`20260807201245_rename_password_hash_to_password`,
`20260808120000_drop_character_password`); nếu chúng được viết sau khi có pipeline này thì đã phải
tách đôi.

**Không có rollback tự động.** `migrate deploy` chạy mỗi migration trong một transaction nên từng file
là all-or-nothing, nhưng một loạt migration thì có thể dừng giữa chừng. Cách lùi vẫn như
`docs/production.md` mục Rollback: viết migration mới đảo ngược thay đổi.

**Đã cân nhắc và bỏ:** thêm bước `migrate:prod:status` chạy trên pull request để thấy trước PR có
migration gì. Đẹp, nhưng buộc phải đưa credential production vào ngữ cảnh PR — YAGNI cho một repo một
người, và là một bề mặt tấn công không cần thiết.

## Việc chủ dự án phải tự làm

- [ ] Thêm secret `PROD_DIRECT_DATABASE_URL` vào repo (giá trị = `DIRECT_DATABASE_URL` trong
      `apps/api/.env.production`).

Không làm bước này thì job fail ngay ở bước kiểm rỗng, deploy bị chặn theo — an toàn, nhưng `main` sẽ
không deploy được cho tới khi có secret. Nên thêm secret **trước** khi merge thay đổi này.

## Tài liệu phải sửa

- [ ] `docs/production.md` mục "Not in place yet": bỏ đoạn "Migrations are still run by hand … the
      pipeline deploys code, never schema".
- [ ] `docs/production.md` mục 4: ghi thêm job `migrate` vào mô tả pipeline, và luật hai-lần-deploy
      cho migration phá vỡ.
- [ ] `docs/production.md` mục 5 ("Running migrations"): nói rõ `pnpm migrate:prod` bằng tay giờ chỉ
      dùng cho tình huống ngoại lệ; đường thường là push lên `main`.

## Test

Không có test tự động cho thay đổi này — nó là cấu hình CI, chỉ chứng minh được bằng cách chạy thật.

Kiểm chứng sau khi merge:

1. Push một commit **không có** migration mới lên `main` → job `migrate` xanh, log in ra
   `No pending migrations to apply`, `deploy-api` chạy tiếp.
2. Đọc dòng datasource ở đầu log để chắc nó trỏ `…pooler.supabase.com:5432`, **không phải**
   `localhost:5432`. Đây là bằng chứng duy nhất cho quyết định 2 — nếu thấy `localhost`, cơ chế
   `PRISMA_ENV_FILE` đã hỏng và job vẫn sẽ báo xanh.
3. Lần sau có migration thật: `pnpm migrate:prod:status` từ local trước và sau khi push, xác nhận
   pipeline đã áp dụng đúng.

## See also

- [`docs/production.md`](../../production.md) — vận hành, mục 4 (deploy) và mục 5 (migration)
- [Vercel deployment spec](2026-08-16-vercel-deployment-design.md) — vì sao pipeline có hình dạng
  hiện tại
- [database hosting spec](2026-08-02-supabase-hosting-design.md) — vì sao chọn session pooler
