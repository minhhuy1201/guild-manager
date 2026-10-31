import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ClassSurveyView } from '@guild/shared/schemas';

import { JwtAuthGuard } from '../../common';
import { ClassSurveyService } from './class-survey.service';

/** Class surveys - readable by any signed-in member, like attendance itself. */
@ApiTags('class-surveys')
@ApiBearerAuth()
@Controller('class-surveys')
@UseGuards(JwtAuthGuard)
export class ClassSurveyController {
  constructor(private readonly surveys: ClassSurveyService) {}

  /**
   * The open survey, else the latest closed one, with every member's row.
   * @returns The view; `survey` is null when none has ever run
   */
  @Get('current')
  @ApiOperation({ summary: 'Đợt khảo sát lưu phái hiện tại cùng câu trả lời' })
  current(): Promise<ClassSurveyView> {
    return this.surveys.current();
  }
}
