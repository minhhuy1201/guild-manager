import { Module } from '@nestjs/common';

import { CatRaceController } from './cat-race.controller';
import {
  CAT_RACE_RANDOM_INT,
  CatRaceService,
  cryptoRandomInt,
} from './cat-race.service';
import { FeaturedRaceController } from './featured-race.controller';
import { FeaturedRaceService } from './featured-race.service';

/** The cat race prize draw: admin-only, with the draw rules and storage in one place. Its one public route is the Featured races. */
@Module({
  controllers: [CatRaceController, FeaturedRaceController],
  providers: [
    CatRaceService,
    FeaturedRaceService,
    { provide: CAT_RACE_RANDOM_INT, useValue: cryptoRandomInt },
  ],
  exports: [CatRaceService],
})
export class CatRaceModule {}
