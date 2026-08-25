import { Module } from '@nestjs/common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/** Member management module: CRUD over guild characters, admins only. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
