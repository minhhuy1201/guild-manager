/**
 * Fixture for `module-boundary.spec.ts` — a **deliberate** module boundary violation.
 *
 * This file is never run: it exists so the test can assert `eslint` still reports an error when
 * someone reaches into another module's internals. It sits one level deeper than any real file
 * (`__tests__/fixtures/`) — exactly where the old depth-based rule silently let it through.
 *
 * `eslint.config.mjs` excludes it from normal linting; the test lints it separately with `--no-ignore`.
 */
import { BattleSessionsService } from '../../../battle-sessions/battle-sessions.service';

export type ViolatingImport = BattleSessionsService;
