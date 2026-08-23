import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { AppConfigService } from '../../config';
import { CharactersModule } from '../characters/characters.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Module đăng nhập: xác thực bằng Discord OAuth2 và phát JWT.
 * JwtModule đăng ký `global: true` để JwtAuthGuard (ở `common/`) inject được JwtService
 * mà module nào cần bảo vệ endpoint cũng không phải import lại.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      /**
       * Lấy khóa ký JWT từ biến môi trường AUTH_SECRET.
       * @param config - ConfigService đã validate theo envSchema
       * @returns Options của JwtModule
       */
      useFactory: (config: AppConfigService) => ({
        secret: config.get('AUTH_SECRET', { infer: true }),
      }),
    }),
    // AuthService tra Character theo Discord ID — danh tính nằm ở module characters.
    CharactersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
