import { appendFileSync } from 'node:fs';

import {
  buildState,
  changedFiles,
  currentBranch,
  fetchFailedJobsLocal,
  fetchFailedJobsViaApi,
  findLatestFailedRun,
  type FailedJob,
} from './collect.ts';
import { readCache, writeCache } from './cache.ts';
import { MissingApiKeyError, runTriage } from './evaluate.ts';
import { renderHuman, renderJson, type TriageReport } from './render.ts';

/** Parsed command line. Defaults are resolved here and nowhere else. */
type Options = {
  asJson: boolean;
  useCache: boolean;
  runId: number | null;
};

/**
 * Reads the command line.
 *
 * @param argv Arguments after the script path.
 * @returns The resolved options.
 */
function parseArgs(argv: string[]): Options {
  const runFlag = argv.indexOf('--run');
  const runValue = runFlag === -1 ? undefined : argv[runFlag + 1];

  return {
    asJson: argv.includes('--json'),
    useCache: !argv.includes('--no-cache'),
    runId: runValue === undefined ? null : Number(runValue),
  };
}

/**
 * Prints a message and ends the process successfully.
 *
 * Every early exit goes through here. A diagnostic tool that fails loudly inside a workflow which
 * is *already* red just gives the reader a second error to rule out, so this one never adds to the
 * pile - the nine real checks stay the only thing that can turn CI red.
 *
 * @param message What to tell the reader.
 * @returns Never - the process ends.
 */
function bail(message: string): never {
  console.log(message);
  process.exit(0);
}

/**
 * Resolves which run to triage and pulls its failed jobs.
 *
 * Inside GitHub Actions the run is the one currently executing, so its logs must come from the
 * per-job API: the run is still `in_progress` and `gh run view --log-failed` refuses those.
 * Locally the run has finished, and the `gh` shortcut is the cheaper path.
 *
 * @param options The parsed command line.
 * @returns The run id, the branch it belongs to, and its failed jobs.
 */
function locateRun(options: Options): {
  runId: number;
  branch: string;
  jobs: FailedJob[];
} {
  const inActions = process.env.GITHUB_ACTIONS === 'true';

  if (inActions && options.runId === null) {
    const repo = process.env.GITHUB_REPOSITORY;
    const runId = Number(process.env.GITHUB_RUN_ID);
    if (!repo || !Number.isFinite(runId)) {
      bail(
        'Chạy trong GitHub Actions nhưng thiếu GITHUB_REPOSITORY hoặc GITHUB_RUN_ID.',
      );
    }
    const branch =
      process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'unknown';
    return { runId, branch, jobs: fetchFailedJobsViaApi(repo, runId) };
  }

  const branch = currentBranch();
  if (branch === null) {
    bail('Không đọc được nhánh hiện tại. Đang ở ngoài một git repository?');
  }

  if (options.runId !== null) {
    if (!Number.isFinite(options.runId)) {
      bail('`--run` cần một run id là số.');
    }
    return {
      runId: options.runId,
      branch,
      jobs: fetchFailedJobsLocal(options.runId),
    };
  }

  const run = findLatestFailedRun(branch);
  if (run === null) {
    bail(
      `Nhánh ${branch} chưa có workflow run nào đỏ. Không có gì để phân loại.`,
    );
  }
  return {
    runId: run.databaseId,
    branch,
    jobs: fetchFailedJobsLocal(run.databaseId),
  };
}

/**
 * Runs one triage end to end: locate the run, build the state, ask Jev, print the answer.
 *
 * The state is never printed, with `--json` or without. It is redacted log text, redaction is best
 * effort, and echoing it doubles the exposure for no benefit.
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { runId, branch, jobs } = locateRun(options);

  if (jobs.length === 0) {
    bail(
      `Run ${runId} không có job đỏ nào đọc được log. Không có gì để phân loại.`,
    );
  }

  const cached = options.useCache ? readCache(runId) : null;
  let result = cached;

  if (result === null) {
    const state = buildState(jobs, changedFiles());
    if (state.logTail.trim() === '') {
      bail(`Log của run ${runId} rỗng sau khi lọc. Không có gì để phân loại.`);
    }

    try {
      result = await runTriage(state);
    } catch (error) {
      if (error instanceof MissingApiKeyError) {
        bail(error.message);
      }
      bail(
        `Gọi Jev thất bại: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (options.useCache) {
      writeCache(runId, result);
    }
  }

  const report: TriageReport = {
    runId,
    branch,
    failedJobs: jobs.map((job) => job.name),
    result,
  };
  const human = renderHuman(report);

  console.log(options.asJson ? renderJson(report) : human);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      `## CI triage (Jev)\n\n\`\`\`\n${human}\n\`\`\`\n`,
      'utf8',
    );
  }
}

await main();
