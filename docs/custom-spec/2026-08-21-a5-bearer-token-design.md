# A5 — Hai guard thành hai adapter mỏng trên một hàm thuần

Ngày: 2026-08-21 · Phạm vi: `apps/api/src/common`, `apps/api/src/modules/auth`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Độc lập với các spec khác — làm lúc nào cũng được.

## Bối cảnh

Luật "chỉ access token hợp lệ mới được nhận diện" hiện được viết ba lần.

```ts
// common/guards/jwt-auth.guard.ts:13
const BEARER_PREFIX = 'Bearer ';
// :37-52
const header = request.headers.authorization;
if (!header?.startsWith(BEARER_PREFIX)) {
  throw new UnauthorizedException('Bạn cần đăng nhập.');
}
const payload = await this.jwt
  .verifyAsync<JwtPayload>(header.slice(BEARER_PREFIX.length))
  .catch(() => null);
if (payload?.type !== TOKEN_TYPE.access) {
  throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
}
request.user = payload;
```

```ts
// common/guards/optional-jwt-auth.guard.ts:8   ← khai lại y hệt hằng số
const BEARER_PREFIX = 'Bearer ';
// :26-36
const header = request.headers.authorization;
if (!header?.startsWith(BEARER_PREFIX)) return true;
const payload = await this.jwt
  .verifyAsync<JwtPayload>(header.slice(BEARER_PREFIX.length))
  .catch(() => null);
if (payload?.type === TOKEN_TYPE.access) {
  request.user = payload;
}
return true;
```

Hai khối khác nhau **đúng một điều**: gặp `null` thì ném hay bỏ qua.

Lần thứ ba, cùng khuôn `verify → .catch(() => null) → kiểm type`, ở
`modules/auth/auth.service.ts:63-68` — chỉ đổi `TOKEN_TYPE.refresh`.

**Không file nào dưới `common/` có test.** `JwtAuthGuard`, `OptionalJwtAuthGuard`,
`AllExceptionsFilter`, `TransformInterceptor`, `LoggingInterceptor` — không spec nào. Đây là code
quyết định ai được vào route admin.

Deletion test cho `OptionalJwtAuthGuard`: xoá nó đi thì độ phức tạp **không dồn về đâu cả** — nó là
`JwtAuthGuard` bỏ nhánh ném. Interface (một class Nest + đăng ký DI + một export) gần bằng
implementation (12 dòng). Shallow.

## Quyết định thiết kế

### 1. Một hàm thuần đọc token

```ts
// common/auth/read-bearer-token.ts

/** Verify một JWT, trả null thay vì ném. */
type VerifyToken = (token: string) => Promise<JwtPayload | null>;

/**
 * Đọc và verify token trong header Authorization.
 * Thiếu header, sai prefix, token hỏng/hết hạn, hoặc sai loại token đều cho null —
 * người gọi quyết định null nghĩa là "chặn" hay "khách ẩn danh".
 * @param header - Giá trị header Authorization, undefined khi không có
 * @param verify - Hàm verify JWT (adapter quanh JwtService)
 * @param expectedType - Loại token bắt buộc phải khớp
 * @returns Payload đã verify, hoặc null
 */
export async function readBearerToken(
  header: string | undefined,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null>;
```

Nhận `verify` chứ không nhận `JwtService`: hàm giữ được tính thuần, test không cần dựng module Nest,
và đây đúng là *"accept dependencies, don't create them"*.

`BEARER_PREFIX` sống trong file này, không export — ai cần nó thì đang cần chính hàm này.

### 2. Hai guard còn là hai adapter

```ts
// jwt-auth.guard.ts
const payload = await readBearerToken(request.headers.authorization, this.verify, TOKEN_TYPE.access);
if (!payload) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
request.user = payload;
return true;
```

```ts
// optional-jwt-auth.guard.ts
const payload = await readBearerToken(request.headers.authorization, this.verify, TOKEN_TYPE.access);
if (payload) request.user = payload;
return true;
```

Khác nhau đúng một dòng — giờ nhìn thấy được.

### 3. Chấp nhận mất một sắc thái message, có chủ ý

Hiện `JwtAuthGuard` phân biệt hai câu: *"Bạn cần đăng nhập."* (không có header) và *"Phiên đăng nhập
không hợp lệ."* (có nhưng hỏng). Sau khi gộp, cả hai đều thành `null`.

Hai lựa chọn:

- **Giữ sắc thái**: hàm trả `{ payload: null, reason: 'missing' | 'invalid' }`. Interface phình lên
  để phục vụ một câu chữ.
- **Bỏ sắc thái**: một message duy nhất cho mọi trường hợp không xác thực được.

