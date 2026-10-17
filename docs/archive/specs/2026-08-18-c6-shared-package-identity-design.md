# C6 — Một danh tính duy nhất cho `@guild/shared`

Ngày: 2026-08-18 · Phạm vi: `apps/web` + `packages/shared`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Nên làm **sau** [C1](./2026-08-18-c1-response-contract-design.md) và
[C3](./2026-08-18-c3-vn-clock-design.md): cả hai làm `apps/web` phụ thuộc package này nặng hơn, và C3
buộc phải sửa `exports` map — sửa một lần cho cả hai.

`apps/web` đang import package dùng chung bằng một alias trỏ thẳng vào file nguồn, đi vòng qua
`exports` map, và **không khai báo nó là dependency**. Spec này gộp về một đường duy nhất.

## Bối cảnh

`packages/shared/package.json` khai một interface rõ ràng:

```json
"exports": {
  "./enums":   { "types": "./enums/index.ts",        "default": "./dist/enums/index.js" },
  "./lib":     { "types": "./lib/battle-session.ts", "default": "./dist/lib/battle-session.js" },
  "./schemas": { "types": "./schemas/index.ts",      "default": "./dist/schemas/index.js" }
}
```

`apps/api` tôn trọng interface đó: `import { shiftVnDate } from '@guild/shared/lib'`
(`session-schedule.ts:10`), và `apps/api/package.json` khai `"@guild/shared": "workspace:*"`.

`apps/web` thì không:

- `apps/web/package.json` **không có** `@guild/shared` trong `dependencies` (cũng không có `zod`).
- `tsconfig.json` khai `"@shared/*": ["../../packages/shared/*"]` — trỏ vào **thư mục nguồn**, bỏ qua
  `exports` map hoàn toàn.
- 36 chỗ import qua alias đó, gồm cả đường dẫn sâu vào file nội bộ:
  `import { defaultDeadline } from "@shared/lib/battle-session"` (`session-form-dialog.tsx:6`,
  `lib/__tests__/session-deadline.test.ts:3`).
- Alias phải khai **hai lần** — `tsconfig.json` và `vitest.config.ts`. `frontend.md:120-123` đã ghi
  cái bẫy: thiếu chỗ thứ hai thì type-check xanh còn test đỏ.
- `apps/web/vercel.json:3` vẫn cài nó như một dependency:
  `pnpm install --frozen-lockfile --filter web --filter @guild/shared`. Tức build production **biết**
  quan hệ phụ thuộc này, chỉ có `package.json` là không.

Hệ quả cụ thể, không phải chuyện thẩm mỹ:

1. **Một package, hai đường build.** `apps/api` chạy `dist/*.js`; `apps/web` để Turbopack biên dịch
   thẳng `.ts`. Một lỗi chỉ xuất hiện ở bước `tsc` của package (ví dụ cấu hình `tsconfig.json` của
   package sai) sẽ làm hỏng API mà web không hề biết.
2. **`exports` map không có tác dụng ràng buộc.** Thêm file thứ hai vào `lib/` thì `apps/api` phải
   sửa `exports`, còn `apps/web` cứ import sâu là xong — nên interface của package âm thầm mất nghĩa.
   [C3](./2026-08-18-c3-vn-clock-design.md) thêm `vn-time.ts` chính là tình huống này.
3. **`pnpm` không biết quan hệ phụ thuộc.** Nó không được ghi ở đâu ngoài `vercel.json`, nên thứ tự
   build, cache và `--filter` đều dựa vào một quan hệ không khai báo.

## Quyết định thiết kế

### 1. Khai báo dependency thật

```json
// apps/web/package.json
"dependencies": { "@guild/shared": "workspace:*", … }
```

Không thêm `zod` vào `apps/web`: web chỉ import **type** từ `@guild/shared/schemas`; giá trị runtime
duy nhất nó lấy là enum và hàm trong `lib`. `dist/schemas/*.js` có `require("zod")` nhưng chỉ được
nạp nếu web thật sự import giá trị schema — hiện không. Nếu sau này cần (ví dụ validate form bằng
chính schema), lúc đó `zod` vẫn resolve được qua `node_modules` của chính package.

### 2. Import bằng tên package ở cả hai app

Đổi 36 chỗ từ `@shared/*` sang `@guild/shared/*`, và bỏ alias `@shared/*` khỏi cả `tsconfig.json`
lẫn `vitest.config.ts`.

Đặc biệt hai chỗ đang import sâu (`@shared/lib/battle-session`) đổi thành `@guild/shared/lib` — chúng
là lý do `exports` map cần một barrel cho `lib/` (xem C3 §3).

Giữ alias `@/*` như hiện tại: đó là alias nội bộ của app, không liên quan.

### 3. Chấp nhận `apps/web` phụ thuộc bước build của package

Đây là **cái giá thật** của spec này và là lý do nó chỉ ở mức *worth exploring*, không phải *strong*.

`exports` map trỏ runtime vào `dist/`, nên sau khi sửa `packages/shared` phải chạy
`pnpm --filter @guild/shared build` trước khi `apps/web` thấy thay đổi ở runtime — hôm nay Turbopack
đọc thẳng source nên không cần. Ba lý do vẫn đáng đổi:

