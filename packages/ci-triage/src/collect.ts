import { execFileSync } from 'node:child_process';

import { MAX_LINES_PER_JOB, MAX_STATE_CHARS } from './questions.ts';
import { redact } from './redact.ts';

/** One CI job that ended red, with whatever log text we managed to retrieve for it. */
export type FailedJob = {
  name: string;
  conclusion: string;
  log: string;
};

/**
 * Everything Jev is given. Deliberately small: job names, changed file *paths* only, and the tail
 * of the failed logs. No diff content and no file contents - they cost tokens and widen the
 * exposure surface without helping a classification decision.
 */
export type TriageState = {
  failedJobs: { name: string; conclusion: string }[];
  changedFiles: string[];
  logTail: string;
};

/**
 * Keeps the end of a log rather than the beginning.
 *
 * The cause of a failure is almost always in the last few lines; the top is setup noise. When
 * anything is dropped, a marker line says so, so a reader of the JSON output never mistakes the
 * excerpt for the whole log.
 *
 * @param log Full log text.
 * @param maxLines Most lines to keep, counted from the end.
 * @param maxChars Hard ceiling on the returned length, applied after the line limit.
 * @returns The tail of the log, prefixed with a marker when anything was dropped.
 */
export function truncateTail(
  log: string,
  maxLines: number,
  maxChars: number,
): string {
  const lines = log.split('\n');
  const droppedLines = Math.max(0, lines.length - maxLines);
  let kept = lines.slice(droppedLines).join('\n');

  if (kept.length > maxChars) {
    kept = kept.slice(kept.length - maxChars);
  }

  const dropped = droppedLines > 0 || kept.length < log.length;
  return dropped
    ? `… earlier output omitted (${droppedLines} lines) …\n${kept}`
    : kept;
}

/**
 * Assembles the state sent to Jev.
 *
 * Redaction runs on the **full** log, before truncation. The reverse order would leave the
 * discarded head unexamined - harmless while it is discarded, but a refactor that widens the
 * excerpt would silently start shipping unredacted text.
 *
 * @param jobs The failed jobs and their raw logs.
 * @param changedFiles Paths changed on this branch, names only.
 * @returns The state object, small enough to fit Jev's context with room to spare.
 */
export function buildState(
  jobs: FailedJob[],
  changedFiles: string[],
): TriageState {
  const perJobChars = Math.floor(MAX_STATE_CHARS / Math.max(1, jobs.length));

  const logTail = jobs
    .map((job) => {
      const safe = redact(job.log);
      return `### ${job.name}\n${truncateTail(safe, MAX_LINES_PER_JOB, perJobChars)}`;
    })
    .join('\n\n');

  return {
    failedJobs: jobs.map(({ name, conclusion }) => ({ name, conclusion })),
    changedFiles,
    logTail: logTail.slice(-MAX_STATE_CHARS),
  };
}

/**
 * Splits `gh run view --log-failed` output into one entry per job.
 *
 * The command emits `<job>\t<step>\t<line>` on every line, so the job name is the first tab-
 * separated field. Lines without tabs (blank separators) are attached to the job in progress.
 *
 * @param raw Combined output of `gh run view --log-failed`.
 * @returns One `FailedJob` per distinct job name, in first-seen order.
 */
export function parseRunLog(raw: string): FailedJob[] {
  const byJob = new Map<string, string[]>();
  let current = 'unknown job';

  for (const line of raw.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab > 0) {
      current = line.slice(0, tab);
    }
    const bucket = byJob.get(current) ?? [];
    bucket.push(tab > 0 ? line.slice(tab + 1) : line);
    byJob.set(current, bucket);
  }

  return [...byJob].map(([name, lines]) => ({
    name,
    conclusion: 'failure',
    log: lines.join('\n'),
  }));
}

/**
 * Runs a `gh` subcommand and returns its stdout.
 *
 * @param args Arguments passed to the `gh` binary.
 * @returns stdout as UTF-8, or `null` when `gh` is missing or exits non-zero.
 */
