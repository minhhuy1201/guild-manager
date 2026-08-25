import { z } from "zod";

import { GuildClass } from "../enums/guild-class.enum";
import { GuildRole } from "../enums/role.enum";

/** Discord snowflake: 17-19 digits. */
const DISCORD_ID_PATTERN = /^\d{17,19}$/;

/**
 * Body of POST /characters (form + request body). Names are not unique — duplicates are
 * legal in game, the id is what distinguishes characters.
 */
export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên thành viên.")
    .max(50, "Tên thành viên tối đa 50 ký tự."),
  guildClass: z.enum(GuildClass),
});

/**
 * Body of PATCH /characters/:id — partial. `discordId` accepts null to unlink; an empty
 * string is normalised to null so forms stay simple.
 */
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  discordId: z
    .union([z.string(), z.null()])
    .transform((value) =>
      value === null || value.trim() === "" ? null : value.trim(),
    )
    .refine((value) => value === null || DISCORD_ID_PATTERN.test(value), {
      message: "Discord ID phải gồm 17–19 chữ số.",
    })
    .optional(),
  role: z.enum(GuildRole).optional(),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;

/**
 * A guild character as the API returns it. Shared by `GET /characters` (admin screen) and
 * `GET /attendance/characters` (public attendance screen) — both return the same row.
 */
export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  guildClass: z.enum(GuildClass),
});

export type Character = z.infer<typeof characterSchema>;

/**
 * A member seen from the admin screen: the character plus its Discord identity. The
 * attendance screen uses `characterSchema` (no Discord ID) so leaders cannot read the whole
 * guild's Discord IDs.
 */
export const guildMemberSchema = characterSchema.extend({
  /** Discord ID assigned by an admin; null = unassigned, this person cannot sign in yet */
  discordId: z.string().nullable(),
  /** Discord name read at the last login */
  discordUsername: z.string().nullable(),
  /** Last login (ISO string); null = never signed in */
  lastLoginAt: z.string().nullable(),
  role: z.enum(GuildRole),
});

export type GuildMember = z.infer<typeof guildMemberSchema>;
