import {
  TACTIC_INSIGNIA_KEYS,
  TACTIC_NUMBER_ICONS,
  type TacticInsigniaKey,
  type TacticTokenIcon,
} from '../enums';

/** An Insignia as the palette offers it before any guild rename. */
export interface TacticInsignia {
  /** Stable identity, survives a rename */
  key: TacticInsigniaKey;
  /** Icon key; fixed, a rename never changes it */
  icon: TacticTokenIcon;
  /** Name shown until the guild sets its own */
  defaultLabel: string;
}

/** Insignia in display order. Typed as a record so a new key cannot be left without a default. */
const INSIGNIA_BY_KEY: Record<TacticInsigniaKey, Omit<TacticInsignia, 'key'>> = {
  attack: { icon: 'swords', defaultLabel: 'Đội công' },
  defense: { icon: 'shield', defaultLabel: 'Đội thủ' },
  mobile: { icon: 'footprints', defaultLabel: 'Cơ động' },
  scout: { icon: 'eye', defaultLabel: 'Trinh sát' },
  rally: { icon: 'flag', defaultLabel: 'Tập kết' },
  tower: { icon: 'castle', defaultLabel: 'Đội trụ' },
  escort: { icon: 'truck', defaultLabel: 'Bảo tiêu' },
};

/**
 * One Insignia by key. The key type covers every entry, so the lookup cannot miss.
 * @param key - A valid Insignia key
 * @returns The shared definition
 */
export function tacticInsigniaOf(key: TacticInsigniaKey): TacticInsignia {
  return { key, ...INSIGNIA_BY_KEY[key] };
}

/** The seven Insignia, in the order the palette shows them. */
export const TACTIC_INSIGNIA: readonly TacticInsignia[] = TACTIC_INSIGNIA_KEYS.map(tacticInsigniaOf);

/** How many numbered teams ("Đội 1" to "Đội 10") the palette offers, one per number icon. */
export const NUMBERED_TEAM_COUNT = TACTIC_NUMBER_ICONS.length;

/**
 * The label of a numbered team token.
 * @param team - 1-based team number
 * @returns The label, e.g. "Đội 3"
 */
export function numberedTeamLabel(team: number): string {
  return `Đội ${team}`;
}
