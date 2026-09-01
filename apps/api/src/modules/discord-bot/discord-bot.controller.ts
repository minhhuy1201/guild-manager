import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { RawResponse } from '../../common';
import { DiscordSignatureGuard } from './discord-bot.guard';
import { routeInteraction, type InteractionReply } from './interaction-router';
import { interactionSchema } from './interaction.schema';

/**
 * The one endpoint Discord calls. Excluded from Swagger: it is not part of the api ↔ web contract
 * and the only client that may call it is Discord.
 */
@ApiExcludeController()
@Controller('discord')
@UseGuards(DiscordSignatureGuard)
export class DiscordBotController {
  /**
   * Answer one Discord interaction.
   *
   * The body is parsed here rather than through a DTO because the reply must not be wrapped in
   * `{ data }` and the shape belongs to Discord, not to this API's own contract.
   *
   * @param body - The raw JSON body, already proven to come from Discord by the guard
   * @returns The interaction reply, sent verbatim
   */
  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  @RawResponse()
  handleInteraction(@Body() body: unknown): InteractionReply {
    return routeInteraction(interactionSchema.parse(body));
  }
}
