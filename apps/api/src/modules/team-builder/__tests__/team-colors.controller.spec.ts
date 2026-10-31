import { TeamColor } from '@guild/shared/enums';

import { JwtAuthGuard } from '../../../common';
import { accessOf, guardsOf } from '../../../__tests__/guards-of';
import { TeamBuilderService } from '../team-builder.service';
import { TeamColorsController } from '../team-colors.controller';

describe('TeamColorsController', () => {
  it('chỉ cần đăng nhập: không Capability, không CapabilityGuard', () => {
    expect(guardsOf(TeamColorsController)).toEqual([JwtAuthGuard]);
    expect(accessOf(TeamColorsController)).toBeUndefined();
    expect(accessOf(TeamColorsController, 'getTeamColors')).toBeUndefined();
  });

  it('trả đúng bảng màu service đưa ra', async () => {
    const colors = { '1': TeamColor.RED, '4': TeamColor.SKY };
    const teamBuilder = { getTeamColors: jest.fn().mockResolvedValue(colors) };
    const controller = new TeamColorsController(
      teamBuilder as unknown as TeamBuilderService,
    );

    await expect(controller.getTeamColors()).resolves.toEqual(colors);
  });
});
