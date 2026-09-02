import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { CronSecretGuard } from './cron.guard';
import { ReminderService, type ReminderOutcome } from './reminder.service';

/**
 * The scheduled attendance reminder.
 *
 * Separate from `DiscordBotController` because that one verifies Discord's Ed25519 signature on
 * every request and this one verifies a shared secret — two authentication schemes cannot share a
 * class-level guard. It stays inside this module all the same: the only thing it does is send a
 * Discord message, and everything it calls lives here.
 *
 * Excluded from Swagger: it is not part of the api ↔ web contract.
 */
@ApiExcludeController()
@Controller('cron')
@UseGuards(CronSecretGuard)
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}

  /**
   * Run the reminder once.
   *
   * `GET` because Vercel Cron only ever issues GET requests. It is not side-effect free, which is
   * the one place this endpoint departs from what the verb implies — the schedule, not the verb, is
   * what decides it runs.
   *
   * The body is not run through `verifyResponse`: this shape is internal to the job, never part of
   * the api ↔ web contract that `packages/shared` owns, and the caller ignores it.
   *
   * The body carries the outcome's tag, so a run that posted nothing still says which silence it
   * was — `no-channel` needs an admin, `nothing-due` is an ordinary morning. Reading the Vercel log
   * to tell those apart was the alternative.
   *
   * @returns What the run did, wrapped as `{ data }` by the transform interceptor
   */
  @Get('attendance-reminder')
  run(): Promise<ReminderOutcome> {
    return this.reminders.run();
  }
}
