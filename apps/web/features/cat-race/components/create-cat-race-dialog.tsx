"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Type } from "lucide-react";
import {
  CAT_RACE_MODE_LABEL,
  CatRaceMode,
  PRIZE_TIER_LABEL,
  PrizeTier,
} from "@guild/shared/enums";
import {
  CAT_RACE_NAME_MAX,
  CAT_RACE_PRIZE_NAME_MAX,
  CAT_RACE_PRIZE_QUANTITY_MAX,
  type Character,
  type CatRacePrizeTemplate,
} from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catRaceEventPath } from "@/config/routes";
import { useCreateCatRace } from "../hooks/use-cat-race-mutations";
import { ChoiceButtons } from "./choice-buttons";
import { RosterChecklist, type RosterSelection } from "./roster-checklist";

const MODE_OPTIONS = Object.values(CatRaceMode).map((value) => ({
  value,
  label: CAT_RACE_MODE_LABEL[value],
}));
const TIER_OPTIONS = Object.values(PrizeTier).map((value) => ({
  value,
  label: PRIZE_TIER_LABEL[value],
}));
const EMPTY_PRIZE: CatRacePrizeTemplate = {
  name: "",
  quantity: 1,
  tier: PrizeTier.MEDIUM,
};

interface CreateCatRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Everyone in the guild, ticked by default */
  characters: readonly Character[];
  /** Prizes of the latest event, to start from */
  prefill: readonly CatRacePrizeTemplate[];
}

/**
 * The "Tạo đợt quay" dialog. The body keeps its own field state, so it sits in a child of the shell
 * and starts clean on every open.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @param characters - Everyone in the guild
 * @param prefill - Prizes to start from
 * @returns The dialog
 */
export function CreateCatRaceDialog({
  open,
  onOpenChange,
  characters,
  prefill,
}: CreateCatRaceDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <CreateCatRaceBody
        characters={characters}
        prefill={prefill}
        onDone={() => onOpenChange(false)}
      />
    </MutationDialogShell>
  );
}

interface CreateCatRaceBodyProps {
  characters: readonly Character[];
  prefill: readonly CatRacePrizeTemplate[];
  onDone: () => void;
}

/**
 * Fields and write of the create form.
 * @param characters - Everyone in the guild
 * @param prefill - Prizes to start from
 * @param onDone - Called once the event exists
 * @returns The form
 */
function CreateCatRaceBody({
  characters,
  prefill,
  onDone,
}: CreateCatRaceBodyProps) {
  const router = useRouter();
  const createRace = useCreateCatRace();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<CatRaceMode>(CatRaceMode.STANDARD);
  const [prizes, setPrizes] = useState<CatRacePrizeTemplate[]>(
    prefill.length > 0 ? [...prefill] : [EMPTY_PRIZE]
  );
  const [selection, setSelection] = useState<RosterSelection>(
    new Map(characters.map((character) => [character.id, 1]))
  );
  const members = characters.map((character) => ({
    characterId: character.id,
    name: character.name,
    guildClass: character.guildClass,
  }));

  const editPrize = (index: number, patch: Partial<CatRacePrizeTemplate>) =>
    setPrizes(prizes.map((prize, i) => (i === index ? { ...prize, ...patch } : prize)));

  return (
    <MutationForm
      title="Tạo đợt quay"
      submitLabel="Tạo đợt"
      pendingLabel="Đang tạo..."
      submitIcon={<Save />}
      fallbackError="Không tạo được đợt quay."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        const created = await createRace.mutateAsync({
          name: name.trim() === "" ? undefined : name,
          mode,
          participants: [...selection].map(([characterId, tickets]) => ({
            characterId,
            // STANDARD has no tickets; the API rejects anything but 1.
            tickets: mode === CatRaceMode.TICKET ? tickets : 1,
          })),
          prizes,
        });
        router.push(catRaceEventPath(created.id));
      }}
    >
      <div className="grid gap-2">
        <FieldLabel htmlFor="cat-race-name" icon={<Type />}>
          Tên đợt (không bắt buộc)
        </FieldLabel>
        <Input
          id="cat-race-name"
          value={name}
          maxLength={CAT_RACE_NAME_MAX}
          placeholder="Để trống: Đợt quay theo ngày"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Chế độ</span>
        <ChoiceButtons label="Chế độ" value={mode} options={MODE_OPTIONS} onChange={setMode} />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Hạng mục</span>
        {prizes.map((prize, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <Input
                aria-label={`Tên hạng mục ${index + 1}`}
                value={prize.name}
                maxLength={CAT_RACE_PRIZE_NAME_MAX}
                onChange={(event) => editPrize(index, { name: event.target.value })}
                required
              />
              <Input
                aria-label={`Số lượng hạng mục ${index + 1}`}
                type="number"
                min={1}
                max={CAT_RACE_PRIZE_QUANTITY_MAX}
                className="w-24"
                value={prize.quantity}
                onChange={(event) => editPrize(index, { quantity: Number(event.target.value) })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Xoá hạng mục ${index + 1}`}
                disabled={prizes.length === 1}
                onClick={() => setPrizes(prizes.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
            <ChoiceButtons
              label={`Bậc hạng mục ${index + 1}`}
              value={prize.tier}
              options={TIER_OPTIONS}
              onChange={(tier) => editPrize(index, { tier })}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setPrizes([...prizes, EMPTY_PRIZE])}>
          <Plus />
          Thêm hạng mục
        </Button>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Người tham gia</span>
        <RosterChecklist
          idPrefix="create-cat-race"
          members={members}
          selection={selection}
          showTickets={mode === CatRaceMode.TICKET}
          onChange={setSelection}
        />
      </div>
    </MutationForm>
  );
}
