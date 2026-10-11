# A5 — Hai guard thành hai adapter mỏng trên một hàm thuần · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** luật "chỉ token hợp lệ, đúng loại, mới được nhận diện" được viết **một lần** trong một
hàm thuần có test; hai guard chỉ còn khác nhau đúng một dòng; `auth.service.refresh` dùng chung hàm
đó. Kèm theo: bộ test đầu tiên cho `common/`.

**Kiến trúc:** `common/` mọc thêm một thư mục `auth/` chứa một file thuần — không Nest, không DI,
không `ExecutionContext`. Guard vẫn là guard: đọc request, gọi hàm, quyết định ném hay không.

**Tech stack:** NestJS 11, `@nestjs/jwt`, Jest.

**Spec:** [`docs/custom-spec/2026-08-21-a5-bearer-token-design.md`](../custom-spec/2026-08-21-a5-bearer-token-design.md)
· độc lập với mọi spec khác.

**Phạm vi:** `apps/api` — `common/auth` (mới), `common/guards`, `common/filters`, `common/index.ts`,
`modules/auth/auth.service.ts`. `packages/shared` **không đổi**. `apps/web` **không đổi** về code —
chỉ thấy một câu thông báo lỗi khác đi.

## Ba điểm kế hoạch chốt khác spec

1. **`VerifyToken` được phép ném, `readToken` bắt.** Spec §1 khai
   `VerifyToken = (token) => Promise<JwtPayload | null>` ("trả null thay vì ném"). Làm thế thì
   `.catch(() => null)` lại phải viết ở cả ba call site — đúng thứ spec muốn xoá. Nên đảo lại:
   `VerifyToken = (token) => Promise<JwtPayload>`, và `readToken` là chỗ **duy nhất** trong repo còn
   `.catch(() => null)`. Call site chỉ còn `(t) => this.jwt.verifyAsync<JwtPayload>(t)`.
2. **`describeException` phải `export`.** Spec yêu cầu test 4 nhánh của nó nhưng hàm đang private
   trong `all-exceptions.filter.ts`. Test qua `filter.catch()` cần giả `ArgumentsHost` — nhiều khung
   hơn phần được kiểm. Cho `export` là đủ; filter vẫn là cửa vào thật.
   *(2026-08-23: hết "khác spec" — spec A5 §Kiểm thử nay tự phát biểu quyết định này kèm lý do.)*
