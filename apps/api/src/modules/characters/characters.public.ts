/**
 * Public API của module characters.
 *
 * Đây là file duy nhất module khác được import code từ đó; mọi file khác trong thư mục này là nội
 * bộ (luật ranh giới module trong `eslint.config.mjs`). File `.module.ts` bên cạnh chỉ còn giữ vai
 * khai báo DI cho Nest.
 *
 * Chỉ re-export, không import ngược từ module khác — nếu hai file `.public.ts` cần nhau thì đó là
 * một cycle nghiệp vụ thật và cách xử lý là tách module thứ ba, không phải `forwardRef()`.
 */
export { CharactersService } from './characters.service';
export { toCharacter } from './characters.codec';
export type { CharacterRow } from './characters.codec';
