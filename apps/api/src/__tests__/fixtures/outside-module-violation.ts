/**
 * Fixture for `module-boundary.spec.ts` — a **deliberate** module boundary violation, from outside
 * `modules/`.
 *
 * Paired with `modules/attendance/__tests__/fixtures/module-boundary-violation.ts`: that one crosses
 * from one module into a sibling, this one crosses in from outside. The two directions hit different
 * branches of `boundaries/elements`, so both need locking down.
 */
import { CharactersService } from '../../modules/characters/characters.service';

export type ViolatingImport = CharactersService;
