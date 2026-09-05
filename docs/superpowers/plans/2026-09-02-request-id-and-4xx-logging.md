# Request ID trước guard và log 4xx — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi request bị guard từ chối đều để lại một dòng log và một `x-request-id` tra được — hôm
nay chúng biến mất không dấu vết.

**Architecture:** Đổi chỗ việc sinh request id từ `LoggingInterceptor` xuống một Express middleware
chạy **trước** tầng guard, và chia vai lại: interceptor lo đường thành công, `AllExceptionsFilter`
lo đường lỗi (kể cả 4xx, hiện chỉ log từ 500 trở lên). Không thêm dependency, không đổi shape của
response.

**Tech Stack:** NestJS 11 trên Express · `node:crypto` (`randomUUID`) · Jest.

**Spec:** không có spec riêng — thay đổi đủ nhỏ và không đổi requirement nào. Mục "Bối cảnh" bên
dưới giữ vai trò đó. Vấn đề được ghi lần đầu ở
[`2026-09-01-discord-bot.md`](2026-09-01-discord-bot.md) mục "Việc tồn đọng khác, không phải từ
review".

## Bối cảnh — vì sao cần sửa

Thứ tự pipeline của Nest:

```
middleware → GUARD → interceptor → pipe → handler → interceptor → filter
```

`LoggingInterceptor` nằm **sau** guard, mà nó lại là nơi duy nhất sinh request id
(`logging.interceptor.ts:33-37`). Guard ném `UnauthorizedException` thì interceptor không chạy, kéo
theo ba thứ cùng mất:

| Thứ | Nơi hỏng | Lý do |
|---|---|---|
| Dòng log HTTP | không có | `tap()` của interceptor không chạy |
| `x-request-id` trong response header | không có | `response.setHeader` ở interceptor không chạy |
| `requestId` trong body lỗi | rỗng | `all-exceptions.filter.ts:54` đọc header mà interceptor mới là thứ gieo vào |

Đo thật trên production `b99ad91`:

```
GET  /api/health                → 200, x-request-id: ddab9a61-030e-481c-bac5-b5197ff530c6
POST /api/discord/interactions  → 401, KHÔNG có x-request-id
GET  /api/characters (no token) → 401, KHÔNG có x-request-id
GET  /api/battle-sessions       → 401, KHÔNG có x-request-id
```

**Không phải lỗi riêng của bot.** Mọi 401 của `JwtAuthGuard` và mọi 403 của `AdminGuard` đều mù y
hệt; endpoint Discord chỉ là chỗ tình cờ nhìn thấy.

Lỗ thứ hai cùng gia đình: `logging.interceptor.ts:42` dùng `tap(() => {...})` một tham số — RxJS chỉ
gọi nhánh `next`, nên **mọi** request ném lỗi đều không có dòng log từ interceptor, kể cả khi
interceptor đã chạy. `AllExceptionsFilter` thì chỉ log khi `status >= 500`
(`all-exceptions.filter.ts:58`). Kết quả: **toàn bộ 4xx trong repo không để lại dấu vết nào trong
log** — 400 của `ZodValidationPipe`, 404 của service, 401 của guard, tất cả đều im lặng.

### Quyết định thiết kế

- **Middleware, không phải interceptor.** Chỉ middleware chạy trước guard. Đây là lý do duy nhất, và
  phải ghi trong doc comment để người sau không "dọn dẹp" nó ngược trở lại thành interceptor.
- **Interceptor lo đường thành công, filter lo đường lỗi.** Không chồng vai, không log hai lần. Vì
  vậy `tap` một nhánh ở interceptor giữ nguyên — nó đúng sau khi filter nhận phần lỗi.
- **4xx log mức `warn`, không kèm stack.** 4xx là lỗi phía gọi; stack chỉ làm nhiễu. 5xx giữ
  nguyên `error` + stack.
- **Chấp nhận log ồn hơn.** Endpoint Discord công khai trên internet nên sẽ có 401 rác. Đổi lại là
  nhìn thấy được khi có thật; im lặng tuyệt đối như hiện tại đắt hơn.
- **Id do client gửi chỉ được giữ lại khi đúng dạng** `/^[\w-]{1,64}$/`, ngoài ra sinh mới. Hành vi
  cũ của interceptor nhận nguyên si mọi giá trị; PR này mở rộng phạm vi của nó sang cả request chưa
  xác thực (401 giờ có dòng log), nên một chuỗi tuỳ ý sẽ vào log ở mức `WARN` mà không cần đăng
  nhập. Kiểm `typeof === 'string'` bịt luôn trường hợp header gửi hai lần thành `string[]`.

