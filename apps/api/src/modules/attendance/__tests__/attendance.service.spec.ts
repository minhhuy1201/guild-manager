import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceStatus } from '@guild/shared/enums';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { hashPassword } from '@/shared/utils/password.util';
import { AttendanceService } from '../attendance.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 — mọi trận trong tuần đều còn hạn trừ trận Thứ 3 (đã qua 10:00 Thứ 3).
const WEDNESDAY = vn('2026-07-22T12:00');
const CHARACTER_ID = 'char-1';
const PASSWORD = 'pass10001';

/** Id trận được prisma mock sinh ra theo nhãn, khớp với thứ tự trong tuần. */
const SESSION_IDS: Record<string, string> = {
  'Thứ 3 · 20:30': 'session-tue',
  'Thứ 5 · 20:30': 'session-thu',
  'Thứ 7 · Guild War': 'session-sat',
};

describe('AttendanceService.mark', () => {
  let service: AttendanceService;
  let prisma: {
    character: { findUnique: jest.Mock };
    battleSession: { upsert: jest.Mock; findMany: jest.Mock };
    attendanceRecord: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });

  beforeEach(() => {
    const sessionRows: {
      id: string;
      label: string;
      dateTime: Date;
      deadline: Date;
      isGuildWar: boolean;
    }[] = [];

    prisma = {
      character: {
        findUnique: jest.fn().mockResolvedValue({
          id: CHARACTER_ID,
          name: 'Mèo Béo',
          passwordHash,
        }),
      },
      battleSession: {
        // Mock upsert lưu lại đúng lịch/deadline mà service tính ra từ luật thời gian thật.
        upsert: jest.fn().mockImplementation((args: { create: unknown }) => {
          const row = args.create as {
            label: string;
            dateTime: Date;
            deadline: Date;
            isGuildWar: boolean;
          };
          sessionRows.push({ id: SESSION_IDS[row.label], ...row });
          return Promise.resolve(row);
        }),
        findMany: jest
          .fn()
          .mockImplementation(() => Promise.resolve(sessionRows)),
      },
      attendanceRecord: {
        upsert: jest
          .fn()
          .mockImplementation(
            (args: {
              create: { characterId: string; sessionId: string };
              update: { status: AttendanceStatus; markedAt: Date };
            }) =>
              Promise.resolve({
                characterId: args.create.characterId,
                sessionId: args.create.sessionId,
                status: args.update.status,
                markedAt: args.update.markedAt,
              }),
          ),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new AttendanceService(prisma as unknown as PrismaService);
  });

  it('ghi nhận điểm danh khi mật khẩu đúng và còn hạn', async () => {
    const record = await service.mark(
      {
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Guild War'],
        status: AttendanceStatus.PRESENT,
        password: PASSWORD,
      },
      WEDNESDAY,
    );

    expect(record).toEqual({
      characterId: CHARACTER_ID,
      sessionId: SESSION_IDS['Thứ 7 · Guild War'],
      status: AttendanceStatus.PRESENT,
      markedAt: WEDNESDAY.toISOString(),
    });
  });

  it('cho đổi Có ⇄ Không khi còn hạn (upsert theo cặp nhân vật + trận)', async () => {
    await service.mark(
      {
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Guild War'],
        status: AttendanceStatus.PRESENT,
        password: PASSWORD,
      },
      WEDNESDAY,
    );
    const changed = await service.mark(
      {
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Guild War'],
        status: AttendanceStatus.ABSENT,
        password: PASSWORD,
      },
      WEDNESDAY,
    );

    expect(changed.status).toBe(AttendanceStatus.ABSENT);
    expect(prisma.attendanceRecord.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          characterId_sessionId: {
            characterId: CHARACTER_ID,
            sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          },
        },
      }),
    );
  });

  it('từ chối khi sai mật khẩu', async () => {
    await expect(
      service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
          password: 'sai-mat-khau',
        },
        WEDNESDAY,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('từ chối khi không có nhân vật', async () => {
    prisma.character.findUnique.mockResolvedValue(null);

    await expect(
      service.mark(
        {
          characterId: 'khong-ton-tai',
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
          password: PASSWORD,
        },
        WEDNESDAY,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('khóa trận đã quá hạn — Thứ 4 thì trận Thứ 3 không sửa được nữa', async () => {
    await expect(
      service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 3 · 20:30'],
          status: AttendanceStatus.PRESENT,
          password: PASSWORD,
        },
        WEDNESDAY,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('sau 17:00 Thứ 5 thì khóa cả Guild War Thứ 7', async () => {
    await expect(
      service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
          password: PASSWORD,
        },
        vn('2026-07-23T17:01'),
      ),
    ).rejects.toThrow(ConflictException);
  });
});
