"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PRIZE_TIER_LABEL, PrizeTier } from "@guild/shared/enums";
import {
  CAT_RACE_PRIZE_NAME_MAX,
  CAT_RACE_PRIZE_QUANTITY_MAX,
  type CatRacePrize,
} from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import {
  useAddCatRacePrize,
  useUpdateCatRacePrize,
} from "../hooks/use-cat-race-mutations";
import { ChoiceButtons } from "./choice-buttons";

const TIER_OPTIONS = Object.values(PrizeTier).map((value) => ({
  value,
  label: PRIZE_TIER_LABEL[value],
}));

interface PrizeFormDialogProps {
  eventId: string;
  open: boolean;
  /** Prize being edited; null adds a new one */
  prize: CatRacePrize | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add or edit a prize: name, quantity, tier.
 * @param eventId - Event the prize belongs to
 * @param open - Whether the dialog is open
 * @param prize - Prize being edited; null adds
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The dialog
 */
export function PrizeFormDialog({
  eventId,
  open,
  prize,
  onOpenChange,
}: PrizeFormDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <PrizeFormBody eventId={eventId} prize={prize} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface PrizeFormBodyProps {
  eventId: string;
  prize: CatRacePrize | null;
  onDone: () => void;
}

/**
 * Fields and write of the prize form.
 * @param eventId - Event the prize belongs to
 * @param prize - Prize being edited; null adds
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function PrizeFormBody({ eventId, prize, onDone }: PrizeFormBodyProps) {
  const addPrize = useAddCatRacePrize();
  const updatePrize = useUpdateCatRacePrize();
  const [name, setName] = useState(prize?.name ?? "");
  const [quantity, setQuantity] = useState(prize?.quantity ?? 1);
  const [tier, setTier] = useState<PrizeTier>(prize?.tier ?? PrizeTier.MEDIUM);

  return (
    <MutationForm
      title={prize ? "Sửa hạng mục" : "Thêm hạng mục"}
      description={
        prize
          ? `Đã trao ${prize.awardedCount}; số lượng không được thấp hơn số đã trao.`
          : undefined
      }
      submitLabel="Lưu"
      pendingLabel="Đang lưu..."
      submitIcon={<Save />}
      fallbackError="Không lưu được hạng mục."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        const fields = { name, quantity, tier };
        if (prize) {
          await updatePrize.mutateAsync({ id: eventId, prizeId: prize.id, ...fields });
          return;
        }
        await addPrize.mutateAsync({ id: eventId, ...fields });
      }}
    >
      <div className="grid gap-2">
        <FieldLabel htmlFor="cat-race-prize-name" icon={<Save />}>
          Tên hạng mục
        </FieldLabel>
        <Input
          id="cat-race-prize-name"
          value={name}
          maxLength={CAT_RACE_PRIZE_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <FieldLabel htmlFor="cat-race-prize-quantity" icon={<Save />}>
          Số lượng
        </FieldLabel>
        <Input
          id="cat-race-prize-quantity"
          type="number"
          min={1}
          max={CAT_RACE_PRIZE_QUANTITY_MAX}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Bậc</span>
        <ChoiceButtons label="Bậc" value={tier} options={TIER_OPTIONS} onChange={setTier} />
      </div>
    </MutationForm>
  );
}
