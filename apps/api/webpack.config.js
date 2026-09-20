/**
 * Extends the default webpack config the Nest CLI builds.
 *
 * By default Nest keeps everything in node_modules out of the bundle (external). But
 * `@guild/shared` is TypeScript source from the workspace with no JS build - left external, a
 * running `dist/main.js` would try to require a `.ts` file and crash. So `@guild/*` alone is
 * bundled in and everything else stays as it was.
 *
 * @param {import('webpack').Configuration} options - The default config prepared by the Nest CLI
 * @returns {import('webpack').Configuration} The config with the adjusted externals rule
 */
module.exports = (options) => ({
  ...options,
  externals: [
    ({ request }, callback) => {
      const isRelative = request.startsWith('.') || request.startsWith('/');
      // `@guild/...` is shared source from the workspace.
      const isInternalSource = request.startsWith('@guild/');

      if (isRelative || isInternalSource) {
        return callback();
      }

      return callback(null, `commonjs ${request}`);
    },
  ],
});
