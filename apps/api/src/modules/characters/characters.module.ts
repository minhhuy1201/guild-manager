import { Global, Module } from '@nestjs/common';

import { GrantLookup } from '../../common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/**
 * Member management module: CRUD over guild characters.
 * Global because it provides `GrantLookup`, which `JwtAuthGuard` injects on every protected route.
 */
@Global()
@Module({
  controllers: [CharactersController],
  providers: [
    CharactersService,
    { provide: GrantLookup, useExisting: CharactersService },
  ],
  exports: [CharactersService, GrantLookup],
})
export class CharactersModule {}
