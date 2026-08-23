import { z } from "zod";

import { GuildClass } from "../enums/guild-class.enum";
import { GuildRole } from "../enums/role.enum";

/** Regex Discord snowflake: 17–19 chữ số. */
const DISCORD_ID_PATTERN = /^\d{17,19}$/;

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

/**
 * Body của PATCH /characters/:id — sửa được từng phần.
 * `discordId` nhận null để gỡ liên kết; chuỗi rỗng cũng quy về null cho form dễ viết.
 */
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  discordId: z
    .union([z.string(), z.null()])
    .transform((value) =>
      value === null || value.trim() === "" ? null : value.trim(),
    )
    .refine((value) => value === null || DISCORD_ID_PATTERN.test(value), {
      message: "Discord ID phải gồm 17–19 chữ số.",
    })
    .optional(),
  role: z.enum(GuildRole).optional(),
});

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

/**
 * Một thành viên nhìn từ màn quản trị: nhân vật cộng phần danh tính Discord.
 * Màn điểm danh dùng `characterSchema` (không có Discord ID) để cán bộ không đọc được
 * Discord ID của cả bang.
 */
export const guildMemberSchema = characterSchema.extend({
  /** Discord ID quản trị viên đã gán; null = chưa gán, người này chưa đăng nhập được */
  discordId: z.string().nullable(),
  /** Tên Discord đọc được ở lần đăng nhập gần nhất */
  discordUsername: z.string().nullable(),
  /** Thời điểm đăng nhập gần nhất (ISO string); null = chưa từng đăng nhập */
  lastLoginAt: z.string().nullable(),
  /** Vai trong bang */
  role: z.enum(GuildRole),
});

/** Kiểu thành viên ở màn quản trị. */
export type GuildMember = z.infer<typeof guildMemberSchema>;
