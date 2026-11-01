import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  type SchemaObject,
} from '@nestjs/swagger';
import {
  classSurveyAnswerInputSchema,
  type ClassSurveyAnswer,
  type ClassSurveyAnswerInput,
  type ClassSurveyView,
} from '@guild/shared/schemas';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

import { CurrentUser, JwtAuthGuard, type RequestActor } from '../../common';
import { ClassSurveyService } from './class-survey.service';

/** OpenAPI 3.0 form of the answer body; Zod's JSON Schema type and Swagger's are separate declarations of the same shape. */
const ANSWER_BODY_SCHEMA = z.toJSONSchema(classSurveyAnswerInputSchema, {
  target: 'openapi-3.0',
}) as SchemaObject;

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

  /**
   * Save the caller's own answer; there is no way to answer for somebody else.
   * @param id - Survey id
   * @param body - Stay, or the class to move to and how sure
   * @param user - JWT payload attached by JwtAuthGuard
   * @returns The saved answer
   */
  @Put(':id/answers/me')
  @ApiOperation({ summary: 'Trả lời khảo sát lưu phái của chính mình' })
  // No DTO class to read the body schema from (see below), so Swagger gets it generated from Zod.
  @ApiBody({ schema: ANSWER_BODY_SCHEMA })
  answer(
    @Param('id') id: string,
    // A union body cannot be a `createZodDto` class, so the schema is handed to the pipe directly.
    @Body(new ZodValidationPipe(classSurveyAnswerInputSchema))
    body: ClassSurveyAnswerInput,
    @CurrentUser() user: RequestActor,
  ): Promise<ClassSurveyAnswer> {
    return this.surveys.answer(id, user, body);
  }
}
