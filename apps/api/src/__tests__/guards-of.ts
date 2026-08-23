import 'reflect-metadata';

/** Khoá metadata Nest dùng để lưu danh sách guard của một class hoặc một method. */
const GUARDS_METADATA = '__guards__';

/**
 * Đọc danh sách guard mà Nest gắn cho một controller.
 *
 * Sống ở `src/__tests__` chứ không ở trong một module: mỗi module tự khẳng định guard của mình
 * (luật ranh giới cấm test của module này import controller của module kia), nên helper phải nằm
 * ngoài mọi module để cả ba dùng chung.
 * @param target - Class controller
 * @param method - Tên method cần đọc; bỏ trống để đọc guard cấp class
 * @returns Mảng class guard, rỗng khi route không gắn guard riêng
 */
export function guardsOf(target: object, method?: string): unknown[] {
  const source = method
    ? (target as { prototype: Record<string, object> }).prototype[method]
    : target;

  return (Reflect.getMetadata(GUARDS_METADATA, source) as unknown[]) ?? [];
}
