import { Module } from '@nestjs/common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export type { MemberEntity } from './entities/character.entity';

/** Module quản lý thành viên: CRUD nhân vật trong bang, chỉ quản trị viên dùng. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
