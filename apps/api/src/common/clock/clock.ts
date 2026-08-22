/**
 * The application's source of time. Every "now" inside a request comes from here,
 * so a single request evaluates time-based rules against a single instant.
 *
 * Declared as an abstract class rather than an interface plus a symbol token:
 * NestJS uses the class itself as the DI token, so nothing extra is needed at the
 * injection sites.
 */
export abstract class Clock {
  /**
   * The current instant.
   * @returns The moment this clock considers "now"
   */
  abstract now(): Date;
}

/**
 * Production adapter: reads the system clock.
 */
export class SystemClock extends Clock {
  /**
   * The current instant, straight from the host machine.
   * @returns A `Date` for the moment of the call
   */
  now(): Date {
    return new Date();
  }
}

/**
 * Test adapter: always reports the same instant.
 */
export class FixedClock extends Clock {
  /**
   * @param instant - The moment this clock always reports
   */
  constructor(private readonly instant: Date) {
    super();
  }

  /**
   * The instant this clock was built with.
   * @returns The same `Date` on every call
   */
  now(): Date {
    return this.instant;
  }
}
