# AC2 - Khoá luật web bằng ESLint

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md)

## 1. Vấn đề

`apps/web/eslint.config.mjs` chỉ có `eslint-config-next` (core-web-vitals + typescript). Ba luật
`apps/web/CLAUDE.md` gọi là "broken first" không có check nào:

- `lib/api-client.ts` là nơi duy nhất gọi `fetch`.
- Component gọi hook của feature, không gọi `useQuery` trực tiếp.
- Import chéo feature chỉ qua entry point của feature.

Hôm nay code sạch: chỉ có một `fetch(` (`lib/api-client.ts:33`), mọi `useQuery`/`useMutation` nằm
trong `features/*/hooks` hoặc `features/*/api`. Code sạch là nhờ agent đọc doc. AC1 sẽ bỏ phần lớn
doc khỏi context, nên phải có lint giữ luật trước khi làm AC1.

`apps/api` đã giải bài toán này: `eslint-plugin-boundaries` trong `apps/api/eslint.config.mjs:51-93`,
kèm `src/__tests__/module-boundary.spec.ts` có một fixture cho mỗi chiều vi phạm. AC2 làm phiên bản
web theo đúng mẫu đó.

## 2. Mục tiêu

- `pnpm --filter web lint` báo lỗi cho cả ba luật, kèm message nói phải làm gì.
- Một test vitest chứng minh từng rule còn bật, theo mẫu `module-boundary.spec.ts`.
- Doc khớp với lint: sửa luật `components/ui/` cho đúng thực tế, ghi đủ entry point của `auth`.

Ngoài phạm vi:

- Luật "không viết literal route, dùng `ROUTES`". User không chọn khoá luật này trong PR này, vì
  pattern phải sinh từ `config/routes.ts` nên dễ vỡ.
- Enforce `components/ui/` bằng lint (xem D1).
- Thêm Prettier cho web (CI `quality-web` không có bước này). Ghi lại, để sau.

## 3. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Luật `components/ui/` | **Sửa luật cho đúng thực tế.** 12 commit đã sửa file có sẵn (contrast, size, surface) cho toàn app. Luật mới: được sửa `components/ui/` khi thay đổi áp cho mọi màn; variant chỉ một feature cần thì bọc trong `components/shared/`. Luật này cần judgment nên không đưa vào lint. |
| D2 | `lib/cache-graph.ts` | **Ngoại lệ trong lint config.** File này được phép import `features/*/api/*-keys.ts`. Code không đổi. Ngoại lệ có fixture test riêng. |
| D3 | Rule nào khoá | `boundaries` cho feature, `fetch` chỉ ở `api-client`, `@tanstack/react-query` chỉ ở các vị trí được phép. |
| D4 | Entry point của feature | `index.ts` (client-safe), `server.ts` (`server-only`), `core/index.ts` (Edge). `auth` là feature duy nhất có đủ ba entry, và `architecture.md:402,421` đã ghi điều này. `proxy.ts` và `app/dang-nhap/discord/route.ts` import `@/features/auth/core` là hợp lệ. |
| D5 | File test | Luật boundaries và react-query không áp cho `*.test.ts(x)` và helper trong `__tests__/`. Ví dụ: `__tests__/proxy.test.ts` import `core/__tests__/sign-token`, các test dựng `QueryClient` riêng. Fixture của AC2 phải nằm ngoài vùng được miễn này, xem §4.4. |

## 4. Thiết kế

### 4.1 Boundaries

Thêm `eslint-plugin-boundaries` `^7.2.0` vào devDependencies của web, cùng version api đang dùng.
Peer dependency là `eslint >=6` [verified bằng `pnpm view`], nên chạy được với `eslint ^9` của web.

Elements:

- `feature`: pattern `features/*`, capture `featureName`.
- `app`: phần còn lại (`app/`, `components/`, `hooks/`, `lib/`, `config/`, `proxy.ts`). Element này
  bắt buộc phải có. Docs của api config giải thích: boundaries bỏ qua mọi dependency mà nó không phân
  loại được cả hai đầu.

Policy: mặc định `allow`. Disallow khi đích là file của element `feature` mà:

1. nguồn nằm ngoài feature đó, kể cả nguồn ở element `app` (như `proxy.ts` hay route handler, không
   có `featureName`). Giống api, bỏ điều kiện `from`: `boundaries` đã bỏ qua phụ thuộc cùng element.
2. `fileInternalPath` của đích không phải `index.ts`, `server.ts` hay `core/index.ts`.

Cần hai pattern như api (`apps/api/eslint.config.mjs:78-81`), nhưng không copy được pattern thứ hai
`*/**` của api: nó đánh dấu mọi file lồng nhau là internal, gồm cả `core/index.ts`, nên
`proxy.ts` (import `@/features/auth/core`) sẽ đỏ, trái D4 và fixture §4.4. Viết lại cho web, ví dụ
`!(index.ts|server.ts)`, `!(core)/**`, `core/!(index.ts)` và `core/*/**` (file lồng sâu hơn trong
`core/`, như `core/__tests__/sign-token.ts`). Pattern extglob một cấp không khớp path
có dấu `/`, nên file nằm sâu sẽ lọt qua nếu thiếu pattern lồng nhau. Spec implement phải nêu pattern
của element `app` cho file ở root web (web không có `src/`, khác `{ type: 'app', pattern: 'src' }` của
api tại `eslint.config.mjs:64`).

Ngoại lệ D2: nguồn là `lib/cache-graph.ts`, đích là `features/*/api/*-keys.ts`, thì allow.

