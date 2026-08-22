import type { ZodType } from 'zod';

/**
 * Có chạy schema Zod trên object chiều ra hay không.
 *
 * Đây là chỗ **duy nhất** trong `src/` đọc thẳng `process.env` (luật chung: chỉ
 * `ConfigService<Env, true>` được đọc env). Lý do: người dùng cờ này là các `<domain>.codec.ts` —
 * hàm thuần ở mức module, không nằm trong cây DI nên không nhận được `ConfigService`. Truyền cờ
 * qua tham số thì mọi call site phải mang theo một thứ chẳng liên quan tới việc dựng response.
 * Giá trị chốt một lần lúc import, đúng như mọi hằng số khác trong `config/`.
 *
 * Tắt ở production vì đây là lưới an toàn cho dev/CI chứ không phải biên nhận dữ liệu không tin
 * được: dữ liệu **ra** khỏi process không cần trả giá CPU cho mỗi response.
 */
export const SHOULD_VERIFY_RESPONSES = process.env.NODE_ENV !== 'production';

/**
 * Check a response object against the contract schema it claims to satisfy.
 *
 * `satisfies <Shape>` is a compile-time check, so an `as` cast on a value read from the database
 * goes through it silently: a stale enum value in a column reaches the client unnoticed. Parsing
 * here turns that class of bug loud in development, test and CI.
 *
 * @param schema - The `@guild/shared` schema that describes the outbound shape
 * @param value - The object built by a codec, already typed as that shape
 * @returns The same shape — parsed outside production, passed straight through in production
 * @throws ZodError outside production when the object does not match the contract
 */
export function verifyResponse<T>(schema: ZodType<T>, value: T): T {
  return SHOULD_VERIFY_RESPONSES ? schema.parse(value) : value;
}
