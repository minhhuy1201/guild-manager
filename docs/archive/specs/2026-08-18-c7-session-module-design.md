# C7 — Seam phiên đăng nhập: một interface, có test

Ngày: 2026-08-18 · Phạm vi: `apps/web/features/auth` + `apps/web/proxy.ts` + `apps/api/src/modules/auth`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Độc lập với các spec khác.

Ba file quyết định "ai được vào trang quản trị" không có test nào, và `proxy.ts` — chỗ thực thi thật
— import xuyên qua `index.ts` của feature. Spec này làm rõ seam và phủ test cho nó.

## Bối cảnh

### Interface khai báo không phải contract thật

```ts
// apps/web/features/auth/index.ts — toàn bộ file
export { LoginButton } from "./components/login-button";
export { getAccessToken, getSession } from "./api/session";
export type { SessionUser } from "./api/session";
```

Nhưng `proxy.ts` đi thẳng vào ba file nội bộ:

```ts
// apps/web/proxy.ts:3,11,12
import { refreshRequest }   from "@/features/auth/api/auth-api";
import { ACCESS_TOKEN_COOKIE, … , type AuthTokens } from "@/features/auth/lib/auth-cookies";
import { verifyJwt }        from "@/features/auth/lib/jwt";
```

Đây là chỗ **duy nhất** trong `apps/web` vi phạm luật "không import file nội bộ của feature khác"
(`frontend.md` §4.5). Và nó vi phạm vì lý do thật, không phải cẩu thả: `proxy.ts` chạy ở **Edge
runtime**, còn `api/session.ts` mở đầu bằng `import "server-only"` và dùng `next/headers` — proxy
không nạp được file đó. Ba file nội bộ kia được viết Edge-safe có chủ đích (`jwt.ts` dùng Web Crypto,
`auth-cookies.ts` cố ý không import `next/headers` — cả hai đều ghi lý do trong doc comment).

Nói cách khác: module `auth` có **hai** nhóm người dùng chạy ở hai runtime khác nhau, nhưng
`index.ts` chỉ mô tả một nhóm.

### Không có test ở chỗ nhạy cảm nhất

| File | Việc nó làm | Test |
|---|---|---|
| `features/auth/lib/jwt.ts` | verify chữ ký HS256, kiểm tra `alg`, kiểm tra `exp` | không có |
| `proxy.ts` | gia hạn phiên, chặn route admin, xoá cookie hỏng | không có |
| `features/auth/api/session.ts` | đọc/ghi/xoá cookie httpOnly | không có |
| `apps/api/src/modules/auth/auth.service.ts` | `timingSafeEqual`, phát cặp JWT | không có (module `auth` không có file spec nào) |

Đối chiếu: `features/team-builder/lib/` có 12/12 module được phủ test. Nỗ lực test đang dồn vào chỗ
rẻ, không phải chỗ rủi ro.

`jwt.ts` đáng chú ý nhất vì nó **tự cài lại** phần verify JWT: kiểm `alg !== "HS256"` để chặn tấn
công đổi thuật toán (`:76`), tự giải base64url (`:32`), tự kiểm `exp` (`:93`). Từng dòng đều đúng
theo rà soát này — nhưng "đúng vào hôm nay, không ai kiểm lại" là trạng thái không nên để một hàm
verify chữ ký nằm trong đó.

## Quyết định thiết kế

### 1. Seam đặt theo runtime, không theo "public/private"

Module `auth` có hai adapter tự nhiên, và đó là seam thật:

```
features/auth/
├── core/                 # ⭐ Edge-safe: không next/headers, không server-only
│   ├── jwt.ts            #   verifyJwt
│   ├── cookie-names.ts   #   tên cookie, maxAge, options  (auth-cookies.ts hiện tại)
│   └── index.ts          #   interface của nhóm core
├── api/
│   ├── session.ts        # adapter Server Component / Server Action (next/headers)
│   ├── auth-api.ts       # gọi backend
│   └── login-action.ts
├── components/
└── index.ts              # interface cho UI + Server Component
```

`proxy.ts` import `@/features/auth/core` — **một** đường, hợp lệ, khai báo tường minh. Không còn ba
đường dẫn sâu.