## Global Constraints

- Comment và tên file bằng **tiếng Anh**; nội dung trong `docs/superpowers/` bằng **tiếng Việt**.
- **Doc comment (JSDoc) cho mọi hàm export**: mục đích, từng tham số, giá trị trả về.
- Thông điệp lỗi trả ra ngoài bằng **tiếng Việt**.
- **Không thêm dependency mới.**
- `common/` **không được** import từ `modules/` hay `infrastructure/`.
- **Không có path alias** — import nội bộ dùng đường dẫn tương đối.
- Commit message tiếng Anh, Conventional Commits, **không** dòng attribution.
- Branch: `fix/log-guard-rejected-requests`. Không commit lên `main`.
- Lệnh test: `pnpm --filter api test <pattern>` (chạy từ thư mục gốc repo).
- Lint/typecheck: `pnpm --filter api lint` · `pnpm --filter api typecheck`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/common/middleware/request-id.middleware.ts` | **Tạo.** Sinh/echo request id trước mọi guard. |
| `src/common/middleware/__tests__/request-id.middleware.spec.ts` | **Tạo.** Test middleware. |
| `src/common/interceptors/logging.interceptor.ts` | **Sửa.** Bỏ phần sinh id, chỉ đọc lại và log đường thành công. |
| `src/common/interceptors/__tests__/logging.interceptor.spec.ts` | **Tạo.** Repo chưa có test cho file này. |
| `src/common/filters/all-exceptions.filter.ts` | **Sửa.** Log cả 4xx ở mức `warn`, kèm requestId. |
| `src/common/filters/__tests__/all-exceptions.filter.spec.ts` | **Sửa.** Thêm test cho `catch`, không chỉ `describeException`. |
| `src/common/index.ts` | **Sửa.** Export middleware. |
| `src/main.ts` | **Sửa.** `app.use(requestIdMiddleware)`. |

---

## Task 1: Middleware sinh request id trước guard

**Files:**
- Create: `apps/api/src/common/middleware/request-id.middleware.ts`
- Create: `apps/api/src/common/middleware/__tests__/request-id.middleware.spec.ts`
- Modify: `apps/api/src/common/index.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `REQUEST_ID_HEADER` từ `common/constants/http.constant.ts` (đã có).
- Produces:
  - `requestIdMiddleware(request: Request, response: Response, next: NextFunction): void`
  - Export qua `src/common/index.ts`.
  - Sau task này, `request.headers['x-request-id']` **luôn** có giá trị ở mọi tầng phía sau.

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/common/middleware/__tests__/request-id.middleware.spec.ts`:

```ts
import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import { requestIdMiddleware } from '../request-id.middleware';

/** A UUID v4 as `randomUUID` produces it. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Build the three arguments Express passes a middleware.
 * @param headers - Incoming request headers
 * @returns The request, the response with a recording `setHeader`, and a counting `next`
 */
function callMiddleware(headers: Record<string, string>): {
  request: Request;
  setHeader: jest.Mock;
  next: jest.Mock;
} {
  const request = { headers } as unknown as Request;
  const setHeader = jest.fn();
  const next = jest.fn();

  requestIdMiddleware(request, { setHeader } as unknown as Response, next);

  return { request, setHeader, next };
}

