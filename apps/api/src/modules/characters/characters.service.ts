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

/** Mã lỗi Prisma khi vi phạm ràng buộc duy nhất (ở đây là trùng khoá chính). */
const UNIQUE_VIOLATION = 'P2002';

/** Thông báo dùng chung khi id không tồn tại. */
const NOT_FOUND = 'Không tìm thấy thành viên.';

/** Thông báo khi Discord ID đã thuộc về thành viên khác. */
const DISCORD_ID_TAKEN = 'Discord ID này đã được gán cho thành viên khác.';

/** CRUD thành viên cho quản trị viên — controller khoá toàn bộ endpoint bằng JwtAuthGuard. */
@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách toàn bộ thành viên.
   * @returns Mảng thành viên sắp theo tên
   */
  async list(): Promise<GuildMember[]> {
    const rows = await this.prisma.character.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map(toGuildMember);
  }

  /**
   * Id của mọi thành viên còn trong bang.
   * Nhận client vào để caller đang ở trong transaction đọc bằng chính client đó, thay vì mở một
   * kết nối thứ hai nhìn dữ liệu ở thời điểm khác.
   * @param client - Prisma client dùng để đọc; `PrismaService` khi ngoài transaction, `tx` khi trong
   * @returns Tập id thành viên
   */
  async listIds(client: PrismaTransactionClient): Promise<Set<string>> {
    const rows = await client.character.findMany({ select: { id: true } });

    return new Set(rows.map((row) => row.id));
  }

  /**
   * Thêm một thành viên: id do hệ thống sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  async create(input: CreateCharacterInput): Promise<GuildMember> {
    try {
      return await this.insert(input);
    } catch (error) {
      // Hậu tố ngẫu nhiên đụng id đã có — sinh lại một lần nữa là đủ.
      if (!isUniqueViolation(error)) throw error;

      return this.insert(input);
    }
  }

  /**
   * Sửa tên, lưu phái, Discord ID và/hoặc vai. Id không đổi vì bảng khác đang trỏ vào nó.
   * @param id - Id thành viên
   * @param input - Các field cần đổi
   * @returns Thành viên sau khi sửa
   * @throws NotFoundException khi không có thành viên đó
   * @throws ConflictException khi Discord ID đã thuộc thành viên khác
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
      // Ràng buộc duy nhất duy nhất có thể vỡ ở đây là discordId — id không nằm trong `data`.
      if (isUniqueViolation(error)) throw new ConflictException(DISCORD_ID_TAKEN);
      throw error;
    }
  }

  /**
   * Tra thành viên theo Discord ID — đường vào của luồng đăng nhập.
   * @param discordId - Discord ID đọc từ hồ sơ OAuth
   * @returns Id và vai của thành viên, hoặc null khi chưa ai được gán ID này
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
   * Đọc nguyên một hàng thành viên theo id.
   * @param id - Id thành viên
   * @returns Hàng Character, hoặc null khi không tồn tại
   */
  async findById(id: string): Promise<GuildMemberRow | null> {
    return this.prisma.character.findUnique({ where: { id } });
  }

  /**
   * Ghi lại tên Discord và thời điểm đăng nhập gần nhất.
   * Quản trị viên đọc hai giá trị này ở màn Thành viên để xác nhận đã gán đúng người.
   * @param id - Id thành viên
   * @param discordUsername - Tên Discord vừa đọc được
   * @param at - Thời điểm đăng nhập
   * @returns Promise hoàn tất khi đã ghi
   */
  async touchLogin(
    id: string,
    discordUsername: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.character.update({
      where: { id },
      data: { discordUsername, lastLoginAt: at },
    });
  }

  /**
   * Xoá một thành viên cùng toàn bộ điểm danh và ô đội hình của họ (cascade ở database).
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi đã xoá
   * @throws NotFoundException khi không có thành viên đó
   */
  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.prisma.character.delete({ where: { id } });
  }

  /**
   * Thành viên này có còn trong bang không.
   * Module khác dùng để kiểm tồn tại mà không phải chạm vào bảng Character.
   * @param id - Id thành viên
   * @returns true nếu thành viên tồn tại
   */
  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.character.findUnique({
      where: { id },
      select: { id: true },
    });

    return found !== null;
  }

  /**
   * Ghi một hàng Character mới với id vừa sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  private async insert(input: CreateCharacterInput): Promise<GuildMember> {
    const row = await this.prisma.character.create({
      data: {
        id: generateId(input.name),
        name: input.name,
        guildClass: input.guildClass,
      },
    });

    return toGuildMember(row);
  }

  /**
   * Kiểm tra thành viên có tồn tại không.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi thành viên tồn tại
   * @throws NotFoundException khi không có thành viên đó
   */
  private async ensureExists(id: string): Promise<void> {
    if (!(await this.exists(id))) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}

/**
 * Lỗi này có phải vi phạm ràng buộc duy nhất của Prisma không.
 * @param error - Lỗi bắt được
 * @returns true nếu là P2002
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION
  );
}
