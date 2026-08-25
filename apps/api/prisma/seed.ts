import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { GuildClass } from '@guild/shared/enums';

import { PrismaClient } from '../src/generated/prisma/client';
import { loadPrismaEnv } from './load-env';

/**
 * The character list lives outside the repo (`seed-data.json` at the root, gitignored) because it
 * is real guild data. See `seed-data-example.json` for the format — that sample is committed.
 */
const SEED_FILE = resolve(__dirname, '../../../seed-data.json');

/** Sample file pointed at in the error message when the real one is missing. */
const EXAMPLE_FILE = 'seed-data-example.json';

/** Transaction timeout — Prisma's 5s default is too short for a remote database. */
const TRANSACTION_TIMEOUT_MS = 60_000;

/** The seed file is data from outside the process, so it is validated at the boundary. */
const seedCharactersSchema = z
  .array(
    z.object({
      /** Primary key: name slug plus a random suffix, produced by `generateId`. */
      id: z.string().min(1),
      name: z.string().min(1),
      guildClass: z.enum(GuildClass),
    }),
  )
  .min(1);

type SeedCharacter = z.infer<typeof seedCharactersSchema>[number];

/**
 * Read and validate the character list from the seed file.
 * @returns The valid character list
 */
function readSeedCharacters(): SeedCharacter[] {
  if (!existsSync(SEED_FILE)) {
    throw new Error(
      `Không tìm thấy file dữ liệu seed "${SEED_FILE}". ` +
        `File này không nằm trong repo vì chứa dữ liệu thật — xin bản mới nhất từ người quản trị ` +
        `bang, hoặc copy "${EXAMPLE_FILE}" thành "seed-data.json" rồi sửa lại theo bang của bạn.`,
    );
  }

  const parsed = seedCharactersSchema.safeParse(
    JSON.parse(readFileSync(SEED_FILE, 'utf8')),
  );

  if (!parsed.success) {
    throw new Error(
      `File seed "${SEED_FILE}" sai định dạng:\n${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data;
}

/**
 * Write the character list to the database. Re-runnable: matches on name so existing characters
 * keep their id, which keeps the attendance entries and formation slots pointing at them alive.
 *
 * Only inserts and updates — never deletes: a character leaving the guild must be removed through
 * the admin UI, so it stays visible which attendance data goes with them.
 */
async function main(): Promise<void> {
  const envFile = loadPrismaEnv();
  const characters = readSeedCharacters();

  // Same precedence as prisma.config.ts: seeding is a CLI operation, so it takes the direct path when available.
  const connectionString =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      `Thiếu DATABASE_URL — kiểm tra file "${envFile}" của apps/api.`,
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existing = await prisma.character.findMany({
      select: { id: true, name: true },
    });
    const existingIdByName = new Map(existing.map((row) => [row.name, row.id]));

    // Batched into as few queries as possible: the database is remote, so each round-trip is
    // expensive and upserting one character at a time would blow the transaction timeout.
    const created = characters.filter(
      (character) => !existingIdByName.has(character.name),
    );
    const updated = characters.filter((character) =>
      existingIdByName.has(character.name),
    );

    await prisma.$transaction(
      [
        ...(created.length > 0
          ? [
              prisma.character.createMany({
                data: created.map((character) => ({
                  id: character.id,
                  name: character.name,
                  guildClass: character.guildClass,
                })),
              }),
            ]
          : []),
        ...updated.map((character) =>
          prisma.character.update({
            where: { id: existingIdByName.get(character.name) },
            data: { name: character.name, guildClass: character.guildClass },
          }),
        ),
      ],
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    console.log(
      `Đã seed ${characters.length} nhân vật vào database của "${envFile}" ` +
        `(thêm ${created.length}, cập nhật ${updated.length}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
