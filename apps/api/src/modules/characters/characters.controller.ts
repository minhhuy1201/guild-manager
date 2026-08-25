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
import type { GuildMember } from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto, UpdateCharacterDto } from './dto/character.dto';

/**
 * Member management — admins only, so the guard sits at controller level rather than on each route.
 */
@ApiTags('characters')
@Controller('characters')
@UseGuards(JwtAuthGuard, AdminGuard)
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
   * @param body - Name and class
   * @returns The created member
   */
  @Post()
  @ApiOperation({ summary: 'Thêm một thành viên' })
  create(@Body() body: CreateCharacterDto): Promise<GuildMember> {
    return this.characters.create(body);
  }

  /**
   * Edit a member's name or class.
   * @param id - Member id
   * @param body - Fields to change
   * @returns The updated member
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa một thành viên' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCharacterDto,
  ): Promise<GuildMember> {
    return this.characters.update(id, body);
  }

  /**
   * Delete a member along with all their attendance history and formation slots.
   * @param id - Member id
   * @returns A promise resolving once they are deleted
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá một thành viên' })
  remove(@Param('id') id: string): Promise<void> {
    return this.characters.remove(id);
  }
}
