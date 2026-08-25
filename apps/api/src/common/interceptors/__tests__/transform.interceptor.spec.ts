import { Reflector } from '@nestjs/core';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { TransformInterceptor } from '../transform.interceptor';

/**
 * Build a fake ExecutionContext carrying only the route handler.
 * @param handler - Stand-in for the controller method where Reflector reads metadata
 * @returns A context sufficient for TransformInterceptor
 */
function contextFor(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

/**
 * Run the interceptor over a value returned by a controller.
 * @param handler - Handler of the route being called
 * @param value - Value the controller returned
 * @returns The value after the interceptor ran
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

    // Nest reads `url` straight off the returned value; wrapping it in `data` empties Location
    // and the whole Discord login flow dies silently.
    await expect(
      intercept(redirectRoute, { url: 'https://discord.com/oauth2/authorize' }),
    ).resolves.toEqual({ url: 'https://discord.com/oauth2/authorize' });
  });
});
