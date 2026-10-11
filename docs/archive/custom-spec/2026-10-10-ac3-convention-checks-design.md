# AC3 - Drift check và Stop hook

Ngày: 2026-10-10 · Trạng thái: **spec, đang triển khai (PR `chore/convention-checks`)** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md) · Phụ
thuộc: AC2 merge trước

## 1. Vấn đề

Ba cặp file phải khớp nhau, nhưng chỉ có chữ trong `CLAUDE.md` nhắc:

| Cặp | Luật | Hôm nay |
|---|---|---|
| `apps/api/src/config/env.validation.ts` (`envSchema`) ↔ `apps/api/.env.example` ↔ bảng ở `development.md` §3 và `production.md` §3 | `CLAUDE.md:50-51` | Schema khớp `.env.example`. `.env.example` có thêm `DIRECT_DATABASE_URL` (chỉ Prisma CLI dùng) và `DISCORD_GUILD_ID` (chỉ script dùng). Bảng doc chưa kiểm. |
| `prisma/schema.prisma` enum `GuildClass`, `GuildRole` ↔ `@guild/shared/enums` | `apps/api/CLAUDE.md:66-68` | Khớp khi so bằng mắt. Chỉ `permissions.spec.ts` assert phía shared. |
| `apps/web/tsconfig.json:21-23` paths ↔ `apps/web/vitest.config.ts:48-52` alias | `apps/web/CLAUDE.md:41-44` | Khớp (một alias catch-all). |

Ngoài ra, agent chỉ biết mình vi phạm lint hoặc typecheck khi CI đỏ, tức là sau khi đã push.
Hướng dẫn context (xem tổng quan), mục Hooks: luật phải luôn đúng thì đặt vào hook, không chỉ ghi ra chữ.

## 2. Mục tiêu

- Ba drift spec chạy trong test suite có sẵn, nên CI tự chạy mà không cần job mới.
- Stop hook chạy lint, typecheck và drift spec cho workspace có file thay đổi. Hook trả exit 2 kèm
  stderr nói rõ file nào sai và sửa thế nào.
- PostToolUse chạy Prettier cho file `apps/api/src/**/*.ts` vừa sửa. CI `quality-api` đã chạy
  `format:check`, nên lỗi format hiện chỉ lộ ra sau khi push.

Ngoài phạm vi: check nội dung cần judgment (`verifyResponse` phủ đủ, `assertNever`). Hai thứ đó để
lint (`switch-exhaustiveness-check`) hoặc review lo, không thuộc spec này.

## 3. Quyết định

| # | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Script riêng hay spec | **Spec trong test suite.** CI đã chạy `pnpm test` cho api và web, nên thêm spec là CI có ngay. Script riêng chỉ có một nơi gọi là hook, tức là seam giả: một adapter. Report HTML vẽ "một script, ba nơi gọi". Spec này đơn giản hoá: hook và CI cùng gọi lệnh `pnpm --filter … lint/typecheck/test` có sẵn. |
| D2 | Hook script nằm đâu | `.claude/hooks/check-on-stop.sh`, cạnh `pre-push-review-gate.sh`. Không đặt ở root: `CLAUDE.md` nói root `package.json` là marker, và không có gì mới thuộc về root. |
| D3 | Allow-list cho env | Hằng `ENV_EXAMPLE_ONLY = ['DIRECT_DATABASE_URL', 'DISCORD_GUILD_ID']` nằm trong spec, kèm comment lý do cho từng key. |
| D4 | Hook chạy gì | Chỉ chạy cho workspace có file đổi so với `git merge-base HEAD origin/main` cộng thay đổi chưa commit và file chưa track: `lint` + `typecheck` + drift spec của workspace đó. Không chạy full test vì quá chậm cho mỗi lần dừng. Full test để CI lo. **Bỏ qua khi không có gì mới** (user chọn, 2026-10-11): hook lưu dấu vân tay của lần pass gần nhất vào `.claude/.stop-check-passed` (git-ignored). Trùng thì exit 0 ngay, nên lượt chỉ hỏi đáp không phải chờ 12-25 s. Hai phương án bị loại: giữ nguyên (chờ ở mọi lượt), và chỉ xét thay đổi chưa commit (sót lỗi khi agent sửa rồi commit trong cùng một lượt). |
| D5 | Vòng lặp | Hook đọc `stop_hook_active` từ stdin. Nếu `true` thì exit 0, theo mẫu Stop hook của hướng dẫn context. |
| D6 | Mod thay hook? | Không. CI không gọi được mod (xem tổng quan §5). |

## 4. Thiết kế

### 4.1 Drift spec

- `apps/api/src/config/__tests__/env-example.spec.ts`
  - So `Object.keys(envSchema.shape)` với các key đọc từ `.env.example` (regex
    `^([A-Z][A-Z0-9_]*)=`), theo cả hai chiều. Trừ allow-list D3.
  - Mỗi key của schema phải xuất hiện trong `docs/development.md` và `docs/production.md`, dạng
    hàng bảng `` | `KEY` | ``. Nhắc trong văn xuôi không tính, vì `DATABASE_URL` và `AUTH_SECRET`
    xuất hiện nhiều lần ngoài bảng.
  - Mỗi key trong `ENV_EXAMPLE_ONLY` phải còn trong `.env.example` và vẫn ngoài schema.
  - Message khi đỏ nêu tên key và file thiếu.
