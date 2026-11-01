import { ClassChangeConfidence, GuildClass } from '@guild/shared/enums';
import { computeClassOutlook } from '@guild/shared/lib';
import type { ClassSurveyMember } from '@guild/shared/schemas';

const { CUU_LINH, TO_VAN, THIET_Y, HUYET_HA } = GuildClass;

let nextId = 0;

/** A member who has not answered. */
function silent(guildClass: GuildClass): ClassSurveyMember {
  nextId += 1;
  return { id: `m${nextId}`, name: `M${nextId}`, guildClass, answer: null };
}

/** A member who keeps their class. */
function keeper(
  guildClass: GuildClass,
  fromClass = guildClass,
): ClassSurveyMember {
  return { ...silent(guildClass), answer: { kind: 'KEEP', fromClass } };
}

/** A member who moves to another class. */
function mover(
  guildClass: GuildClass,
  targetClass: GuildClass,
  confidence: ClassChangeConfidence,
  fromClass = guildClass,
): ClassSurveyMember {
  return {
    ...silent(guildClass),
    answer: { kind: 'CHANGE', fromClass, targetClass, confidence },
  };
}

/** The row of one class. */
function rowOf(members: ClassSurveyMember[], guildClass: GuildClass) {
  const row = computeClassOutlook(members).rows.find(
    (r) => r.guildClass === guildClass,
  );
  if (!row) throw new Error('missing row');
  return row;
}

describe('computeClassOutlook', () => {
  it('lists every class in display order, zeroes included, when nobody is in the guild', () => {
    const { rows, moverCount, sureMoverCount } = computeClassOutlook([]);

    expect(rows.map((r) => r.guildClass)).toEqual(Object.values(GuildClass));
    expect(
      rows.every((r) => r.before === 0 && r.after === 0 && r.delta === 0),
    ).toBe(true);
    expect([moverCount, sureMoverCount]).toEqual([0, 0]);
  });

  it('nobody answered: before and after are the current line-up, all of it firm', () => {
    const members = [silent(CUU_LINH), silent(CUU_LINH), silent(TO_VAN)];

    expect(rowOf(members, CUU_LINH)).toMatchObject({
      before: 2,
      afterSure: 2,
      afterConsidering: 0,
      after: 2,
      delta: 0,
    });
    expect(rowOf(members, TO_VAN)).toMatchObject({
      before: 1,
      after: 1,
      delta: 0,
    });
    expect(computeClassOutlook(members)).toMatchObject({
      moverCount: 0,
      sureMoverCount: 0,
    });
  });

  it('everybody keeps their class: nothing moves', () => {
    const members = [keeper(CUU_LINH), keeper(TO_VAN), silent(TO_VAN)];
    const outlook = computeClassOutlook(members);

    expect(outlook.rows.every((r) => r.delta === 0)).toBe(true);
    expect(outlook.moverCount).toBe(0);
  });

  it('a sure move leaves the old class and lands in the solid part of the new one', () => {
    const members = [
      mover(CUU_LINH, TO_VAN, ClassChangeConfidence.SURE),
      keeper(TO_VAN),
    ];

    expect(rowOf(members, CUU_LINH)).toMatchObject({
      before: 1,
      after: 0,
      delta: -1,
    });
    expect(rowOf(members, TO_VAN)).toMatchObject({
      before: 1,
      afterSure: 2,
      afterConsidering: 0,
      after: 2,
      delta: 1,
    });
    expect(computeClassOutlook(members)).toMatchObject({
      moverCount: 1,
      sureMoverCount: 1,
    });
  });

  it('a considering move lands in the striped part, and counts as a mover but not a sure one', () => {
    const members = [
      mover(CUU_LINH, TO_VAN, ClassChangeConfidence.CONSIDERING),
      keeper(TO_VAN),
    ];

    expect(rowOf(members, TO_VAN)).toMatchObject({
      afterSure: 1,
      afterConsidering: 1,
      after: 2,
      delta: 1,
    });
    expect(rowOf(members, CUU_LINH)).toMatchObject({ after: 0, delta: -1 });
    expect(computeClassOutlook(members)).toMatchObject({
      moverCount: 1,
      sureMoverCount: 0,
    });
  });

  it('counts an answered member by the class they answered from, not their profile now', () => {
    // Answered as Cuu Linh, profile later edited to Thiet Y.
    const members = [
      keeper(THIET_Y, CUU_LINH),
      mover(THIET_Y, HUYET_HA, ClassChangeConfidence.SURE, CUU_LINH),
    ];

    expect(rowOf(members, CUU_LINH)).toMatchObject({
      before: 2,
      after: 1,
      delta: -1,
    });
    expect(rowOf(members, THIET_Y)).toMatchObject({ before: 0, after: 0 });
    expect(rowOf(members, HUYET_HA)).toMatchObject({
      before: 0,
      after: 1,
      delta: 1,
    });
  });

  it('an unanswered member counts at their current class on both sides', () => {
    const members = [
      silent(THIET_Y),
      mover(CUU_LINH, THIET_Y, ClassChangeConfidence.SURE),
    ];

    expect(rowOf(members, THIET_Y)).toMatchObject({ before: 1, after: 2 });
  });
});
