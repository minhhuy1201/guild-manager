# Jev CI triage — phân loại nguyên nhân khi CI đỏ

Ngày: 2026-09-20 · Phạm vi: `packages/ci-triage` (mới), `.github/workflows/ci.yml`, `.env.example`, `docs/`.
Không đụng `apps/api/src`, `apps/web`, `packages/shared`.

## Bối cảnh

CI có chín cổng: `Backend test`, `Frontend test`, `Lint & typecheck API`, `Lint & typecheck web`,
`SonarQube`, `Build API`, `Build web`, `CodeQL`, `Security`. Khi một cổng đỏ, quy trình hiện tại là
thủ công: mở tab Actions, đọc log, tự đoán nguyên nhân, rồi quyết định *chạy lại* hay *sửa code*.

Cái đoán đó luôn rơi vào một tập nhãn đóng. Nó không cần văn xuôi, không cần một model sinh chữ. Nó
cần một phân loại có xác suất. Đó đúng là hình dạng bài toán mà **Jev** — model quyết định của
TypeSafe AI trên Vercel AI Gateway — sinh ra để giải.

### Vì sao Jev, không phải một LLM

| | LLM (Claude, GPT) | Jev |
|---|---|---|
| Đầu ra | văn xuôi tự do | Choice / Score / Boolean + phân phối xác suất |
| Xác định được | không | có — tập nhãn đóng, khai báo trước |
| Giá | tính cả input lẫn output | **$0.042 / 1M input token, output 0** |
| Hợp với | giải thích, sửa code | định tuyến, phân loại, chấm rubric |

Một lần triage gửi ~10K token log → khoảng **$0.0004**. Rẻ tới mức chi phí không phải là biến số
trong thiết kế này.

### Cái spec này **không** làm

- **Không review code.** Jev không sinh được danh sách "dòng 42 thiếu RBAC check". Việc review vẫn
  thuộc về skill `pr-review` và hook `pre-push-review-gate.sh`.
- **Không thay bất kỳ cổng nào.** Chín check hiện tại vẫn là nguồn sự thật. Jev chỉ trả lời câu hỏi
  *"cái đỏ này là loại gì"*, sau khi đã đỏ.
- **Không chặn merge.** Job CI mới chạy `if: failure()` và luôn kết thúc xanh. Gate xác suất là gate
  flaky; đưa nó vào ruleset của `main` là tự bắn vào chân.

## Quyết định thiết kế

### 1. Một package công cụ riêng, ngoài đường chạy của sản phẩm

```
packages/ci-triage/        # @guild/ci-triage — private, không app nào import
├── src/
│   ├── cli.ts             # điểm vào: đọc cờ, in kết quả, chọn exit code
│   ├── collect.ts         # lấy log của các job đỏ + danh sách file đổi
│   ├── redact.ts          # xoá thứ giống secret trước khi gửi đi
│   ├── evaluate.ts        # gọi Jev — nơi duy nhất biết tới AI Gateway
│   ├── questions.ts       # bốn câu hỏi, dưới dạng dữ liệu
│   ├── render.ts          # bản in cho người, bản JSON cho máy
│   └── cache.ts           # một kết quả cho mỗi run id
└── __tests__/
```

Lý do đặt ở `packages/` chứ không phải trong `apps/api`: nó **không phải code sản phẩm**. Nó không
được build vào Vercel Function, không được import bởi Next.js, không có mặt trong `dist` của app nào.
`pnpm-workspace.yaml` đã có glob `packages/*`, nên không cần đổi cấu hình workspace.

Lý do không đặt ở root: `package.json` ở root là **marker cho Dependabot**, không phải package —
CLAUDE.md nói rõ không có dependency và script nào thuộc về đó.

### 2. Chạy TypeScript trực tiếp, không build step

