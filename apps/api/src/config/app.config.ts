import { ConfigService } from '@nestjs/config';

import type { Env } from './env.validation';

/** ConfigService đã gắn kiểu Env — inject kiểu này thay vì ConfigService trần. */
export type AppConfigService = ConfigService<Env, true>;

/** Prefix chung cho mọi route HTTP. */
export const API_PREFIX = 'api';

/**
 * Đường dẫn trang Swagger UI (chỉ bật ngoài production).
 * Nằm ngoài `API_PREFIX` — mở tại `http://localhost:PORT/docs`.
 */
export const SWAGGER_PATH = 'docs';

/**
 * Tham số pg pool, đặt theo khuyến nghị của Vercel cho Fluid compute.
 *
 * `idleTimeoutMillis` ngắn để nhả kết nối sớm về Supavisor. **Đừng đặt `max: 1`**: Fluid compute
 * chạy nhiều request đồng thời trên cùng một instance, pool một kết nối sẽ biến chúng thành hàng
 * đợi. `min: 1` giữ sẵn một kết nối để request kế tiếp không phải bắt tay lại từ đầu.
 */
export const DATABASE_POOL_OPTIONS = {
  min: 1,
  idleTimeoutMillis: 5_000,
} as const;