- `apps/api/src/__tests__/prisma-enum-sync.spec.ts`
  - Mỗi enum trong `$Enums` của client đã generate có một bản cùng tên trong `@guild/shared/enums`,
    với cùng tập giá trị.
  - Enum mới thêm vào Prisma mà quên shared thì đỏ.
  - So với client đã generate, nên sau khi sửa schema phải generate lại trước khi tin kết quả local.
    CI cài lại từ đầu nên luôn đúng.
  - Cột `purpose` của bot channel cố ý là `String`, không phải enum (`schema.prisma:206`), nên không
    thuộc phạm vi spec này.
- `apps/web/__tests__/alias-sync.test.ts`
  - Mỗi key trong `compilerOptions.paths` của `tsconfig.json` có alias tương ứng trong
    `vitest.config.ts`, và ngược lại.

TDD: mỗi spec có một case âm chạy trên dữ liệu giả (thiếu key, thừa giá trị) để chứng minh nó đỏ được.

### 4.2 Stop hook

Thêm vào `.claude/settings.json`:

```json
"Stop": [{ "hooks": [{ "type": "command",
  "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/check-on-stop.sh\"", "timeout": 300 }] }]
```

`check-on-stop.sh` làm theo thứ tự:

1. Đọc stdin. Nếu `stop_hook_active` là `true` thì exit 0.
2. Lấy danh sách file đổi (so với merge-base, cộng file chưa track; không có `origin/main` thì chỉ xét
   thay đổi chưa commit). Tính dấu vân tay: hash của base, `git diff <base>`, tên và nội dung file chưa
   track. Trùng nội dung `.claude/.stop-check-passed` thì exit 0.
3. Map file đổi sang workspace: `apps/api` → `api`, `apps/web` → `web`, `packages/shared` → cả hai
   (shared đổi thì cả hai app phải typecheck lại), `packages/ci-triage` → `@guild/ci-triage` (có
   lint, typecheck và test riêng trong job CI `tooling-check`). `docs/development.md` và
   `docs/production.md` → `api` (spec env đọc hai file đó). File trong `apps/*` hoặc `packages/*` không
   map được → một dòng lỗi, không bỏ qua.
4. Với mỗi workspace: chạy `lint`, `typecheck` và drift spec của workspace đó. Gom output lỗi lại.
5. Không lỗi thì ghi dấu vân tay vào marker rồi exit 0. Có lỗi thì không ghi marker, in ra stderr
   dòng `Convention check failed. Fix these before finishing:` kèm output đã gom, rồi exit 2.
   Output mỗi lệnh lỗi giữ 60 dòng cuối.

### 4.3 PostToolUse Prettier

Matcher `Edit|Write`. Script đọc `tool_input.file_path`. File khớp `apps/api/src/**/*.ts` thì chạy
`apps/api/node_modules/.bin/prettier --write <file>`; file khớp `packages/ci-triage/src/**/*.ts` thì
chạy binary Prettier của ci-triage. Gọi binary trực tiếp, không qua `pnpm --filter … exec`, vì lệnh
đó chạy lại install và `prisma generate` mỗi lần (chậm, và đua nhau khi nhiều Edit chạy song song).
File khác thì exit 0. Không chặn gì, nên luôn exit 0. Lint của api và ci-triage đã gồm
`eslint-plugin-prettier`, nên Stop hook vẫn bắt lỗi format khi file đổi qua Bash.

## 5. Tiêu chí xong

- Ba spec xanh trên code hiện tại. Mỗi spec đỏ khi bỏ một key, một giá trị hoặc một alias.
- Chạy tay `echo '{"stop_hook_active":false}' | .claude/hooks/check-on-stop.sh` trên branch có lỗi
  lint thì exit 2 và in đúng file. Trên branch sạch thì exit 0.
- Ghi vào PR thời gian hook chạy trên một thay đổi web và trên một thay đổi api. Đo (máy dev, 2026-10-11): api (lint + typecheck + spec) 9 s, web 10 s; hook trọn vẹn khi đổi cả hai khoảng 20 s; lượt không đổi gì (trùng marker) dưới 1 s.

## 6. Kích thước

Một PR, branch `chore/convention-checks`. Thực tế: ba spec ~310, hai hook script ~120, settings ~22,
doc ~30, spec AC3 ~15, tổng **~500** (không tính file plan). Bằng ước tính ban đầu của báo cáo gốc
(~500): bỏ script và command riêng (D1) bù cho hai hook script và các check thêm ở Task 4-5.

## 7. Rủi ro

- Hook chậm có thể làm mỗi lần dừng mất hàng chục giây. Lint api là type-aware (`projectService`) nên chậm,
  cộng thêm `tsc`. Nếu quá 60 s, đổi `typecheck` sang `tsc --incremental` hoặc bỏ typecheck khỏi hook.
- Hook chỉ chạy trong Claude Code. Push từ terminal thường vẫn chỉ có CI chặn. Điều này chấp nhận
  được: hook để agent tự sửa, không phải cổng bảo mật.
