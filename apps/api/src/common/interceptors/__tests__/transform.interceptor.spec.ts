import { Reflector } from '@nestjs/core';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { TransformInterceptor } from '../transform.interceptor';

/**
 * Dựng ExecutionContext giả chỉ mang handler của route.
 * @param handler - Hàm đại diện method của controller, nơi Reflector đọc metadata
 * @returns Context đủ dùng cho TransformInterceptor
 */
function contextFor(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

/**
 * Gọi interceptor với một giá trị controller trả về.
 * @param handler - Handler của route đang gọi
 * @param value - Giá trị controller trả về
 * @returns Giá trị sau khi interceptor xử lý
 */
async function intercept(
  handler: () => void,
  value: unknown,
): Promise<unknown> {
  const interceptor = new TransformInterceptor(new Reflector());

  return firstValueFrom(
    interceptor.intercept(contextFor(handler), {
      handle: () => of(value),
    }),
  );
}

describe('TransformInterceptor', () => {
  it('bọc response thường vào field data', async () => {
    function plainRoute(): void {}

    await expect(intercept(plainRoute, { id: 'meo-beo' })).resolves.toEqual({
      data: { id: 'meo-beo' },
    });
  });

  it('để nguyên object điều khiển của route @Redirect()', async () => {
    function redirectRoute(): void {}
    Reflect.defineMetadata(
      REDIRECT_METADATA,
      { statusCode: 302, url: '' },
      redirectRoute,
    );

    // Nest đọc `url` ngay trên giá trị trả về; bọc nó vào `data` làm Location rỗng
    // và cả luồng đăng nhập Discord chết trong im lặng.
    await expect(
      intercept(redirectRoute, { url: 'https://discord.com/oauth2/authorize' }),
    ).resolves.toEqual({ url: 'https://discord.com/oauth2/authorize' });
  });
});
