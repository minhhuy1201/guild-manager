"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { CatRaceMode } from "@guild/shared/enums";
import type { CatRaceEventDetail, Character } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { useSetCatRaceParticipants } from "../hooks/use-cat-race-mutations";
import { RosterChecklist, type RosterSelection } from "./roster-checklist";

interface ParticipantsDialogProps {
  event: CatRaceEventDetail;
  /** Everyone in the guild, so someone outside the event can be added */
  characters: readonly Character[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tick and untick who takes part in the event; ticket counts in TICKET mode.
 * @param event - The event
 * @param characters - Everyone in the guild
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The dialog
 */
export function ParticipantsDialog({
  event,
  characters,
  open,
  onOpenChange,
}: ParticipantsDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      <ParticipantsBody event={event} characters={characters} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface ParticipantsBodyProps {
  event: CatRaceEventDetail;
  characters: readonly Character[];
  onDone: () => void;
}

/**
 * Checklist and write of the participants dialog.
 * @param event - The event
 * @param characters - Everyone in the guild
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function ParticipantsBody({ event, characters, onDone }: ParticipantsBodyProps) {
  const setParticipants = useSetCatRaceParticipants();
  const [selection, setSelection] = useState<RosterSelection>(
    new Map(event.participants.map((p) => [p.characterId, p.tickets]))
  );
  const isTicketMode = event.mode === CatRaceMode.TICKET;

  return (
    <MutationForm
      title="Người tham gia"
      description="Người mới vào các hạng mục chưa đủ giải; người bị bỏ tick rời mọi hạng mục."
      submitLabel="Lưu"
      pendingLabel="Đang lưu..."
      submitIcon={<Save />}
      fallbackError="Không lưu được người tham gia."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        await setParticipants.mutateAsync({
          id: event.id,
          participants: [...selection].map(([characterId, tickets]) => ({
            characterId,
            tickets: isTicketMode ? tickets : 1,
          })),
        });
      }}
    >
      <RosterChecklist
        idPrefix="participants"
        members={characters.map((c) => ({
          characterId: c.id,
          name: c.name,
          guildClass: c.guildClass,
        }))}
        selection={selection}
        showTickets={isTicketMode}
        onChange={setSelection}
      />
    </MutationForm>
  );
}
