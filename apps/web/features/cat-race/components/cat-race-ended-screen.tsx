import type { CatRaceEventDetail } from "@guild/shared/schemas";

import { eventStageOf } from "../lib/event-stage";
import { AnnounceButton } from "./announce-button";
import { CatRaceHeader } from "./cat-race-header";
import { FeatureRaceSwitch } from "./feature-race-switch";
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
      <CatRaceHeader
        event={event}
        actions={
          event.discordPostedAt ? (
            <span className="text-sm">Đã đăng lên Discord.</span>
          ) : (
            <AnnounceButton eventId={event.id} />
          )
        }
      />
      <RaceStatusBadge stage={eventStageOf(event)} className="self-start" />
      <FeatureRaceSwitch event={event} />
      <CatRaceResults event={event} />
    </div>
  );
}
