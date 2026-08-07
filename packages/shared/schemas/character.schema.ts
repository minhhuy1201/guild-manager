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
