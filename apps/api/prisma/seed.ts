import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { GuildClass } from '@guild/shared/enums';

import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Danh sách nhân vật nằm ngoài repo (`seed-data.json` ở gốc, đã gitignore) vì đó là
 * dữ liệu thật của bang hội. Định dạng xem `seed-data-example.json` — file mẫu có commit.
 */
const SEED_FILE = resolve(__dirname, '../../../seed-data.json');

/** File mẫu để chỉ cho người dùng mới, nhắc tới trong thông báo lỗi khi thiếu file thật. */
const EXAMPLE_FILE = 'seed-data-example.json';

/** Hạn transaction — mặc định 5s của Prisma quá ngắn cho database ở xa. */
const TRANSACTION_TIMEOUT_MS = 60_000;

/** File seed là dữ liệu ngoài process nên phải validate ở biên. */
const seedCharactersSchema = z
  .array(
    z.object({
      /** Khoá chính: slug tên + hậu tố ngẫu nhiên, sinh bởi `generateId`. */
      id: z.string().min(1),
      name: z.string().min(1),
      guildClass: z.enum(GuildClass),
    }),
  )
  .min(1);

type SeedCharacter = z.infer<typeof seedCharactersSchema>[number];

/**
 * Đọc và validate danh sách nhân vật từ file seed.
 * @returns Danh sách nhân vật hợp lệ
 */
function readSeedCharacters(): SeedCharacter[] {
  if (!existsSync(SEED_FILE)) {
    throw new Error(
      `Không tìm thấy file dữ liệu seed "${SEED_FILE}". ` +
        `File này không nằm trong repo vì chứa dữ liệu thật — xin bản mới nhất từ người quản trị ` +
        `bang, hoặc copy "${EXAMPLE_FILE}" thành "seed-data.json" rồi sửa lại theo bang của bạn.`,
    );
  }

  const parsed = seedCharactersSchema.safeParse(JSON.parse(readFileSync(SEED_FILE, 'utf8')));

  if (!parsed.success) {
    throw new Error(`File seed "${SEED_FILE}" sai định dạng:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}

/**
 * Ghi danh sách nhân vật vào database. Chạy được nhiều lần: khớp theo tên để giữ nguyên id
 * của nhân vật đã có, nhờ vậy điểm danh và ô đội hình đang trỏ vào nó không bị mất.
 *
 * Chỉ thêm và cập nhật — không xoá ai: nhân vật rời bang phải xoá qua giao diện quản trị,
 * để còn thấy rõ dữ liệu điểm danh nào bị xoá theo.
 */
async function main(): Promise<void> {
  const characters = readSeedCharacters();

  // Cùng thứ tự ưu tiên với prisma.config.ts: seed là thao tác CLI nên đi đường direct nếu có.
  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Thiếu DATABASE_URL — kiểm tra file .env của apps/api.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await prisma.character.findMany({ select: { id: true, name: true } });
    const existingIdByName = new Map(existing.map((row) => [row.name, row.id]));

    // Gom thành ít truy vấn nhất có thể: database ở xa nên mỗi round-trip đắt,
    // upsert từng nhân vật một sẽ vượt hạn mức của transaction.
    const created = characters.filter((character) => !existingIdByName.has(character.name));
    const updated = characters.filter((character) => existingIdByName.has(character.name));

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
      `Đã seed ${characters.length} nhân vật (thêm ${created.length}, cập nhật ${updated.length}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
