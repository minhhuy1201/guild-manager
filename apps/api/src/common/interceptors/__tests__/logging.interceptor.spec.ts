import { Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import { LoggingInterceptor } from '../logging.interceptor';

/**
 * Run the interceptor over one successful request.
 * @param headers - Request headers, as the middleware left them
 * @returns The single line the interceptor logged
 */
async function interceptAndReadLog(
  headers: Record<string, string>,
): Promise<string> {
  const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers, method: 'GET', url: '/api/characters' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;

  const next = { handle: () => of({ ok: true }) } as CallHandler;

  await firstValueFrom(new LoggingInterceptor().intercept(context, next));

  const [line] = log.mock.calls[0] as [string];
  log.mockRestore();

  return line;
}

describe('LoggingInterceptor', () => {
  it('log id do middleware gieo, không tự sinh id khác', async () => {
    const line = await interceptAndReadLog({
      [REQUEST_ID_HEADER]: 'id-tu-middleware',
    });

    expect(line).toContain('[id-tu-middleware]');
  });

  it('log method, url và status của request', async () => {
    const line = await interceptAndReadLog({ [REQUEST_ID_HEADER]: 'bat-ky' });

    expect(line).toContain('GET /api/characters 200');
  });
});
