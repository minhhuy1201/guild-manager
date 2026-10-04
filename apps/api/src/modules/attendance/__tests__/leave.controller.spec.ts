import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GuildRole } from '@guild/shared/enums';

import { JwtAuthGuard, TOKEN_TYPE, type JwtPayload } from '../../../common';
import { LeaveController } from '../leave.controller';
import type { LeaveService } from '../leave.service';

const USER: JwtPayload = {
  sub: 'discord-1',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
};

describe('LeaveController', () => {
  let leaves: { listActive: jest.Mock; create: jest.Mock; cancel: jest.Mock };
  let controller: LeaveController;

  beforeEach(() => {
    leaves = {
      listActive: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'l1' }),
      cancel: jest.fn().mockResolvedValue({ id: 'l1' }),
    };
    controller = new LeaveController(leaves as unknown as LeaveService);
  });

  it('requires a signed-in user on every route', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, LeaveController)).toContain(
      JwtAuthGuard,
    );
  });

  it('lists through the service', async () => {
    await controller.list();

    expect(leaves.listActive).toHaveBeenCalled();
  });

  it('creates for the caller', async () => {
    const body = {
      characterId: 'c1',
      startDate: '2026-10-05',
      endDate: '2026-10-06',
    };

    await controller.create(body, USER);

    expect(leaves.create).toHaveBeenCalledWith(body, USER);
  });

  it('cancels by id for the caller', async () => {
    await controller.cancel('l1', USER);

    expect(leaves.cancel).toHaveBeenCalledWith('l1', USER);
  });
});
