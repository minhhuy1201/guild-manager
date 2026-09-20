import {
  TACTIC_LIMITS,
  saveTacticStagesSchema,
  tacticSceneSchema,
} from '@guild/shared/schemas';

/**
 * Build a scene with a given number of stages, each holding a given number of text elements.
 * @param stageCount - How many stages
 * @param elementsPerStage - How many elements in each stage
 * @returns The scene document
 */
function sceneWith(stageCount: number, elementsPerStage: number) {
  return {
    schemaVersion: 1,
    stages: Array.from({ length: stageCount }, (_, stage) => ({
      id: `stage-${stage}`,
      name: `Giai đoạn ${stage + 1}`,
      elements: Array.from({ length: elementsPerStage }, (_, index) => ({
        kind: 'text' as const,
        id: `el-${stage}-${index}`,
        x: 10,
        y: 10,
        text: 'Tập kết',
        color: 'red' as const,
        fontSize: 24,
      })),
    })),
  };
}

describe('tactic scene limits', () => {
  it('accepts a scene at every ceiling', () => {
    const scene = sceneWith(
      TACTIC_LIMITS.stagesPerTactic,
      TACTIC_LIMITS.elementsPerStage,
    );

    expect(tacticSceneSchema.safeParse(scene).success).toBe(true);
  });

  it('rejects the 21st stage with a Vietnamese message', () => {
    const result = tacticSceneSchema.safeParse(
      sceneWith(TACTIC_LIMITS.stagesPerTactic + 1, 0),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Một chiến thuật tối đa 20 giai đoạn.',
    );
  });

  it('rejects an empty scene: a tactic always has a stage to draw on', () => {
    const result = tacticSceneSchema.safeParse(sceneWith(0, 0));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Chiến thuật phải có ít nhất một giai đoạn.',
    );
  });

  it('rejects the 401st element in one stage', () => {
    const result = tacticSceneSchema.safeParse(
      sceneWith(1, TACTIC_LIMITS.elementsPerStage + 1),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Một giai đoạn tối đa 400 phần tử.',
    );
  });

  it('rejects a freehand stroke past 4000 points', () => {
    const scene = {
      schemaVersion: 1,
      stages: [
        {
          id: 's1',
          name: 'Giai đoạn 1',
          elements: [
            {
              kind: 'freehand',
              id: 'f1',
              points: Array.from(
                { length: (TACTIC_LIMITS.pointsPerStroke + 1) * 2 },
                () => 1,
              ),
              color: 'red',
              strokeWidth: 4,
            },
          ],
        },
      ],
    };

    const result = tacticSceneSchema.safeParse(scene);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Nét vẽ quá dài.');
  });

  it('rejects a note past 80 characters', () => {
    const scene = sceneWith(1, 1);
    scene.stages[0].elements[0].text = 'a'.repeat(TACTIC_LIMITS.textLength + 1);

    const result = tacticSceneSchema.safeParse(scene);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Ghi chú tối đa 80 ký tự.');
  });

  it('rejects a stage name past 40 characters', () => {
    const scene = sceneWith(1, 0);
    scene.stages[0].name = 'a'.repeat(TACTIC_LIMITS.stageNameLength + 1);

    const result = tacticSceneSchema.safeParse(scene);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Tên giai đoạn tối đa 40 ký tự.',
    );
  });

  it('rejects a scene written by a newer schema version', () => {
    const scene = { ...sceneWith(1, 0), schemaVersion: 2 };

    expect(saveTacticStagesSchema.safeParse({ scene }).success).toBe(false);
  });

  it('rejects a stroke width the toolbar never offers', () => {
    const scene = {
      schemaVersion: 1,
      stages: [
        {
          id: 's1',
          name: 'Giai đoạn 1',
          elements: [
            {
              kind: 'arrow',
              id: 'a1',
              points: [0, 0, 10, 10],
              color: 'red',
              strokeWidth: 7,
            },
          ],
        },
      ],
    };

    expect(tacticSceneSchema.safeParse(scene).success).toBe(false);
  });
});
