import { NotFoundException } from '@nestjs/common';
import { GuildClass } from '@guild/shared/enums';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CharactersService } from '../characters.service';

/** Một hàng Character như Prisma trả về. */
const ROW = {
  id: 'meo-beo-k7ma3x',
  name: 'Mèo Béo',
  guildClass: GuildClass.CUU_LINH,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Lỗi trùng khoá chính của Prisma. */
const UNIQUE_VIOLATION = Object.assign(new Error('Unique constraint failed'), {
  code: 'P2002',
});

/** Lỗi Prisma khác — service phải để nó nổi lên, không được nuốt. */
const OTHER_ERROR = Object.assign(new Error('Connection lost'), {
  code: 'P1001',
});

/** Đối số của `prisma.character.create` — khai báo để đọc lại mock.calls không lọt `any`. */
interface CreateArgs {
  data: {
    id: string;
    name: string;
    guildClass: GuildClass;
  };
}

/** Đối số của `prisma.character.update`. */
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
      expect(members).toEqual([
        { id: ROW.id, name: ROW.name, guildClass: ROW.guildClass },
      ]);
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
