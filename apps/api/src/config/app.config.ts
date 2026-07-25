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
