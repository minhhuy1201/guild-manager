import { z } from "zod";

import { GuildClass } from "../enums/guild-class.enum";
import { GuildRole } from "../enums/role.enum";

/** Discord snowflake: 17-19 digits. */
const DISCORD_ID_PATTERN = /^\d{17,19}$/;

/**
 * The Discord ID as both forms send it: null unlinks, an empty string is normalised to null so a
 * form can leave the box blank, anything else must be a snowflake.
 */
const discordIdField = z
  .union([z.string(), z.null()])
  .transform((value) =>
    value === null || value.trim() === "" ? null : value.trim(),
  )
  .refine((value) => value === null || DISCORD_ID_PATTERN.test(value), {
    message: "Discord ID phải gồm 17–19 chữ số.",
  });

/**
 * Body of POST /characters (form + request body). Names are not unique — duplicates are
 * legal in game, the id is what distinguishes characters. The Discord ID is optional: a member
 * can be created before anyone knows theirs.
 */
export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên thành viên.")
    .max(50, "Tên thành viên tối đa 50 ký tự."),
  guildClass: z.enum(GuildClass),
  discordId: discordIdField.optional(),
});

/**
 * Body of PATCH /characters/:id — every create field optional, plus the role. Only an existing
 * member has a role to change: creating one always lands on MEMBER.
 */
export const updateCharacterSchema = createCharacterSchema.partial().extend({
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
 * attendance screen uses `characterSchema` (no Discord ID) so that screen never hands out the
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
