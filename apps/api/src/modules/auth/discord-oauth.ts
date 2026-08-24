/** Endpoint OAuth2 của Discord — hằng số, không phải cấu hình theo môi trường. */
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const PROFILE_URL = 'https://discord.com/api/users/@me';

/**
 * Chỉ xin `identify`: tư cách thành viên do bảng Character quyết định, không do Discord.
 * Xin thêm scope là xin thêm dữ liệu không dùng tới.
 */
const SCOPE = 'identify';

/** Cấu hình Discord Application, đọc từ biến môi trường. */
export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Phần hồ sơ Discord mà hệ thống thực sự dùng. */
export interface DiscordProfile {
  /** Snowflake — khoá tra ngược ra Character */
  id: string;
  /** Tên hiển thị, chỉ dùng để quản trị viên xác nhận gán đúng người */
  username: string;
  /**
   * Hash avatar — chỉ phần hash, không phải URL. null khi người dùng để avatar mặc định.
   * Lưu hash chứ không lưu URL vì định dạng URL CDN là chuyện của Discord.
   */
  avatar: string | null;
}

/**
 * Dựng URL đưa người dùng sang trang cho phép của Discord.
 * @param config - Cấu hình Discord Application
 * @param state - Token state ngắn hạn, Discord trả lại nguyên văn ở callback
 * @returns URL tuyệt đối để redirect
 */
export function buildAuthorizeUrl(
  config: DiscordConfig,
  state: string,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);

  return url.toString();
}

/**
 * Đổi `code` lấy access token của Discord rồi đọc hồ sơ người dùng.
 *
 * Access token ấy **không được lưu lại**: nó chỉ phục vụ đúng lời gọi `/users/@me` ngay dưới đây.
 * Bot sau này dùng bot token riêng, nên giữ token người dùng chỉ là thêm một thứ phải bảo vệ.
 * @param config - Cấu hình Discord Application
 * @param code - Mã uỷ quyền Discord gửi kèm callback
 * @returns Hồ sơ Discord tối giản
 * @throws Error khi Discord từ chối đổi code hoặc từ chối trả hồ sơ
 */
export async function exchangeCodeForProfile(
  config: DiscordConfig,
  code: string,
): Promise<DiscordProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord từ chối đổi code (${tokenResponse.status}).`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as {
    access_token?: string;
  };
  if (!accessToken) throw new Error('Discord không trả access token.');

  const profileResponse = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(
      `Không đọc được hồ sơ Discord (${profileResponse.status}).`,
    );
  }

  const profile = (await profileResponse.json()) as {
    id?: string;
    username?: string;
    avatar?: string | null;
  };
  if (!profile.id || !profile.username) {
    throw new Error('Hồ sơ Discord thiếu id hoặc username.');
  }

  // `avatar` được phép vắng mặt: tài khoản để ảnh mặc định không có hash nào cả.
  return {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar ?? null,
  };
}
