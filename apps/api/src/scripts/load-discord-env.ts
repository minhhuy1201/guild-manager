import { existsSync } from 'node:fs';

import { config } from 'dotenv';

/** Env file read when nothing else is named. */
export const DEFAULT_DISCORD_ENV_FILE = '.env';

/** Variable naming the file to read instead of the default. */
export const DISCORD_ENV_FILE_VAR = 'DISCORD_ENV_FILE';

/**
 * Decide which env file the Discord scripts should read.
 *
 * Exactly one file, never merged with `.env` — the same rule the Prisma scripts follow, and for the
 * same reason: local and production are two different Discord Applications, so falling back to
 * `.env` after a missing `.env.production` would register production's commands against the dev
 * application, succeed, and tell nobody.
 *
 * @param requestedFile - Value of `DISCORD_ENV_FILE`, or undefined when unset
 * @param exists - Probe for a file's existence, injected so the rule is testable without the disk
 * @returns The file to load, or null when there is none and ambient variables must be used
 * @throws Error when a file was explicitly named and is not there
 */
export function resolveDiscordEnvFile(
  requestedFile: string | undefined,
  exists: (path: string) => boolean,
): string | null {
  const envFile = requestedFile ?? DEFAULT_DISCORD_ENV_FILE;

  if (exists(envFile)) return envFile;

  if (requestedFile !== undefined) {
    throw new Error(
      `Không tìm thấy file biến môi trường "${requestedFile}". ` +
        `Chạy lệnh từ thư mục apps/api, và tạo file đó nếu chưa có.`,
    );
  }

  return null;
}

/**
 * Load the env file chosen by {@link resolveDiscordEnvFile} into `process.env`.
 *
 * @returns The file that was loaded, or null when ambient variables are used
 * @throws Error when `DISCORD_ENV_FILE` names a file that does not exist
 */
export function loadDiscordEnv(): string | null {
  const envFile = resolveDiscordEnvFile(
    process.env[DISCORD_ENV_FILE_VAR],
    existsSync,
  );

  // override: true so the chosen file always beats a value already sitting in the shell.
  if (envFile) config({ path: envFile, override: true });

  return envFile;
}
