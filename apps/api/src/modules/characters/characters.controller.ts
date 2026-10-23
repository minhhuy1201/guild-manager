import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Capability } from '@guild/shared/enums';
import type { GuildMember } from '@guild/shared/schemas';

import {
  CapabilityGuard,
  CurrentUser,
  JwtAuthGuard,
  RequireAdmin,
  RequireCapability,
  type JwtPayload,
} from '../../common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto, UpdateCharacterDto } from './dto/character.dto';

/**
 * Member management, so the guard sits at controller level rather than on each route. Deleting a
 * member is the one route that stays Admin-only.
 */
@ApiTags('characters')
@Controller('characters')
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability(Capability.MEMBERS)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  /**
   * List members.
   * @returns Members ordered by name
   */
  @Get()
  @ApiOperation({ summary: 'Danh sách thành viên' })
  list(): Promise<GuildMember[]> {
    return this.characters.list();
  }

  /**
   * Add a member.
   * @param body - Name, class and optionally the Discord ID
   * @returns The created member
   */
  @Post()
  @ApiOperation({ summary: 'Thêm một thành viên' })
  create(@Body() body: CreateCharacterDto): Promise<GuildMember> {
    return this.characters.create(body);
  }

  /**
   * Edit a member. The role and the Grants are for an Admin to send.
   * @param id - Member id
   * @param body - Fields to change
   * @param actor - JWT payload of the caller
   * @returns The updated member
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa một thành viên' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCharacterDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<GuildMember> {
    return this.characters.update(id, body, actor);
  }

  /**
   * Delete a member along with all their attendance history.
   * Their formation cells are emptied rather than removed, so the notes on them survive.
   * @param id - Member id
   * @returns A promise resolving once they are deleted
   */
  @Delete(':id')
  @RequireAdmin()
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá một thành viên' })
  remove(@Param('id') id: string): Promise<void> {
    return this.characters.remove(id);
  }
}
