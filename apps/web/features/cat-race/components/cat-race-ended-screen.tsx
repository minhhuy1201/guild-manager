import { CAT_RACE_MODE_LABEL } from "@guild/shared/enums";
import type { CatRaceEventDetail } from "@guild/shared/schemas";

import { PageHeader } from "@/components/shared/page-header";
import { eventStageOf } from "../lib/event-stage";
import { AnnounceButton } from "./announce-button";
import { CatRaceResults } from "./cat-race-results";
import { RaceStatusBadge } from "./race-status-badge";

interface CatRaceEndedScreenProps {
  event: CatRaceEventDetail;
}

/**
 * A finished event: the results board under the usual header, with the Discord post as the one
 * thing left to do.
 * @param event - The ended event
 * @returns The screen body
 */
export function CatRaceEndedScreen({ event }: CatRaceEndedScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner="teamBuilder"
        title={event.name}
        description={`Chế độ ${CAT_RACE_MODE_LABEL[event.mode]}`}
        actions={
          event.discordPostedAt ? (
            <span className="text-sm">Đã đăng lên Discord.</span>
          ) : (
            <AnnounceButton eventId={event.id} />
          )
        }
      />
      <RaceStatusBadge stage={eventStageOf(event)} className="self-start" />
      <CatRaceResults event={event} />
    </div>
  );
}