3. **Không tạo `common/auth/index.ts`.** `common/index.ts` re-export thẳng
   `./auth/read-bearer-token`, giống cách nó đang làm với `./clock/clock`. Một barrel cho một file là
   thừa.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/a5-bearer-token`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Một thay đổi hành vi duy nhất, có chủ ý** (spec §3): `JwtAuthGuard` bỏ phân biệt hai câu
  *"Bạn cần đăng nhập."* / *"Phiên đăng nhập không hợp lệ."*, chỉ còn **"Bạn cần đăng nhập."**. Phải
  ghi vào commit message của Task 2. Ma trận quyết định chặn/cho qua **không đổi**.
- **`common/` không import từ `modules/`** — `TOKEN_TYPE`, `TokenType`, `JwtPayload` đã ở
  `common/constants/auth.constant.ts`. ESLint (`lowerLayerRules`) áp cho `src/common/*/*.ts` nên file
  mới nằm đúng tầm kiểm.
- **`apps/api` không có path alias** — import nội bộ là đường dẫn tương đối.
- **Doc comment cho mọi hàm mới**, viết tiếng Việt như phần còn lại của repo; comment chuyển chỗ thì
  bê nguyên văn, không dịch lại.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter api typecheck` · `pnpm --filter api lint` · `pnpm --filter api test`
  - chạy một file: `pnpm --filter api test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/common/auth/read-bearer-token.ts` | `VerifyToken`, `readToken`, `readBearerToken`, `BEARER_PREFIX` (private) |
| `apps/api/src/common/auth/__tests__/read-bearer-token.spec.ts` | 7 ca của bảng quyết định |
| `apps/api/src/common/filters/__tests__/all-exceptions.filter.spec.ts` | 4 nhánh của `describeException` |

**Sửa**

| File | Việc |
|---|---|
| `apps/api/src/common/index.ts` | re-export `./auth/read-bearer-token` |
| `apps/api/src/common/guards/jwt-auth.guard.ts` | dùng `readBearerToken`; bỏ `BEARER_PREFIX`; một message |
| `apps/api/src/common/guards/optional-jwt-auth.guard.ts` | như trên, nhánh không ném |
| `apps/api/src/common/filters/all-exceptions.filter.ts` | `export function describeException` |
| `apps/api/src/modules/auth/auth.service.ts:62-69` | dùng `readToken` |

---

### Task 0: Nhánh làm việc

- [ ] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree chỉ có file kế hoạch này. Nếu bẩn hơn: dừng, hỏi người
dùng.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/a5-bearer-token
git rev-parse --abbrev-ref HEAD
```

- [ ] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter api test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: `read-bearer-token.ts` — một hàm thuần, hai tầng

Task này **chỉ tạo file mới và test**. Guard chưa đụng tới.

**Files:**
- Create: `apps/api/src/common/auth/read-bearer-token.ts`
- Test: `apps/api/src/common/auth/__tests__/read-bearer-token.spec.ts`

**Interfaces:**
- Produces:
  - `type VerifyToken = (token: string) => Promise<JwtPayload>`
  - `readToken(token: string, verify: VerifyToken, expectedType: TokenType): Promise<JwtPayload | null>`
  - `readBearerToken(header: string | undefined, verify: VerifyToken, expectedType: TokenType): Promise<JwtPayload | null>`

- [ ] **Bước 1: Viết test đỏ**

`apps/api/src/common/auth/__tests__/read-bearer-token.spec.ts`:

```ts
import { ADMIN_ROLE } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../constants/auth.constant';
import { readBearerToken, readToken } from '../read-bearer-token';

/** Payload access token hợp lệ dùng chung cho mọi ca. */
const ACCESS: JwtPayload = {
  sub: 'admin',
  role: ADMIN_ROLE,
  type: TOKEN_TYPE.access,
};

/**
 * Dựng một hàm verify giả trả payload cho trước.
 * @param payload - Payload mà verify sẽ trả về
 * @returns Hàm verify luôn thành công
 */
function verifiesAs(payload: JwtPayload) {
  return () => Promise.resolve(payload);
}

/** Verify giả luôn ném — token hỏng, sai chữ ký, hoặc hết hạn. */
const rejects = () => Promise.reject(new Error('jwt expired'));

