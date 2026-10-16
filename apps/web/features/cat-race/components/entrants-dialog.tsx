"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { useSetCatRaceEntrants } from "../hooks/use-cat-race-mutations";
import { RosterChecklist, type RosterSelection } from "./roster-checklist";

interface EntrantsDialogProps {
  event: CatRaceEventDetail;
  prize: CatRacePrize;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tick and untick who may still win one prize. People who already won it are labelled.
 * @param event - The event
 * @param prize - The prize whose list is edited
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The dialog
 */
export function EntrantsDialog({ event, prize, open, onOpenChange }: EntrantsDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      <EntrantsBody event={event} prize={prize} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface EntrantsBodyProps {
  event: CatRaceEventDetail;
  prize: CatRacePrize;
  onDone: () => void;
}

/**
 * Checklist and write of the entrants dialog.
 * @param event - The event
 * @param prize - The prize whose list is edited
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function EntrantsBody({ event, prize, onDone }: EntrantsBodyProps) {
  const setEntrants = useSetCatRaceEntrants();
  const [selection, setSelection] = useState<RosterSelection>(
    new Map(prize.entrantIds.map((id) => [id, 1]))
  );
  const winners = new Set(
    event.rounds
      .filter((round) => round.prizeId === prize.id && round.voidedAt === null)
      .flatMap((round) => (round.winnerCharacterId ? [round.winnerCharacterId] : []))
  );

  return (
    <MutationForm
      title={`Danh sách đua: ${prize.name}`}
      submitLabel="Lưu"
      pendingLabel="Đang lưu..."
      submitIcon={<Save />}
      fallbackError="Không lưu được danh sách đua."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        await setEntrants.mutateAsync({
          id: event.id,
          prizeId: prize.id,
          characterIds: [...selection.keys()],
        });
      }}
    >
      <RosterChecklist
        idPrefix="entrants"
        members={event.participants.map((p) => ({
          characterId: p.characterId,
          name: p.name,
          guildClass: p.guildClass,
          note: winners.has(p.characterId) ? "đã trúng" : undefined,
        }))}
        selection={selection}
        showTickets={false}
        onChange={setSelection}
      />
    </MutationForm>
  );
}
