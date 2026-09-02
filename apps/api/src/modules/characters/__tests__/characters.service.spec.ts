import { ConflictException, NotFoundException } from '@nestjs/common';
import { GuildClass, GuildRole } from '@guild/shared/enums';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CharactersService } from '../characters.service';

/** A Character row as Prisma returns it. */
const ROW = {
  id: 'meo-beo-k7ma3x',
  name: 'Mèo Béo',
  guildClass: GuildClass.CUU_LINH,
  discordId: null,
  discordUsername: null,
  lastLoginAt: null,
  role: GuildRole.MEMBER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** A member as the admin screen sees it — the shape list/create/update return. */
const MEMBER = {
  id: ROW.id,
  name: ROW.name,
  guildClass: ROW.guildClass,
  discordId: null,
  discordUsername: null,
  lastLoginAt: null,
  role: GuildRole.MEMBER,
};

/** Prisma's primary-key conflict error. */
const UNIQUE_VIOLATION = Object.assign(new Error('Unique constraint failed'), {
  code: 'P2002',
});

/**
 * Prisma's conflict error on the discordId column — a different fix from an id collision.
 *
 * Copied from what Prisma 7 actually throws through the driver adapter, not hand-shaped: the older
 * `meta.target` array is gone, and building the double from memory is how this stayed green while
 * `POST /characters` answered 500 in production.
 */
const DISCORD_ID_VIOLATION = Object.assign(
  new Error('Unique constraint failed'),
  {
    code: 'P2002',
    meta: {
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: {
          originalCode: '23505',
          originalMessage:
            'duplicate key value violates unique constraint "Character_discordId_key"',
          kind: 'UniqueConstraintViolation',
          constraint: { index: 'Character_discordId_key' },
          table: 'Character',
        },
      },
      modelName: 'Character',
    },
  },
);

/** A different Prisma error — the service must let it surface, not swallow it. */
const OTHER_ERROR = Object.assign(new Error('Connection lost'), {
  code: 'P1001',
});

/** Argument of `prisma.character.create` — declared so reading mock.calls does not leak `any`. */
interface CreateArgs {
  data: {
    id: string;
    name: string;
    guildClass: GuildClass;
    discordId: string | null;
  };
}

/** Argument of `prisma.character.update`. */
interface UpdateArgs {
  where: { id: string };
  data: { name?: string; guildClass?: GuildClass };
}

