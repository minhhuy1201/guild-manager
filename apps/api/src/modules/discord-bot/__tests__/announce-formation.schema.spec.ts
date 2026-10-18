import {
  announceFormationSchema,
  notifyMembersSchema,
} from '@guild/shared/schemas';

import { AdminGuard, JwtAuthGuard } from '../../../common';
import { guardsOf } from '../../../__tests__/guards-of';
import { FormationAnnounceController } from '../formation-announce.controller';
import { FormationAnnouncerService } from '../formation-announcer.service';
import { TeamNoticeService } from '../team-notice.service';

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

  // The ceiling of 2 matches the highest matchCount a single day can have.
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
      {} as TeamNoticeService,
    );
    const images = [IMAGE, 'data:image/webp;base64,BAUG'];

    await expect(
      controller.announceFormation('session-1', { images }),
    ).resolves.toEqual({ imageCount: 2 });

    expect(announcer.announce).toHaveBeenCalledWith('session-1', images);
  });

  it('nhắn riêng chuyển sessionId và danh sách nhắn lại xuống TeamNoticeService, trả nguyên báo cáo', async () => {
    const report = {
      sentCount: 1,
      totalCount: 1,
      blocked: [],
      missingDiscordId: [],
      notPresent: [],
      unsent: [],
    };
    const notices = { notifyMembers: jest.fn().mockResolvedValue(report) };
    const controller = new FormationAnnounceController(
      {} as FormationAnnouncerService,
      notices as unknown as TeamNoticeService,
    );

    await expect(controller.notifyMembers('session-1', {})).resolves.toEqual(
      report,
    );
    expect(notices.notifyMembers).toHaveBeenCalledWith('session-1', undefined);
  });
});

describe('notifyMembersSchema', () => {
  it('nhận body rỗng: nhắn cho tất cả', () => {
    expect(notifyMembersSchema.safeParse({}).success).toBe(true);
  });

  it('nhận danh sách người và trận để nhắn lại', () => {
    expect(
      notifyMembersSchema.safeParse({
        notices: [{ characterId: 'kirito', matchIndex: 2 }],
      }).success,
    ).toBe(true);
  });

  it('từ chối trận ngoài 1 và 2, và id rỗng', () => {
    expect(
      notifyMembersSchema.safeParse({
        notices: [{ characterId: 'kirito', matchIndex: 3 }],
      }).success,
    ).toBe(false);
    expect(
      notifyMembersSchema.safeParse({
        notices: [{ characterId: '', matchIndex: 1 }],
      }).success,
    ).toBe(false);
  });
});
