import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

import { describeException } from '../all-exceptions.filter';

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
