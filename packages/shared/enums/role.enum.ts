/**
 * Guild role. Travels over the network (JWT payload and `/auth/me`), so it lives
 * in the shared package and must match Prisma's GuildRole enum values.
 */
export enum GuildRole {
  /** Every power in the app, including who is a Manager and what each Manager may do */
  ADMIN = "ADMIN",
  /** A Member plus the Grants an Admin ticked for this one person */
  MANAGER = "MANAGER",
  /** Sees and marks attendance only for their own character */
  MEMBER = "MEMBER",
}

/** Vietnamese display label per role. */
export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  [GuildRole.ADMIN]: "ADMIN",
  [GuildRole.MANAGER]: "Quản lý",
  [GuildRole.MEMBER]: "Bang chúng",
};

/** Roles in dropdown display order. */
export const GUILD_ROLE_OPTIONS: GuildRole[] = [
  GuildRole.MEMBER,
  GuildRole.MANAGER,
  GuildRole.ADMIN,
];
