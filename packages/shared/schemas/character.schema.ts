import { z } from "zod";

import { GuildClass } from "../enums/guild-class.enum";

/**
 * Body của POST /characters.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 * Tên không ràng buộc duy nhất — trong game trùng tên vẫn được, id mới là thứ phân biệt.
 */
export const createCharacterSchema = z.object({
  /** Tên hiển thị của nhân vật */
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên thành viên.")
    .max(50, "Tên thành viên tối đa 50 ký tự."),
  /** Lưu phái của nhân vật */
  guildClass: z.enum(GuildClass),
});

/** Body của PATCH /characters/:id — sửa được từng phần. */
export const updateCharacterSchema = createCharacterSchema.partial();

/** Kiểu body tạo thành viên đã validate. */
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

/** Kiểu body sửa thành viên đã validate. */
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;

/**
 * Một nhân vật trong bang, đúng như API trả về.
 * Dùng chung cho `GET /characters` (màn quản trị) và `GET /attendance/characters`
 * (màn điểm danh công khai) — hai chỗ này trả về cùng một hàng của bảng Character.
 */
export const characterSchema = z.object({
  /** Khoá chính do hệ thống sinh. */
  id: z.string(),
  /** Tên hiển thị của nhân vật */
  name: z.string(),
  /** Lưu phái của nhân vật */
  guildClass: z.enum(GuildClass),
});

/** Kiểu nhân vật API trả về. */
export type Character = z.infer<typeof characterSchema>;
