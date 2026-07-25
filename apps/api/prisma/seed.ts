import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { GuildClass } from '@guild/shared/enums';

import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/shared/utils/password.util';

/**
 * Danh sách nhân vật mẫu — giữ khớp với mock data của frontend
 * (apps/web/features/attendance/api/mock-data.ts) để FE chuyển sang API thật không lệch dữ liệu.
 * Mật khẩu ở đây là plaintext mẫu, seed sẽ hash trước khi ghi vào database.
 */
const CHARACTERS: {
  /** ID trong game — cũng là khóa chính của nhân vật. */
  id: string;
  name: string;
  guildClass: GuildClass;
  password: string;
}[] = [
  { id: '10001', name: 'Mèo Béo', guildClass: GuildClass.CUU_LINH, password: 'pass10001' },
  { id: '10002', name: 'Tiểu Long Nữ', guildClass: GuildClass.THAN_TUONG, password: 'pass10002' },
  { id: '10003', name: 'Cẩu Tạp Chủng', guildClass: GuildClass.HUYET_HA, password: 'pass10003' },
  { id: '10004', name: 'Trương Tam Phong', guildClass: GuildClass.LONG_NGAM, password: 'pass10004' },
  { id: '10005', name: 'Hắc Miêu', guildClass: GuildClass.THIET_Y, password: 'pass10005' },
  { id: '10006', name: 'Kim Mao Sư', guildClass: GuildClass.TOAI_MONG, password: 'pass10006' },
  { id: '10007', name: 'Chu Chỉ Nhược', guildClass: GuildClass.TO_VAN, password: 'pass10007' },
  { id: '10008', name: 'Hồng Thất Công', guildClass: GuildClass.HUYET_HA, password: 'pass10008' },
  { id: '10009', name: 'Du Thản Chi', guildClass: GuildClass.LONG_NGAM, password: 'pass10009' },
  { id: '10010', name: 'Mèo Mướp', guildClass: GuildClass.THIET_Y, password: 'pass10010' },
  { id: '10011', name: 'Lệnh Hồ Xung', guildClass: GuildClass.CUU_LINH, password: 'pass10011' },
  { id: '10012', name: 'Nhậm Doanh Doanh', guildClass: GuildClass.THAN_TUONG, password: 'pass10012' },
  { id: '10013', name: 'Nhạc Bất Quần', guildClass: GuildClass.HUYET_HA, password: 'pass10013' },
  { id: '10014', name: 'Nhạc Linh San', guildClass: GuildClass.TO_VAN, password: 'pass10014' },
  { id: '10015', name: 'Lâm Bình Chi', guildClass: GuildClass.LONG_NGAM, password: 'pass10015' },
  { id: '10016', name: 'Điền Bá Quang', guildClass: GuildClass.THIET_Y, password: 'pass10016' },
  { id: '10017', name: 'Nghi Lâm', guildClass: GuildClass.TOAI_MONG, password: 'pass10017' },
  { id: '10018', name: 'Lam Phượng Hoàng', guildClass: GuildClass.THAN_TUONG, password: 'pass10018' },
  { id: '10019', name: 'Đông Phương Bất Bại', guildClass: GuildClass.CUU_LINH, password: 'pass10019' },
  { id: '10020', name: 'Hướng Vấn Thiên', guildClass: GuildClass.HUYET_HA, password: 'pass10020' },
  { id: '10021', name: 'Mạc Đại', guildClass: GuildClass.LONG_NGAM, password: 'pass10021' },
  { id: '10022', name: 'Lưu Chính Phong', guildClass: GuildClass.TO_VAN, password: 'pass10022' },
  { id: '10023', name: 'Định Dật', guildClass: GuildClass.THIET_Y, password: 'pass10023' },
  { id: '10024', name: 'Phương Chứng', guildClass: GuildClass.TOAI_MONG, password: 'pass10024' },
  { id: '10025', name: 'Xung Hư', guildClass: GuildClass.CUU_LINH, password: 'pass10025' },
];

/**
 * Ghi dữ liệu mẫu vào database. Chạy được nhiều lần (upsert theo id trong game).
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Thiếu DATABASE_URL — kiểm tra file .env của apps/api.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const rows = await Promise.all(
      CHARACTERS.map(async (character) => ({
        id: character.id,
        name: character.name,
        guildClass: character.guildClass,
        passwordHash: await hashPassword(character.password),
      })),
    );

    await Promise.all(
      rows.map((row) =>
        prisma.character.upsert({
          where: { id: row.id },
          create: row,
          update: { name: row.name, guildClass: row.guildClass },
        }),
      ),
    );

    console.log(`Đã seed ${rows.length} nhân vật.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
