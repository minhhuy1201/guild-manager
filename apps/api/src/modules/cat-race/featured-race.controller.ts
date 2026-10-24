import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FeaturedRace } from '@guild/shared/schemas';

import { FeaturedRaceService } from './featured-race.service';

/**
 * The landing page's Bảng vàng. No guard, on purpose: the page is public. It sits under its own
 * `public/` prefix so it can never share a path with the guarded `cat-races` routes.
 */
@ApiTags('public')
@Controller('public/featured-races')
export class FeaturedRaceController {
  constructor(private readonly featuredRaces: FeaturedRaceService) {}

  /** The newest Featured races, results only. */
  @Get()
  @ApiOperation({ summary: 'Các đợt đua được khoe ở trang chủ' })
  list(): Promise<FeaturedRace[]> {
    return this.featuredRaces.list();
  }
}
