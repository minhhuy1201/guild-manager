/**
 * Guild role. Travels over the network (JWT payload and `/auth/me`), so it lives
 * in the shared package and must match Prisma's GuildRole enum values.
 */
export enum GuildRole {
  /** Sees the whole guild, administers it, marks attendance for others past the deadline */
  ADMIN = "ADMIN",
  /** Sees and marks attendance only for their own character */
  MEMBER = "MEMBER",
}

/** Vietnamese display label per role. */
export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  [GuildRole.ADMIN]: "Quản trị",
  [GuildRole.MEMBER]: "Bang chúng",
};

/** Roles in dropdown display order. */
export const GUILD_ROLE_OPTIONS: GuildRole[] = [GuildRole.MEMBER, GuildRole.ADMIN];
