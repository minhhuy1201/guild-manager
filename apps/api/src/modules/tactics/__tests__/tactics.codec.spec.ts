import { InternalServerErrorException } from '@nestjs/common';
import { TACTIC_SCHEMA_VERSION } from '@guild/shared/schemas';

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

    expect(scene.schemaVersion).toBe(TACTIC_SCHEMA_VERSION);
    expect(scene.stages).toHaveLength(1);
    expect(scene.stages[0].name).toBe('Giai đoạn 1');
    expect(scene.stages[0].elements).toEqual([]);
  });

  it('parses a stored scene back into the shared shape', () => {
    expect(parseScene(row.stages as never, row.id, row.name)).toEqual(
      emptyScene(),
    );
  });

  it('lifts a v1 scene instead of refusing the colour it retired', () => {
    const v1 = {
      schemaVersion: 1,
      stages: [
        {
          id: 's1',
          name: 'Giai đoạn 1',
          elements: [
            {
              kind: 'text',
              id: 't1',
              x: 10,
              y: 10,
              text: 'Tập kết',
              color: 'white',
              fontSize: 24,
            },
          ],
        },
      ],
    };

    const scene = parseScene(v1, 't1', 'Thủ cổng tây');

    expect(scene.schemaVersion).toBe(TACTIC_SCHEMA_VERSION);
    expect(scene.stages[0].elements[0].color).toBe('black');
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
    const future = { schemaVersion: TACTIC_SCHEMA_VERSION + 1, stages: [] };

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

  it('still lists a tactic whose drawing holds an element it cannot read', () => {
    const broken = {
      ...row,
      stages: {
        schemaVersion: TACTIC_SCHEMA_VERSION,
        stages: [
          { id: 's1', name: 'Giai đoạn 1', elements: [{ kind: 'circle' }] },
          { id: 's2', name: 'Giai đoạn 2', elements: [] },
        ],
      },
    };

    // The list only needs the stage count; the detail read is where the broken element is reported.
    expect(toSummary(broken as never).stageCount).toBe(2);
    expect(() => toDetail(broken as never)).toThrow(/Thủ cổng tây/);
  });

  it('fails loudly, naming the tactic, when the list cannot even find the stages', () => {
    const noStages = { ...row, stages: { nonsense: true } };

    expect(() => toSummary(noStages as never)).toThrow(
      InternalServerErrorException,
    );
    expect(() => toSummary(noStages as never)).toThrow(/Thủ cổng tây/);
  });

  it('rejects a preset whose stored icon key is unknown', () => {
    expect(() =>
      toPreset({ id: 'p1', label: 'Đội công', icon: 'nope', sortOrder: 1 }),
    ).toThrow(InternalServerErrorException);
  });
});
