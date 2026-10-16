"use client";

import { useEffect, useState } from "react";
import { CAT_RACE_MODE_LABEL } from "@guild/shared/enums";
import type {
  CatRaceEventDetail,
  CatRacePrize,
  CatRaceRound,
} from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useCharacters } from "@/features/attendance";
import { useInvalidate } from "@/hooks/use-invalidate";
import { combineQueries } from "@/lib/query-group";
import { useDeleteCatRacePrize } from "../hooks/use-cat-race-mutations";
import { useCatRaceEvent } from "../hooks/use-cat-races";
import { parseRaceDuration } from "../lib/race-duration";
import { prizeLockReason } from "../lib/prize-lock";
import { useRaceStore } from "../store/race-store";
import { AnnounceButton } from "./announce-button";
import { EndEventButton } from "./end-event-button";
import { EntrantsDialog } from "./entrants-dialog";
import { ParticipantsDialog } from "./participants-dialog";
import { PrizeChips } from "./prize-chips";
import { PrizeFormDialog } from "./prize-form-dialog";
import { RaceControls } from "./race-controls";
import { RaceStage } from "./race-stage";
import { VoidRoundDialog } from "./void-round-dialog";
import { WinnersPanel } from "./winners-panel";

interface CatRaceEventScreenProps {
  id: string;
}

/**
 * The draw screen of one event.
 * @param id - Event id from the route
 * @returns The event screen
 */
export function CatRaceEventScreen({ id }: CatRaceEventScreenProps) {
  const eventQuery = useCatRaceEvent(id);
  const state = combineQueries([eventQuery], "Không tải được đợt quay.");

  return (
    <QueryBoundary
      state={state}
      skeleton={<Skeleton className="h-96 w-full" />}
    >
      {eventQuery.data ? <EventBody event={eventQuery.data} /> : null}
    </QueryBoundary>
  );
}

/** Which dialog is open; one at a time. */
type OpenDialog =
  | { kind: "none" }
  | { kind: "participants" }
  | { kind: "entrants" }
  | { kind: "prize"; prize: CatRacePrize | null }
  | { kind: "delete-prize"; prize: CatRacePrize };

/**
 * The loaded event: header, prize chips, race area and winners.
 * @param event - The event
 * @returns The screen body
 */
function EventBody({ event }: { event: CatRaceEventDetail }) {
  const { selectedPrizeId, selectPrize, stage, durationSeconds, setDurationSeconds } =
    useRaceStore();
  const charactersQuery = useCharacters();
  const deletePrize = useDeleteCatRacePrize();
  const [dialog, setDialog] = useState<OpenDialog>({ kind: "none" });
  const [voiding, setVoiding] = useState<CatRaceRound | null>(null);
  const [durationText, setDurationText] = useState(String(durationSeconds));
  const invalidate = useInvalidate("cat-race");

  // The store outlives this screen. Leaving mid-race or on the winner card must not replay that
  // round on the next event, and a round drawn but never shown to the end still needs the winners
  // list refreshed.
  useEffect(() => {
    return () => {
      const { pendingResult } = useRaceStore.getState();
      useRaceStore.setState({
        stage: "idle",
        pendingResult: null,
        selectedPrizeId: null,
      });
      if (pendingResult) void invalidate();
    };
  }, [event.id, invalidate]);

  const isOpen = event.status === "OPEN";
  const isBusy = stage !== "idle";
  const selected =
    event.prizes.find((prize) => prize.id === selectedPrizeId) ??
    event.prizes.find((prize) => !prizeLockReason(prize, event.status)) ??
    event.prizes[0];
  const close = () => setDialog({ kind: "none" });
  const changeDuration = (text: string) => {
    setDurationText(text);
    const seconds = parseRaceDuration(text);
    if (seconds !== null) setDurationSeconds(seconds);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner="teamBuilder"
        title={event.name}
        description={`Chế độ ${CAT_RACE_MODE_LABEL[event.mode]}`}
        actions={
          isOpen ? (
            <EndEventButton eventId={event.id} />
          ) : event.discordPostedAt ? (
            <span className="text-sm">Đã đăng lên Discord.</span>
          ) : (
            <AnnounceButton eventId={event.id} />
          )
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <PrizeChips
          event={event}
          selectedPrizeId={selected?.id ?? null}
          canEdit={isOpen && !isBusy}
          onSelect={(prize) => !isBusy && selectPrize(prize.id)}
          onEdit={(prize) => setDialog({ kind: "prize", prize })}
          onDelete={(prize) => setDialog({ kind: "delete-prize", prize })}
          onAdd={() => setDialog({ kind: "prize", prize: null })}
        />
        <RaceControls
          durationText={durationText}
          onDurationTextChange={changeDuration}
          isLocked={isBusy}
          canEdit={isOpen}
          hasPrize={selected !== undefined}
          entrantCount={selected?.entrantIds.length ?? 0}
          participantCount={event.participants.length}
          onEditEntrants={() => setDialog({ kind: "entrants" })}
          onEditParticipants={() => setDialog({ kind: "participants" })}
        />
      </div>

      <RaceStage
        event={event}
        prize={selected}
        isDurationValid={parseRaceDuration(durationText) !== null}
      />
      <WinnersPanel event={event} canVoid={isOpen && !isBusy} onVoid={setVoiding} />

      <ParticipantsDialog
        event={event}
        characters={charactersQuery.data ?? []}
        open={dialog.kind === "participants"}
        onOpenChange={(open) => !open && close()}
      />
      {selected ? (
        <EntrantsDialog
          event={event}
          prize={selected}
          open={dialog.kind === "entrants"}
          onOpenChange={(open) => !open && close()}
        />
      ) : null}
      <PrizeFormDialog
        eventId={event.id}
        open={dialog.kind === "prize"}
        prize={dialog.kind === "prize" ? dialog.prize : null}
        onOpenChange={(open) => !open && close()}
      />
      <ConfirmDeleteDialog
        open={dialog.kind === "delete-prize"}
        onOpenChange={(open) => !open && close()}
        title="Xoá hạng mục?"
        description={
          dialog.kind === "delete-prize"
            ? `Xoá hạng mục ${dialog.prize.name}. Chỉ xoá được hạng mục chưa có vòng nào.`
            : undefined
        }
        submitLabel="Xoá"
        pendingLabel="Đang xoá..."
        fallbackError="Không xoá được hạng mục."
        run={async () => {
          if (dialog.kind !== "delete-prize") return;
          await deletePrize.mutateAsync({ id: event.id, prizeId: dialog.prize.id });
        }}
      />
      <VoidRoundDialog
        eventId={event.id}
        round={voiding}
        onOpenChange={(open) => !open && setVoiding(null)}
      />
    </div>
  );
}