Node 24 (`.nvmrc`) strip type sẵn. `node src/cli.ts` chạy được, nên package này **không có `build`**,
không có `dist`, không cần `tsx` hay `ts-node`. Đổi lại: không dùng `enum`, `namespace`, hay
parameter property — giới hạn của type stripping. Không mất gì, đây là một script.

Dependency runtime duy nhất: `ai@^7`. Bản 7 trở lên là điều kiện bắt buộc của
`experimental_evaluate`.

### 3. State gửi cho Jev: ba mẩu, đã cắt và đã che

```ts
type TriageState = {
  failedJobs: { name: string; conclusion: string }[];
  changedFiles: string[];      // chỉ tên file, không nội dung
  logTail: string;             // đuôi log của các job đỏ, đã redact
};
```

Ba ràng buộc, theo thứ tự ưu tiên:

1. **Che trước, cắt sau.** `redact.ts` chạy trước mọi thứ khác. GitHub đã che secret của chính nó
   thành `***`, nhưng nó không biết gì về `DATABASE_URL` in ra từ một lệnh Prisma. Danh sách mẫu ở §5.
2. **Cắt theo đuôi.** Nguyên nhân thật gần như luôn nằm ở cuối log. Giữ **200 dòng cuối mỗi job đỏ**,
   trần tổng **40.000 ký tự** (~10K token). Context của `typesafe-ai/jev` là 32.000 token — cắt ở
   40K ký tự để lại biên an toàn rộng.
3. **Chỉ tên file, không diff.** Tên file đủ để Jev biết "đụng `prisma/schema.prisma`" hay "chỉ đụng
   `.md`". Nội dung diff vừa tốn token vừa mở rộng bề mặt rò rỉ mà không thêm tín hiệu cho *phân loại*.

### 4. Bốn câu hỏi

Cả bốn đi trong **một request** — Jev trả lời song song trên cùng một state, một vòng mạng.

#### `category` — `choice`

| Nhãn | Nghĩa | Hành động đúng |
|---|---|---|
| `flaky` | test không ổn định, cùng code chạy lại có thể xanh | chạy lại, rồi sửa test |
| `real_regression` | code mới làm hỏng behavior | sửa code |
| `infra` | runner, registry, mạng, Vercel lỗi | chạy lại, không phải lỗi mình |
| `migration_drift` | schema Prisma lệch với database | `prisma:migrate` / kiểm `migrate:prod:status` |
| `env_missing` | thiếu secret hoặc biến môi trường | thêm vào GitHub secret hoặc `.env` |
| `lint_format` | ESLint hoặc Prettier đỏ, runtime không sao | `pnpm --filter <app> lint:fix` / `format` |
| `dependency` | cài đặt, lockfile, hoặc advisory bảo mật | sửa `pnpm-lock.yaml` / `overrides` |

Bảy nhãn này không phải là tập tổng quát. Chúng lấy trực tiếp từ những thứ có thể đỏ trong
`ci.yml` và `security.yml` của **repo này**.

#### `rerunLikelyGreen` — `boolean`

*"Chạy lại đúng commit này, CI có khả năng xanh không?"* Trả về xác suất 0–1.

Đây là câu hỏi có giá trị hành động cao nhất, và nó **độc lập** với `category` một cách hữu ích: một
lỗi `infra` gần như luôn `rerunLikelyGreen` cao, một `real_regression` luôn thấp, còn `flaky` nằm ở
giữa — và chính chỗ giữa đó là nơi con số có ích.

#### `blastRadius` — `score`

Rubric bốn mức, thấp lên cao:

```
0  một test hoặc một file lẻ
1  một module hoặc một feature
2  nhiều module, hoặc cắt ngang cả hai app
3  schema, migration, hoặc đường deploy
```

Trả về `score` nội suy (ví dụ `2.86`) cộng xác suất từng mức. Dùng để xếp thứ tự khi nhiều thứ cùng
đỏ.

#### `ownerApp` — `choice`

`api` | `web` | `shared` | `ci_infra` | `migration`.