Chọn **bỏ**, và dùng câu *"Bạn cần đăng nhập."* Lý do: với người dùng, hai trường hợp dẫn tới cùng
một hành động (đăng nhập lại), và với kẻ dò thì phân biệt "thiếu" với "hỏng" là thông tin thừa. Đây
là **thay đổi hành vi**, phải ghi vào commit message và sửa test tương ứng nếu có.

### 4. `auth.service.refresh` dùng chung hàm đó

`:63-68` gọi `readBearerToken(undefined, …)` không hợp — nó nhận token trần, không phải header. Nên
tách hàm nhỏ hơn một nấc:

```ts
/** Verify một token và kiểm đúng loại. Trả null cho mọi trường hợp không hợp lệ. */
export async function readToken(token: string, verify: VerifyToken, expectedType: TokenType): Promise<JwtPayload | null>;
```

`readBearerToken` = bóc prefix + `readToken`. `auth.service.refresh` gọi `readToken(..., refresh)`.
Một module, hai hàm, hàm ngoài dựng trên hàm trong.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `common/auth/read-bearer-token.ts` (mới) | `readToken`, `readBearerToken`, `BEARER_PREFIX` (private) |
| `common/index.ts` | re-export |
| `common/guards/jwt-auth.guard.ts` | rút gọn còn ~10 dòng; bỏ `BEARER_PREFIX` |
| `common/guards/optional-jwt-auth.guard.ts` | như trên |
| `modules/auth/auth.service.ts:63-68` | dùng `readToken` |
| `common/auth/__tests__/read-bearer-token.spec.ts` (mới) | bộ test đầu tiên của `common/` |
| `common/filters/__tests__/all-exceptions.filter.spec.ts` (mới) | test `describeException` (4 nhánh) |

`common/` vẫn không import từ `modules/`: `TOKEN_TYPE` và `JwtPayload` đã nằm ở
`common/constants/auth.constant.ts`. Luật giữ nguyên.

## Edge case

- **Header có prefix đúng nhưng phần token rỗng** (`'Bearer '`): `verify('')` ném →
  `.catch(() => null)` → null. Đúng, và phải có test khoá lại.
- **Prefix sai hoa/thường** (`'bearer '`): hiện `startsWith` phân biệt hoa thường nên bị từ chối.
  Giữ nguyên hành vi — RFC 7235 nói scheme là case-insensitive, nhưng đổi ở đây là mở rộng phạm vi
  ngoài spec này; ghi lại như một câu hỏi riêng — xem "Câu hỏi còn mở" ở cuối.
- **`request.user` khi payload null** ở guard optional: không gán, giữ `undefined`. `@CurrentUser()`
  đã xử lý `undefined` (`attendance.controller.ts` truyền `user ?? null`).
- **Token đúng chữ ký nhưng `type` là `refresh`** gửi vào route admin: `null` → chặn. Đây là ca bảo
  mật quan trọng nhất và hiện **không có test nào**.

## Kiểm thử

`read-bearer-token.spec.ts`, mỗi ca một dòng, không cần `ExecutionContext` giả:

| Ca | Kỳ vọng |
|---|---|
| header `undefined` | `null` |
| header `'Token abc'` | `null` |
| header `'Bearer '` | `null` |
| token hỏng (verify ném) | `null` |
| token hết hạn | `null` |
| payload `type = refresh`, đợi `access` | `null` |
| payload `type = access`, đợi `access` | payload |

Thêm cho `describeException`: `HttpException` có message chuỗi, có mảng, lỗi Zod, lỗi lạ.

## Rủi ro

- **Đổi message là thay đổi người dùng thấy được.** Frontend hiển thị `ApiError.message` nguyên văn
  nên câu mới xuất hiện ngay; kiểm nhanh màn đăng nhập hết phiên.
- Không rủi ro về hành vi chặn: bộ test ở trên khoá đúng ma trận quyết định trước và sau.

## Ngoài phạm vi

- Đổi sang cookie-based auth cho API (web đã dùng cookie httpOnly ở tầng của nó).
- Thêm role thứ hai / phân quyền chi tiết — hàm mới sẵn sàng cho việc đó, spec này không làm.

## Câu hỏi còn mở

- **Có nên chấp nhận prefix `bearer` viết thường?** RFC 7235 nói auth scheme là case-insensitive,
  nhưng `readBearerToken` dùng `startsWith('Bearer ')` nên hiện từ chối. Chưa có client nào gửi chữ
  thường, nên chưa đổi; nếu đổi thì chỗ sửa là đúng một dòng trong
  `apps/api/src/common/auth/read-bearer-token.ts` cùng một ca test.
