import { announceFormationSchema } from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../../common';
import { guardsOf } from '../../../__tests__/guards-of';
import { FormationAnnounceController } from '../formation-announce.controller';
import { FormationAnnouncerService } from '../formation-announcer.service';

const IMAGE = 'data:image/webp;base64,AQID';

describe('announceFormationSchema', () => {
  it('nhận một tới hai ảnh webp', () => {
    expect(announceFormationSchema.safeParse({ images: [IMAGE] }).success).toBe(
      true,
    );
    expect(
      announceFormationSchema.safeParse({ images: [IMAGE, IMAGE] }).success,
    ).toBe(true);
  });

  it('từ chối khi không có ảnh nào', () => {
    expect(announceFormationSchema.safeParse({ images: [] }).success).toBe(
      false,
    );
  });

  // Trần 2 khớp với matchCount tối đa của một ngày.
  it('từ chối quá hai ảnh', () => {
    expect(
      announceFormationSchema.safeParse({ images: [IMAGE, IMAGE, IMAGE] })
        .success,
    ).toBe(false);
  });

  it('từ chối định dạng khác webp', () => {
    expect(
      announceFormationSchema.safeParse({
        images: ['data:image/png;base64,AQID'],
      }).success,
    ).toBe(false);
  });

  it('từ chối ảnh vượt trần kích thước', () => {
    const huge = `data:image/webp;base64,${'A'.repeat(3_000_001)}`;

    expect(announceFormationSchema.safeParse({ images: [huge] }).success).toBe(
      false,
    );
  });
});

describe('FormationAnnounceController', () => {
  it('khoá endpoint cho quản trị viên ở cấp controller', () => {
    expect(guardsOf(FormationAnnounceController)).toEqual([
      JwtAuthGuard,
      AdminGuard,
    ]);
  });

  it('chuyển thẳng sessionId và ảnh xuống announcer', async () => {
    const announcer = {
      announce: jest.fn().mockResolvedValue({ imageCount: 2 }),
    };
    const controller = new FormationAnnounceController(
      announcer as unknown as FormationAnnouncerService,
    );
    const images = [IMAGE, 'data:image/webp;base64,BAUG'];

    await expect(
      controller.announceFormation('session-1', { images }),
    ).resolves.toEqual({ imageCount: 2 });

    expect(announcer.announce).toHaveBeenCalledWith('session-1', images);
  });
});