describe('readBearerToken', () => {
  it('không có header thì null', async () => {
    await expect(
      readBearerToken(undefined, verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('scheme khác Bearer thì null', async () => {
    await expect(
      readBearerToken('Token abc', verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('đúng prefix nhưng token rỗng thì null', async () => {
    // 'Bearer ' lọt startsWith; chặn nằm ở verify('') ném.
    await expect(
      readBearerToken('Bearer ', rejects, TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('token hỏng hoặc hết hạn thì null', async () => {
    await expect(
      readBearerToken('Bearer abc', rejects, TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('access token hợp lệ thì trả payload', async () => {
    await expect(
      readBearerToken('Bearer abc', verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toEqual(ACCESS);
  });
});

describe('readToken', () => {
  it('refresh token gửi vào chỗ đợi access thì null', async () => {
    const refresh: JwtPayload = { ...ACCESS, type: TOKEN_TYPE.refresh };

    await expect(
      readToken('abc', verifiesAs(refresh), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('access token gửi vào chỗ đợi refresh thì null', async () => {
    await expect(
      readToken('abc', verifiesAs(ACCESS), TOKEN_TYPE.refresh),
    ).resolves.toBeNull();
  });

  it('đúng loại thì trả payload', async () => {
    const refresh: JwtPayload = { ...ACCESS, type: TOKEN_TYPE.refresh };

    await expect(
      readToken('abc', verifiesAs(refresh), TOKEN_TYPE.refresh),
    ).resolves.toEqual(refresh);
  });

  it('payload thiếu type thì null', async () => {
    const noType = { sub: 'admin', role: ADMIN_ROLE } as JwtPayload;

    await expect(
      readToken('abc', verifiesAs(noType), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- read-bearer-token
```

Kết quả mong đợi: FAIL — `../read-bearer-token` không tồn tại.

- [ ] **Bước 3: Cài đặt**

`apps/api/src/common/auth/read-bearer-token.ts`:

```ts
import type { JwtPayload, TokenType } from '../constants/auth.constant';

/** Prefix của header Authorization theo chuẩn Bearer, phân biệt hoa thường như `startsWith`. */
const BEARER_PREFIX = 'Bearer ';

/**
 * Verify chữ ký và hạn của một JWT.
 * Được phép ném — `readToken` là chỗ duy nhất bắt lỗi đó.
 */
export type VerifyToken = (token: string) => Promise<JwtPayload>;

/**
 * Verify một token và kiểm đúng loại.
 *
 * Mọi kiểu không hợp lệ đều quy về một giá trị: token hỏng, sai chữ ký, hết hạn, hoặc đúng chữ ký
 * nhưng sai loại (refresh token gửi vào route cần access) — tất cả cho `null`. Người gọi quyết định
 * `null` nghĩa là "chặn" hay "khách ẩn danh".
 * @param token - Token trần, không có prefix
 * @param verify - Hàm verify JWT; được phép ném
 * @param expectedType - Loại token bắt buộc phải khớp
 * @returns Payload đã verify và đúng loại, hoặc null
 */
export async function readToken(
  token: string,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  const payload = await verify(token).catch(() => null);

  return payload?.type === expectedType ? payload : null;
}

/**
 * Đọc và verify token trong header Authorization.
 * Thiếu header hoặc sai scheme cũng cho `null`, cùng đường với token hỏng.
 * @param header - Giá trị header Authorization, undefined khi không có
 * @param verify - Hàm verify JWT; được phép ném
 * @param expectedType - Loại token bắt buộc phải khớp
 * @returns Payload đã verify và đúng loại, hoặc null
 */
export async function readBearerToken(
  header: string | undefined,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  if (!header?.startsWith(BEARER_PREFIX)) return null;

  return readToken(header.slice(BEARER_PREFIX.length), verify, expectedType);
}
```

- [ ] **Bước 4: Re-export ở `common/index.ts`**

Thêm dòng đầu danh sách (đang xếp theo alphabet của đường dẫn):

```ts
export * from './auth/read-bearer-token';
```

- [ ] **Bước 5: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- read-bearer-token
pnpm --filter api typecheck
pnpm --filter api lint
```

Kết quả mong đợi: PASS, typecheck và lint sạch.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/common
git commit -m "feat(api): add a pure bearer token reader with tests

The rule 'only a valid token of the expected type is recognised' was written
three times. It now lives in one pure function that takes a verify callback,
so it can be tested without booting a Nest module."
```

---

### Task 2: Hai guard thành hai adapter

**Files:**
- Modify: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Modify: `apps/api/src/common/guards/optional-jwt-auth.guard.ts`

**Interfaces:**
- Consumes: `readBearerToken` (Task 1)
- `AuthenticatedRequest` giữ nguyên chỗ cũ (`jwt-auth.guard.ts`) — guard optional vẫn import từ đó.

- [ ] **Bước 1: `jwt-auth.guard.ts`**

Xoá hằng `BEARER_PREFIX` (`:12-13`), thêm `readBearerToken` vào import. `TOKEN_TYPE` và `JwtPayload`
vẫn cần. Thân `canActivate` còn:

```ts
  /**
   * Kiểm tra access token của request.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns true khi token hợp lệ
   * @throws UnauthorizedException khi thiếu token, token sai/hết hạn, hoặc không phải access token
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const payload = await readBearerToken(
      request.headers.authorization,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.access,
    );

    // Một câu cho mọi trường hợp: với người dùng, thiếu token và token hỏng dẫn tới cùng một hành
    // động; với kẻ dò, phân biệt hai ca là thông tin thừa.
    if (!payload) throw new UnauthorizedException('Bạn cần đăng nhập.');

    request.user = payload;
    return true;
  }
```

- [ ] **Bước 2: `optional-jwt-auth.guard.ts`**

```ts
  /**
   * Đọc và verify access token nếu có, gắn payload vào `request.user`.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns Luôn true — token hỏng/thiếu chỉ đồng nghĩa "không đăng nhập"
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const payload = await readBearerToken(
      request.headers.authorization,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.access,
    );

    if (payload) request.user = payload;

    return true;
  }
```

Không gán khi `payload` null — `@CurrentUser()` đã xử lý `undefined`
(`attendance.controller.ts` truyền `user ?? null`).

- [ ] **Bước 3: Kiểm tra**

```bash
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
grep -rn "BEARER_PREFIX" apps/api/src
```

Kết quả mong đợi: ba lệnh đầu sạch; `grep` ra **đúng một** dòng — trong `read-bearer-token.ts`.

- [ ] **Bước 4: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/common/guards
git commit -m "refactor(api): make both jwt guards adapters over readBearerToken

BEHAVIOUR CHANGE: JwtAuthGuard no longer distinguishes a missing Authorization
header from a broken token. Both now answer 'Bạn cần đăng nhập.' The two cases
lead a user to the same action, and telling a prober which one it was is free
information. The allow/deny matrix is unchanged and locked by
common/auth/__tests__/read-bearer-token.spec.ts."
```

---

### Task 3: `auth.service.refresh` dùng `readToken`

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts:62-69`

**Interfaces:**
- Consumes: `readToken` (Task 1), import từ `'../../common'`

- [ ] **Bước 1: Kiểm tra test hiện có đang khoá đúng hành vi**

`auth.service.spec.ts` đã có 3 ca cho `refresh`: access token dùng thay refresh, token hết hạn, tài
khoản bị bỏ khỏi danh sách. Không cần thêm — Task 3 không đổi hành vi. Chạy trước để có mốc:

```bash
pnpm --filter api test -- auth.service
```

Kết quả mong đợi: PASS.

- [ ] **Bước 2: Đổi thân `refresh`**

```ts
  async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const payload = await readToken(
      input.refreshToken,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.refresh,
    );

    if (!payload) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }
    if (!this.adminUsernames.includes(payload.sub)) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    return this.issueTokens(payload.sub);
  }
```

Cập nhật import ở `:12`: thêm `readToken`. `TOKEN_TYPE` và `JwtPayload` vẫn dùng.

- [ ] **Bước 3: Chạy test cho chắc là vẫn xanh**

```bash
pnpm --filter api test -- auth.service
pnpm --filter api typecheck
grep -rn "catch(() => null)" apps/api/src
```

Kết quả mong đợi: PASS **không sửa một dòng test nào**; `grep` ra **đúng một** dòng — trong
`read-bearer-token.ts`.

- [ ] **Bước 4: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/auth
git commit -m "refactor(api): verify the refresh token through readToken

Third and last copy of 'verify, swallow the throw, check the type'. Behaviour
is unchanged; auth.service.spec.ts passes untouched."
```

---

### Task 4: Test cho `describeException`

**Files:**
- Modify: `apps/api/src/common/filters/all-exceptions.filter.ts:74`
- Test: `apps/api/src/common/filters/__tests__/all-exceptions.filter.spec.ts`

**Interfaces:**
- Produces: `export function describeException(exception: unknown): { message: string; errors?: unknown }`

- [ ] **Bước 1: Viết test đỏ**

`apps/api/src/common/filters/__tests__/all-exceptions.filter.spec.ts`:

```ts
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

import { describeException } from '../all-exceptions.filter';

describe('describeException', () => {
  it('exception lạ không lộ chi tiết ra ngoài', () => {
    expect(describeException(new Error('connect ECONNREFUSED 5432'))).toEqual({
      message: 'Lỗi hệ thống, vui lòng thử lại sau.',
    });
  });

  it('HttpException với payload chuỗi lấy nguyên câu đó', () => {
    const exception = new HttpException('Trận này đã đánh xong.', HttpStatus.CONFLICT);

    expect(describeException(exception)).toEqual({
      message: 'Trận này đã đánh xong.',
    });
  });

  it('payload có message mảng thì nối lại bằng dấu phẩy', () => {
    const exception = new BadRequestException({
      message: ['Tên không được rỗng', 'Ngày không hợp lệ'],
    });

    expect(describeException(exception)).toMatchObject({
      message: 'Tên không được rỗng, Ngày không hợp lệ',
    });
  });

  it('giữ nguyên errors của lỗi validate Zod', () => {
    const errors = { name: ['Bắt buộc'] };
    const exception = new BadRequestException({
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });

    expect(describeException(exception)).toEqual({
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  });

  it('payload không có message dùng message của exception', () => {
    const exception = new HttpException({ statusCode: 418 }, 418);

    expect(describeException(exception)).toMatchObject({
      message: exception.message,
    });
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- all-exceptions
```

Kết quả mong đợi: FAIL — `describeException` chưa được export.

- [ ] **Bước 3: `export` hàm**

Ở `:74`, đổi `function describeException(` thành `export function describeException(` và thêm một
câu vào doc comment nói vì sao nó public:

```ts
/**
 * Tách message và chi tiết lỗi ra khỏi exception.
 * Export để `__tests__` kiểm bốn nhánh trực tiếp, không phải dựng `ArgumentsHost` giả.
 * @param exception - Exception cần mô tả
 * @returns Message hiển thị được, kèm `errors` khi là lỗi validate nhiều trường
 */
```

- [ ] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- all-exceptions
pnpm --filter api typecheck
pnpm --filter api lint
```

- [ ] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/common/filters
git commit -m "test(api): cover the four branches of describeException

Nothing under common/filters had a test, and this function decides what every
error response says."
```

---

### Task 5: Rà soát cuối

- [ ] **Bước 1: Rà không còn bản sao nào**

```bash
grep -rn "BEARER_PREFIX\|catch(() => null)" apps/api/src
grep -rn "Phiên đăng nhập không hợp lệ" apps/api/src
```

Kết quả mong đợi: lệnh 1 ra **đúng hai** dòng, cả hai trong `read-bearer-token.ts`. Lệnh 2 không ra
dòng nào.

- [ ] **Bước 2: Kiểm tra toàn bộ**

```bash
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
```

Kết quả mong đợi: cả ba sạch. Dán số suite/số test vào phần báo cáo — không tuyên bố "xong" khi chưa
nhìn thấy output.

- [ ] **Bước 3: Kiểm tay hai đường xác thực**

```bash
pnpm --filter api dev   # ở một terminal khác
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/auth/me'
curl -s 'http://localhost:3001/auth/me' -H 'Authorization: Bearer hong' | head -c 200
```

Kết quả mong đợi: `401` cho cả hai, và câu trong body là **"Bạn cần đăng nhập."** ở cả hai ca — đây
là thay đổi hành vi đã chốt. (Cổng lấy theo `PORT` trong `apps/api/.env`.)

- [ ] **Bước 4: Kiểm nhanh màn hình hết phiên trên web**

Mở app web, xoá cookie phiên, gọi một trang cần đăng nhập. Kỳ vọng: thấy câu mới, không thấy lỗi
trắng màn.

- [ ] **Bước 5: Review và báo cáo**

Chạy `/code-review` trên nhánh, sửa những gì đáng sửa, rồi tóm tắt cho người dùng: các commit đã tạo,
output của `pnpm --filter api test`, và ba điểm kế hoạch chốt khác spec.

---

## Ngoài phạm vi (theo spec)

- Chấp nhận prefix `bearer` viết thường (RFC 7235 nói scheme là case-insensitive). Giữ nguyên hành vi
  hiện tại; ghi lại như một câu hỏi riêng.
- Đổi API sang cookie-based auth.
- Thêm role thứ hai / phân quyền chi tiết — `readToken` sẵn sàng cho việc đó, spec này không làm.
- Test cho `TransformInterceptor` và `LoggingInterceptor` — spec chỉ yêu cầu hai file test ở trên.
