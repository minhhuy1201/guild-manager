import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { FixedClock } from '../../clock/clock';
import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import {
  AllExceptionsFilter,
  describeException,
  statusOf,
  type ErrorResponseBody,
} from '../all-exceptions.filter';

/** Fixed moment the filter stamps every response with, so `timestamp` is assertable. */
const NOW = new Date('2026-09-20T05:00:00.000Z');

describe('describeException', () => {
  it('exception lạ không lộ chi tiết ra ngoài', () => {
    expect(describeException(new Error('connect ECONNREFUSED 5432'))).toEqual({
      message: 'Lỗi hệ thống, vui lòng thử lại sau.',
    });
  });

  it('HttpException với payload chuỗi lấy nguyên câu đó', () => {
    const exception = new HttpException(
      'Trận này đã đánh xong.',
      HttpStatus.CONFLICT,
    );

    expect(describeException(exception)).toEqual({
      message: 'Trận này đã đánh xong.',
    });
  });

  it('payload có message mảng thì nối lại bằng dấu phẩy', () => {
    const exception = new BadRequestException({
      message: ['Tên không được rỗng', 'Ngày không hợp lệ'],
    });

    expect(describeException(exception)).toMatchObject({
      message: 'Tên không được rỗng, Ngày không hợp lệ',
    });
  });

  it('giữ nguyên errors của lỗi validate Zod', () => {
    const errors = { name: ['Bắt buộc'] };
    const exception = new BadRequestException({
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });

    expect(describeException(exception)).toEqual({
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  });

  it('lỗi Zod lấy câu tiếng Việt trong errors thay cho "Validation failed"', () => {
    const exception = new BadRequestException({
      message: 'Validation failed',
      errors: [
        {
          path: ['scene', 'stages'],
          message: 'Một chiến thuật tối đa 20 giai đoạn.',
        },
      ],
    });

    expect(describeException(exception)).toMatchObject({
      message: 'Một chiến thuật tối đa 20 giai đoạn.',
    });
  });

  it('nhiều issue trùng câu chỉ hiện một lần', () => {
    const exception = new BadRequestException({
      message: 'Validation failed',
      errors: [
        { path: ['a'], message: 'Ghi chú tối đa 80 ký tự.' },
        { path: ['b'], message: 'Ghi chú tối đa 80 ký tự.' },
        { path: ['c'], message: 'Tên giai đoạn tối đa 40 ký tự.' },
      ],
    });

    expect(describeException(exception)).toMatchObject({
      message: 'Ghi chú tối đa 80 ký tự. Tên giai đoạn tối đa 40 ký tự.',
    });
  });

  it('payload không có message dùng message của exception', () => {
    const exception = new HttpException({ statusCode: 418 }, 418);

    expect(describeException(exception)).toMatchObject({
      message: exception.message,
    });
  });
});

describe('AllExceptionsFilter.catch', () => {
  /**
   * Run the filter over one exception and capture what it logged and answered.
   * @param exception - The exception Nest caught
   * @returns The response body, plus the warn/error spies
   */
  function runFilter(exception: unknown): {
    body: ErrorResponseBody;
    warnLines: string[];
    errorLines: { line: string; stack: string }[];
  } {
    const warnLines: string[] = [];
    const errorLines: { line: string; stack: string }[] = [];

    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((message: unknown) => {
        warnLines.push(String(message));
      });
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((message: unknown, stack: unknown) => {
        errorLines.push({ line: String(message), stack: String(stack) });
      });

    let body = {} as ErrorResponseBody;
    const response = {
      status: () => response,
      json: (payload: ErrorResponseBody) => {
        body = payload;
      },
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/discord/interactions',
          method: 'POST',
          headers: { [REQUEST_ID_HEADER]: 'id-tu-middleware' },
        }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    new AllExceptionsFilter(new FixedClock(NOW)).catch(exception, host);

    return { body, warnLines, errorLines };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('log 4xx một dòng warn, không kèm stack — lỗi phía gọi, stack chỉ làm nhiễu', () => {
    const { warnLines, errorLines } = runFilter(
      new UnauthorizedException('Chữ ký Discord không hợp lệ.'),
    );

    expect(warnLines).toHaveLength(1);
    expect(errorLines).toHaveLength(0);
    expect(warnLines[0]).toContain('401');
  });

  it('request bị guard chặn vẫn có requestId để tra log', () => {
    // This is the hole the plan closed: before requestIdMiddleware existed, this value was an empty
    // string.
    const { body } = runFilter(new UnauthorizedException('Không có quyền.'));

    expect(body.requestId).toBe('id-tu-middleware');
  });

  it('timestamp đọc từ Clock, không phải đồng hồ máy', () => {
    const { body } = runFilter(new UnauthorizedException('Không có quyền.'));

    expect(body.timestamp).toBe(NOW.toISOString());
  });

  it('5xx vẫn log error kèm stack', () => {
    const { warnLines, errorLines } = runFilter(
      new Error('connect ECONNREFUSED 5432'),
    );

    expect(errorLines).toHaveLength(1);
    expect(warnLines).toHaveLength(0);
    expect(errorLines[0].stack).toContain('Error: connect ECONNREFUSED');
  });
});

// body-parser throws a bare Error when the body is over the limit, so it used to land in the
// "unknown exception" branch and come back as a 500 "Lỗi hệ thống" - the wrong class of error, and
// no help at all on what to do about it.
describe('body vượt trần', () => {
  /**
   * The error body-parser throws when a request is larger than `limit`.
   * @returns An Error carrying the exact fields body-parser attaches
   */
  function payloadTooLarge(): Error {
    return Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });
  }

  it('trả 413 chứ không phải 500', () => {
    expect(statusOf(payloadTooLarge())).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
  });

  it('nói bằng tiếng Việt là ảnh quá nặng', () => {
    expect(describeException(payloadTooLarge()).message).toMatch(/quá nặng/);
  });

  it('exception thường vẫn là 500', () => {
    expect(statusOf(new Error('connect ECONNREFUSED 5432'))).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('HttpException vẫn giữ status của chính nó', () => {
    expect(statusOf(new UnauthorizedException())).toBe(HttpStatus.UNAUTHORIZED);
  });
});
