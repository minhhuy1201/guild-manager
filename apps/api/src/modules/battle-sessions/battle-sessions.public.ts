/**
 * Public API of the battle-sessions module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`). The neighbouring `.module.ts` is left
 * with only its Nest DI declaration role.
 *
 * Re-exports only, never importing back from another module — if two `.public.ts` files need each
 * other that is a real domain cycle, and the answer is a third module, not `forwardRef()`.
 */
export { BattleSessionsService } from './battle-sessions.service';
export type { ScheduledSession } from './battle-sessions.service';
export {
  formatSessionLabel,
  isSameWeek,
  isSessionLocked,
  parseWeekStart,
  weekEndOf,
  weekStartOf,
} from './session-schedule';
export type { WeekAnchor } from './session-schedule';