- `apps/api` **đã** chịu ràng buộc này (`architecture.md` §2 ghi rõ), nên đây là làm cho hai app
  giống nhau chứ không phải thêm một ràng buộc mới cho dự án.
- `prepare` script chạy `tsc` khi `pnpm install`, nên `dist` luôn có sau khi cài.
- Nếu thấy phiền lúc dev, thêm `pnpm --filter @guild/shared build --watch` chạy song song — hoặc để
  script `dev` của web phụ thuộc nó.

Phương án đã cân nhắc và loại: **trỏ `exports` map vào `.ts` cho cả runtime** để bỏ hẳn bước build.
Loại vì đã thử và hỏng ở production — Vercel biên dịch TypeScript tại chỗ rồi chỉ giữ `.js`, nên
đường dẫn `.ts` trong `exports` map sẽ không còn file. Lý do này được ghi ngay trong
`packages/shared/package.json` (`"//exports"`) và trong `docs/production.md` §4. **Không lặp lại thí
nghiệm đó.**

### 4. Không đổi `"type"` của package

`packages/shared` cố ý **không** phải `"type": "module"` — `apps/api` là CommonJS dưới `nodenext`, nếu
là ESM thì import tương đối bắt buộc có đuôi `.js`, mà Turbopack của `apps/web` lại không resolve
được đuôi đó. Lý do này ghi ở `package.json` (`"//"`) và `architecture.md` §2. Spec này không đụng
vào.

## Thay đổi cụ thể

- `apps/web/package.json` — thêm `"@guild/shared": "workspace:*"`.
- `apps/web/tsconfig.json` — bỏ `"@shared/*"` khỏi `paths`.
- `apps/web/vitest.config.ts` — bỏ alias tương ứng.
- 36 import: `grep -rln "@shared/" apps/web --include='*.ts' --include='*.tsx'` rồi thay
  `@shared/enums` → `@guild/shared/enums`, `@shared/schemas` → `@guild/shared/schemas`,
  `@shared/lib/battle-session` → `@guild/shared/lib`.
- `pnpm install` để cập nhật lockfile và link workspace.
- `apps/web/vercel.json` — `installCommand` giữ nguyên; nó đã đúng, giờ mới khớp với `package.json`.

Tài liệu phải sửa theo:

- `apps/web/docs/frontend.md` §4 — đoạn *"Shared code from the workspace package is imported as
  `@shared/*`"* và cả cảnh báo "alias khai hai lần" (cảnh báo đó biến mất cùng alias).
- `apps/web/CLAUDE.md` — gạch đầu dòng cuối về hai alias.
- `docs/architecture.md` §4.2 — dòng "Import với `@/`".

## Edge case

- **`pnpm` strict `node_modules`.** Sau khi khai dependency, `apps/web/node_modules/@guild/shared` là
  symlink tới `packages/shared`. Trước đây không có symlink đó — nên nếu có script nào giả định
  đường dẫn tương đối tới `packages/`, kiểm tra lại.
- **`engineStrict: true`** ở `pnpm-workspace.yaml` — `packages/shared` khai `"node": "24.x"`, khớp.
- **Vitest resolve điều kiện nào?** Vitest chạy môi trường node, nên `exports` sẽ resolve nhánh
  `default` → `dist/*.js`. Nghĩa là **test của web sẽ chạy trên `dist`**, không phải source. Đây là
  thay đổi hành vi thật đối với `lib/__tests__/session-deadline.test.ts`: phải build package trước
  khi chạy test, nếu không test chạy trên `dist` cũ. Cân nhắc thêm `"pretest": "pnpm --filter
  @guild/shared build"` hoặc để CI chạy build package trước — **đây là điểm cần kiểm chứng thực tế
  trước khi merge.**
- **CI** (`.github/workflows/ci.yml`) đã cài toàn workspace nên `prepare` sinh `dist`; kiểm tra thứ
  tự job vẫn đúng sau thay đổi.

## Kiểm thử

Đây là refactor không đổi hành vi; cái xác nhận là các bước build chạy được:

- `pnpm --filter web typecheck` — bắt mọi import còn sót `@shared/`.
- `pnpm --filter web test` — xem Edge case về `dist`.
- `pnpm --filter web build` và `pnpm --filter api build` cùng xanh.
- Chạy tay `pnpm --filter web dev`, mở `/` và `/thiet-lap`, xác nhận enum lưu phái và
  form hạn chót vẫn đúng — đó là hai chỗ dùng giá trị runtime từ package.
- Deploy preview một lần trước khi merge vào `main`: `vercel.json` và `exports` map là hai thứ chỉ
  hỏng ở môi trường thật, và dự án đã từng dính đúng loại lỗi này (`production.md` §4).

## Ngoài phạm vi

- Bỏ hẳn bước build của `packages/shared` — đã loại ở §3, có tiền lệ hỏng ở production.
- Chuyển package sang ESM — đã loại ở §4.
- Tách `packages/shared` thành nhiều package (`@guild/contracts`, `@guild/time`) — chưa đủ lớn để
  đáng.
