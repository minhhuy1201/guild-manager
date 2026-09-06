# E — Khoá HMAC dựng một lần, không dựng lại mỗi request

Ngày: 2026-09-06 · Phạm vi: `apps/web/features/auth/core/jwt.ts`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Worth exploring**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

## Bối cảnh

### 1. Mỗi lần verify là một lần import khoá

`apps/web/features/auth/core/jwt.ts:45`

```ts
function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
}
```

`apps/web/features/auth/core/jwt.ts:76`

```ts
const key = await importKey(secret);
const valid = await crypto.subtle.verify("HMAC", key, ...);
```

Khoá được dựng lại ở mỗi lần gọi `verifyJwt`, dù `secret` luôn là cùng một chuỗi `AUTH_SECRET` trong
suốt vòng đời tiến trình.

### 2. Và `verifyJwt` chạy trên mọi page request

`apps/web/proxy.ts:52`

```ts
if (secret) {
  const access = await verifyJwt(accessToken, secret);
  if (access) return decide(request, access.role, NextResponse.next());

  const refresh = refreshToken ? await verifyJwt(refreshToken, secret) : null;
  ...
}
```

`config.matcher` (`proxy.ts:149`) phủ mọi route trang, trừ tài nguyên tĩnh — kể cả prefetch của Next.
Request thường: **một** lần import. Request có access token vừa hết hạn: **hai** lần.

## Quyết định

1. **Memo hoá `CryptoKey` theo `secret`** ngay trong `jwt.ts`, ở module scope. Lưu chính `Promise`
   chứ không lưu giá trị đã resolve, để hai lần gọi đồng thời cùng chờ một lần import.
2. **Khoá theo `secret`**, không phải một biến toàn cục trần: `verifyJwt` nhận secret làm tham số, và
   một cache bỏ qua tham số đó sẽ trả nhầm khoá nếu có bao giờ tồn tại hai secret. Một `Map` một phần
   tử là đủ.
3. **`verifyJwt` không đổi chữ ký.** Người gọi không biết gì về cache — nó nằm sau interface.

### Vì sao không nâng cache lên `proxy.ts`

Đó là đẩy một chi tiết của việc verify ra chỗ gọi, và `verifyJwt` còn có người gọi khác ngoài proxy
(`features/auth/server.ts`). Cache thuộc về module sở hữu phép toán, không thuộc về người gọi nó
nhiều nhất.

## Ảnh hưởng contract

**Không có.**

## Behaviour giữ nguyên

- **Secret sai / thiếu.** `readAuthSecret` vẫn log rồi trả `undefined`, nhánh `if (secret)` vẫn bỏ
  qua. Cache không được đụng tới khi không có secret.
- **Token hỏng, sai `alg`, hết hạn.** Mọi nhánh trả `null` giữ nguyên; cache chỉ nằm ở bước dựng
  khoá, không nằm ở bước quyết định.
- **`importKey` ném lỗi.** Hôm nay lỗi rơi vào `catch` ở dòng 95 và thành `null`. Khi cache
  một `Promise` bị reject, nó phải **không** được giữ lại — nếu giữ, một lần hỏng nhất thời sẽ khoá
  chết mọi lần verify sau đó cho tới khi tiến trình chết. Đây là điểm dễ hỏng nhất của thay đổi này.

## Rủi ro

Trên Edge runtime mỗi isolate có module scope riêng và sống ngắn, nên cache không phải lúc nào cũng
trúng. Nó không sai, chỉ là lợi ích thấp hơn con số lý thuyết.

## Vì sao chỉ ở mức Worth exploring, và thật thà về độ lớn

Một lần `importKey` của Web Crypto tính bằng micro giây. Bỏ nó đi **không cứu được ai** — không có
màn hình nào đang chậm vì lý do này. Việc này đáng làm vì nó rẻ, nằm gọn trong một file, không rủi ro
behaviour, và bỏ được một phép toán lặp trên đường đi của mọi navigation. Nếu phải xếp sau bất cứ mục
nào khác trong đợt này thì xếp sau.
