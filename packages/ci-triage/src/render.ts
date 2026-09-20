import { assertNever } from './assert-never.ts';
import type { TriageResult } from './evaluate.ts';
import {
  BLAST_RADIUS_CRITERIA,
  CONFIDENT_AT,
  UNCERTAIN_AT,
  type OwnerApp,
  type TriageCategory,
} from './questions.ts';

/** Everything the CLI knows about one run, ready to print either way. */
export type TriageReport = {
  runId: number;
  branch: string;
  failedJobs: string[];
  result: TriageResult;
};

/**
 * Formats a report for a person reading a terminal or a GitHub step summary.
 *
 * Every label is printed with its probability beside it, always. A bare label reads as a fact, and
 * these are not facts - they are a probabilistic model's opinion about a log excerpt. Below
 * `UNCERTAIN_AT` no label is printed at all, only the two leading candidates.
 *
 * @param report The run, its failed jobs and Jev's answers.
 * @returns A multi-line block, in Vietnamese, with no trailing newline.
 */
export function renderHuman(report: TriageReport): string {
  const { answers, inputTokens, cost } = report.result;
  const category = describeChoice(
    answers.category.choice,
    answers.category.probabilities,
  );
  const owner = describeChoice(
    answers.ownerApp.choice,
    answers.ownerApp.probabilities,
  );

  const lines = [
    `CI triage · run ${report.runId} · nhánh ${report.branch}`,
    '',
    row('Loại lỗi', category.text),
    row('Nửa hỏng', owner.text),
    row('Chạy lại xanh', answers.rerunLikelyGreen.probability.toFixed(2)),
    row('Độ lan', describeScore(answers.blastRadius.score)),
    '',
    row('Job đỏ', report.failedJobs.join(', ') || '(không đọc được)'),
  ];

  if (category.isConfident) {
    lines.push(row('Gợi ý', advise(answers.category.choice)));
  }

  lines.push('', row('Chi phí', renderCost(inputTokens, cost)));

  return lines.join('\n');
}

/**
 * Serialises a report as the machine-readable form CI and Claude Code consume.
 *
 * The `answers` object is passed through exactly as the AI SDK returned it. Re-wrapping it would
 * create a second schema to keep in step with the first, for no gain.
 *
 * @param report The run, its failed jobs and Jev's answers.
 * @returns Pretty-printed JSON.
 */
export function renderJson(report: TriageReport): string {
  return JSON.stringify(
    {
      runId: report.runId,
      branch: report.branch,
      failedJobs: report.failedJobs,
      answers: report.result.answers,
      usage: { inputTokens: report.result.inputTokens },
      cost: report.result.cost,
    },
    null,
    2,
  );
}

/** A choice rendered for display, and whether it cleared the confidence bar. */
type DescribedChoice = { text: string; isConfident: boolean };

/**
 * Turns a choice answer into display text, applying the three confidence bands.
 *
 * @param choice The label Jev selected.
 * @param probabilities Per-label probabilities; the SDK marks this optional, so it may be absent.
 * @returns The text to print and whether an action may be suggested alongside it.
 */
function describeChoice(
  choice: string,
  probabilities: Record<string, number> | undefined,
): DescribedChoice {
  if (!probabilities) {
    // No distribution came back, so there is no way to tell a firm answer from a coin flip.
    return { text: `${choice} (không có xác suất)`, isConfident: false };
  }

  const ranked = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
  const top = probabilities[choice] ?? 0;

  if (top >= CONFIDENT_AT) {
    return { text: `${choice} (${top.toFixed(2)})`, isConfident: true };
  }
  if (top >= UNCERTAIN_AT) {
    return {
      text: `${choice} (${top.toFixed(2)}) — không chắc`,
      isConfident: false,
    };
  }

  const candidates = ranked
    .slice(0, 2)
    .map(([label, p]) => `${label} (${p.toFixed(2)})`)
    .join(', ');
  return { text: `không kết luận được — ${candidates}`, isConfident: false };
}

/**
 * Renders the blast-radius score against its rubric.
 *
 * @param score The interpolated score, between 0 and the top rung.
 * @returns Text of the form `1.2 / 3 (Local: …)`.
 */
function describeScore(score: number): string {
  const top = BLAST_RADIUS_CRITERIA.length - 1;
  const rung =
    BLAST_RADIUS_CRITERIA[Math.min(top, Math.max(0, Math.round(score)))];
  return `${score.toFixed(1)} / ${top}  (${rung})`;
}

/**
 * Maps a failure category to the next thing worth doing.
 *
 * @param category The category Jev chose, once it cleared the confidence bar.
 * @returns One line of advice, in Vietnamese.
 */
function advise(category: TriageCategory): string {
  switch (category) {
    case 'flaky':
      return 'Chạy lại run này. Vẫn đỏ thì đây là real_regression, không phải flaky.';
    case 'real_regression':
      return 'Đọc assertion đỏ trong log, tái hiện tại chỗ, sửa code.';
    case 'infra':
      return 'Chạy lại. Đỏ lại đúng chỗ đó thì kiểm trạng thái của runner hoặc dịch vụ ngoài.';
    case 'migration_drift':
      return 'Kiểm `pnpm --filter api migrate:prod:status`, rồi `prisma:migrate` tại chỗ và commit migration.';
    case 'env_missing':
      return 'Thiếu biến môi trường hoặc secret. Đối chiếu `.env.example` với GitHub Secrets.';
    case 'lint_format':
      return 'Chạy `pnpm --filter <app> lint:fix` và `format`, rồi commit lại.';
    case 'dependency':
      return 'Kiểm `pnpm-lock.yaml` và `overrides` trong `pnpm-workspace.yaml`. Chạy `pnpm install` rồi commit lockfile.';
    default:
      return assertNever(category);
  }
}

/**
 * Formats the usage line, tolerating a gateway that reported neither number.
 *
 * @param inputTokens Input tokens billed, when known.
 * @param cost Gateway cost as a decimal string, when known.
 * @returns One line for the cost row.
 */
function renderCost(
  inputTokens: number | undefined,
  cost: string | undefined,
): string {
  const parts: string[] = [];
  if (cost !== undefined) parts.push(`$${Number(cost).toFixed(6)}`);
  if (inputTokens !== undefined) parts.push(`${inputTokens} input token`);
  return parts.join(' · ') || '(không rõ)';
}

/**
 * Lays out one aligned label/value row.
 *
 * @param label Row label.
 * @param value Row value.
 * @returns The padded line.
 */
function row(label: string, value: string): string {
  return `  ${label.padEnd(14)}${value}`;
}

/** Re-exported so the CLI can annotate its own output without importing the questions module. */
export type { OwnerApp, TriageCategory };
