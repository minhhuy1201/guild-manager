import { Module } from '@nestjs/common';

import { CharactersModule } from '../characters/characters.module';
import { ClassSurveyController } from './class-survey.controller';
import { ClassSurveyService } from './class-survey.service';

/** Class survey module: rounds that ask members which class they will play after a game update. */
@Module({
  imports: [CharactersModule],
  controllers: [ClassSurveyController],
  providers: [ClassSurveyService],
  // The Discord bot opens a survey through this same service, so the one-open-at-a-time rule lives
  // in exactly one place.
  exports: [ClassSurveyService],
})
export class ClassSurveyModule {}
