import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { envSchema } from '../env.validation';

/** Root of `apps/api` — where `.env.example` lives. */
const API_ROOT = join(__dirname, '..', '..', '..');

/** Root of the repository — where `docs/` lives. */
const REPO_ROOT = join(API_ROOT, '..', '..');

/**
 * Keys `.env.example` documents that `envSchema` deliberately does not read. Each needs a reason:
 * an entry here is a promise that the runtime never touches the variable.
 */
const ENV_EXAMPLE_ONLY = [
  // Read by the Prisma CLI only (`migrate:prod`, `db:seed`); the runtime must never touch it.
  'DIRECT_DATABASE_URL',
  // Read by `discord:register` only, a script run by hand, never by the running app.
  'DISCORD_GUILD_ID',
];

/** Docs whose §3 table must have a row for every key the schema reads. */
const ENV_DOCS = ['docs/development.md', 'docs/production.md'];

/**
 * @param text - Contents of an env file
 * @returns Every key assigned at the start of a line; commented-out lines do not count
 */
function envFileKeys(text: string): string[] {
  return [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
}

/**
 * Compare the schema with `.env.example`, both ways, minus `ENV_EXAMPLE_ONLY`.
 *
 * @returns One line per key that is on one side only
 */
function exampleDrift(schemaKeys: string[], exampleKeys: string[]): string[] {
  const missingFromExample = schemaKeys
    .filter((key) => !exampleKeys.includes(key))
    .map((key) => `${key}: in envSchema but not in .env.example`);
  const missingFromSchema = exampleKeys
    .filter((key) => !schemaKeys.includes(key))
    .filter((key) => !ENV_EXAMPLE_ONLY.includes(key))
    .map(
      (key) =>
        `${key}: in .env.example but not in envSchema (add it to envSchema, or to ENV_EXAMPLE_ONLY with the reason the runtime never reads it)`,
    );

  return [...missingFromExample, ...missingFromSchema];
}

/**
 * A loose mention is not enough: `DATABASE_URL` appears all over both docs, so only a table row
 * proves the variable is documented.
 *
 * @returns One line per key with no `| \`KEY\` |` row in the doc
 */
function missingDocRows(
  keys: string[],
  docText: string,
  docPath: string,
): string[] {
  return keys
    .filter((key) => !new RegExp(`^\\| \`${key}\` \\|`, 'm').test(docText))
    .map((key) => `${key}: no table row in ${docPath}`);
}

const schemaKeys = Object.keys(envSchema.shape);
const exampleKeys = envFileKeys(
  readFileSync(join(API_ROOT, '.env.example'), 'utf8'),
);

describe('envSchema khớp .env.example và bảng env trong docs', () => {
  it('mọi key của envSchema có trong .env.example, và ngược lại', () => {
    expect(exampleDrift(schemaKeys, exampleKeys)).toEqual([]);
  });

  it('ENV_EXAMPLE_ONLY chỉ chứa key có trong .env.example mà envSchema không đọc', () => {
    const stale = ENV_EXAMPLE_ONLY.filter(
      (key) => !exampleKeys.includes(key) || schemaKeys.includes(key),
    );

    expect(stale).toEqual([]);
  });

  it.each(ENV_DOCS)(
    'mọi key của envSchema có một hàng trong bảng của %s',
    (docPath) => {
      const docText = readFileSync(join(REPO_ROOT, docPath), 'utf8');

      expect(missingDocRows(schemaKeys, docText, docPath)).toEqual([]);
    },
  );

  describe('đỏ được khi lệch (dữ liệu giả)', () => {
    it('báo key schema thiếu trong .env.example', () => {
      expect(exampleDrift(['A_KEY', 'B_KEY'], ['A_KEY'])).toEqual([
        'B_KEY: in envSchema but not in .env.example',
      ]);
    });

    it('báo key .env.example thừa ngoài allow-list, bỏ qua key trong allow-list', () => {
      expect(
        exampleDrift(['A_KEY'], ['A_KEY', 'EXTRA_KEY', 'DIRECT_DATABASE_URL']),
      ).toEqual([
        expect.stringMatching(
          /^EXTRA_KEY: in \.env\.example but not in envSchema/,
        ),
      ]);
    });

    it('không tính dòng đã comment trong .env.example', () => {
      expect(envFileKeys('A_KEY=1\n# B_KEY=2\n#   C_KEY=3 pnpm run\n')).toEqual(
        ['A_KEY'],
      );
    });

    it('báo key chỉ được nhắc trong văn xuôi mà không có hàng bảng', () => {
      const doc = '| `A_KEY` | ✅ | x |\nSee `B_KEY` for details.\n';

      expect(missingDocRows(['A_KEY', 'B_KEY'], doc, 'docs/x.md')).toEqual([
        'B_KEY: no table row in docs/x.md',
      ]);
    });
  });
});
