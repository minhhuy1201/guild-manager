import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Hậu tố domain mà Vercel cấp cho mọi deployment không gắn domain riêng. */
const VERCEL_APP_SUFFIX = 'vercel.app';

/** Ký tự có thể xuất hiện trong phần hậu tố Vercel gắn thêm (hash, tên nhánh, tên scope). */
const PREVIEW_SUFFIX_PATTERN = '[a-z0-9-]+';

/**
 * Origin của một bản preview trên Vercel là `https://<project>-<hash>-<scope>.vercel.app`, đổi theo
 * từng lần deploy nên không so khớp cứng được.
 *
 * Chỉ nhận đúng project web, **không** nới ra cả `*.vercel.app`: đi cùng `credentials: true` thì
 * một origin rộng như vậy là mở cửa cho bất kỳ ai deploy lên Vercel.
 *
 * @param projectName - Tên project web trên Vercel
 */
function buildPreviewOriginPattern(projectName: string): RegExp {
  const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(
    `^https://${escaped}-${PREVIEW_SUFFIX_PATTERN}\\.${VERCEL_APP_SUFFIX.replace('.', '\\.')}$`,
  );
}

/**
 * Kiểm tra một origin có được phép gọi API hay không.
 *
 * @param origin - Header `Origin` của request; `undefined` với request cùng origin hoặc từ curl
 * @param webOrigin - Origin production của apps/web (biến WEB_ORIGIN)
 * @param previewPattern - Mẫu domain preview, `null` khi không khai báo WEB_PREVIEW_PROJECT
 */
function isOriginAllowed(
  origin: string | undefined,
  webOrigin: string,
  previewPattern: RegExp | null,
): boolean {
  if (!origin) {
    return true;
  }

  if (origin === webOrigin) {
    return true;
  }

  return previewPattern?.test(origin) ?? false;
}

/**
 * Dựng cấu hình CORS: nhận origin production, và nhận thêm domain preview của project web nếu có
 * khai báo `WEB_PREVIEW_PROJECT`.
 *
 * @param webOrigin - Giá trị biến WEB_ORIGIN
 * @param previewProjectName - Tên project web trên Vercel, bỏ trống khi không deploy trên Vercel
 */
export function createCorsOptions(
  webOrigin: string,
  previewProjectName?: string,
): CorsOptions {
  const previewPattern = previewProjectName
    ? buildPreviewOriginPattern(previewProjectName)
    : null;

  return {
    // Từ chối bằng `false` chứ không ném Error: ném thì Nest trả 500 cho mọi request từ origin lạ
    // (bot quét cũng tính), trong khi thứ cần làm chỉ là không gắn header CORS — trình duyệt tự
    // chặn. Request không qua trình duyệt vẫn đi được, đúng như trước, vì CORS không phải lớp
    // xác thực; chặn truy cập là việc của JwtAuthGuard.
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin, webOrigin, previewPattern));
    },
    credentials: true,
  };
}
