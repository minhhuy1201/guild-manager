/**
 * Public API of the cat-race module.
 *
 * The only file other modules may import code from. Re-exports only: `discord-bot` reads an ended
 * event's winners through the service and shapes them into a message on its own side.
 */
export { CatRaceService } from './cat-race.service';
export type { CatRaceAnnouncement } from './cat-race.service';
