/**
 * Public API của module battle-sessions.
 *
 * Đây là file duy nhất module khác được import code từ đó; mọi file khác trong thư mục này là nội
 * bộ (luật ranh giới module trong `eslint.config.mjs`). File `.module.ts` bên cạnh chỉ còn giữ vai
 * khai báo DI cho Nest.
 *
 * Chỉ re-export, không import ngược từ module khác — nếu hai file `.public.ts` cần nhau thì đó là
 * một cycle nghiệp vụ thật và cách xử lý là tách module thứ ba, không phải `forwardRef()`.
 */
export { BattleSessionsService } from './battle-sessions.service';
export {
  formatSessionLabel,
  isDeadlinePassed,
  weekEndOf,
} from './session-schedule';
