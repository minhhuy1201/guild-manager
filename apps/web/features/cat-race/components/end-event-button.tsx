"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

import { MutationDialog } from "@/components/shared/mutation-dialog";
import { Button } from "@/components/ui/button";
import { useEndCatRace } from "../hooks/use-cat-race-mutations";

interface EndEventButtonProps {
  eventId: string;
  /** Ending mid-race would cut the replay and the winner card off */
  disabled?: boolean;
}

/**
 * "Kết thúc đợt", behind a confirmation: an ended event only reads, it never reopens.
 * @param eventId - Event to end
 * @param disabled - Whether a race is running
 * @returns The button and its dialog
 */
export function EndEventButton({ eventId, disabled = false }: EndEventButtonProps) {
  const [open, setOpen] = useState(false);
  const endRace = useEndCatRace();

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <Flag />
        Kết thúc đợt
      </Button>
      {disabled ? <span className="text-sm">Đợi xong vòng này rồi hãy kết thúc.</span> : null}
      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        showCancel
        title="Kết thúc đợt đua?"
        description="Đợt đã kết thúc chỉ xem được, không mở lại và không huỷ vòng được nữa."
        submitLabel="Kết thúc"
        pendingLabel="Đang kết thúc..."
        submitIcon={<Flag />}
        fallbackError="Không kết thúc được đợt đua."
        successMessage="Đã kết thúc đợt đua."
        run={async () => {
          await endRace.mutateAsync(eventId);
        }}
      />
    </>
  );
}
