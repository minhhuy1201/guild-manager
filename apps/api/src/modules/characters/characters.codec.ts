import type { GuildClass, GuildRole } from '@guild/shared/enums';
import {
  characterSchema,
  guildMemberSchema,
  type Character,
  type GuildMember,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** The Character columns the codec needs to build a response. */
export type CharacterRow = {
  id: string;
  name: string;
  guildClass: string;
};

/**
 * Turn a Character row into the object returned to the client.
 * @param row - Row read from Prisma
 * @returns The contract-shaped character
 */
export function toCharacter(row: CharacterRow): Character {
  return verifyResponse(characterSchema, {
    id: row.id,
    name: row.name,
    // Prisma emits a string literal union, the shared enum is a TS enum — same values, constrained
    // by the database enum, so the cast is safe. `verifyResponse` is what asserts that outside
    // production: a cast is not checked by the compiler.
    guildClass: row.guildClass as GuildClass,
  } satisfies Character);
}

/** The Character columns the admin codec needs. */
export type GuildMemberRow = CharacterRow & {
  discordId: string | null;
  discordUsername: string | null;
  /** Discord avatar hash. Not in `guildMemberSchema`: the admin screen shows no picture. */
  discordAvatar: string | null;
  lastLoginAt: Date | null;
  role: string;
};

/**
 * Turn a Character row into the admin-screen object (with the Discord identity).
 * @param row - Row read from Prisma
 * @returns The contract-shaped member, timestamps as ISO strings
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
