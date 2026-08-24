import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

/** Response thành công thống nhất: dữ liệu luôn nằm trong `data`. */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Bọc mọi response thành công vào `{ data }` để frontend chỉ unwrap một chỗ
 * trong api client, thay vì mỗi endpoint một shape khác nhau.
 *
 * Trừ route `@Redirect()`: giá trị `{ url }` nó trả về không phải dữ liệu cho client mà là
 * chỉ dẫn cho Nest, và Nest đọc `url` ngay trên tầng đầu tiên. Bọc vào `data` thì Nest không
 * thấy `url` nữa và trả 302 với header `Location` rỗng — không lỗi, không log, chỉ là trình
 * duyệt đứng im giữa luồng đăng nhập Discord.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Bọc giá trị trả về của controller vào field `data`, bỏ qua route redirect.
   * @param context - Ngữ cảnh thực thi, dùng để đọc metadata của handler
   * @param next - Handler kế tiếp trong chuỗi xử lý
   * @returns Observable phát ra `{ data }`, hoặc giá trị nguyên vẹn với route redirect
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const isRedirect =
      this.reflector.get(REDIRECT_METADATA, context.getHandler()) !== undefined;

    if (isRedirect) return next.handle();

    return next.handle().pipe(map((data) => ({ data })));
  }
}
