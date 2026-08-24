/** Kích thước ảnh xin từ CDN: avatar hiển thị 32px, lấy gấp đôi cho màn hình retina. */
const AVATAR_SIZE = 64;

/** Tiền tố Discord gắn vào hash của avatar động. */
const ANIMATED_PREFIX = "a_";

/**
 * Dựng URL ảnh avatar Discord từ hash lưu trong database.
 *
 * Backend chỉ lưu hash chứ không lưu URL, vì định dạng URL CDN là chuyện của Discord —
 * đổi lúc nào không báo, mà hash thì không đổi. Ghép URL ở đây, ngay chỗ dùng.
 * @param discordId - Discord ID của người đang đăng nhập
 * @param avatarHash - Hash avatar đọc ở lần đăng nhập gần nhất, null khi để ảnh mặc định
 * @returns URL ảnh, hoặc null khi không có hash để dựng
 */
export function discordAvatarUrl(
  discordId: string,
  avatarHash: string | null
): string | null {
  if (!avatarHash) return null;

  // Avatar động có hash bắt đầu bằng "a_" và chỉ ra ảnh khi xin đuôi .gif.
  const extension = avatarHash.startsWith(ANIMATED_PREFIX) ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=${AVATAR_SIZE}`;
}
