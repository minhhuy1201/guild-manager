import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
} from '@/common';
import { API_PREFIX } from '@/config';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health trả về trạng thái đã bọc trong { data }', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/health`)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        status: 'ok',
        uptime: expect.any(Number) as number,
        db: expect.stringMatching(/^(up|down)$/) as string,
        timestamp: expect.any(String) as string,
      },
    });
  });

  it('gắn header x-request-id vào response', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/health`)
      .expect(200);

    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('trả lỗi 404 theo format thống nhất', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/khong-ton-tai`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      path: `/${API_PREFIX}/khong-ton-tai`,
      timestamp: expect.any(String) as string,
    });
  });
});
