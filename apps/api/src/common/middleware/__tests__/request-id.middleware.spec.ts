import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import { requestIdMiddleware } from '../request-id.middleware';

/** A UUID v4 as `randomUUID` produces it. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Build the three arguments Express passes a middleware.
 * @param headers - Incoming request headers
 * @returns The request, the response with a recording `setHeader`, and a counting `next`
 */
function callMiddleware(headers: Record<string, string | string[]>): {
  request: Request;
  setHeader: jest.Mock;
  next: jest.Mock;
} {
  const request = { headers } as unknown as Request;
  const setHeader = jest.fn();
  const next = jest.fn();

  requestIdMiddleware(request, { setHeader } as unknown as Response, next);

  return { request, setHeader, next };
}

describe('requestIdMiddleware', () => {
  it('sinh id mới khi client không gửi', () => {
    const { request } = callMiddleware({});

    expect(String(request.headers[REQUEST_ID_HEADER])).toMatch(UUID_PATTERN);
  });

  it('giữ nguyên id client gửi, để frontend nối được log của nó với log của API', () => {
    const { request } = callMiddleware({ [REQUEST_ID_HEADER]: 'tu-frontend' });

    expect(request.headers[REQUEST_ID_HEADER]).toBe('tu-frontend');
  });

  it('gieo id vào request.headers — đây là chỗ AllExceptionsFilter đọc ra', () => {
    const { request, setHeader } = callMiddleware({});

    expect(setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      request.headers[REQUEST_ID_HEADER],
    );
  });

  it('gọi next đúng một lần để request đi tiếp', () => {
    const { next } = callMiddleware({});

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('thay id quá dài bằng id tự sinh', () => {
    // Id được ghi vào log của mọi request, kể cả request chưa xác thực bị guard chặn — nhận nguyên
    // si chuỗi tuỳ ý của người gọi là biến log thành chỗ đổ rác miễn phí.
    const { request } = callMiddleware({ [REQUEST_ID_HEADER]: 'a'.repeat(65) });

    expect(String(request.headers[REQUEST_ID_HEADER])).toMatch(UUID_PATTERN);
  });

  it('thay id chứa ký tự ngoài chữ, số và dấu gạch bằng id tự sinh', () => {
    const { request } = callMiddleware({
      [REQUEST_ID_HEADER]: 'id có khoảng trắng',
    });

    expect(String(request.headers[REQUEST_ID_HEADER])).toMatch(UUID_PATTERN);
  });

  it('thay id bằng id tự sinh khi header bị gửi hai lần — Express gộp thành string[]', () => {
    const { request } = callMiddleware({
      [REQUEST_ID_HEADER]: ['tu-frontend', 'tu-frontend'],
    });

    expect(String(request.headers[REQUEST_ID_HEADER])).toMatch(UUID_PATTERN);
  });
});
