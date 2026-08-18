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
import type { Character } from '@guild/shared/schemas';

import { JwtAuthGuard } from '../../common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto, UpdateCharacterDto } from './dto/character.dto';

/**
 * Quản lý thành viên — chỉ quản trị viên được đụng tới, nên guard đặt ở cấp
 * controller chứ không đặt lẻ từng route.
 */
@ApiTags('characters')
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  /**
   * Danh sách thành viên.
   * @returns Mảng thành viên sắp theo tên
   */
  @Get()
  @ApiOperation({ summary: 'Danh sách thành viên' })
  list(): Promise<Character[]> {
    return this.characters.list();
  }

  /**
   * Thêm một thành viên.
   * @param body - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  @Post()
  @ApiOperation({ summary: 'Thêm một thành viên' })
  create(@Body() body: CreateCharacterDto): Promise<Character> {
    return this.characters.create(body);
  }

  /**
   * Sửa tên hoặc lưu phái của một thành viên.
   * @param id - Id thành viên
   * @param body - Các field cần đổi
   * @returns Thành viên sau khi sửa
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa một thành viên' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCharacterDto,
  ): Promise<Character> {
    return this.characters.update(id, body);
  }

  /**
   * Xoá một thành viên cùng toàn bộ lịch sử điểm danh và đội hình của họ.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi đã xoá
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá một thành viên' })
  remove(@Param('id') id: string): Promise<void> {
    return this.characters.remove(id);
  }
}