Monorepo có hai nửa và một contract ở giữa. Câu này nói ngay nên mở thư mục nào. Nó trùng một phần
với path filter của `ci.yml`, nhưng path filter nói *cái gì đổi*, còn câu này nói *cái gì hỏng* — hai
thứ hay lệch nhau, và chỗ lệch là chỗ đáng chú ý.

### 5. Redaction

`redact.ts` thay bằng `[redacted]` mọi thứ khớp:

- Dòng chứa tên biến nhạy cảm đã biết: `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `SONAR_TOKEN`,
  `VERCEL_TOKEN`, `AI_GATEWAY_API_KEY`, `DISCORD_*`, `CRON_SECRET`, bất cứ khoá nào kết thúc bằng
  `_TOKEN`, `_SECRET`, `_KEY`, `_PASSWORD`.
- Connection string: `postgres://…`, `postgresql://…`, `mysql://…`.
- JWT: ba đoạn base64url nối bằng dấu chấm.
- Chuỗi dài ≥ 32 ký tự thuộc `[A-Za-z0-9_-]` đứng sau dấu `=` hoặc `:`.
- Bearer token trong header in ra log.

Phía gateway có hai lớp nữa, nhưng **chỉ một lớp dùng được trên mọi plan**
(*sửa 2026-09-20, sau khi đọc bảng ở trang pricing của AI Gateway*):

| Tuỳ chọn | Tác dụng | Plan |
|---|---|---|
| `only: ['typesafe-ai']` | chặn gateway định tuyến state sang provider khác | mọi plan — luôn gửi |
| `zeroDataRetention: true` | yêu cầu provider không lưu, không train trên nội dung | **Pro trở lên** — bật qua `CI_TRIAGE_ZERO_DATA_RETENTION=1`, mặc định tắt |

```ts
providerOptions: { gateway: buildGatewayOptions(process.env) }
```

Bản spec đầu gửi cả hai vô điều kiện. Sai: tài khoản của dự án là Hobby, gửi một tuỳ chọn plan không
phục vụ chỉ biến một lỗi rõ ràng thành một lỗi khó đọc. Mặc định giải quyết ở đúng một chỗ có tên
(`buildGatewayOptions`), không rải `?? default` trong thân hàm gọi.

**Hệ quả phải nói thẳng:** trên Hobby, redaction là lớp duy nhất giữa log CI và provider. Mà
redaction là **best effort**, không phải bảo đảm. Nó nằm trong tài liệu đúng bằng những chữ này, vì
cái tệ nhất là để người dùng tin rằng nó tuyệt đối.

### 6. Hai đường chạy, một lõi

**Local** — `pnpm --filter ci-triage triage`

Tìm run đỏ gần nhất của nhánh đang đứng:
```
gh run list --branch <HEAD branch> --status failure --limit 1 --json databaseId
```
rồi lấy log. Không có run đỏ nào → in ra câu đó và thoát 0. Không cần Jev.

**CI** — job `triage` trong `ci.yml`

```yaml
needs: [ tất cả job kiểm tra ]
if: failure()
```

`github.run_id` đã biết sẵn, không cần tìm. Lấy log của từng job đỏ qua REST API:
```
GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs
GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs
```
**Không dùng `gh run view --log-failed` trong CI**: workflow run lúc đó vẫn `in_progress` (chính job
triage đang chạy), và lệnh đó từ chối một run chưa kết thúc. Endpoint theo từng job thì không.

Kết quả ghi vào `$GITHUB_STEP_SUMMARY`, và nếu là pull request thì comment lên PR — một comment duy
nhất, cập nhật tại chỗ theo `run_id` để không rải rác.

Job luôn `exit 0`. Thiếu `AI_GATEWAY_API_KEY` → in một dòng nói thiếu, thoát 0. Một công cụ chẩn đoán
không bao giờ được là lý do khiến CI đỏ thêm lần nữa.

### 7. Đầu ra

