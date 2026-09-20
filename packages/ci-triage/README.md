# @guild/ci-triage

Classifies **why** CI went red, using `typesafe-ai/jev` through the Vercel AI Gateway. It answers
four typed questions about a failed run - what kind of failure, which half of the monorepo, whether
a re-run is likely to go green, and how far the damage spreads.

It does **not** review code, and it does **not** gate anything. The nine existing CI checks remain
the only source of truth; this tool runs after one of them has already failed.

See [`docs/ci-triage.md`](../../docs/ci-triage.md).
