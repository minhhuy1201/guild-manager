import { GUILD_CLASS_OPTIONS, type GuildClass } from "../enums/guild-class.enum";
import { ClassChangeConfidence } from "../enums/class-change-confidence.enum";
import type { ClassSurveyMember } from "../schemas/class-survey.schema";

/** One class's head-count before and after the update. */
export interface ClassOutlookRow {
  guildClass: GuildClass;
  /** Members in the class now: `fromClass` for who answered, the profile class for who did not */
  before: number;
  /** Members staying put plus those moving in who are sure - the solid part of the "after" bar */
  afterSure: number;
  /** Members moving in who are still considering - the striped part */
  afterConsidering: number;
  /** `afterSure + afterConsidering` */
  after: number;
  /** `after - before` */
  delta: number;
}

/** The guild's line-up before and after the update. */
export interface ClassOutlook {
  /** One row per class, in `GUILD_CLASS_OPTIONS` order, zeroes included */
  rows: ClassOutlookRow[];
  /** Members who plan to change class, sure or not */
  moverCount: number;
  /** Of those, the ones who are sure */
  sureMoverCount: number;
}

/**
 * Count each class before and after the update. Every mover leaves their old class whatever their
 * confidence; the confidence only decides which part of the new class's "after" they fill. Shared
 * so the web page and Discord show the same figures.
 * @param members - Every guild member with their answer (null until answered)
 * @returns Per-class counts plus how many members plan to move
 */
export function computeClassOutlook(members: readonly ClassSurveyMember[]): ClassOutlook {
  const counts = new Map<GuildClass, Omit<ClassOutlookRow, "guildClass" | "after" | "delta">>(
    GUILD_CLASS_OPTIONS.map((guildClass) => [
      guildClass,
      { before: 0, afterSure: 0, afterConsidering: 0 },
    ])
  );
  let moverCount = 0;
  let sureMoverCount = 0;

  for (const { guildClass, answer } of members) {
    const origin = answer ? answer.fromClass : guildClass;
    const from = counts.get(origin);
    if (!from) continue;
    from.before += 1;

    if (answer?.kind !== "CHANGE") {
      from.afterSure += 1;
      continue;
    }

    moverCount += 1;
    const into = counts.get(answer.targetClass);
    if (!into) continue;
    if (answer.confidence === ClassChangeConfidence.SURE) {
      sureMoverCount += 1;
      into.afterSure += 1;
    } else {
      into.afterConsidering += 1;
    }
  }

  const rows = GUILD_CLASS_OPTIONS.map((guildClass) => {
    const { before, afterSure, afterConsidering } = counts.get(guildClass)!;
    const after = afterSure + afterConsidering;

    return { guildClass, before, afterSure, afterConsidering, after, delta: after - before };
  });

  return { rows, moverCount, sureMoverCount };
}
