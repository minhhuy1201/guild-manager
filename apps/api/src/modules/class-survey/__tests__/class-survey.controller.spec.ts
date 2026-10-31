import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GuildRole } from '@guild/shared/enums';

import { JwtAuthGuard, TOKEN_TYPE, type RequestActor } from '../../../common';
import { ClassSurveyController } from '../class-survey.controller';
import type { ClassSurveyService } from '../class-survey.service';

const USER: RequestActor = {
  sub: 'discord-1',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
  capabilities: [],
  grantedCommands: [],
};

describe('ClassSurveyController', () => {
  let surveys: { current: jest.Mock; answer: jest.Mock };
  let controller: ClassSurveyController;

  beforeEach(() => {
    surveys = {
      current: jest.fn().mockResolvedValue({ survey: null, members: [] }),
      answer: jest
        .fn()
        .mockResolvedValue({ kind: 'KEEP', fromClass: 'TO_VAN' }),
    };
    controller = new ClassSurveyController(
      surveys as unknown as ClassSurveyService,
    );
  });

  it('requires a signed-in user on every route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ClassSurveyController),
    ).toContain(JwtAuthGuard);
  });

  it('answers for the caller only, never for a body-supplied member', async () => {
    const body = { kind: 'KEEP' } as const;

    await expect(controller.answer('s1', body, USER)).resolves.toEqual({
      kind: 'KEEP',
      fromClass: 'TO_VAN',
    });
    expect(surveys.answer).toHaveBeenCalledWith('s1', USER, body);
  });
});