describe('CharactersService', () => {
  let service: CharactersService;
  let prisma: {
    character: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock<Promise<typeof ROW>, [CreateArgs]>;
      update: jest.Mock<Promise<typeof ROW>, [UpdateArgs]>;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest.fn().mockResolvedValue([ROW]),
        findUnique: jest.fn().mockResolvedValue(ROW),
        create: jest
          .fn<Promise<typeof ROW>, [CreateArgs]>()
          .mockResolvedValue(ROW),
        update: jest
          .fn<Promise<typeof ROW>, [UpdateArgs]>()
          .mockResolvedValue(ROW),
        delete: jest.fn().mockResolvedValue(ROW),
      },
    };
    service = new CharactersService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('trả về danh sách sắp theo tên', async () => {
      const members = await service.list();

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(members).toEqual([MEMBER]);
    });
  });

  describe('listRows', () => {
    it('trả nguyên hàng Prisma, sắp theo tên, không qua codec nào', async () => {
      const rows = await service.listRows();

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(rows).toEqual([ROW]);
    });

    it('hàng thô còn đủ trường để caller tự chọn codec của mình', async () => {
      prisma.character.findMany.mockResolvedValue([
        { ...ROW, discordId: '123456789012345678' },
      ]);

      const [row] = await service.listRows();

      expect(row.discordId).toBe('123456789012345678');
      expect(row).toHaveProperty('createdAt');
    });
  });

  describe('create', () => {
    it('sinh id mang prefix từ tên', async () => {
      await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
      });

      const { data } = prisma.character.create.mock.calls[0][0];
      expect(data.id).toMatch(/^meo-beo-[a-z0-9]{6}$/);
      expect(data.name).toBe('Mèo Béo');
      expect(data.guildClass).toBe(GuildClass.CUU_LINH);
    });

    it('gán luôn Discord ID khi được truyền vào', async () => {
      await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
        discordId: '123456789012345678',
      });

      const { data } = prisma.character.create.mock.calls[0][0];
      expect(data.discordId).toBe('123456789012345678');
    });

    it('để discordId null khi không truyền', async () => {
      await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
      });

      const { data } = prisma.character.create.mock.calls[0][0];
      expect(data.discordId).toBeNull();
    });

    it('báo 409 và không thử lại khi Discord ID đã có người dùng', async () => {
      prisma.character.create.mockRejectedValue(DISCORD_ID_VIOLATION);

      await expect(
        service.create({
          name: 'Mèo Béo',
          guildClass: GuildClass.CUU_LINH,
          discordId: '123456789012345678',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.character.create).toHaveBeenCalledTimes(1);
    });

    it('vẫn báo 409 khi Prisma đổi hình dạng lỗi và ta không nhận ra', async () => {
      // Phòng thủ cho đúng cái đã xảy ra: `meta` đổi hình dạng, isDiscordIdViolation trả false,
      // create tưởng đụng khoá chính rồi thử lại — lần hai vỡ y hệt và thoát ra thành 500.
      // insert() sinh id mới mỗi lần, mà Character chỉ có hai unique constraint, nên P2002 lần thứ
      // hai chắc chắn là discordId dù đọc được `meta` hay không.
      const UNRECOGNISED = Object.assign(
        new Error('Unique constraint failed'),
        {
          code: 'P2002',
          meta: { somethingPrismaChangedLater: true },
        },
      );
      prisma.character.create
        .mockRejectedValueOnce(UNRECOGNISED)
        .mockRejectedValueOnce(UNRECOGNISED);

      await expect(
        service.create({
          name: 'Mèo Béo',
          guildClass: GuildClass.CUU_LINH,
          discordId: '123456789012345678',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.character.create).toHaveBeenCalledTimes(2);
    });

    it('lỗi không phải trùng khoá ở lần thử lại thì ném nguyên vẹn', async () => {
      const BOOM = new Error('database sập');
      prisma.character.create
        .mockRejectedValueOnce(UNIQUE_VIOLATION)
        .mockRejectedValueOnce(BOOM);

      await expect(
        service.create({ name: 'Mèo Béo', guildClass: GuildClass.CUU_LINH }),
      ).rejects.toThrow('database sập');
    });

    it('sinh lại id và thử lần nữa khi đụng khoá chính', async () => {
      prisma.character.create
        .mockRejectedValueOnce(UNIQUE_VIOLATION)
        .mockResolvedValueOnce(ROW);

      const member = await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
      });

      expect(prisma.character.create).toHaveBeenCalledTimes(2);
      const firstId = prisma.character.create.mock.calls[0][0].data.id;
      const secondId = prisma.character.create.mock.calls[1][0].data.id;
      expect(firstId).not.toBe(secondId);
      expect(member.id).toBe(ROW.id);
    });

    it('không nuốt lỗi Prisma khác', async () => {
      prisma.character.create.mockRejectedValue(OTHER_ERROR);

      await expect(
        service.create({ name: 'Mèo Béo', guildClass: GuildClass.CUU_LINH }),
      ).rejects.toThrow('Connection lost');
      expect(prisma.character.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('chỉ gửi xuống Prisma những field được truyền vào', async () => {
      await service.update(ROW.id, { name: 'Mèo Mập' });

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: ROW.id },
        data: { name: 'Mèo Mập' },
      });
    });

    it('ném NotFoundException khi không có thành viên đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.update('khong-co', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe('gán Discord ID', () => {
    it('trả 409 khi Discord ID đã thuộc thành viên khác', async () => {
      prisma.character.update.mockRejectedValue(UNIQUE_VIOLATION);

      await expect(
        service.update(ROW.id, { discordId: '123456789012345678' }),
      ).rejects.toThrow(ConflictException);
    });

    it('không nuốt lỗi Prisma khác khi sửa', async () => {
      prisma.character.update.mockRejectedValue(OTHER_ERROR);

      await expect(service.update(ROW.id, { name: 'X' })).rejects.toThrow(
        'Connection lost',
      );
    });

    it('tra được thành viên theo Discord ID', async () => {
      prisma.character.findUnique.mockResolvedValue({
        id: ROW.id,
        role: GuildRole.ADMIN,
      });

      await expect(
        service.findByDiscordId('123456789012345678'),
      ).resolves.toEqual({ id: ROW.id, role: GuildRole.ADMIN });
      expect(prisma.character.findUnique).toHaveBeenCalledWith({
        where: { discordId: '123456789012345678' },
        select: { id: true, role: true },
      });
    });

    it('trả null khi chưa ai được gán Discord ID đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.findByDiscordId('111')).resolves.toBeNull();
    });

    it('ghi lại tên Discord, avatar và thời điểm đăng nhập gần nhất', async () => {
      const at = new Date('2026-08-24T10:00:00.000Z');

      await service.touchLogin(ROW.id, 'meobeo', 'a1b2c3d4e5f6', at);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: ROW.id },
        data: {
          discordUsername: 'meobeo',
          discordAvatar: 'a1b2c3d4e5f6',
          lastLoginAt: at,
        },
      });
    });

    it('ghi null khi tài khoản Discord để ảnh mặc định', async () => {
      const at = new Date('2026-08-24T10:00:00.000Z');

      await service.touchLogin(ROW.id, 'meobeo', null, at);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: ROW.id },
        data: {
          discordUsername: 'meobeo',
          discordAvatar: null,
          lastLoginAt: at,
        },
      });
    });
  });

  describe('remove', () => {
    it('xoá theo id', async () => {
      await service.remove(ROW.id);

      expect(prisma.character.delete).toHaveBeenCalledWith({
        where: { id: ROW.id },
      });
    });

    it('ném NotFoundException khi không có thành viên đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.remove('khong-co')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.character.delete).not.toHaveBeenCalled();
    });
  });
});
