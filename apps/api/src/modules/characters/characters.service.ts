import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GuildRole } from '@guild/shared/enums';
import type {
  CreateCharacterInput,
  GuildMember,
  UpdateCharacterInput,
} from '@guild/shared/schemas';

import {
  PrismaService,
  type PrismaTransactionClient,
} from '../../infrastructure/prisma/prisma.service';
import { toGuildMember, type GuildMemberRow } from './characters.codec';
import { generateId } from './characters.lib';

/** Prisma error code for a unique constraint violation (here, a primary key collision). */
const UNIQUE_VIOLATION = 'P2002';

/** Column name as it appears in both Prisma conflict shapes, and inside `Character_discordId_key`. */
const DISCORD_ID_COLUMN = 'discordId';

/** The parts of a P2002 `meta` that name the constraint, across Prisma's two reporting shapes. */
interface PrismaConflictMeta {
  /** Present without a driver adapter: the conflicting column names. */
  target?: string[];
  /** Present with a driver adapter: the database's own constraint name. */
  driverAdapterError?: {
    cause?: { constraint?: { index?: string } };
  };
}

/** Shared message for a missing id. */
const NOT_FOUND = 'Không tìm thấy thành viên.';

/** Message when the Discord ID already belongs to another member. */
const DISCORD_ID_TAKEN = 'Discord ID này đã được gán cho thành viên khác.';

