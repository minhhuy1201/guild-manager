import { Module } from '@nestjs/common';

import { CatRaceController } from './cat-race.controller';
import {
  CAT_RACE_RANDOM_INT,
  CatRaceService,
  cryptoRandomInt,
} from './cat-race.service';

/** The cat race prize draw: admin-only, with the draw rules and storage in one place. */
@Module({
  controllers: [CatRaceController],
  providers: [
    CatRaceService,
    { provide: CAT_RACE_RANDOM_INT, useValue: cryptoRandomInt },
  ],
  exports: [CatRaceService],
})
export class CatRaceModule {}