`refreshRequest` (`api/auth-api.ts`) là ngoại lệ còn lại: proxy cần nó và nó không thuộc `core`
(nó gọi HTTP qua `apiFetch`). Hai lựa chọn — chuyển `refreshRequest` vào `core/` (nó không dùng
`next/headers`, chỉ dùng `fetch`, nên Edge-safe), hoặc export nó từ `index.ts`. **Chọn chuyển vào
`core/`**: nó thuộc cùng nhóm "thứ chạy được ở Edge", và giữ `index.ts` không phình ra vì một người
dùng duy nhất.

Đây là "hai adapter làm nên một seam thật" — không phải seam giả dựng cho tương lai: hai runtime đã
tồn tại hôm nay và đã kéo ba import xuyên rào.

### 2. `getSession` vẫn là interface duy nhất của Server Component

Không đổi. `index.ts` tiếp tục export `getSession`, `getAccessToken`, `SessionUser`, `LoginButton`.
Trang quản trị vẫn gọi `getSession()`; ba lớp bảo vệ (proxy + `getSession()` trong page + guard ở
API) giữ nguyên như `frontend.md` mô tả.

### 3. Test trước, cấu trúc sau

Thứ tự quan trọng: **viết test cho hành vi hiện tại trước khi đổi chỗ file**. Đổi chỗ mà không có
lưới an toàn ở đúng phần bảo mật là kiểu rủi ro không đáng nhận.

`jwt.ts` và `auth.service.ts` test được ngay, không cần hạ tầng mới (`jwt.ts` chỉ cần Web Crypto, có
sẵn trong Node 24; `auth.service.ts` là Jest như mọi service khác). `proxy.ts` cần dựng `NextRequest`
— nặng hơn, làm sau.

### 4. Không đụng `auth.service.ts` về mặt cấu trúc

`apps/api/src/modules/auth/auth.service.ts` (134 dòng) trộn ba việc: ném exception, hàm băm thuần
(`sha256`, `matchesPassword`, `timingSafeEqual`, `:111-134`), và phát JWT (`:88-103`). Nó **không**
có Prisma — tài khoản đến từ biến môi trường, một đặc điểm riêng chỉ được ghi trong comment
(`:20-23`).

Spec này chỉ **thêm test**, không tách file. Lý do: 134 dòng chưa chạm ngưỡng ~300 của
`backend.md` §3, và phần đáng tách (hàm băm thuần) sẽ tách được an toàn hơn nhiều khi đã có test.
Nếu sau khi có test thấy nên tách `auth.crypto.ts` thì đó là bước tiếp theo, không phải bước này.

## Thay đổi cụ thể

### Giai đoạn 1 — test cho hành vi hiện tại

`apps/web/features/auth/lib/__tests__/jwt.test.ts` (Vitest, môi trường node):

- token hợp lệ ký bằng đúng secret → trả payload;
- sai secret → `null`;
- `alg: "none"` và `alg: "RS256"` → `null` **kể cả khi phần chữ ký được nặn cho khớp** (đây là bài
  test đắt giá nhất — nó khoá lại `:76`);
- `exp` đã qua → `null`;
- token thiếu đoạn, base64 hỏng, JSON hỏng → `null`, không ném;
- `sub` không phải string → `null`.

Ký token trong test bằng `crypto.subtle` để không thêm dependency.

`apps/api/src/modules/auth/__tests__/auth.service.spec.ts` (Jest):

- đăng nhập đúng → trả cặp token và `user`;
- sai mật khẩu, sai tên đăng nhập → `UnauthorizedException`, **cùng một thông báo** cho cả hai (đừng
  để thông báo tiết lộ tên đăng nhập nào có thật);
- tên đăng nhập khác hoa/thường vẫn vào được (chuẩn hoá chữ thường);
- `refresh` với access token thay vì refresh token → từ chối (kiểm tra field `type`);
- `refresh` với token hết hạn → từ chối.

### Giai đoạn 2 — dựng seam

