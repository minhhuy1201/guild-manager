import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { REQUEST_ID_HEADER } from '../../constants/http.constant';
import {
  AllExceptionsFilter,
  describeException,
  type ErrorResponseBody,
} from '../all-exceptions.filter';

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

    new AllExceptionsFilter().catch(exception, host);

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
    // Đây chính là lỗ hổng plan này vá: trước khi có requestIdMiddleware, giá trị này là chuỗi rỗng.
    const { body } = runFilter(new UnauthorizedException('Không có quyền.'));

    expect(body.requestId).toBe('id-tu-middleware');
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
