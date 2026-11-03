import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { TACTIC_INSIGNIA } from '@guild/shared/lib';

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
    tacticInsigniaName: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('TacticsService', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    notes: null,
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
      service.createPreset({ label: 'Đội cảm tử', icon: 'skull' }),
    ).rejects.toThrow(ConflictException);
  });

  it('appends a new preset after the last sortOrder', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([
      { id: 'p1', label: 'Đội cảm tử', icon: 'skull', sortOrder: 3 },
    ]);
    prisma.tacticTokenPreset.create.mockResolvedValue({
      id: 'p2',
      label: 'Đội phá cổng',
      icon: 'shield',
      sortOrder: 4,
    });
    const service = new TacticsService(prisma as never);

    const created = await service.createPreset({
      label: 'Đội phá cổng',
      icon: 'shield',
    });

    expect(prisma.tacticTokenPreset.create).toHaveBeenCalledWith({
      data: { label: 'Đội phá cổng', icon: 'shield', sortOrder: 4 },
    });
    expect(created.sortOrder).toBe(4);
  });
});

describe('TacticsService — the rest of the surface', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    notes: null,
    stages: emptyScene() as unknown,
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  };

  it('returns one tactic with its whole scene', async () => {
    const prisma = createPrisma();
    prisma.tactic.findUnique.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    await expect(service.get('t1')).resolves.toMatchObject({
      id: 't1',
      scene: emptyScene(),
    });
  });

  it('renames a tactic and answers with the updated summary', async () => {
    const prisma = createPrisma();
    prisma.tactic.update.mockResolvedValue({ ...row, name: 'Mở màn' });
    const service = new TacticsService(prisma as never);

    await expect(
      service.update('t1', { name: 'Mở màn' }),
    ).resolves.toMatchObject({ name: 'Mở màn' });
    expect(prisma.tactic.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { name: 'Mở màn', description: undefined, notes: undefined },
    });
  });

  it('rewrites the notes alone, leaving the name and description be', async () => {
    const prisma = createPrisma();
    prisma.tactic.update.mockResolvedValue({ ...row, notes: 'Giữ cổng.' });
    const service = new TacticsService(prisma as never);

    await service.update('t1', { notes: 'Giữ cổng.' });

    expect(prisma.tactic.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { name: undefined, description: undefined, notes: 'Giữ cổng.' },
    });
  });

  it('reports a missing tactic when renaming one that is gone', async () => {
    const prisma = createPrisma();
    prisma.tactic.update.mockRejectedValue({ code: 'P2025' });
    const service = new TacticsService(prisma as never);

    await expect(service.update('nope', { name: 'x' })).rejects.toThrow(
      'Không tìm thấy chiến thuật.',
    );
  });

  it('reports a missing tactic when saving a scene into one that is gone', async () => {
    const prisma = createPrisma();
    prisma.tactic.update.mockRejectedValue({ code: 'P2025' });
    const service = new TacticsService(prisma as never);

    await expect(service.saveStages('nope', emptyScene())).rejects.toThrow(
      'Không tìm thấy chiến thuật.',
    );
  });

  it('lets an unrelated database failure through instead of calling it a 404', async () => {
    const prisma = createPrisma();
    const outage = Object.assign(new Error('connection lost'), {
      code: 'P1001',
    });
    prisma.tactic.update.mockRejectedValue(outage);
    prisma.tactic.delete.mockRejectedValue(outage);
    prisma.tacticTokenPreset.delete.mockRejectedValue(outage);
    prisma.tacticTokenPreset.findMany.mockResolvedValue([]);
    prisma.tacticTokenPreset.create.mockRejectedValue(outage);
    const service = new TacticsService(prisma as never);

    await expect(service.update('t1', { name: 'x' })).rejects.toThrow(outage);
    await expect(service.saveStages('t1', emptyScene())).rejects.toThrow(
      outage,
    );
    await expect(service.remove('t1')).rejects.toThrow(outage);
    await expect(service.removePreset('p1')).rejects.toThrow(outage);
    await expect(
      service.createPreset({ label: 'Đội phá cổng', icon: 'shield' }),
    ).rejects.toThrow(outage);
  });

  it('deletes a tactic that exists', async () => {
    const prisma = createPrisma();
    prisma.tactic.delete.mockResolvedValue(row);
    const service = new TacticsService(prisma as never);

    await expect(service.remove('t1')).resolves.toBeUndefined();
    expect(prisma.tactic.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('lists the presets in display order', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([
      { id: 'p1', label: 'Đội công', icon: 'swords', sortOrder: 1 },
    ]);
    const service = new TacticsService(prisma as never);

    await expect(service.listPresets()).resolves.toEqual([
      { id: 'p1', label: 'Đội công', icon: 'swords', sortOrder: 1 },
    ]);
    expect(prisma.tacticTokenPreset.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: 'asc' },
    });
  });

  it('starts the sort order at 1 for the first preset', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.findMany.mockResolvedValue([]);
    prisma.tacticTokenPreset.create.mockResolvedValue({
      id: 'p1',
      label: 'Đội phá cổng',
      icon: 'swords',
      sortOrder: 1,
    });
    const service = new TacticsService(prisma as never);

    await service.createPreset({ label: 'Đội phá cổng', icon: 'swords' });

    expect(prisma.tacticTokenPreset.create).toHaveBeenCalledWith({
      data: { label: 'Đội phá cổng', icon: 'swords', sortOrder: 1 },
    });
  });

  it('deletes a preset, and reports a missing one in Vietnamese', async () => {
    const prisma = createPrisma();
    prisma.tacticTokenPreset.delete.mockResolvedValue({ id: 'p1' });
    const service = new TacticsService(prisma as never);

    await expect(service.removePreset('p1')).resolves.toBeUndefined();

    prisma.tacticTokenPreset.delete.mockRejectedValue({ code: 'P2025' });
    await expect(service.removePreset('p1')).rejects.toThrow(
      'Không tìm thấy quân cờ.',
    );
  });

  describe('listInsignia', () => {
    it('answers every Insignia under its default name when no row is stored', async () => {
      const prisma = createPrisma();
      prisma.tacticInsigniaName.findMany.mockResolvedValue([]);
      const service = new TacticsService(prisma as never);

      const insignia = await service.listInsignia();

      expect(insignia).toHaveLength(TACTIC_INSIGNIA.length);
      for (const entry of insignia) {
        expect(entry.label).toBe(entry.defaultLabel);
      }
    });

    it('answers the guild name for an Insignia that has one, and the default for the rest', async () => {
      const prisma = createPrisma();
      prisma.tacticInsigniaName.findMany.mockResolvedValue([
        { key: 'scout', label: 'Do thám', updatedAt: new Date() },
      ]);
      const service = new TacticsService(prisma as never);

      const insignia = await service.listInsignia();
      const scout = insignia.find((entry) => entry.key === 'scout');
      const attack = insignia.find((entry) => entry.key === 'attack');

      expect(scout).toEqual({
        key: 'scout',
        icon: 'eye',
        label: 'Do thám',
        defaultLabel: 'Trinh sát',
      });
      expect(attack?.label).toBe('Đội công');
    });

    it('skips and logs a stored row whose key is no longer an Insignia', async () => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const prisma = createPrisma();
      prisma.tacticInsigniaName.findMany.mockResolvedValue([
        { key: 'retired', label: 'Cũ', updatedAt: new Date() },
      ]);
      const service = new TacticsService(prisma as never);

      const insignia = await service.listInsignia();

      expect(insignia.map((entry) => entry.label)).toEqual(
        TACTIC_INSIGNIA.map((entry) => entry.defaultLabel),
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('retired'));
    });

    it('keeps the display order whatever order the rows come back in', async () => {
      const prisma = createPrisma();
      prisma.tacticInsigniaName.findMany.mockResolvedValue([
        { key: 'escort', label: 'Hậu cần', updatedAt: new Date() },
        { key: 'attack', label: 'Xung kích', updatedAt: new Date() },
      ]);
      const service = new TacticsService(prisma as never);

      const insignia = await service.listInsignia();

      expect(insignia.map((entry) => entry.key)).toEqual(
        TACTIC_INSIGNIA.map((entry) => entry.key),
      );
    });
  });
  describe('renameInsignia', () => {
    const stored = (key: string, label: string) => ({
      key,
      label,
      updatedAt: new Date(),
    });

    /**
     * A service over a store holding the given Insignia names and presets.
     * @param names - Stored Insignia rows
     * @param presetLabels - Labels of the stored presets
     * @returns The service and its Prisma double
     */
    function setup(
      names: ReturnType<typeof stored>[] = [],
      presetLabels: string[] = [],
    ) {
      const prisma = createPrisma();
      prisma.tacticInsigniaName.findMany.mockResolvedValue(names);
      prisma.tacticTokenPreset.findMany.mockResolvedValue(
        presetLabels.map((label, index) => ({
          id: `p${index}`,
          label,
          icon: 'skull',
          sortOrder: index,
        })),
      );
      prisma.tacticInsigniaName.upsert.mockImplementation(
        ({ create }: { create: { key: string; label: string } }) =>
          Promise.resolve(stored(create.key, create.label)),
      );

      return { prisma, service: new TacticsService(prisma as never) };
    }

    it('stores the new name and answers the updated Insignia', async () => {
      const { prisma, service } = setup();

      const entry = await service.renameInsignia('scout', 'Do thám');

      expect(prisma.tacticInsigniaName.upsert).toHaveBeenCalledWith({
        where: { key: 'scout' },
        create: { key: 'scout', label: 'Do thám' },
        update: { label: 'Do thám' },
      });
      expect(entry).toMatchObject({
        key: 'scout',
        label: 'Do thám',
        defaultLabel: 'Trinh sát',
      });
    });

    it('deletes the row instead of storing the default name, whatever its case or spacing', async () => {
      const { prisma, service } = setup([stored('scout', 'Do thám')]);

      const entry = await service.renameInsignia('scout', ' TRINH SÁT ');

      expect(prisma.tacticInsigniaName.deleteMany).toHaveBeenCalledWith({
        where: { key: 'scout' },
      });
      expect(prisma.tacticInsigniaName.upsert).not.toHaveBeenCalled();
      expect(entry.label).toBe('Trinh sát');
    });

    it('lets an Insignia keep its own name when saving it again', async () => {
      const { service } = setup([stored('scout', 'Do thám')]);

      await expect(
        service.renameInsignia('scout', 'do thám'),
      ).resolves.toMatchObject({ label: 'do thám' });
    });

    it.each([
      ['another Insignia on its default name', 'Đội thủ'],
      ['the same with other case and padding', '  ĐỘI THỦ  '],
      ['another Insignia on a custom name', 'Xung kích'],
      ['a numbered team', 'đội 3'],
      [
        'a decomposed Unicode spelling of a numbered team',
        'Đội 10'.normalize('NFD'),
      ],
      ['a preset', ' đội cảm tử '],
    ])('refuses a name taken by %s', async (_case, label) => {
      const { prisma, service } = setup(
        [stored('attack', 'Xung kích')],
        ['Đội cảm tử'],
      );

      await expect(service.renameInsignia('scout', label)).rejects.toThrow(
        new ConflictException('Đã có quân cờ trùng tên.'),
      );
      expect(prisma.tacticInsigniaName.upsert).not.toHaveBeenCalled();
    });

    // The default stays reserved, so restoring the renamed Insignia later can never collide.
    it('keeps the default name of a renamed Insignia reserved', async () => {
      const { prisma, service } = setup([stored('attack', 'Xung kích')]);

      await expect(service.renameInsignia('scout', 'Đội công')).rejects.toThrow(
        new ConflictException('Đã có quân cờ trùng tên.'),
      );
      expect(prisma.tacticInsigniaName.upsert).not.toHaveBeenCalled();
    });
  });

  describe('resetInsignia', () => {
    it('drops the stored name', async () => {
      const prisma = createPrisma();
      const service = new TacticsService(prisma as never);

      await expect(service.resetInsignia('scout')).resolves.toBeUndefined();
      expect(prisma.tacticInsigniaName.deleteMany).toHaveBeenCalledWith({
        where: { key: 'scout' },
      });
    });

    it('succeeds when the Insignia already wears its default name', async () => {
      const prisma = createPrisma();
      prisma.tacticInsigniaName.deleteMany.mockResolvedValue({ count: 0 });
      const service = new TacticsService(prisma as never);

      await expect(service.resetInsignia('scout')).resolves.toBeUndefined();
      await expect(service.resetInsignia('scout')).resolves.toBeUndefined();
    });
  });

  describe('createPreset against Insignia names', () => {
    const cases: [string, { key: string; label: string }[], string][] = [
      ['a renamed Insignia', [{ key: 'scout', label: 'Do thám' }], ' do THÁM '],
      ['a default Insignia name', [], 'đội công'],
      [
        'the default name of a renamed Insignia',
        [{ key: 'attack', label: 'Xung kích' }],
        'Đội công',
      ],
      ['a numbered team', [], 'Đội 7'],
    ];

    it.each(cases)(
      'refuses a preset named like %s',
      async (_case, rows, label) => {
        const prisma = createPrisma();
        prisma.tacticInsigniaName.findMany.mockResolvedValue(
          rows.map((row) => ({ ...row, updatedAt: new Date() })),
        );
        const service = new TacticsService(prisma as never);

        await expect(
          service.createPreset({ label, icon: 'skull' }),
        ).rejects.toThrow(new ConflictException('Đã có quân cờ trùng tên.'));
        expect(prisma.tacticTokenPreset.create).not.toHaveBeenCalled();
      },
    );
  });
});