/** Member CRUD for admins — the controller locks every endpoint behind JwtAuthGuard. */
@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List every member with their Discord identity — the admin screen's shape.
   * @returns Members ordered by name
   */
  async list(): Promise<GuildMember[]> {
    const rows = await this.listRows();

    return rows.map(toGuildMember);
  }

  /**
   * Raw member rows, for a caller that applies its own codec.
   * `list()` would hand out `discordId` and `lastLoginAt`, which only the admin screen may read.
   * @returns The Character rows ordered by name
   */
  async listRows(): Promise<GuildMemberRow[]> {
    return this.prisma.character.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Ids of every member still in the guild.
   * Takes a client so a caller inside a transaction reads through that same client, instead of
   * opening a second connection seeing data from another moment.
   * @param client - Prisma client to read through; `PrismaService` outside a transaction, `tx` inside
   * @returns The set of member ids
   */
  async listIds(client: PrismaTransactionClient): Promise<Set<string>> {
    const rows = await client.character.findMany({ select: { id: true } });

    return new Set(rows.map((row) => row.id));
  }

  /**
   * Add a member; the id is system-generated.
   * @param input - Name, class and optionally the Discord ID
   * @returns The created member
   * @throws ConflictException when the Discord ID already belongs to another member
   */
  async create(input: CreateCharacterInput): Promise<GuildMember> {
    try {
      return await this.insert(input);
    } catch (error) {
      if (isDiscordIdViolation(error))
        throw new ConflictException(DISCORD_ID_TAKEN);
      // The random suffix collided with an existing id — regenerating once is enough.
      if (!isUniqueViolation(error)) throw error;

      return this.retryAfterIdCollision(input);
    }
  }

  /**
   * Second and last insert attempt, after a unique violation that did not name the Discord ID.
   * @param input - Name, class and optionally the Discord ID
   * @returns The created member
   * @throws ConflictException when the retry hits a unique constraint too
   */
  private async retryAfterIdCollision(
    input: CreateCharacterInput,
  ): Promise<GuildMember> {
    try {
      return await this.insert(input);
    } catch (error) {
      // `insert` generates a fresh id, so the primary key cannot collide twice on the same value,
      // and Character has exactly two unique constraints — a second P2002 is the Discord ID no
      // matter which shape Prisma reported it in. Answering 409 here is what stops the next change
      // to that shape from turning a taken Discord ID back into a 500, the way it already did once.
      if (isUniqueViolation(error))
        throw new ConflictException(DISCORD_ID_TAKEN);

      throw error;
    }
  }

  /**
   * Edit the name, class, Discord ID and/or role. The id never changes because other tables point at it.
   * @param id - Member id
   * @param input - Fields to change
   * @returns The updated member
   * @throws NotFoundException when no such member exists
   * @throws ConflictException when the Discord ID already belongs to another member
   */
  async update(id: string, input: UpdateCharacterInput): Promise<GuildMember> {
    await this.ensureExists(id);

    try {
      const row = await this.prisma.character.update({
        where: { id },
        data: input,
      });

      return toGuildMember(row);
    } catch (error) {
      // The only unique constraint that can break here is discordId — the id is not in `data`.
      if (isUniqueViolation(error))
        throw new ConflictException(DISCORD_ID_TAKEN);
      throw error;
    }
  }

  /**
   * Look a member up by Discord ID — the entry point of the login flow.
   * @param discordId - Discord ID read from the OAuth profile
   * @returns The member's id and role, or null when nobody has this ID assigned
   */
  async findByDiscordId(
    discordId: string,
  ): Promise<{ id: string; role: GuildRole } | null> {
    const row = await this.prisma.character.findUnique({
      where: { discordId },
      select: { id: true, role: true },
    });

    return row === null ? null : { id: row.id, role: row.role as GuildRole };
  }

  /**
   * Read a whole member row by id.
   * @param id - Member id
   * @returns The Character row, or null when it does not exist
   */
  async findById(id: string): Promise<GuildMemberRow | null> {
    return this.prisma.character.findUnique({ where: { id } });
  }

  /**
   * Record the Discord name and the last login time.
   * Admins read both on the Members screen to confirm the right person was assigned.
   * @param id - Member id
   * @param discordUsername - Discord name just read
   * @param discordAvatar - Avatar hash just read, null on the default picture
   * @param at - Login time
   * @returns A promise resolving once written
   */
  async touchLogin(
    id: string,
    discordUsername: string,
    discordAvatar: string | null,
    at: Date,
  ): Promise<void> {
    await this.prisma.character.update({
      where: { id },
      data: { discordUsername, discordAvatar, lastLoginAt: at },
    });
  }

  /**
   * Delete a member along with all their attendance and formation slots (cascade in the database).
   * @param id - Member id
   * @returns A promise resolving once they are deleted
   * @throws NotFoundException when no such member exists
   */
  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.prisma.character.delete({ where: { id } });
  }

  /**
   * Whether this member is still in the guild.
   * Used by other modules to check existence without touching the Character table.
   * @param id - Member id
   * @returns true when the member exists
   */
  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.character.findUnique({
      where: { id },
      select: { id: true },
    });

    return found !== null;
  }

  /**
   * Insert a new Character row with the generated id.
   * @param input - Name, class and optionally the Discord ID
   * @returns The created member
   */
  private async insert(input: CreateCharacterInput): Promise<GuildMember> {
    const row = await this.prisma.character.create({
      data: {
        id: generateId(input.name),
        name: input.name,
        guildClass: input.guildClass,
        discordId: input.discordId ?? null,
      },
    });

    return toGuildMember(row);
  }

  /**
   * Assert that a member exists.
   * @param id - Member id
   * @returns A promise resolving when the member exists
   * @throws NotFoundException when no such member exists
   */
  private async ensureExists(id: string): Promise<void> {
    if (!(await this.exists(id))) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}

/**
 * Whether a unique violation is the one on `discordId` rather than on the primary key.
 * Only the id collision is worth retrying — a taken Discord ID is the caller's to fix.
 * @param error - The caught error
 * @returns true for P2002 naming the discordId column
 */
function isDiscordIdViolation(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;

  const { meta } = error as { meta?: PrismaConflictMeta };

  // Two shapes, because Prisma reports the offending constraint in two different places: through a
  // driver adapter (what this app uses) it is the constraint name, and without one it is the column
  // list. Reading only `target` is what made a taken Discord ID answer 500 instead of 409 — `create`
  // read it as an id collision and retried, on a conflict that could never resolve.
  const constraintName = meta?.driverAdapterError?.cause?.constraint?.index;
  const columns = meta?.target;

  return (
    (constraintName ?? '').includes(DISCORD_ID_COLUMN) ||
    (columns ?? []).includes(DISCORD_ID_COLUMN)
  );
}

/**
 * Whether this error is a Prisma unique constraint violation.
 * @param error - The caught error
 * @returns true for P2002
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION
  );
}
