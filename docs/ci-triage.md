# CI triage

When a CI run goes red, something has to decide what kind of red it is: a flaky test, a real
regression, a runner that ran out of disk, a schema that drifted. That decision is always drawn from
the same short list, and it is always made by reading the tail of a log.

`packages/ci-triage` makes it automatically. It sends the failed jobs, the changed file paths and a
redacted excerpt of the logs to **[Jev](https://vercel.com/ai-gateway/models/jev)**, TypeSafe AI's
decision model on the Vercel AI Gateway, and prints a labelled answer with the probability beside it.

## 1. What it is not

**It does not review code.** Jev generates no text at all — it answers typed questions with a
choice, a score or a probability. It cannot tell you that line 42 forgot an RBAC check. Code review
stays with the `pr-review` skill and the `pre-push-review-gate.sh` hook.

**It does not gate anything.** The nine required checks in the repository ruleset are the only thing
that can block a merge. The triage job is not one of them and must never become one: its answer is a
probability, and a probabilistic required check is a flaky required check.

**It does not replace a single existing check.** ESLint, Prettier, `tsc`, Jest, Vitest, the builds,
SonarQube, CodeQL and Trivy all stay exactly where they are. Triage runs *after* one of them has
already failed.

## 2. Environment

| Variable | Where it lives |
|---|---|
| `AI_GATEWAY_API_KEY` | `.env.local` at the repo root (git-ignored) for local runs; a GitHub Actions secret of the same name for CI |
| `GH_TOKEN` | Supplied by `gh auth login` locally, and by `secrets.GITHUB_TOKEN` in CI |
| `CI_TRIAGE_ZERO_DATA_RETENTION` | Optional, off by default. `1` or `true` asks the gateway for Zero Data Retention — see section 7 |

`AI_GATEWAY_API_KEY` is the name the AI SDK reads from the environment by itself, which is why it is
not renamed to something project-specific. It is **developer tooling, not a runtime variable**: it
is absent from `apps/api/src/config/env.validation.ts` and from `apps/web/config/api.ts` on purpose,
and neither app changes behaviour without it.

The key belongs to a Vercel team that needs a payment method on file — AI Gateway refuses requests
from a team without one, even for free credits.

## 3. Local command

```bash
pnpm --filter @guild/ci-triage triage             # the newest failed run on the current branch
pnpm --filter @guild/ci-triage triage --run 123   # a specific workflow run, by id
pnpm --filter @guild/ci-triage triage --json      # machine-readable, for a script or an agent
pnpm --filter @guild/ci-triage triage --no-cache  # ignore a stored answer for this run
```

The script loads `.env.local` from the repo root through Node's `--env-file-if-exists`, so there is
nothing to export by hand.

It **always exits 0**, including when the key is missing, when the branch has no failed run, and
when the gateway returns an error. It is a diagnostic; it never becomes a second problem to rule
out.

Output looks like this:

```
CI triage · run 1234567890 · nhánh feat/some-branch

  Loại lỗi      flaky (0.78)
  Nửa hỏng      api (0.91)
  Chạy lại xanh 0.74
  Độ lan        1.2 / 3  (Local: one module or one frontend feature.)

  Job đỏ        Backend test
  Gợi ý         Chạy lại run này. Vẫn đỏ thì đây là real_regression, không phải flaky.

  Chi phí       $0.000410 · 9812 input token
```

## 4. The four questions

| Key | Type | Answers |
|---|---|---|
| `category` | choice | `flaky`, `real_regression`, `infra`, `migration_drift`, `env_missing`, `lint_format`, `dependency` |
| `ownerApp` | choice | `api`, `web`, `shared`, `ci_infra`, `migration` |
| `rerunLikelyGreen` | boolean | The probability that re-running this exact commit goes green |
| `blastRadius` | score | 0 (one test) to 3 (schema, migration or the deploy path) |

All four are answered in one request against one shared state. Their wording lives in
`src/questions.ts`; it names the real job names and real commands of this repository on purpose,
because Jev scores against the criteria it is given and nothing else.

## 5. Reading the probabilities

A label on its own reads like a fact. These are not facts, so the CLI never prints one alone:

| Probability of the chosen label | What is printed |
|---|---|
| ≥ 0.70 | the label, plus a suggested next action |
| 0.45 – 0.70 | the label marked *không chắc*, no suggestion |
| < 0.45 | no label at all — only the two leading candidates |

The thresholds are `CONFIDENT_AT` and `UNCERTAIN_AT` in `src/questions.ts`. Raise them to make the
tool quieter and more cautious; lower them to make it opinionated. They are the only policy dial
there is.

## 6. In CI

The `Triage` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs when any of the
seven code jobs fails:

```
install → lint / typecheck / test / build / Sonar → (red) → Triage → run summary + PR comment
```

- `if: failure()`, not `always()` — a cancelled run has nothing to diagnose.
- `continue-on-error: true`, on top of the CLI's own exit 0. Two layers, because the first cannot
  rescue a step that breaks before the CLI starts.
- It writes the same block into `$GITHUB_STEP_SUMMARY` and, on a pull request, into **one** comment
  that later runs edit in place rather than stacking up.
- It is skipped entirely on a docs-only commit, because the jobs it depends on are skipped too.

**It covers seven of the nine required checks.** CodeQL and Security (Trivy, dependency review)
live in their own workflow files, and `needs:` cannot reach across workflows, so a run that is red
*only* from one of those gets no triage. That is a known limit, not an oversight: both are security
scanners that already report a specific finding with a file and a rule id, which is the thing
triage would otherwise have to guess.

A separate `Lint & typecheck tooling` job runs this package's own lint, Prettier, `tsc` and tests
whenever `packages/ci-triage/**` changes.

## 7. What is sent, and what is not

State sent to Jev is three things and nothing else:

1. the names of the failed jobs,
2. the **paths** of changed files — never their contents, never the diff,
3. the last 200 lines of each failed job's log, capped at 40,000 characters in total.

Before any of it leaves the machine, `src/redact.ts` removes every secret shape this repository is
known to produce: the variables from `.env.example`, anything matching `*_TOKEN` / `*_SECRET` /
`*_KEY` / `*_PASSWORD`, Postgres connection strings, JWTs and bearer headers.

Two gateway-side protections exist, and **only one of them is available on every plan**:

| Protection | What it does | Availability |
|---|---|---|
| `only: ['typesafe-ai']` | Stops the gateway routing this state to any other provider | All plans — always sent |
| `zeroDataRetention: true` | Asks the provider not to retain or train on the body | **Pro and Enterprise only** — opt-in via `CI_TRIAGE_ZERO_DATA_RETENTION=1` |

Zero Data Retention is off by default because this repository's Vercel account is on Hobby, where
the gateway does not offer it. Sending it anyway would turn a clear plan error into an obscure one.
Set the variable once the account is on Pro.

**So on Hobby, redaction is the only thing between a CI log and the provider — and redaction is
best effort, not a guarantee.** A secret printed in a shape none of its patterns match will pass
through. The patterns are deliberately narrow: over-redacting would strip the assertion diffs and
rule names that the classification actually needs. Treat the log tail as something a third party
may read.

Results are cached per workflow run id under the package's `node_modules/.cache/triage/`. A run id
is immutable, so there is no expiry and no way for a stale answer to be served.

## 8. Cost

Jev bills input tokens only, at $0.042 per million. A triage of roughly 10,000 tokens costs about
$0.0004. It runs only when CI is already red, and at most once per run id.

## 9. Turning it off

- **For one run:** nothing to do — it never blocks anything.
- **In CI:** delete the `AI_GATEWAY_API_KEY` secret. The job still runs, prints one line saying the
  key is absent, and goes green.
- **Permanently:** delete `packages/ci-triage/`, the `triage` and `tooling-check` jobs and the
  `tooling` filter from `ci.yml`, and the `AI_GATEWAY_API_KEY` block from `.env.example`. Nothing
  else in the repository refers to it.

## See also

- [`architecture.md`](architecture.md) — where new code goes
- [`development.md`](development.md) — commands and environment variables
- [`custom-spec/2026-09-20-jev-ci-triage-design.md`](custom-spec/2026-09-20-jev-ci-triage-design.md) — why it is built this way
