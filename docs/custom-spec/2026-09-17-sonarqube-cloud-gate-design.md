# SonarQube Cloud — cổng chất lượng code thứ chín

Ngày: 2026-09-17 · Phạm vi: `.github/workflows/ci.yml`, `sonar-project.properties`, cấu hình
coverage của `apps/api` và `apps/web`, `docs/production.md`.

Yêu cầu gốc: thêm một luồng kiểm tra chất lượng code bằng SonarQube Cloud **bản miễn phí**, và nó
phải là một required check thật sự chặn merge — không phải một dashboard ai thích thì xem.

## Bối cảnh

### 1. Tám check hiện tại không ai hỏi câu Sonar hỏi

| Check | Câu nó trả lời |
|---|---|
| `Lint & typecheck API/web` | File này có vi phạm quy tắc ESLint nào không? Kiểu có khớp không? |
| `Backend/Frontend test` | Hành vi có đúng như test mô tả không? |
| `Build API/web` | Có build được không? |
| `Dependency review` | Dependency mới có mang advisory nào vào không? |
| `Trivy scan` | Lockfile, secret, Dockerfile có gì bẩn không? |
| `CodeQL` | Có luồng dữ liệu nào dẫn tới lỗ hổng không? |

Không cái nào hỏi: *code mới thêm vào PR này có bao nhiêu phần trăm được test?*, *có đoạn nào trùng
lặp không?*, *độ phức tạp có đang phình ra không?*, *có code smell nào tích tụ dần không?*. ESLint
đọc từng file một và chỉ biết những quy tắc đã bật; CodeQL chỉ quan tâm bảo mật. Khoảng trống này
đúng là khoảng Sonar lấp.

### 2. Free plan làm được gì cho repo này

Repo là **public** (`docs/production.md` §6 — đó cũng là lý do CodeQL, secret scanning và dependency
review đang miễn phí). SonarQube Cloud cho **quét public project không giới hạn số dòng, miễn phí**:
phân tích nhánh chính, phân tích pull request, quality gate, và coverage. Không cần trả tiền, không
cần giới hạn phạm vi.

Hai giới hạn thật sự có, và cả hai đều không chạm vào đây:
- Private repo mới bị giới hạn 50k dòng.
- Monorepo support (nhiều Sonar project trên cùng một repo) là tính năng trả tiền → dùng **một
  project duy nhất** phủ cả monorepo. Với một repo một người, chia hai project không đem lại gì.

### 3. Automatic Analysis và CI-based analysis loại trừ nhau

Mặc định SonarQube Cloud bật **Automatic Analysis** cho repo GitHub: nó tự clone và quét, không cần
CI. Nhưng Automatic Analysis **không đọc được coverage**, và khi nó đang bật thì mọi lần chạy
SonarScanner từ CI đều **fail**. Đây là cái bẫy đắt nhất của lần setup đầu tiên: workflow đỏ với một
thông báo không nói rõ nguyên nhân nằm ở một cái toggle trong web UI.

Vì đã chọn đẩy coverage lên, **Automatic Analysis phải tắt** trước khi job CI chạy lần đầu.

## Quyết định

### 1. Gate nằm trong `ci.yml`, không dựa vào GitHub App của Sonar

Một job mới tên **`SonarQube`** trong `.github/workflows/ci.yml`, chạy scanner với
`-Dsonar.qualitygate.wait=true`: scanner chờ Sonar tính xong quality gate rồi thoát mã khác 0 nếu
gate đỏ. Job đỏ → required check đỏ → không merge được.

Cách còn lại là để check `SonarQube Code Analysis` do GitHub App của Sonar post lên PR làm required
check. Không chọn, vì hai lý do: check đó do một app bên ngoài đặt tên và có thể đổi tên, và khi app
im lặng thì PR treo vô hạn ở trạng thái "đang chờ" mà không có log nào trong repo để đọc. Một job
trong `ci.yml` có log, có thể re-run, và tên do repo này đặt.

### 2. Một job tự chạy test của chính nó, không dùng artifact

Job `SonarQube` chạy `pnpm --filter api test:cov` và `pnpm --filter web test:cov` rồi mới gọi
scanner. Nghĩa là test chạy hai lần trong một CI run: một lần ở `Backend/Frontend test`, một lần ở
đây.

Cách kia — `backend-test`/`frontend-test` upload lcov thành artifact, job Sonar download — tiết kiệm
vài phút nhưng thêm bốn bước YAML, và hỏng ngay ở trường hợp thường gặp nhất của repo này: một PR chỉ
chạm `apps/web` làm `backend-test` bị skip, và bước download artifact không có gì để tải. Runner cho
repo public là **miễn phí không giới hạn phút**, nên cái phải tiết kiệm ở đây là số thứ có thể hỏng,
không phải số phút. Job tự đủ.

