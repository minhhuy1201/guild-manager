import { Controller, Module, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { AddressInfo } from 'node:net';
import type { Request } from 'express';

import { JSON_BODY_LIMIT } from '../config';

/** Express's own default, and the ceiling this bootstrap exists to lift. */
const EXPRESS_DEFAULT_LIMIT = 100 * 1024;

/** Booting a real HTTP server is slower than Jest's 5s default. */
const BOOT_TIMEOUT_MS = 30_000;

/** What the probe endpoint answers with. */
interface ProbeResult {
  /** Whether `rawBody: true` survived the body parser being replaced */
  hasRawBody: boolean;
  /** Length of the string the request carried, proving how much got parsed */
  size: number;
}

@Controller('probe')
class ProbeController {
  /**
   * Report what the request arrived as.
   * @param request - The incoming request, raw body included when Nest kept one
   * @returns Whether a raw body survived, and how much of the payload was parsed
   */
  @Post()
  echo(@Req() request: RawBodyRequest<Request>): ProbeResult {
    return {
      hasRawBody: request.rawBody !== undefined,
      size: (request.body as { blob?: string }).blob?.length ?? 0,
    };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

// Hai dòng trong main.ts phụ thuộc lẫn nhau theo kiểu không lộ ra khi hỏng: `rawBody: true` là thứ
// duy nhất cho guard Discord thấy đúng bytes Discord đã ký, mà guard đó trả 401 cho cả "chữ ký sai"
// lẫn "mất rawBody" — nên nếu `useBodyParser` nuốt mất rawBody, triệu chứng ngoài đời chỉ là Discord
// "tự nhiên" từ chối mọi interaction.
describe('Bootstrap body parser', () => {
  let app: NestExpressApplication;
  let origin: string;

  beforeAll(async () => {
    // Dựng đúng như main.ts, chỉ thay AppModule bằng một module rỗng để test không cần biến môi trường.
    app = await NestFactory.create<NestExpressApplication>(ProbeModule, {
      rawBody: true,
      logger: false,
    });
    app.useBodyParser('json', { limit: JSON_BODY_LIMIT });

    await app.listen(0);

    const { port } = app.getHttpServer().address() as AddressInfo;
    origin = `http://127.0.0.1:${port}`;
  }, BOOT_TIMEOUT_MS);

  afterAll(async () => {
    await app.close();
  });

  /**
   * Post a JSON body of a given size to the probe.
   * @param blobLength - How many characters the payload's single string field holds
   * @returns What the probe reported
   */
  async function post(blobLength: number): Promise<ProbeResult> {
    const response = await fetch(`${origin}/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blob: 'A'.repeat(blobLength) }),
    });

    expect(response.status).toBe(201);

    return (await response.json()) as ProbeResult;
  }

  it('giữ rawBody cho guard chữ ký Discord', async () => {
    await expect(post(10)).resolves.toMatchObject({ hasRawBody: true });
  });

  it('nhận body lớn hơn hẳn mức mặc định 100kb của Express', async () => {
    const blobLength = EXPRESS_DEFAULT_LIMIT * 4;

    await expect(post(blobLength)).resolves.toMatchObject({
      size: blobLength,
      hasRawBody: true,
    });
  });
});
