"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import {
  CAT_RACE_VOID_REASON_MAX,
  type CatRaceRound,
} from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Textarea } from "@/components/ui/textarea";
import { useVoidCatRaceRound } from "../hooks/use-cat-race-mutations";

interface VoidRoundDialogProps {
  eventId: string;
  /** Round to void; null closes the dialog */
  round: CatRaceRound | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Void a round after asking why. The slot goes back to the prize.
 * @param eventId - Event the round belongs to
 * @param round - Round to void; null means closed
 * @param onOpenChange - Called when the dialog wants to close
 * @returns The dialog
 */
export function VoidRoundDialog({ eventId, round, onOpenChange }: VoidRoundDialogProps) {
  return (
    <MutationDialogShell open={round !== null} onOpenChange={onOpenChange}>
      {round ? (
        <VoidRoundBody eventId={eventId} round={round} onDone={() => onOpenChange(false)} />
      ) : null}
    </MutationDialogShell>
  );
}

interface VoidRoundBodyProps {
  eventId: string;
  round: CatRaceRound;
  onDone: () => void;
}

/**
 * Reason field and write of the void dialog.
 * @param eventId - Event the round belongs to
 * @param round - Round to void
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function VoidRoundBody({ eventId, round, onDone }: VoidRoundBodyProps) {
  const voidRound = useVoidCatRaceRound();
  const [reason, setReason] = useState("");

  return (
    <MutationForm
      title="Huỷ vòng"
      description={`Huỷ giải của ${round.winnerName}. Suất trả về hạng mục và người này được đua lại.`}
      submitLabel="Huỷ vòng"
      pendingLabel="Đang huỷ..."
      submitIcon={<Ban />}
      variant="destructive"
      fallbackError="Không huỷ được vòng."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        await voidRound.mutateAsync({ id: eventId, roundId: round.id, reason });
      }}
    >
      <div className="grid gap-2">
        <FieldLabel htmlFor="cat-race-void-reason" icon={<Ban />}>
          Lý do
        </FieldLabel>
        <Textarea
          id="cat-race-void-reason"
          value={reason}
          maxLength={CAT_RACE_VOID_REASON_MAX}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </div>
    </MutationForm>
  );
}