Mặc định, cho người:

```
CI triage · run 1234567890 · nhánh feat/jev-ci-triage

  Loại lỗi      flaky                  (0.78)
  Nửa hỏng      api                    (0.91)
  Chạy lại xanh 0.74
  Độ lan        1.2 / 3  (một module)

  Job đỏ        Backend test
  Gợi ý         Chạy lại run này. Nếu vẫn đỏ, đây là real_regression chứ không phải flaky.

  Chi phí       $0.00041 · 9.812 input token
```

`--json`, cho máy:

```json
{
  "runId": 1234567890,
  "branch": "feat/jev-ci-triage",
  "failedJobs": ["Backend test"],
  "answers": {
    "category":         { "type": "choice",  "choice": "flaky", "probabilities": { "flaky": 0.78, "real_regression": 0.14, "...": 0 } },
    "ownerApp":         { "type": "choice",  "choice": "api",   "probabilities": { "api": 0.91, "...": 0 } },
    "rerunLikelyGreen": { "type": "boolean", "probability": 0.74 },
    "blastRadius":      { "type": "score",   "score": 1.2, "probabilities": { "0": 0.1, "1": 0.7, "2": 0.2, "3": 0 } }
  },
  "usage": { "inputTokens": 9812 },
  "cost": "0.00041"
}
```

Schema này không phải do spec tự nghĩ ra — nó là hình dạng `result.answers` mà AI SDK trả về, giữ
nguyên. Bọc lại thành shape riêng chỉ tạo ra một chỗ nữa để lệch.

**`probabilities` là optional.** Type `EvaluationAnswer` của AI SDK khai `probabilities?` cho cả
`choice` lẫn `score` — chỉ `boolean` là luôn có `probability`. Không có phân phối thì không có cách
nào phân biệt một câu trả lời chắc chắn với một lần tung đồng xu, nên CLI xếp trường hợp đó vào mức
*không chắc* ở §8 và không gợi ý hành động.

### 8. Ngưỡng và độ tin cậy

Một xác suất 0.34 không phải là một câu trả lời. CLI phân ba mức:

| `probabilities[choice]` | Cách in |
|---|---|
| ≥ 0.70 | in nhãn kèm gợi ý hành động |
| 0.45 – 0.70 | in nhãn, đánh dấu *không chắc*, không gợi ý hành động |
| < 0.45 | in `không kết luận được` kèm hai nhãn cao nhất |

Ngưỡng nằm trong một hằng số có tên ở `questions.ts`, không rải rác trong `render.ts`.

### 9. Cache

Một `run_id` cho ra đúng một kết quả. Kết quả ghi vào
`packages/ci-triage/node_modules/.cache/triage/<runId>.json`; gọi lại cùng run id thì đọc file, không
gọi Jev. Chạy lại CI sinh run id mới, nên cache không bao giờ che một kết quả đã cũ. `--no-cache` bỏ
qua.

## Biến môi trường

| Tên | Bắt buộc | Ở đâu |
|---|---|---|
| `AI_GATEWAY_API_KEY` | có | shell của lập trình viên (`.env.local` ở root, đã git-ignore) và GitHub Actions secret |
| `GH_TOKEN` | local | `gh auth login` cấp sẵn; trong CI là `secrets.GITHUB_TOKEN` |

`AI_GATEWAY_API_KEY` là tên **chính thức** mà AI SDK và `@ai-sdk/gateway` tự đọc từ môi trường —
không đặt tên khác, vì đặt tên khác buộc phải viết code để gán lại, và đó là code tồn tại không lý do.

Đây là một dev tool, không phải app: nó **không** đi vào `apps/api/src/config/env.validation.ts` và
**không** đi vào `apps/web/config/api.ts`. Nó cũng không xuất hiện trong bảng biến môi trường của
`development.md` §3 hay `production.md` §3 — hai bảng đó mô tả runtime của sản phẩm.