describe('requestIdMiddleware', () => {
  it('sinh id mới khi client không gửi', () => {
    const { request } = callMiddleware({});

    expect(String(request.headers[REQUEST_ID_HEADER])).toMatch(UUID_PATTERN);
  });

  it('giữ nguyên id client gửi, để frontend nối được log của nó với log của API', () => {
    const { request } = callMiddleware({ [REQUEST_ID_HEADER]: 'tu-frontend' });

    expect(request.headers[REQUEST_ID_HEADER]).toBe('tu-frontend');
  });

  it('gieo id vào request.headers — đây là chỗ AllExceptionsFilter đọc ra', () => {
    const { request, setHeader } = callMiddleware({});

    expect(setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      request.headers[REQUEST_ID_HEADER],
    );
  });

  it('gọi next đúng một lần để request đi tiếp', () => {
    const { next } = callMiddleware({});

    expect(next).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test request-id.middleware
```
Kỳ vọng: FAIL — `Cannot find module '../request-id.middleware'`.

- [x] **Bước 3: Viết middleware**

Tạo `apps/api/src/common/middleware/request-id.middleware.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/**
 * Give every request a correlation id before anything can reject it.
 *
 * This is Express middleware and not an interceptor on purpose: Nest runs middleware ahead of the
 * guard layer, interceptors after it. While the id was minted in `LoggingInterceptor`, every
 * request a guard rejected — each 401 and 403 the API returns — reached neither the log line nor
 * the `requestId` in its own error body. Moving this back into an interceptor reopens that hole.
 *
 * @param request - Incoming request; an id the caller supplied is kept, so a client can stitch its
 *   logs to ours
 * @param response - Outgoing response, which echoes the id back in the same header
 * @param next - Hands control to the rest of the stack
 * @returns Nothing
 */
export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = String(request.headers[REQUEST_ID_HEADER] ?? randomUUID());

  request.headers[REQUEST_ID_HEADER] = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test request-id.middleware
```
Kỳ vọng: PASS, 4 test.

- [x] **Bước 5: Export ra `common/index.ts`**

Trong `apps/api/src/common/index.ts`, thêm dòng này ngay dưới
`export * from './interceptors/transform.interceptor';` (giữ đúng thứ tự alphabet của đường dẫn —
`interceptors/` đứng trước `middleware/`):

```ts
export * from './middleware/request-id.middleware';
```

- [x] **Bước 6: Gắn middleware trong `main.ts`**

Trong `apps/api/src/main.ts`, thêm `requestIdMiddleware` vào khối import từ `'./common'`:

```ts
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
  requestIdMiddleware,
} from './common';
```

Và thêm một dòng ngay sau `const config = ...`, **trước** `app.setGlobalPrefix`:

```ts
  // Must be the first thing in the stack: middleware runs before guards, so a request a guard
  // rejects still carries an id into the error body and the response header.
  app.use(requestIdMiddleware);
```

- [x] **Bước 7: Lint + typecheck**

```
pnpm --filter api lint && pnpm --filter api typecheck
```
Kỳ vọng: không lỗi.

- [x] **Bước 8: Commit**

```bash
git add apps/api/src/common/middleware apps/api/src/common/index.ts apps/api/src/main.ts
git commit -m "fix(api): mint the request id before guards can reject the request"
```

---

## Task 2: Interceptor chỉ đọc lại id, không sinh nữa

**Files:**
- Create: `apps/api/src/common/interceptors/__tests__/logging.interceptor.spec.ts`
- Modify: `apps/api/src/common/interceptors/logging.interceptor.ts`

**Interfaces:**
- Consumes: `requestIdMiddleware` (Task 1) — đã gieo `request.headers[REQUEST_ID_HEADER]`.
- Produces: `LoggingInterceptor` không còn gọi `randomUUID` và không còn `setHeader`; chữ ký công
  khai (`intercept(context, next)`) giữ nguyên.

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/common/interceptors/__tests__/logging.interceptor.spec.ts`:

```ts
import { Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import { LoggingInterceptor } from '../logging.interceptor';

/**
 * Run the interceptor over one successful request.
 * @param headers - Request headers, as the middleware left them
 * @returns The single line the interceptor logged
 */
async function interceptAndReadLog(
  headers: Record<string, string>,
): Promise<string> {
  const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers, method: 'GET', url: '/api/characters' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;

  const next = { handle: () => of({ ok: true }) } as CallHandler;

  await firstValueFrom(new LoggingInterceptor().intercept(context, next));

  const [line] = log.mock.calls[0] as [string];
  log.mockRestore();

  return line;
}

describe('LoggingInterceptor', () => {
  it('log id do middleware gieo, không tự sinh id khác', async () => {
    const line = await interceptAndReadLog({
      [REQUEST_ID_HEADER]: 'id-tu-middleware',
    });

    expect(line).toContain('[id-tu-middleware]');
  });

  it('log method, url và status của request', async () => {
    const line = await interceptAndReadLog({ [REQUEST_ID_HEADER]: 'bat-ky' });

    expect(line).toContain('GET /api/characters 200');
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test logging.interceptor
```
Kỳ vọng: FAIL, 2 test — `TypeError: response.setHeader is not a function`.

Fake response trong test chỉ có `statusCode`, vì sau bước 3 interceptor không còn đụng tới
`setHeader` nữa — việc đó đã chuyển sang middleware. Nên chính cái đang bị gỡ mới là thứ làm test
đỏ: đây là đỏ-xanh đúng nghĩa, không phải characterization test.

*(Bản đầu của plan này dự đoán nhầm là PASS ngay; sửa lại sau khi chạy thật.)*

- [x] **Bước 3: Bỏ phần sinh id khỏi interceptor**

Trong `apps/api/src/common/interceptors/logging.interceptor.ts`:

Xoá import `randomUUID`, tức bỏ hẳn dòng:

```ts
import { randomUUID } from 'node:crypto';
```

Thay thân `intercept` (giữ nguyên chữ ký), bỏ ba dòng gieo id và `setHeader`:

```ts
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // `requestIdMiddleware` runs before every guard, so the header is always here by now.
    const requestId = String(request.headers[REQUEST_ID_HEADER]);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - startedAt;
        this.logger.log(
          `${request.method} ${request.url} ${response.statusCode} - ${elapsed}ms [${requestId}]`,
        );
      }),
    );
```

Và sửa doc comment của class cho khớp vai mới:

```ts
/**
 * Logs method, URL, status and duration of every request that succeeds.
 *
 * Failures are not logged here: `tap` with one argument only sees the `next` branch, and an
 * interceptor never runs at all when a guard rejects the request. `AllExceptionsFilter` owns the
 * failure path, so the two together cover every request exactly once.
 *
 * The correlation id comes from `requestIdMiddleware`, which runs early enough that a rejected
 * request has one too.
 */
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test logging.interceptor
```
Kỳ vọng: PASS, 2 test.

- [x] **Bước 5: Commit**

```bash
git add apps/api/src/common/interceptors
git commit -m "refactor(api): read the request id in the logging interceptor instead of minting it"
```

---

## Task 3: Filter log cả 4xx

**Files:**
- Modify: `apps/api/src/common/filters/all-exceptions.filter.ts`
- Modify: `apps/api/src/common/filters/__tests__/all-exceptions.filter.spec.ts`

**Interfaces:**
- Consumes: `requestIdMiddleware` (Task 1) — nhờ nó mà `body.requestId` khác rỗng khi guard chặn.
- Produces: `AllExceptionsFilter.catch` log **mọi** exception: `warn` một dòng cho 4xx, `error` kèm
  stack cho 5xx. Shape của `ErrorResponseBody` **không đổi**.

- [x] **Bước 1: Viết test thất bại**

Thêm vào cuối `apps/api/src/common/filters/__tests__/all-exceptions.filter.spec.ts`:

```ts
describe('AllExceptionsFilter.catch', () => {
  /**
   * Run the filter over one exception and capture what it logged and answered.
   * @param exception - The exception Nest caught
   * @returns The response body, plus the warn/error spies
   */
  function runFilter(exception: unknown): {
    body: ErrorResponseBody;
    warnLines: string[];
    errorLines: { line: string; stack: string }[];
  } {
    const warnLines: string[] = [];
    const errorLines: { line: string; stack: string }[] = [];

    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((message: unknown) => {
        warnLines.push(String(message));
      });
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((message: unknown, stack: unknown) => {
        errorLines.push({ line: String(message), stack: String(stack) });
      });

    let body = {} as ErrorResponseBody;
    const response = {
      status: () => response,
      json: (payload: ErrorResponseBody) => {
        body = payload;
      },
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/discord/interactions',
          method: 'POST',
          headers: { [REQUEST_ID_HEADER]: 'id-tu-middleware' },
        }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    new AllExceptionsFilter().catch(exception, host);

    return { body, warnLines, errorLines };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('log 4xx một dòng warn, không kèm stack — lỗi phía gọi, stack chỉ làm nhiễu', () => {
    const { warnLines, errorLines } = runFilter(
      new UnauthorizedException('Chữ ký Discord không hợp lệ.'),
    );

    expect(warnLines).toHaveLength(1);
    expect(errorLines).toHaveLength(0);
    expect(warnLines[0]).toContain('401');
  });

  it('request bị guard chặn vẫn có requestId để tra log', () => {
    // Đây chính là lỗ hổng plan này vá: trước khi có requestIdMiddleware, giá trị này là chuỗi rỗng.
    const { body } = runFilter(new UnauthorizedException('Không có quyền.'));

    expect(body.requestId).toBe('id-tu-middleware');
  });

  it('5xx vẫn log error kèm stack', () => {
    const { warnLines, errorLines } = runFilter(
      new Error('connect ECONNREFUSED 5432'),
    );

    expect(errorLines).toHaveLength(1);
    expect(warnLines).toHaveLength(0);
    expect(errorLines[0].stack).toContain('Error: connect ECONNREFUSED');
  });
});
```

Và thay dòng import đầu file bằng:

```ts
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import {
  AllExceptionsFilter,
  describeException,
  type ErrorResponseBody,
} from '../all-exceptions.filter';
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test all-exceptions.filter
```
Kỳ vọng: FAIL ở test 4xx — `warn` chưa từng được gọi, vì filter hiện chỉ log từ 500 trở lên. Hai test
còn lại PASS (requestId đã chạy được nhờ Task 1, 5xx vốn đã đúng).

- [x] **Bước 3: Sửa filter**

Trong `apps/api/src/common/filters/all-exceptions.filter.ts`, thay khối `if (status >= ...)` trong
`catch` bằng:

```ts
    const line = `${request.method} ${request.url} -> ${status} [${body.requestId}]`;

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      // A guard rejects before any interceptor runs, so without this line a 401 or 403 leaves no
      // trace anywhere. 4xx is the caller's mistake: one line, no stack.
      this.logger.warn(line);
    }
```

Và nối thêm vào doc comment của class:

```
 * It is also the only place a failed request gets logged — `LoggingInterceptor` covers the success
 * path and never runs when a guard rejects the request.
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test all-exceptions.filter
```
Kỳ vọng: PASS, 8 test (5 cũ + 3 mới).

- [x] **Bước 5: Commit**

```bash
git add apps/api/src/common/filters
git commit -m "fix(api): log 4xx responses so guard rejections stop vanishing"
```

---

## Task 4: Kiểm chứng thật rồi mở PR

- [x] **Bước 1: Chạy đủ bộ kiểm tra CI ở local**

```
pnpm --filter api test && pnpm --filter api lint && pnpm --filter api format:check && pnpm --filter api typecheck && pnpm --filter api build
```
Kỳ vọng: xanh hết. Đây đúng những gì CI chạy.

- [x] **Bước 2: Chạy API và kiểm bằng curl**

Terminal 1:

```
pnpm --filter api dev
```

Terminal 2:

```bash
curl -s -D - -o /dev/null http://localhost:3001/api/health | grep -i "^HTTP\|^x-request-id"
curl -s -D - http://localhost:3001/api/characters | grep -i "^HTTP\|^x-request-id\|requestId"
```

Kỳ vọng:

| Request | Header `x-request-id` | Body |
|---|---|---|
| `/api/health` | có | — |
| `/api/characters` không token | **có** (trước khi sửa là không) | `"requestId"` khác rỗng |

Và trong log của terminal 1 phải thấy đúng một dòng `WARN` cho request 401, mang cùng id với header.
Không thấy dòng nào → filter chưa log 4xx; thấy hai dòng cho một request → interceptor và filter đang
chồng vai, xem lại Task 2 bước 3.

- [x] **Bước 3: Kiểm cả endpoint Discord**

```bash
curl -s -D - -X POST http://localhost:3001/api/discord/interactions \
  -H 'Content-Type: application/json' -d '{"type":1}' | grep -i "^HTTP\|^x-request-id\|requestId"
```
Kỳ vọng: `401`, có `x-request-id`, body có `requestId` khác rỗng, log có một dòng `WARN`. Dừng server.

- [x] **Bước 4: Mở PR**

Nội dung theo `.github/pull_request_template.md`, tiêu đề:

```
fix(api): give guard-rejected requests a log line and a request id
```

Trong `## Note` ghi rõ: thay đổi chạm `common/`, tức **mọi endpoint**; log sẽ ồn hơn vì 4xx giờ có
dòng `warn` — đó là chủ ý, đổi lấy việc nhìn thấy được 401/403.

---

## Kiểm tra bao phủ

| Vấn đề trong "Bối cảnh" | Task |
|---|---|
| Guard chặn → không có dòng log | Task 3 |
| Guard chặn → không có `x-request-id` header | Task 1 |
| Guard chặn → `requestId` trong body rỗng | Task 1 (test khoá ở Task 3) |
| Mọi 4xx trong repo đều im lặng | Task 3 |
| `tap` một nhánh bỏ sót đường lỗi | Task 2 — giữ nguyên `tap`, chuyển vai lỗi sang filter |
| Chứng minh trên request thật, không chỉ unit test | Task 4 |
