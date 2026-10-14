import type { CatRaceParticipant } from "@guild/shared/schemas";

import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { cn } from "@/lib/utils";
import { catLabels } from "../lib/cat-label";
import type { RaceScript } from "../lib/race-script";

/** Cats on the podium; their rank takes the primary surface. */
const PODIUM_SIZE = 3;

interface RaceStandingsProps {
  /** The race being replayed; null before the first round */
  script: RaceScript | null;
  participants: readonly CatRaceParticipant[];
  /** Every cat key, leader first */
  keys: readonly string[];
  className?: string;
}

/**
 * The live board: every cat in the race, one row each, in the order they run. The same ranking
 * orders the track, so the board and the lanes never disagree.
 * @param script - The race being replayed
 * @param participants - Who is racing, for names and colours
 * @param keys - Every cat key, leader first
 * @param className - Sizing from the screen
 * @returns The board
 */
export function RaceStandings({ script, participants, keys, className }: RaceStandingsProps) {
  const labels = script ? catLabels(script.cats, participants) : null;
  const ownerOf = new Map(script?.cats.map((cat) => [cat.key, cat.characterId]));
  const classOf = new Map(participants.map((p) => [p.characterId, p.guildClass]));

  return (
    <aside
      aria-label="Bảng xếp hạng"
      className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-background", className)}
    >
      <h2 className="border-b border-border px-3 py-2 text-base font-semibold">
        Bảng xếp hạng{script ? ` · ${script.cats.length} mèo` : ""}
      </h2>
      {labels && keys.length > 0 ? (
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {keys.map((key, index) => {
            const guildClass = classOf.get(ownerOf.get(key) ?? "");

            return (
              <li
                key={key}
                className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-sm last:border-b-0"
              >
                <span
                  className={cn(
                    "w-8 shrink-0 rounded-md px-1 text-center font-semibold tabular-nums",
                    index < PODIUM_SIZE && "bg-primary text-primary-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  aria-hidden
                  className="size-2 shrink-0"
                  style={{ backgroundColor: guildClass ? GUILD_CLASS_COLOR[guildClass] : undefined }}
                />
                <span className={cn("min-w-0 truncate", index < PODIUM_SIZE && "font-semibold")}>
                  {labels.get(key)}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="p-3 text-sm text-muted-foreground">Bảng xếp hạng hiện khi bắt đầu đua.</p>
      )}
    </aside>
  );
}
