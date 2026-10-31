import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GuildClass } from '@guild/shared/enums';
import type {
  ClassSurvey,
  ClassSurveyAnswer,
  ClassSurveyAnswerInput,
  ClassSurveyView,
} from '@guild/shared/schemas';

import { Clock, type RequestActor } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CharactersService } from '../characters/characters.public';
import {
  toClassSurvey,
  toClassSurveyAnswer,
  toClassSurveyView,
} from './class-survey.codec';

const DEADLINE_PASSED = 'Hạn chót đã qua, không mở được đợt khảo sát.';
/** A member who has not answered the open survey. */
export type UnansweredMember = {
  id: string;
  name: string;
  /** null when no Discord account is linked - they cannot be pinged */
  discordId: string | null;
};

/** The open survey with the members who have not answered it yet. */
export type SurveyReminderTargets = {
  survey: ClassSurvey;
  unanswered: UnansweredMember[];
};

const SURVEY_NOT_FOUND = 'Không tìm thấy đợt khảo sát.';
const SURVEY_CLOSED = 'Đợt khảo sát đã đóng, không sửa được câu trả lời.';
const NO_CHARACTER = 'Tài khoản này chưa gắn với thành viên nào.';
const SAME_CLASS = 'Phái muốn chuyển phải khác phái hiện tại.';
const ALREADY_OPEN = 'Đang có một đợt khảo sát chưa hết hạn.';

/**
 * Class surveys: a named round with a deadline, open while `now < closesAt`. Opening one while
 * another is open is refused, so the guild never has two competing.
 */
@Injectable()
export class ClassSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Open a survey.
   * @param title - Name shown to members
   * @param closesAt - The deadline instant
   * @param actor - JWT payload of whoever opens it; its `sub` is kept as `createdById`
   * @returns The new survey
   * @throws BadRequestException when the deadline is not in the future or another survey is open
   */
  async open(
    title: string,
    closesAt: Date,
    actor: RequestActor,
  ): Promise<ClassSurvey> {
    return this.prisma.$transaction(async (tx) => {
      // Serialises openers: the "is one open" read and the create after it must not interleave with
      // another opener (two admins at once), or two surveys end up open. Released at commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('class-survey-open'))`;

      const now = this.clock.now();

      if (closesAt <= now) throw new BadRequestException(DEADLINE_PASSED);

      const open = await tx.classSurvey.findFirst({
        where: { closesAt: { gt: now } },
      });
      if (open) throw new BadRequestException(ALREADY_OPEN);

      const created = await tx.classSurvey.create({
        data: { title, closesAt, createdAt: now, createdById: actor.sub },
      });

      return toClassSurvey(created, now);
    });
  }

  /**
   * Save the caller's own answer, replacing an earlier one. The caller's class at this moment is
   * kept as `fromClass`, so a later edit of their profile does not move the result.
   * @param surveyId - Survey being answered
   * @param actor - JWT payload of the answerer; its `sub` (Discord id) finds their Character
   * @param input - Stay, or move to another class with a confidence
   * @returns The saved answer
   * @throws NotFoundException when the survey does not exist or the caller has no Character
   * @throws BadRequestException when the survey is closed or the target is the caller's current class
   */
  async answer(
    surveyId: string,
    actor: RequestActor,
    input: ClassSurveyAnswerInput,
  ): Promise<ClassSurveyAnswer> {
    const now = this.clock.now();
    const [survey, character] = await Promise.all([
      this.prisma.classSurvey.findUnique({ where: { id: surveyId } }),
      this.characters.findByDiscordId(actor.sub),
    ]);

    if (!survey) throw new NotFoundException(SURVEY_NOT_FOUND);
    if (!character) throw new NotFoundException(NO_CHARACTER);
    if (survey.closesAt <= now) throw new BadRequestException(SURVEY_CLOSED);
    // The profile column holds the shared enum's values (prisma-enum-sync.spec.ts keeps them in step).
    const fromClass = character.guildClass as GuildClass;
    if (input.kind === 'CHANGE' && input.targetClass === fromClass) {
      throw new BadRequestException(SAME_CLASS);
    }

    const fields = {
      fromClass,
      targetClass: input.kind === 'CHANGE' ? input.targetClass : null,
      confidence: input.kind === 'CHANGE' ? input.confidence : null,
      answeredAt: now,
    };
    const saved = await this.prisma.classSurveyAnswer.upsert({
      where: { surveyId_characterId: { surveyId, characterId: character.id } },
      create: { surveyId, characterId: character.id, ...fields },
      update: fields,
    });

    return toClassSurveyAnswer(saved);
  }

  /**
   * The open survey, else the latest closed one, with a row per Character.
   * @returns The view; `survey` is null when none has ever run
   */
  async current(): Promise<ClassSurveyView> {
    const now = this.clock.now();
    const survey =
      (await this.prisma.classSurvey.findFirst({
        where: { closesAt: { gt: now } },
      })) ??
      (await this.prisma.classSurvey.findFirst({
        orderBy: { closesAt: 'desc' },
      }));

    const [answers, members] = await Promise.all([
      survey
        ? this.prisma.classSurveyAnswer.findMany({
            where: { surveyId: survey.id },
          })
        : [],
      this.characters.listRows(),
    ]);

    return toClassSurveyView(survey, answers, members, now);
  }

  /**
   * Who still owes an answer to the open survey.
   * @returns The open survey and every Character without an answer, or null when no survey is open
   */
  async unanswered(): Promise<SurveyReminderTargets | null> {
    const now = this.clock.now();
    const survey = await this.prisma.classSurvey.findFirst({
      where: { closesAt: { gt: now } },
    });

    if (!survey) return null;

    const [answers, members] = await Promise.all([
      this.prisma.classSurveyAnswer.findMany({
        where: { surveyId: survey.id },
        select: { characterId: true },
      }),
      this.characters.listRows(),
    ]);
    const answered = new Set(answers.map((answer) => answer.characterId));

    return {
      survey: toClassSurvey(survey, now),
      unanswered: members
        .filter((member) => !answered.has(member.id))
        .map(({ id, name, discordId }) => ({ id, name, discordId })),
    };
  }
}
