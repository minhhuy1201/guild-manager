import { z } from "zod";

import { GuildRole } from "../enums/role.enum";
import { characterSchema } from "./character.schema";

/** Payload xin cặp token mới khi accessToken đã hết hạn. */
export const refreshTokenSchema = z.object({
  /** Refresh token còn hạn lấy từ lần đăng nhập/refresh trước */
  refreshToken: z.string().min(1, "Thiếu refresh token."),
});

/** Kiểu payload refresh đã validate. */
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/** Payload đổi mã dùng-một-lần (do API phát ở cuối OAuth callback) lấy cặp JWT. */
export const discordExchangeSchema = z.object({
  /** Mã ngẫu nhiên nằm trên query string mà API redirect về web */
  code: z.string().min(1, "Thiếu mã đăng nhập."),
});

/** Kiểu payload đổi mã đã validate. */
export type DiscordExchangeInput = z.infer<typeof discordExchangeSchema>;

/** Thông tin phiên đăng nhập API trả về — không bao giờ chứa token của Discord. */
export const sessionUserSchema = z.object({
  /** Discord ID của người đang đăng nhập */
  discordId: z.string(),
  /** Tên Discord đọc được ở lần đăng nhập gần nhất */
  discordUsername: z.string().nullable(),
  /**
   * Hash avatar Discord đọc ở lần đăng nhập gần nhất — chỉ phần hash, không phải URL đầy đủ.
   * Web tự dựng URL CDN từ hash và `discordId`; null = chưa đọc được hoặc người dùng để avatar mặc định.
   */
  discordAvatar: z.string().nullable(),
  /** Vai trong bang */
  role: z.enum(GuildRole),
  /** Nhân vật gắn với tài khoản này; null chỉ xảy ra với quản trị viên cứu hộ */
  character: characterSchema.nullable(),
});

/** Cặp token phát ra sau khi đổi mã hoặc refresh thành công. */
export const authTokensSchema = z.object({
  /** Token dùng cho các request cần xác thực (hạn 1 ngày) */
  accessToken: z.string(),
  /** Token dùng để xin cặp token mới (hạn 1 tuần) */
  refreshToken: z.string(),
  /** Phiên ứng với cặp token này */
  user: sessionUserSchema,
});

/** Kiểu thông tin phiên API trả về. */
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Kiểu cặp token API trả về. */
export type AuthTokens = z.infer<typeof authTokensSchema>;
