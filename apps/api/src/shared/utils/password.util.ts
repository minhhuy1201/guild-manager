import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** Độ dài khóa dẫn xuất (byte). */
const KEY_LENGTH = 64;

/**
 * Hash mật khẩu bằng scrypt kèm salt ngẫu nhiên.
 * Dùng scrypt của node:crypto để không phải thêm dependency native (bcrypt/argon2).
 * @param plain - Mật khẩu dạng plaintext
 * @returns Chuỗi `salt:hash` dạng hex, lưu thẳng vào cột passwordHash
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derived.toString('hex')}`;
}

/**
 * So khớp mật khẩu với hash đã lưu, so sánh theo kiểu constant-time.
 * @param plain - Mật khẩu người dùng nhập
 * @param stored - Giá trị `salt:hash` lấy từ database
 * @returns true nếu mật khẩu khớp
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(':');

  if (!salt || !hash) {
    return false;
  }

  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hash, 'hex');

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
