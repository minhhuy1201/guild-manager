import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Domain suffix Vercel gives every deployment without a custom domain. */
const VERCEL_APP_SUFFIX = 'vercel.app';

/** Characters that can appear in the suffix Vercel appends (hash, branch name, scope name). */
const PREVIEW_SUFFIX_PATTERN = '[a-z0-9-]+';

/**
 * A Vercel preview origin is `https://<project>-<hash>-<scope>.vercel.app`, different on every
 * deploy, so it cannot be matched literally.
 *
 * Only the web project is accepted, **not** all of `*.vercel.app`: together with
 * `credentials: true`, an origin that broad opens the door to anyone who deploys on Vercel.
 *
 * @param projectName - Name of the web project on Vercel
 */
function buildPreviewOriginPattern(projectName: string): RegExp {
  const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(
    `^https://${escaped}-${PREVIEW_SUFFIX_PATTERN}\\.${VERCEL_APP_SUFFIX.replace('.', '\\.')}$`,
  );
}

/**
 * Whether an origin may call the API.
 *
 * @param origin - The request's `Origin` header; `undefined` for same-origin or curl requests
 * @param webOrigin - Production origin of apps/web (the WEB_ORIGIN variable)
 * @param previewPattern - Preview domain pattern, `null` when WEB_PREVIEW_PROJECT is unset
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
 * Build the CORS config: accepts the production origin, plus the web project's preview domains
 * when `WEB_PREVIEW_PROJECT` is declared.
 *
 * @param webOrigin - Value of the WEB_ORIGIN variable
 * @param previewProjectName - Web project name on Vercel, omitted when not deploying there
 */
export function createCorsOptions(
  webOrigin: string,
  previewProjectName?: string,
): CorsOptions {
  const previewPattern = previewProjectName
    ? buildPreviewOriginPattern(previewProjectName)
    : null;

  return {
    // Reject with `false` rather than throwing: throwing makes Nest return 500 for every request
    // from an unknown origin (scanning bots included), when all that is needed is to omit the CORS
    // headers — the browser blocks it itself. Non-browser requests still go through, as before,
    // because CORS is not an authentication layer; blocking access is JwtAuthGuard's job.
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin, webOrigin, previewPattern));
    },
    credentials: true,
  };
}
