import type { GuildClass, GuildRole } from '@guild/shared/enums';
import {
  characterSchema,
  guildMemberSchema,
  type Character,
  type GuildMember,
} from '@guild/shared/schemas';

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

/** Những cột của bảng Character mà codec quản trị cần. */
export type GuildMemberRow = CharacterRow & {
  discordId: string | null;
  discordUsername: string | null;
  lastLoginAt: Date | null;
  role: string;
};

/**
 * Đổi một hàng Character thành object cho màn quản trị (kèm danh tính Discord).
 * @param row - Hàng đọc từ Prisma
 * @returns Thành viên đúng shape contract, thời điểm ở dạng ISO string
 */
export function toGuildMember(row: GuildMemberRow): GuildMember {
  return verifyResponse(guildMemberSchema, {
    id: row.id,
    name: row.name,
    guildClass: row.guildClass as GuildClass,
    discordId: row.discordId,
    discordUsername: row.discordUsername,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    role: row.role as GuildRole,
  } satisfies GuildMember);
}
