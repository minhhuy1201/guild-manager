/** Places shown under the winner: second and third. */
const PODIUM_PLACES = [2, 3] as const;

export interface PodiumEntry {
  place: number;
  label: string;
}

/**
 * Second and third place of a finished race.
 * @param ranking - Cat keys, winner first
 * @param labels - Display text by cat key
 * @returns Up to two entries; a place nobody finished in is left out
 */
export function podiumOf(
  ranking: readonly string[],
  labels: ReadonlyMap<string, string>
): PodiumEntry[] {
  return PODIUM_PLACES.flatMap((place) => {
    const key = ranking[place - 1];
    const label = key === undefined ? undefined : labels.get(key);

    return label === undefined ? [] : [{ place, label }];
  });
}
