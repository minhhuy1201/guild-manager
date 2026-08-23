/** Trang mặc định sau khi đăng nhập, cũng là giá trị an toàn khi redirect không hợp lệ. */
const DEFAULT_REDIRECT = '/';

/**
 * Lọc tham số `redirect` do client gửi lên.
 *
 * Chỉ chấp nhận đường dẫn tương đối một gạch. `//host` bị loại vì trình duyệt hiểu nó là
 * protocol-relative URL — nhận vào là mở đường cho open redirect ngay giữa luồng đăng nhập.
 * @param value - Giá trị `redirect` thô, undefined khi không có
 * @returns Đường dẫn an toàn để redirect sau khi đăng nhập
 */
export function safeRedirect(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//'))
    return DEFAULT_REDIRECT;

  return value;
}

/**
 * Dựng URL tuyệt đối trỏ về frontend.
 * @param origin - WEB_ORIGIN đã cấu hình
 * @param path - Đường dẫn tương đối, bắt đầu bằng `/`
 * @param params - Query string cần gắn thêm
 * @returns URL đầy đủ để trả trong header Location
 */
export function webUrl(
  origin: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