### 3. Gate không chặn deploy

`SonarQube` **không** nằm trong `needs` của `migrate`, `deploy-api`, `deploy-web`. Nó chặn ở chỗ
đáng chặn — cửa merge vào `main` — đúng như `Trivy scan` và `CodeQL` đang làm từ một workflow khác.
Thêm nó vào chuỗi deploy chỉ kéo dài thời gian lên production của một commit đã qua gate ở PR rồi.

### 4. Cấu hình nằm trong `sonar-project.properties` ở root

Đường dẫn source, test và lcov là thuộc tính của workspace, không phải của một lần chạy CI. Để trong
file thì scanner chạy ở máy local cũng đọc được cùng cấu hình; nhét vào `args:` của workflow thì
không. Trong workflow chỉ còn đúng một `-D`: `sonar.qualitygate.wait=true` — thứ duy nhất thuộc về
riêng CI.

### 5. Coverage: lcov từ cả hai app

- `apps/api` — Jest đã có `test:cov`; chỉ thêm reporter `lcov` vì mặc định của Jest không sinh lcov.
- `apps/web` — Vitest cần provider tách rời: thêm devDependency `@vitest/coverage-v8`, block
  `coverage` trong `vitest.config.ts`, và script `test:cov`.
- **Cả hai reporter đều đặt `projectRoot` trỏ về root của repo.** Mặc định, mỗi runner ghi đường dẫn
  trong lcov tương đối với thư mục app của nó (`src/app.module.ts`, `app/page.tsx`), còn scanner chạy
  ở root và phân giải mọi đường dẫn đó theo base dir của chính nó — không khớp file nào. Sonar không
  fail vì chuyện này, nó chỉ log một dòng "Could not resolve N file paths" rồi báo 0% coverage. Cùng
  một kiểu hỏng im lặng như đường dẫn lcov sai.

Không đẩy coverage thì điều kiện coverage trong quality gate bị **bỏ qua im lặng** (Sonar không áp
điều kiện cho metric không có dữ liệu) — gate vẫn xanh và người đọc tưởng đã được bảo vệ. Một gate
nói dối tệ hơn không có gate.

**Hệ quả phải biết trước:** quality gate mặc định *Sonar way* đòi **80% coverage trên code MỚI**.
Từ lúc gate bật, một PR thêm code không test sẽ đỏ. Đó là điều được chọn, không phải tác dụng phụ.

### 6. Thiếu `SONAR_TOKEN` thì fail to, ngay bước đầu

Cùng khuôn với job `migrate`: kiểm tra secret rỗng và thoát với một `::error::` nói rõ phải thêm gì,
ở đâu. Nếu không, scanner sẽ chết bằng một lỗi xác thực của Sonar và người đọc log phải tự đoán.

## Ranh giới

- Không thêm workflow file mới: gate này thuộc về **chất lượng code** như lint và test, và chúng đang
  ở `ci.yml`. `security.yml` là chỗ của scanner bảo mật.
- Không đụng `apps/api/src`, `apps/web/features`, `packages/shared` — không có dòng code sản phẩm nào
  đổi.
- Không thêm `.trivyignore`-kiểu file bỏ qua issue. Issue nào không sửa thì đánh dấu trong Sonar UI,
  ở đó nó nhìn thấy được và đảo ngược được.
- Không tự sửa quality gate. Dùng *Sonar way* mặc định; muốn đổi ngưỡng thì đổi trong Sonar UI và ghi
  lại lý do vào `docs/production.md`.

## Việc phải làm tay trong web UI (code không làm thay được)

1. Đăng nhập sonarcloud.io bằng GitHub, tạo organization từ tài khoản `minhhuy1201`, chọn **Free
   plan**.
2. Import project `minhhuy1201/guild-manager`, lấy `sonar.organization` và `sonar.projectKey` thật
   rồi đối chiếu với `sonar-project.properties`.
3. **Administration → Analysis Method → tắt Automatic Analysis.** Bỏ bước này thì job CI đỏ 100%.
4. Tạo token, thêm vào repo: Settings → Secrets and variables → Actions → `SONAR_TOKEN`.
5. New Code definition: **Previous version** hoặc *số ngày* — gate "trên code mới" phụ thuộc vào
   định nghĩa này.
6. Sau khi job xanh lần đầu: thêm `SonarQube` vào required status checks của ruleset `main
   protection` → **chín** check.

Thứ tự quan trọng: bước 6 đứng sau cùng. Đặt required check cho một job chưa từng xanh nghĩa là tự
khoá mọi PR lại.

## Ảnh hưởng contract

Không có. Không endpoint nào, không schema nào, không biến môi trường nào của app đổi. `SONAR_TOKEN`
là secret của CI, không phải biến runtime → không vào `env.validation.ts`, không vào `.env.example`.
