import { TEAM_COUNT } from '@guild/shared/lib';
import {
  TEAM_IMAGE_MAX_CHARS,
  ANNOUNCEMENT_NOTE_MAX_CHARS,
  announceFormationSchema,
  notifyMembersSchema,
} from '@guild/shared/schemas';

import { Capability } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf, guardsOf } from '../../../__tests__/guards-of';
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
  it('khoá endpoint theo Capability xếp team ở cấp controller', () => {
    expect(guardsOf(FormationAnnounceController)).toEqual([
      JwtAuthGuard,
      CapabilityGuard,
    ]);
    expect(accessOf(FormationAnnounceController)).toEqual({
      kind: 'capability',
      capability: Capability.TEAM_BUILDER,
    });
  });

  it('chuyển thẳng sessionId, ảnh và lưu ý xuống announcer', async () => {
    const announcer = {
      announce: jest.fn().mockResolvedValue({ imageCount: 2 }),
    };
    const controller = new FormationAnnounceController(
      announcer as unknown as FormationAnnouncerService,
      {} as TeamNoticeService,
    );
    const images = [IMAGE, 'data:image/webp;base64,BAUG'];

    await expect(
      controller.announceFormation('session-1', { images, note: 'Đổi map' }),
    ).resolves.toEqual({ imageCount: 2 });

    expect(announcer.announce).toHaveBeenCalledWith(
      'session-1',
      images,
      'Đổi map',
    );
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
    expect(notices.notifyMembers).toHaveBeenCalledWith(
      'session-1',
      undefined,
      undefined,
    );
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

describe('notifyMembersSchema - ảnh team', () => {
  const teamImage = { matchIndex: 1, team: 3, image: IMAGE };

  it('thiếu teamImages vẫn hợp lệ: team đó nhận text', () => {
    expect(notifyMembersSchema.safeParse({ notices: [] }).success).toBe(true);
  });

  it('nhận ảnh cho các cặp (trận, team) khác nhau', () => {
    expect(
      notifyMembersSchema.safeParse({
        teamImages: [teamImage, { ...teamImage, matchIndex: 2 }],
      }).success,
    ).toBe(true);
  });

  it('từ chối ảnh sai định dạng', () => {
    expect(
      notifyMembersSchema.safeParse({
        teamImages: [{ ...teamImage, image: 'data:image/png;base64,AQID' }],
      }).success,
    ).toBe(false);
  });

  it('từ chối ảnh vượt TEAM_IMAGE_MAX_CHARS', () => {
    const huge = `data:image/webp;base64,${'A'.repeat(TEAM_IMAGE_MAX_CHARS)}`;

    expect(
      notifyMembersSchema.safeParse({
        teamImages: [{ ...teamImage, image: huge }],
      }).success,
    ).toBe(false);
  });

  it('từ chối cặp trùng', () => {
    expect(
      notifyMembersSchema.safeParse({ teamImages: [teamImage, teamImage] })
        .success,
    ).toBe(false);
  });

  it.each([
    { matchIndex: 0, team: 1 },
    { matchIndex: 3, team: 1 },
    { matchIndex: 1, team: 0 },
    { matchIndex: 1, team: TEAM_COUNT + 1 },
  ])('từ chối cặp ngoài khoảng %j', (pair) => {
    expect(
      notifyMembersSchema.safeParse({
        teamImages: [{ ...pair, image: IMAGE }],
      }).success,
    ).toBe(false);
  });

  it('từ chối nhiều hơn TEAM_COUNT x 2 ảnh', () => {
    const teamImages = Array.from({ length: TEAM_COUNT * 2 + 1 }, () => ({
      ...teamImage,
    }));

    expect(notifyMembersSchema.safeParse({ teamImages }).success).toBe(false);
  });
});

describe('announceFormationSchema — lưu ý thêm', () => {
  const parse = (note: unknown) =>
    announceFormationSchema.safeParse({ images: [IMAGE], note });

  it('không bắt buộc', () => {
    const result = announceFormationSchema.safeParse({ images: [IMAGE] });

    expect(result.success && result.data.note).toBeUndefined();
  });

  it('cắt khoảng trắng hai đầu, giữ xuống dòng ở giữa', () => {
    const result = parse('  Dòng một\nDòng hai \n');

    expect(result.success && result.data.note).toBe('Dòng một\nDòng hai');
  });

  it.each(['', '   ', '\n \n'])('%j coi như không có lưu ý', (note) => {
    const result = parse(note);

    expect(result.success && result.data.note).toBeUndefined();
  });

  it('nhận đúng giới hạn và từ chối vượt một ký tự', () => {
    expect(parse('a'.repeat(ANNOUNCEMENT_NOTE_MAX_CHARS)).success).toBe(true);
    expect(parse('a'.repeat(ANNOUNCEMENT_NOTE_MAX_CHARS + 1)).success).toBe(
      false,
    );
  });
});
