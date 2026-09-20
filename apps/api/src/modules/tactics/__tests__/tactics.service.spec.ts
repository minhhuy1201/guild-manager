import { ConflictException, NotFoundException } from '@nestjs/common';

import { emptyScene } from '../tactics.codec';
import { TacticsService } from '../tactics.service';

/** Minimal Prisma double: only the delegates this service touches. */
function createPrisma() {
  return {
    tactic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tacticTokenPreset: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('TacticsService', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    stages: emptyScene() as unknown,
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  };

  it('lists tactics newest edit first, without their scenes', async () => {
    const prisma = createPrisma();
    prisma.tactic.findMany.mockResolvedValue([row]);
    const service = new TacticsService(prisma as never);

    const list = await service.list();

    expect(prisma.tactic.findMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: 'desc' },
    });
    expect(list[0]).not.toHaveProperty('scene');
    expect(list[0].stageCount).toBe(1);
  });

  it('creates a tactic holding one empty stage', async () => {
    const prisma = createPrisma();
    prisma.tactic.create.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    const created = await service.create({ name: 'Thủ cổng tây' });

    expect(prisma.tactic.create).toHaveBeenCalledWith({
      data: {
        name: 'Thủ cổng tây',
        description: undefined,
        stages: emptyScene(),
      },
    });
    expect(created.scene.stages).toHaveLength(1);
  });

  it('reports a missing tactic in Vietnamese', async () => {
    const prisma = createPrisma();
    prisma.tactic.findUnique.mockResolvedValue(null);
    const service = new TacticsService(prisma as never);

    await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    await expect(service.get('nope')).rejects.toThrow(
      'Không tìm thấy chiến thuật.',
    );
  });

  it('overwrites the whole scene, last writer wins', async () => {
    const prisma = createPrisma();
    prisma.tactic.findUnique.mockResolvedValue(row);
    prisma.tactic.update.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    await service.saveStages('t1', emptyScene());

    expect(prisma.tactic.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { stages: emptyScene() },
    });
  });

  it('reports a missing tactic when deleting one that is gone', async () => {
    const prisma = createPrisma();
    prisma.tactic.delete.mockRejectedValue({ code: 'P2025' });
    const service = new TacticsService(prisma as never);

    await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
  });

  it('rejects a duplicate preset label in Vietnamese', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([]);
    prisma.tacticTokenPreset.create.mockRejectedValue({ code: 'P2002' });
    const service = new TacticsService(prisma as never);

    await expect(
      service.createPreset({ label: 'Đội công', icon: 'swords' }),
    ).rejects.toThrow(ConflictException);
  });

  it('appends a new preset after the last sortOrder', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([
      { id: 'p1', label: 'Đội công', icon: 'swords', sortOrder: 3 },
    ]);
    prisma.tacticTokenPreset.create.mockResolvedValue({
      id: 'p2',
      label: 'Đội thủ',
      icon: 'shield',
      sortOrder: 4,
    });
    const service = new TacticsService(prisma as never);

    const created = await service.createPreset({
      label: 'Đội thủ',
      icon: 'shield',
    });

    expect(prisma.tacticTokenPreset.create).toHaveBeenCalledWith({
      data: { label: 'Đội thủ', icon: 'shield', sortOrder: 4 },
    });
    expect(created.sortOrder).toBe(4);
  });
});
