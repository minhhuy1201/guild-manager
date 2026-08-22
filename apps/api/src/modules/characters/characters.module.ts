import { Module } from '@nestjs/common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/** Module quản lý thành viên: CRUD nhân vật trong bang, chỉ quản trị viên dùng. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
