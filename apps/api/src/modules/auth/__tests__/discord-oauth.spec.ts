import { buildAuthorizeUrl, exchangeCodeForProfile } from '../discord-oauth';

const config = {
  clientId: 'app-id',
  clientSecret: 'app-secret',
  redirectUri: 'http://localhost:3001/api/auth/discord/callback',
};

describe('buildAuthorizeUrl', () => {
  it('xin đúng scope identify và mang theo state', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-token'));

    expect(url.origin + url.pathname).toBe(
      'https://discord.com/oauth2/authorize',
    );
    expect(url.searchParams.get('scope')).toBe('identify');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-token');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
  });
});

describe('exchangeCodeForProfile', () => {
  afterEach(() => jest.restoreAllMocks());

  it('đổi code lấy token rồi đọc hồ sơ', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'discord-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '123456789012345678',
            username: 'meobeo',
            avatar: 'a1b2c3d4e5f6',
          }),
          { status: 200 },
        ),
      );

    await expect(exchangeCodeForProfile(config, 'auth-code')).resolves.toEqual({
      id: '123456789012345678',
      username: 'meobeo',
      avatar: 'a1b2c3d4e5f6',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nhận hồ sơ không có avatar — người dùng để ảnh mặc định của Discord', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'discord-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '123456789012345678',
            username: 'meobeo',
            avatar: null,
          }),
          { status: 200 },
        ),
      );

    // A missing avatar is not a broken profile: only `id` and `username` are required.
    await expect(exchangeCodeForProfile(config, 'auth-code')).resolves.toEqual({
      id: '123456789012345678',
      username: 'meobeo',
      avatar: null,
    });
  });

  it('ném lỗi khi Discord từ chối đổi code', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response('{"error":"invalid_grant"}', { status: 400 }),
      );

    await expect(exchangeCodeForProfile(config, 'bad-code')).rejects.toThrow();
  });
});
