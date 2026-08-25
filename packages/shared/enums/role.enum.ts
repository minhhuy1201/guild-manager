/**
 * Guild role. Travels over the network (JWT payload and `/auth/me`), so it lives
 * in the shared package and must match Prisma's GuildRole enum values.
 */
export enum GuildRole {
  /** Full access: members, schedule, formations, attendance on behalf of others */
  ADMIN = "ADMIN",
  /** Sees the whole guild's attendance to chase people, marks only their own */
  LEADER = "LEADER",
  /** Sees and marks attendance only for their own character */
  MEMBER = "MEMBER",
}

/** Vietnamese display label per role. */
export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  [GuildRole.ADMIN]: "Quản trị",
  [GuildRole.LEADER]: "Cán bộ",
  [GuildRole.MEMBER]: "Bang chúng",
};

/** Roles in dropdown display order. */
export const GUILD_ROLE_OPTIONS: GuildRole[] = [
  GuildRole.MEMBER,
  GuildRole.LEADER,
  GuildRole.ADMIN,
];
