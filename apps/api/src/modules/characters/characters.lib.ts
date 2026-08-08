import { randomInt } from 'node:crypto';

/**
 * Bảng chữ cái dùng cho mật khẩu và hậu tố id.
 * Bỏ `l`, `o`, `0`, `1` để đọc lại và gõ lại không nhầm.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Độ dài mật khẩu điểm danh. */
const PASSWORD_LENGTH = 8;

/** Độ dài phần ngẫu nhiên trong id — phần đảm bảo id không trùng. */
const ID_SUFFIX_LENGTH = 6;

/** Prefix dùng khi tên không còn ký tự nào slug hoá được (ví dụ tên thuần chữ Hán). */
const FALLBACK_PREFIX = 'thanh-vien';

/**
 * Sinh chuỗi ngẫu nhiên từ ALPHABET.
 * @param length - Số ký tự cần sinh
 * @returns Chuỗi ngẫu nhiên
 */
function randomString(length: number): string {
  return Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
}

/**
 * Slug hoá tên nhân vật: bỏ dấu tiếng Việt, hạ chữ thường, nối bằng gạch ngang.
 * @param name - Tên hiển thị của nhân vật
 * @returns Slug chỉ gồm [a-z0-9-], hoặc `thanh-vien` nếu không còn ký tự nào
 */
export function slugifyName(name: string): string {
  const slug = name
    .normalize('NFD')
    // Bỏ dấu thanh và dấu mũ đã tách ra sau NFD.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // NFD không tách đ/Đ nên phải quy riêng.
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? FALLBACK_PREFIX : slug;
}

/**
 * Sinh khoá chính cho một nhân vật mới: slug tên + hậu tố ngẫu nhiên.
 * Prefix chỉ để nhìn vào database còn đoán được là ai; hậu tố mới là thứ đảm bảo duy nhất.
 * @param name - Tên hiển thị của nhân vật
 * @returns Id dạng `meo-beo-k7ma3x`
 */
export function generateId(name: string): string {
  return `${slugifyName(name)}-${randomString(ID_SUFFIX_LENGTH)}`;
}

/**
 * Sinh mật khẩu điểm danh ngẫu nhiên.
 * @returns Mật khẩu 8 ký tự
 */
export function generatePassword(): string {
  return randomString(PASSWORD_LENGTH);
}
