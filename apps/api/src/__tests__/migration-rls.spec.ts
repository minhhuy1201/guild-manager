import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '../../prisma/migrations');

/**
 * Collect every quoted table name a regex captures across all migration files.
 * @param pattern - A global regex whose first group is the table name
 * @returns The distinct table names found
 */
function tablesMatching(pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const entry of readdirSync(MIGRATIONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sql = readFileSync(
      join(MIGRATIONS_DIR, entry.name, 'migration.sql'),
      'utf8',
    );
    for (const match of sql.matchAll(pattern)) names.add(match[1]);
  }
  return names;
}

// The Data API is shut out in two layers (docs/production.md §5). Revoked grants reach new tables
// through ALTER DEFAULT PRIVILEGES; RLS does not, so each table needs its own line or it is left
// with one layer and nothing says so.
describe('migrations', () => {
  it('enable row level security on every table they create', () => {
    const created = tablesMatching(/^CREATE TABLE "(\w+)"/gm);
    const secured = tablesMatching(
      /^ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY;/gm,
    );

    const unsecured = [...created].filter((table) => !secured.has(table));

    expect(unsecured).toEqual([]);
  });
});