Resolver: web dùng alias `@/*` (`tsconfig.json:21-23`), nên resolver phải hiểu alias này. Nếu không,
mọi import `@/features/...` không resolve được, rule bỏ qua chúng mà không báo gì, và lint vẫn xanh.
Rủi ro resolver này đã được ghi ở `backend.md:224-226`. (Lỗi ngày 2026-09-01 ở api là chuyện khác:
nửa luật cho target lồng nhau bị tắt im lặng, xem `apps/api/CLAUDE.md:28`.) Fixture "vi phạm phải
đỏ" ở §4.4 có mặt để bắt đúng lỗi này. Chọn resolver lúc implement: TypeScript resolver, hoặc `node` kèm map alias.

Message:

> Import another feature through its entry point: index.ts (client-safe), server.ts (server-only) or
> core/index.ts (Edge). Do not reach into its internal files.

### 4.2 `fetch`

- `no-restricted-globals` cho `fetch`.
- `no-restricted-properties` cho `window.fetch` và `globalThis.fetch`.
- Tắt cả hai cho `lib/api-client.ts`.

Message:

> Call the backend through apiFetch in lib/api-client.ts, wrapped by the feature's api/ function.

### 4.3 `@tanstack/react-query`

Dùng `@typescript-eslint/no-restricted-imports` với `allowTypeImports: true`, để `import type
{ QueryKey }` vẫn được phép ở mọi nơi.

Được phép import ở:

- `features/*/hooks/**` và `features/*/api/**`
- `hooks/**`: `use-invalidate.ts` là hook dùng chung
- `components/providers.tsx`: dựng `QueryClientProvider`
- `lib/cache-graph.ts`
- file test (D5)

Đã kiểm tra bằng grep ngày 2026-10-10: mọi file import `@tanstack/react-query` ngoài
`features/*/{hooks,api}` đều nằm trong danh sách trên.

Message:

> Components call the feature's hook; only features/*/hooks and features/*/api talk to TanStack
> Query.

### 4.4 Test giữ rule

Tạo `apps/web/__tests__/lint-rules.test.ts`. Test spawn ESLint thật với `--no-ignore --format json`
trên từng fixture, giống `lintBoundaryErrors` của api. Đặt timeout 60 s, vì ESLint chạy mất vài giây.

| Fixture | Kỳ vọng |
|---|---|
| Feature A import file nội bộ của feature B | 1 lỗi boundaries |
| `components/` import file nội bộ của một feature | 1 lỗi boundaries |
| Import file nằm sâu hơn gốc feature (`features/x/lib/sub/y.ts`) | 1 lỗi boundaries |
| Import file lồng sâu trong `core/` (`features/auth/core/<sub>/x.ts`) | 1 lỗi boundaries |
| Component gọi `fetch` | 1 lỗi `no-restricted-globals` |
| Component import `useQuery` | 1 lỗi `no-restricted-imports` |
| `lib/cache-graph.ts` thật | 0 lỗi (ngoại lệ D2 còn hiệu lực) |
| `proxy.ts` thật (import `auth/core`) | 0 lỗi (entry D4) |
| Một component thật import qua `index.ts` | 0 lỗi (control: rule không "đúng" nhờ cấm hết) |

Fixture được liệt kê từng file trong `eslint.config.mjs` (global ignore), giống `BOUNDARY_FIXTURES`
của api, để một fixture mới không tự lọt khỏi lint. Fixture phải nằm ở path mà element `feature`
phân loại được, nhưng không bị miễn theo D5. Ví dụ: `features/attendance/__lint_fixtures__/…`.

TDD: viết test trước, chạy và thấy đỏ trên config hiện tại. Sau đó mới thêm rule.

### 4.5 Doc

- `apps/web/CLAUDE.md`: thay dòng `components/ui/` bằng luật D1. Thêm `core/index.ts` vào câu về
  entry point. Ghi rằng ba luật này do `eslint.config.mjs` enforce.
- `apps/web/docs/frontend.md` §9: đổi hàng "Editing `components/ui/button.tsx`" theo D1. §4 thêm một
  câu cho biết lint enforce và test nào giữ rule.
- `docs/architecture.md` §4.2: thêm một câu tương tự, nếu đoạn đó đang mô tả cách enforce.

## 5. Tiêu chí xong

- `pnpm --filter web lint`, `typecheck` và `test` đều xanh trên code hiện tại, không sửa file nguồn
  nào ngoài config, test, fixture và doc.
- Bỏ một rule khỏi config thì `lint-rules.test.ts` đỏ ít nhất một case.
- CI không đổi: `quality-web` đã chạy `pnpm --filter web lint`, `frontend-test` chạy vitest.

## 6. Kích thước và PR

Một PR, branch `chore/web-lint-boundaries`. Ước tính:

| Phần | Dòng |
|---|---|
| `eslint.config.mjs` | ~90 |
| `lint-rules.test.ts` | ~110 |
| 5 fixture | ~30 |
| Doc | ~30 |
| `package.json` + `pnpm-lock.yaml` | ~15 (plugin đã có trong lockfile cho api) |
| **Tổng** | **~275** |

## 7. Rủi ro

- Lint chậm hơn: boundaries resolve mọi import. Đo `time pnpm --filter web lint` trước và sau, rồi ghi
  vào PR.
- Resolver sai alias làm rule tắt mà không báo gì. Fixture đỏ ở §4.4 là chỗ chặn rủi ro này.