## Kiểm thử

`__tests__/` cạnh `src/`, chạy bằng `node --test` (có sẵn trong Node 24, không thêm dependency test
runner nào).

| Cái gì | Kiểm bằng |
|---|---|
| `redact.ts` | log thật đã ẩn danh, chứa `DATABASE_URL=postgres://u:p@h/db`, một JWT, một `SONAR_TOKEN=…`. Khẳng định: không mẩu nào còn trong output, và dòng bình thường không bị đụng. |
| Cắt log | vào 5.000 dòng, ra ≤ 200 dòng mỗi job và ≤ 40.000 ký tự, **và giữ đúng phần đuôi**. |
| Ngưỡng | ba xác suất mẫu (0.9 / 0.55 / 0.3) cho ba dạng in khác nhau. |
| `render.ts --json` | shape khớp §7. |
| Gọi Jev | **không mock, cũng không gọi thật trong unit test.** `evaluate.ts` nhận hàm gọi qua tham số; test truyền vào một hàm trả về answer cố định. Đường gọi thật được kiểm bằng tay một lần, ghi lại ở §Xác minh của kế hoạch. |

Không viết test khẳng định Jev trả về nhãn nào — đó là hành vi của một model xác suất, không phải của
code trong repo này. Muốn đo độ chính xác thì dùng bộ case ở dưới.

## Bộ case để đo độ chính xác (tuỳ chọn, làm sau)

`packages/ci-triage/cases/*.json`: mỗi file là một log thật đã redact cộng nhãn đúng do người gán.
`pnpm --filter ci-triage eval` chạy cả bộ qua Jev và in ma trận nhầm lẫn.

Đây là thứ biến "dùng thử Jev" thành "biết Jev đúng bao nhiêu phần trăm trên chính dữ liệu của mình".
Nó cũng là cách duy nhất để chỉnh `instructions` và `criteria` có căn cứ thay vì cảm tính. Để ngoài
phạm vi đợt đầu vì nó cần log thật, mà log thật thì phải tích luỹ.

## Rủi ro đã cân nhắc

| Rủi ro | Xử lý |
|---|---|
| Log chứa secret bị gửi đi | redact + `only` pin provider + chỉ gửi đuôi log. `zeroDataRetention` chỉ có trên Pro, mặc định tắt — nên trên Hobby redact là lớp duy nhất. Vẫn là best effort, ghi rõ trong tài liệu. |
| Jev phân loại sai, người tin nhầm | ngưỡng tin cậy §8; job không chặn merge; mọi bản in đều kèm xác suất, không bao giờ in nhãn trần. |
| Phụ thuộc thêm vào một dịch vụ ngoài | công cụ hỏng thì CI vẫn chạy y nguyên. Gỡ bỏ = xoá một thư mục, một job, một dòng `.env.example`. |
| `experimental_evaluate` là API thực nghiệm | tên hàm đã mang chữ `experimental_`. Chỉ một file (`evaluate.ts`) chạm vào nó; API đổi thì sửa một chỗ. |
| Chi phí | ~$0.0004 mỗi lần, chỉ chạy khi CI đỏ, có cache theo run id. Không đáng theo dõi. |

## Bảng thay đổi

| File | Việc |
|---|---|
| `packages/ci-triage/**` | mới — toàn bộ công cụ |
| `.github/workflows/ci.yml` | thêm job `triage`, thêm filter `tooling`, thêm job lint/typecheck cho tooling |
| `.env.example` | thêm `AI_GATEWAY_API_KEY=` (placeholder) |
| `docs/ci-triage.md` | mới — tài liệu vận hành |
| `docs/architecture.md` | §2 sơ đồ thư mục, §7 một dòng trong bảng, §8 ghi chú |
| `docs/development.md` | một mục cho lệnh local |
| `CLAUDE.md` | một dòng trỏ tới `docs/ci-triage.md` |

Không file nào trong `apps/` đổi.