function gh(args: string[]): string | null {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    // `gh` is absent, unauthenticated, or the resource does not exist. Every caller treats a
    // missing result as "nothing to triage" and exits cleanly, so there is nothing to rethrow.
    return null;
  }
}

/** The subset of `gh run list --json` output this tool reads. */
type RunSummary = { databaseId: number; headSha: string };

/**
 * Finds the most recent failed workflow run for a branch.
 *
 * @param branch Branch name to look up.
 * @returns The run's id and head SHA, or `null` when the branch has no failed run.
 */
export function findLatestFailedRun(branch: string): RunSummary | null {
  const raw = gh([
    'run',
    'list',
    '--branch',
    branch,
    '--status',
    'failure',
    '--limit',
    '1',
    '--json',
    'databaseId,headSha',
  ]);
  if (!raw) return null;

  const runs = JSON.parse(raw) as RunSummary[];
  return runs[0] ?? null;
}

/**
 * Fetches the failed jobs of a finished run, the short way.
 *
 * Only usable once the run itself has completed - `gh run view --log-failed` refuses a run that is
 * still in progress, which is exactly the situation inside CI. Use {@link fetchFailedJobsViaApi}
 * there.
 *
 * @param runId The workflow run id.
 * @returns One entry per failed job, or an empty array when no log could be read.
 */
export function fetchFailedJobsLocal(runId: number): FailedJob[] {
  const raw = gh(['run', 'view', String(runId), '--log-failed']);
  return raw ? parseRunLog(raw) : [];
}

/** The subset of the Actions jobs API this tool reads. */
type ApiJob = { id: number; name: string; conclusion: string | null };

/**
 * Fetches the failed jobs of a run that may still be in progress.
 *
 * This is the path used inside CI: the triage job is itself part of the run, so the run is always
 * `in_progress` when it asks. The per-job endpoints have no such restriction.
 *
 * @param repo `owner/name` of the repository.
 * @param runId The workflow run id.
 * @returns One entry per failed job, each with its log body.
 */
export function fetchFailedJobsViaApi(
  repo: string,
  runId: number,
): FailedJob[] {
  const raw = gh([
    'api',
    `/repos/${repo}/actions/runs/${runId}/jobs`,
    '--paginate',
  ]);
  if (!raw) return [];

  // `--paginate` concatenates one JSON object per page; each carries its own `jobs` array.
  const pages = raw
    .replace(/}\s*{/g, '}\n{')
    .split('\n')
    .filter((line) => line.trim().startsWith('{'));

  const jobs = pages.flatMap(
    (page) => (JSON.parse(page) as { jobs?: ApiJob[] }).jobs ?? [],
  );

  return jobs
    .filter((job) => job.conclusion === 'failure')
    .map((job) => ({
      name: job.name,
      conclusion: 'failure',
      log: gh(['api', `/repos/${repo}/actions/jobs/${job.id}/logs`]) ?? '',
    }));
}

/**
 * Lists the files this branch changes relative to `main`.
 *
 * @returns Changed paths, or an empty array when the comparison cannot be made.
 */
export function changedFiles(): string[] {
  try {
    const out = execFileSync(
      'git',
      ['diff', '--name-only', 'origin/main...HEAD'],
      {
        encoding: 'utf8',
      },
    );
    return out.split('\n').filter(Boolean);
  } catch {
    // No `origin/main` ref - a fresh clone, a fork, or a shallow checkout. The file list is a
    // hint for the evaluation, not a requirement, so an empty list is a valid answer.
    return [];
  }
}

/**
 * Reads the current branch name.
 *
 * @returns The checked-out branch, or `null` in a detached HEAD or outside a repository.
 */
export function currentBranch(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    // Not a git repository, or HEAD points at no branch. The caller reports this and exits.
    return null;
  }
}
