import { InternalServerErrorException } from '@nestjs/common';

import {
  emptyScene,
  parseScene,
  toDetail,
  toPreset,
  toSummary,
} from '../tactics.codec';

describe('tactics.codec', () => {
  const row = {
    id: 't1',
    name: 'Thủ cổng tây',
    description: null,
    stages: emptyScene() as unknown,
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  };

  it('starts a tactic with exactly one empty stage named "Giai đoạn 1"', () => {
    const scene = emptyScene();

    expect(scene.schemaVersion).toBe(1);
    expect(scene.stages).toHaveLength(1);
    expect(scene.stages[0].name).toBe('Giai đoạn 1');
    expect(scene.stages[0].elements).toEqual([]);
  });

  it('parses a stored scene back into the shared shape', () => {
    expect(parseScene(row.stages as never, row.id, row.name)).toEqual(
      emptyScene(),
    );
  });

  it('fails loudly, naming the tactic, when the stored scene is broken', () => {
    expect(() => parseScene({ nonsense: true }, 't1', 'Thủ cổng tây')).toThrow(
      InternalServerErrorException,
    );
    expect(() => parseScene({ nonsense: true }, 't1', 'Thủ cổng tây')).toThrow(
      /Thủ cổng tây/,
    );
  });

  it('refuses a scene written by a newer app version', () => {
    const future = { schemaVersion: 2, stages: [] };

    expect(() => parseScene(future, 't1', 'Thủ cổng tây')).toThrow(
      /phiên bản mới hơn/,
    );
  });

  it('summarises without the scene and counts the stages', () => {
    const summary = toSummary(row as never);

    expect(summary.stageCount).toBe(1);
    expect(summary).not.toHaveProperty('scene');
    expect(toDetail(row as never).scene).toEqual(emptyScene());
  });

  it('rejects a preset whose stored icon key is unknown', () => {
    expect(() =>
      toPreset({ id: 'p1', label: 'Đội công', icon: 'nope', sortOrder: 1 }),
    ).toThrow(InternalServerErrorException);
  });
});
