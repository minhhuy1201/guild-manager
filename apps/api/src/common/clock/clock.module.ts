import { Global, Module } from '@nestjs/common';

import { Clock, SystemClock } from './clock';

/**
 * Provides the Clock to the whole app. Time is a cross-cutting concern, so the
 * module is @Global() and feature modules do not have to import it everywhere.
 */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
