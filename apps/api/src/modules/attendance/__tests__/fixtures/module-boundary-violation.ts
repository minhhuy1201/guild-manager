/**
 * Fixture cho `module-boundary.spec.ts` — **cố tình vi phạm** ranh giới module.
 *
 * File này không bao giờ được chạy: nó tồn tại để bài test khẳng định `eslint` vẫn báo lỗi khi có
 * ai đó đụng vào file nội bộ của module khác. Nó nằm sâu hơn mọi file thật một cấp
 * (`__tests__/fixtures/`) — đúng chỗ mà luật cũ, vốn khoá theo độ sâu thư mục, đã im lặng bỏ qua.
 *
 * `eslint.config.mjs` loại nó khỏi lượt lint thường; bài test lint nó riêng với `--no-ignore`.
 */
import { BattleSessionsService } from '../../../battle-sessions/battle-sessions.service';

export type ViolatingImport = BattleSessionsService;
