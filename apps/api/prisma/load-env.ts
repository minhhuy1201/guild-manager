import { existsSync } from 'node:fs';

import { config } from 'dotenv';

/** Default env file when nothing else is specified. */
const DEFAULT_ENV_FILE = '.env';

/** Label returned when there is no file to load and the variables are already in the environment. */
const AMBIENT_ENV_LABEL = 'biến môi trường có sẵn (không có file .env)';

/**
 * Load the env file for Prisma CLI commands (generate/migrate/seed/studio).
 *
 * Set `PRISMA_ENV_FILE` to target another environment:
 *
 *   PRISMA_ENV_FILE=.env.production pnpm db:seed
 *
 * Exactly one file is loaded, never merged with `.env`, so a command aimed at production can never
 * pick up a local connection string. That is also why this is not written as
 * `DATABASE_URL=$DIRECT_DATABASE_URL prisma ...`: the shell expands variables before dotenv runs.
 *
 * Both `prisma.config.ts` and `prisma/seed.ts` call this. Seed runs in a child process of the Prisma
 * CLI and does not inherit what config loaded, so it must load the same file again.
 *
 * Hosted build environments (Vercel, GitHub Actions) have no `.env` file: variables are injected
 * into the process. A missing file there is normal, so the ambient variables are used instead of
 * throwing. It still throws when there is neither a file nor `DATABASE_URL` — that is the wrong-
 * directory case this guard exists to catch.
 *
 * @returns Path of the loaded file, or {@link AMBIENT_ENV_LABEL} when ambient variables are used
 * @throws Error when the named file is missing, or when no source of variables exists at all
 */
export function loadPrismaEnv(): string {
  const requestedFile = process.env.PRISMA_ENV_FILE;
  const envFile = requestedFile ?? DEFAULT_ENV_FILE;

  if (!existsSync(envFile)) {
    // An explicitly named file that is missing is always an error: silently falling back to ambient
    // variables would let a production-targeted command run against a completely different database.
    if (requestedFile !== undefined) {
      throw new Error(
        `Không tìm thấy file biến môi trường "${envFile}". ` +
          `Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
      );
    }

    if (!process.env.DATABASE_URL) {
      throw new Error(
        `Không tìm thấy file biến môi trường "${envFile}", và cũng không có DATABASE_URL ` +
          `trong môi trường. Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
      );
    }

    return AMBIENT_ENV_LABEL;
  }

  // override: true so the chosen file always beats variables already present in the shell.
  config({ path: envFile, override: true });

  return envFile;
}
