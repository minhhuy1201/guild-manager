import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** Response thành công thống nhất: dữ liệu luôn nằm trong `data`. */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Bọc mọi response thành công vào `{ data }` để frontend chỉ unwrap một chỗ
 * trong api client, thay vì mỗi endpoint một shape khác nhau.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Bọc giá trị trả về của controller vào field `data`.
   * @param _context - Ngữ cảnh thực thi (không dùng)
   * @param next - Handler kế tiếp trong chuỗi xử lý
   * @returns Observable phát ra `{ data }`
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
