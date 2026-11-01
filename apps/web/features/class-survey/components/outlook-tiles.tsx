import { GUILD_CLASS_LABEL } from "@guild/shared/enums";
import type { ClassOutlook } from "@guild/shared/lib";
import type { ClassSurveyMember } from "@guild/shared/schemas";

import { Card } from "@/components/ui/card";
import { biggestGainer, formatDelta } from "../lib/outlook-rows";

interface OutlookTilesProps {
  /** Every guild member with their answer */
  members: ClassSurveyMember[];
  /** The computed before/after counts */
  outlook: ClassOutlook;
}

interface TileProps {
  label: string;
  value: string;
}

/**
 * One headline figure.
 * @param label - What the figure counts
 * @param value - The figure
 * @returns The tile
 */
function Tile({ label, value }: TileProps) {
  return (
    <Card className="gap-1 px-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

/**
 * The four headline figures: answered out of the whole guild, planned moves, how many of those are
 * sure, and the class that grows the most.
 * @param members - Every guild member with their answer
 * @param outlook - The computed before/after counts
 * @returns The tile row
 */
export function OutlookTiles({ members, outlook }: OutlookTilesProps) {
  const answered = members.filter((member) => member.answer !== null).length;
  const gainer = biggestGainer(outlook.rows);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Đã điền" value={`${answered} / ${members.length}`} />
      <Tile label="Định chuyển" value={String(outlook.moverCount)} />
      <Tile label="Trong đó chắc chắn" value={String(outlook.sureMoverCount)} />
      <Tile
        label="Phái tăng mạnh nhất"
        value={gainer ? `${GUILD_CLASS_LABEL[gainer.guildClass]} ${formatDelta(gainer.delta)}` : "-"}
      />
    </div>
  );
}
