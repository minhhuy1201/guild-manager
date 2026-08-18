import { Injectable, NotFoundException } from '@nestjs/common';
import type { GuildClass } from '@guild/shared/enums';
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '@guild/shared/schemas';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { generateId } from './characters.lib';

/** Mã lỗi Prisma khi vi phạm ràng buộc duy nhất (ở đây là trùng khoá chính). */
const UNIQUE_VIOLATION = 'P2002';

/** Thông báo dùng chung khi id không tồn tại. */
const NOT_FOUND = 'Không tìm thấy thành viên.';

/** CRUD thành viên cho quản trị viên — controller khoá toàn bộ endpoint bằng JwtAuthGuard. */
@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách toàn bộ thành viên.
   * @returns Mảng thành viên sắp theo tên
   */
  async list(): Promise<Character[]> {
    const rows = await this.prisma.character.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map(toEntity);
  }

  /**
   * Thêm một thành viên: id do hệ thống sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  async create(input: CreateCharacterInput): Promise<Character> {
    try {
      return await this.insert(input);
    } catch (error) {
      // Hậu tố ngẫu nhiên đụng id đã có — sinh lại một lần nữa là đủ.
      if (!isUniqueViolation(error)) throw error;

      return this.insert(input);
    }
  }

  /**
   * Sửa tên và/hoặc lưu phái. Id không đổi vì các bảng khác đang trỏ vào nó.
   * @param id - Id thành viên
   * @param input - Các field cần đổi
   * @returns Thành viên sau khi sửa
   * @throws NotFoundException khi không có thành viên đó
   */
  async update(id: string, input: UpdateCharacterInput): Promise<Character> {
    await this.ensureExists(id);

    const row = await this.prisma.character.update({
      where: { id },
      data: input,
    });

    return toEntity(row);
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
   * Ghi một hàng Character mới với id vừa sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  private async insert(input: CreateCharacterInput): Promise<Character> {
    const row = await this.prisma.character.create({
      data: {
        id: generateId(input.name),
        name: input.name,
        guildClass: input.guildClass,
      },
    });

    return toEntity(row);
  }

  /**
   * Kiểm tra thành viên có tồn tại không.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi thành viên tồn tại
   * @throws NotFoundException khi không có thành viên đó
   */
  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.character.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}

/**
 * Đổi một hàng Prisma thành object trả cho client.
 * @param row - Hàng Character đọc từ database
 * @returns Nhân vật đúng shape contract
 */
function toEntity(row: { id: string; name: string; guildClass: string }) {
  return {
    id: row.id,
    name: row.name,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
    guildClass: row.guildClass as GuildClass,
  } satisfies Character;
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