- Tạo `features/auth/core/`, chuyển `lib/jwt.ts` → `core/jwt.ts`,
  `lib/auth-cookies.ts` → `core/cookie-names.ts`, `api/auth-api.ts` → `core/auth-api.ts`, thêm
  `core/index.ts`.
- `proxy.ts` — ba import thành một: `import { … } from "@/features/auth/core"`.
- `api/session.ts` import từ `../core`.
- Nếu [C1](./2026-08-18-c1-response-contract-design.md) đã làm: `AuthTokens` đến từ
  `@guild/shared/schemas`, `core/cookie-names.ts` chỉ còn tên cookie và options.

### Giai đoạn 3 — test cho `proxy.ts`

Ba nhánh, dựng `NextRequest` trực tiếp:

- access token còn hạn → `NextResponse.next()`, không gọi `refreshRequest`;
- access hết hạn + refresh còn hạn → gọi `refreshRequest`, cookie mới có mặt **trên cả request lẫn
  response** (`renewSession:96-105` — ghi vào request là điểm tinh tế nhất của file, và hiện không
  test);
- cả hai hết hạn + đường dẫn `/xep-team` → redirect về `ROUTES.attendance`, và cookie hỏng bị xoá;
- thiếu `AUTH_SECRET` → trang công khai **vẫn vào được**, chỉ route quản trị bị chặn (`:52`,
  `readAuthSecret` cố ý không ném — hành vi này đáng được khoá lại bằng test).

## Edge case

- **`proxy.ts` không được ném lỗi.** Nó chạy trước *mọi* trang; ném là sập cả trang điểm danh công
  khai. Doc comment `:19-26` đã ghi. Test phải khẳng định điều này, và refactor không được đổi nó.
- **Xoá cookie khi phiên chết** (`:76-78`) — nếu bỏ sót, trình duyệt gửi lại token hỏng mãi mãi.
- **`matcher` của proxy** (`:107-110`) loại `_next/static`, `_next/image`, `favicon.ico`, `img/`.
  Đổi cấu trúc không được đụng vào chuỗi này.
- **`getAuthSecret()` ở `session.ts:29` thì ném, `readAuthSecret()` ở `proxy.ts:29` thì không.** Bất
  đối xứng có chủ ý (Server Component ném được, proxy thì không) — giữ, nhưng ghi lý do cạnh nhau
  sau khi hai file nằm cùng module, vì hai hàm gần giống nhau mà hành vi ngược nhau là thứ người sau
  sẽ "sửa" nhầm.
- **`AUTH_SECRET` phải giống hệt giữa hai app** — `CLAUDE.md` đã cảnh báo; test không kiểm được điều
  này, chỉ vận hành mới kiểm được.

## Kiểm thử

Xem Giai đoạn 1 và 3. Ghi chú hạ tầng: cả hai bộ test chạy ở môi trường **node** hiện có, không cần
jsdom (khác [C4](./2026-08-18-c4-formation-screen-design.md)). `apps/web/docs/frontend.md` §8 cần bổ
sung mục "auth và proxy có test" khi xong.

## Rủi ro

- **Đổi chỗ file trong feature auth chạm vào đường bảo mật.** Không gộp giai đoạn 1 và 2 vào một
  commit; test phải xanh trên cấu trúc cũ trước.
- **`server-only` là hàng rào thật.** Nếu vô tình kéo một import `next/headers` vào `core/`, build
  Edge sẽ hỏng — hỏng lúc build, không phải lúc chạy, nên rủi ro chấp nhận được.

## Ngoài phạm vi

- Tách `auth.crypto.ts` khỏi `auth.service.ts` — xem §4, sau khi có test.
- Chuyển tài khoản quản trị từ biến môi trường sang database — thay đổi domain, không phải kiến trúc.
- Dùng thư viện JWT thay `jwt.ts` tự viết: `jose` chạy được ở Edge và bỏ đi được ~90 dòng tự cài. Đáng
  cân nhắc theo luật *"ưu tiên dependency được bảo trì"*, nhưng chỉ nên đổi **sau** khi bộ test ở
  Giai đoạn 1 tồn tại — lúc đó việc thay thế là an toàn và kiểm chứng được.
