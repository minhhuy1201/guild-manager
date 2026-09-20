/**
 * The four typed questions Jev answers about a failed CI run, plus the constants that decide how
 * much state we send and how confident an answer has to be before it is printed as a conclusion.
 *
 * The criteria are deliberately written against *this* repository - they name the real job names
 * from `.github/workflows/ci.yml`, the real commands, and the real shape of the monorepo. Jev
 * scores the supplied state against the supplied criteria and nothing else, so generic wording
 * ("a test failed") produces a flat probability distribution that says nothing.
 */

/** Longest a log tail may be, in characters. Jev's context is 32k tokens; this leaves wide margin. */
export const MAX_STATE_CHARS = 40_000;

/** Lines kept from the end of each failed job's log. The cause is almost always at the bottom. */
export const MAX_LINES_PER_JOB = 200;

/** At or above this probability, an answer is printed as a conclusion with a suggested action. */
export const CONFIDENT_AT = 0.7;

/** Below this probability, no label is printed at all - only the top two candidates. */
export const UNCERTAIN_AT = 0.45;

/**
 * What kind of failure this is. The seven labels are not a general taxonomy: each one maps to a
 * different next action, and together they cover what can actually go red in this repository's
 * `ci.yml` and `security.yml`.
 */
export const CATEGORY_CRITERIA = {
  flaky:
    'A test failed for a reason unrelated to the change: a timing or ordering assumption, a shared fixture, a date or timezone edge, or a race. The same commit could pass on a re-run.',
  real_regression:
    'The change under test genuinely broke behaviour. An assertion fails on the logic the diff touched, or a type error points at the new code.',
  infra:
    'The failure is outside the repository: the GitHub runner, npm/pnpm registry, network timeouts, Vercel or SonarQube being unreachable, a cancelled or out-of-disk runner.',
  migration_drift:
    'Prisma schema, the committed migrations and the database disagree. Typical signs: `prisma migrate` reporting drift or pending migrations, a missing column or table at runtime, `P3005`, `P3009`.',
  env_missing:
    'A required environment variable or GitHub secret is absent or empty. Typical signs: env validation failing at startup, `AUTH_SECRET` length errors, an empty token check step failing deliberately.',
  lint_format:
    'ESLint or Prettier reported violations. The code runs, but style or lint rules are not satisfied. Typical signs: rule names in the output, `format:check` reporting files that differ.',
  dependency:
    'Install, the lockfile, or a dependency advisory caused the failure. Typical signs: pnpm refusing an out-of-date `pnpm-lock.yaml`, an `engines` mismatch, a Trivy or dependency-review finding, a peer dependency conflict.',
} as const;

/** One of the seven failure kinds `category` can return. */
export type TriageCategory = keyof typeof CATEGORY_CRITERIA;

/**
 * Which part of the monorepo owns the failure. This is not the same as which paths the commit
 * touched - `ci.yml`'s path filters already answer that. The interesting case is when the two
 * disagree: a change in `packages/shared` that only breaks `apps/web`, for instance.
 */
export const OWNER_APP_CRITERIA = {
  api: 'The NestJS backend in `apps/api` - its modules, services, controllers, guards or Jest suite.',
  web: 'The Next.js frontend in `apps/web` - its features, pages, components or Vitest suite.',
  shared:
    'The contract package `packages/shared` - Zod schemas, enums or the Vietnam clock helpers - or a mismatch between it and one of the apps, including a stale `dist` build.',
  ci_infra:
    'The workflow definitions, composite actions, the pnpm workspace, the lockfile or the runner setup, rather than any application code.',
  migration:
    'The Prisma schema, a migration folder, the seed script, or the production database state.',
} as const;

/** Which half of the monorepo (or neither) the failure belongs to. */
export type OwnerApp = keyof typeof OWNER_APP_CRITERIA;

/**
 * The blast-radius rubric, ordered lowest to highest. The answer is an interpolated score between
 * 0 and 3 plus the probability of each rung, so a spread distribution is itself information: it
 * means the failed jobs disagree about how far the damage reaches.
 */
export const BLAST_RADIUS_CRITERIA = [
  'Contained: one test case or one file.',
  'Local: one module or one frontend feature.',
  'Wide: several modules, or a break that crosses both apps through the shared package.',
  'Structural: the database schema, a migration, or the deploy path itself.',
] as const;

/**
 * The request body's `questions` field, sent as-is to `experimental_evaluate`. All four are
 * answered in a single round trip against the same state.
 */
export const TRIAGE_QUESTIONS = {
  category: {
    type: 'choice',
    instructions:
      'A CI run on a pnpm monorepo (NestJS API + Next.js web + a shared Zod package) has failed. Given the failed job names, the changed file paths and the tail of the failed logs, classify the root cause.',
    criteria: CATEGORY_CRITERIA,
  },
  ownerApp: {
    type: 'choice',
    instructions:
      'Which part of the monorepo does this failure belong to? Judge by what is breaking in the logs, not only by which files the commit changed.',
    criteria: OWNER_APP_CRITERIA,
  },
  rerunLikelyGreen: {
    type: 'boolean',
    instructions:
      'If this exact commit were re-run on CI with no code change at all, would the run pass?',
    criteria: {
      true: 'The failure does not depend on the code under test: infrastructure, a network timeout, a cancelled runner, or a test whose outcome varies between runs.',
      false:
        'The failure is deterministic. The same commit will fail the same way every time until the code, configuration or schema changes.',
    },
  },
  blastRadius: {
    type: 'score',
    instructions: 'How far does this failure reach into the system?',
    criteria: BLAST_RADIUS_CRITERIA,
  },
} as const;
