import { classSurveyAnswerInputSchema } from '@guild/shared/schemas';

describe('classSurveyAnswerInputSchema', () => {
  it('accepts "keep" with nothing else', () => {
    expect(
      classSurveyAnswerInputSchema.safeParse({ kind: 'KEEP' }).success,
    ).toBe(true);
  });

  it('accepts a change with a target and a confidence', () => {
    const result = classSurveyAnswerInputSchema.safeParse({
      kind: 'CHANGE',
      targetClass: 'HUYEN_CO',
      confidence: 'CONSIDERING',
    });

    expect(result.success).toBe(true);
  });

  it.each([
    [
      'a change without a confidence',
      { kind: 'CHANGE', targetClass: 'HUYEN_CO' },
    ],
    ['a change without a target', { kind: 'CHANGE', confidence: 'SURE' }],
    [
      'an unknown class',
      { kind: 'CHANGE', targetClass: 'NOPE', confidence: 'SURE' },
    ],
    ['an unknown kind', { kind: 'MAYBE' }],
  ])('rejects %s', (_label, body) => {
    expect(classSurveyAnswerInputSchema.safeParse(body).success).toBe(false);
  });

  it('drops a confidence sent with "keep"', () => {
    const result = classSurveyAnswerInputSchema.safeParse({
      kind: 'KEEP',
      confidence: 'SURE',
    });

    expect(result.success && result.data).toEqual({ kind: 'KEEP' });
  });
});
