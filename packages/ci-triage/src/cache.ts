import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TriageResult } from './evaluate.ts';

/**
 * Cached results live inside this package's `node_modules`, which git already ignores - no new
 * `.gitignore` entry, and `pnpm install --force` clears them for free.
 */
const CACHE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  '.cache',
  'triage',
);

/**
 * Reads a previously stored result for a workflow run.
 *
 * There is no expiry: a run id names an immutable run, so its triage can never go stale. Re-running
 * CI produces a new run id and therefore a new evaluation.
 *
 * @param runId The workflow run id.
 * @returns The stored result, or `null` when nothing usable is cached.
 */
export function readCache(runId: number): TriageResult | null {
  try {
    return JSON.parse(readFileSync(cachePath(runId), 'utf8')) as TriageResult;
  } catch {
    // No file yet, or a half-written / hand-edited one. Either way the only sensible answer is
    // "not cached" - the caller then asks Jev again and overwrites it.
    return null;
  }
}

/**
 * Stores a result so the same run is never evaluated twice.
 *
 * @param runId The workflow run id.
 * @param result The result to store.
 */
export function writeCache(runId: number, result: TriageResult): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath(runId), JSON.stringify(result), 'utf8');
  } catch {
    // A read-only or full filesystem. The cache is an optimisation; losing it costs one extra
    // evaluation at $0.0004, which is not worth failing a diagnostic run over.
  }
}

/**
 * Builds the on-disk path for one run's cached result.
 *
 * @param runId The workflow run id.
 * @returns Absolute path to that run's cache file.
 */
function cachePath(runId: number): string {
  return join(CACHE_DIR, `${runId}.json`);
}
