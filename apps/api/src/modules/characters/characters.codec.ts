import type { GuildClass } from '@guild/shared/enums';
import { characterSchema, type Character } from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** Những cột của bảng Character mà codec cần để dựng response. */
export type CharacterRow = {
  id: string;
  name: string;
  guildClass: string;
};

/**
 * Đổi một hàng Character thành object trả cho client.
 * @param row - Hàng đọc từ Prisma
 * @returns Nhân vật đúng shape contract
 */
export function toCharacter(row: CharacterRow): Character {
  return verifyResponse(characterSchema, {
    id: row.id,
    name: row.name,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn. `verifyResponse` là thứ
    // khẳng định câu đó ngoài production: cast không được biên dịch viên kiểm.
    guildClass: row.guildClass as GuildClass,
  } satisfies Character);
}
