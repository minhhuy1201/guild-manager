/**
 * Mở rộng webpack config mặc định của Nest CLI.
 *
 * Mặc định Nest để mọi thứ trong node_modules ra ngoài bundle (external). Nhưng
 * `@guild/shared` là source TypeScript của workspace, không có bản build JS — để external
 * thì lúc chạy `dist/main.js` Node sẽ đòi require file `.ts` và crash. Vì vậy chỉ riêng
 * `@guild/*` được bundle vào, phần còn lại giữ nguyên như cũ.
 *
 * @param {import('webpack').Configuration} options - Config mặc định do Nest CLI dựng sẵn
 * @returns {import('webpack').Configuration} Config với luật externals đã chỉnh
 */
module.exports = (options) => ({
  ...options,
  externals: [
    ({ request }, callback) => {
      const isRelative = request.startsWith('.') || request.startsWith('/');
      // `@/...` là alias tới src của chính app, `@guild/...` là source dùng chung của workspace.
      const isInternalSource =
        request.startsWith('@/') || request.startsWith('@guild/');

      if (isRelative || isInternalSource) {
        return callback();
      }

      return callback(null, `commonjs ${request}`);
    },
  ],
});
