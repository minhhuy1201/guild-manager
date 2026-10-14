import type { CatRaceParticipant } from "@guild/shared/schemas";

import type { RaceCat } from "./race-script";

/**
 * Display text of every cat: the person's name, with `#n` when they run several cats.
 * @param cats - Every cat in the race
 * @param participants - Who is racing
 * @returns Label by cat key
 */
export function catLabels(
  cats: readonly RaceCat[],
  participants: readonly CatRaceParticipant[]
): Map<string, string> {
  const nameOf = new Map(participants.map((p) => [p.characterId, p.name]));
  const catsPerOwner = new Map<string, number>();
  for (const cat of cats) {
    catsPerOwner.set(cat.characterId, (catsPerOwner.get(cat.characterId) ?? 0) + 1);
  }

  return new Map(
    cats.map((cat) => {
      const name = nameOf.get(cat.characterId) ?? "?";
      const isShared = (catsPerOwner.get(cat.characterId) ?? 0) > 1;

      return [cat.key, isShared ? `${name} #${cat.ticketNo}` : name];
    })
  );
}
