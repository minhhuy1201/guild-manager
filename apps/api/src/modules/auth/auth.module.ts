import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { AppConfigService } from '../../config';
import { CharactersModule } from '../characters/characters.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Login module: Discord OAuth2 authentication and JWT issuance.
 * JwtModule registers with `global: true` so JwtAuthGuard (in `common/`) can inject JwtService and
 * no module protecting an endpoint has to import it again.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      /**
       * Take the JWT signing key from the AUTH_SECRET environment variable.
       * @param config - ConfigService validated against envSchema
       * @returns JwtModule options
       */
      useFactory: (config: AppConfigService) => ({
        secret: config.get('AUTH_SECRET', { infer: true }),
      }),
    }),
    // AuthService looks Characters up by Discord ID — identity lives in the characters module.
    CharactersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
