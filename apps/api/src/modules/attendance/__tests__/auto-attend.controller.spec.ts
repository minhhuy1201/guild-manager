import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GuildRole } from '@guild/shared/enums';

import { JwtAuthGuard, TOKEN_TYPE, type RequestActor } from '../../../common';
import { AutoAttendController } from '../auto-attend.controller';
import type { AutoAttendService } from '../auto-attend.service';

const USER: RequestActor = {
  sub: 'discord-1',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
  capabilities: [],
  grantedCommands: [],
};

describe('AutoAttendController', () => {
  let autoAttend: { status: jest.Mock; set: jest.Mock };
  let controller: AutoAttendController;

  beforeEach(() => {
    autoAttend = {
      status: jest.fn().mockResolvedValue({ enabled: false, enabledAt: null }),
      set: jest.fn().mockResolvedValue({ enabled: true, enabledAt: 'x' }),
    };
    controller = new AutoAttendController(
      autoAttend as unknown as AutoAttendService,
    );
  });

  it('requires a signed-in user on every route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AutoAttendController),
    ).toContain(JwtAuthGuard);
  });

  it('reads the status for the caller', async () => {
    await controller.status(USER);

    expect(autoAttend.status).toHaveBeenCalledWith(USER);
  });

  it('switches for the caller', async () => {
    await controller.set({ enabled: true }, USER);

    expect(autoAttend.set).toHaveBeenCalledWith(USER, true);
  });
});
