"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  CAT_RACE_MODE_LABEL,
  CatRaceMode,
  PrizeTier,
} from "@guild/shared/enums";
import {
  CAT_RACE_TICKETS_MAX,
  type Character,
  type CatRacePrizeTemplate,
} from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { catRaceEventPath } from "@/config/routes";
import { useCreateCatRace } from "../hooks/use-cat-race-mutations";
import { ChoiceButtons } from "./choice-buttons";
import {
  CreateRaceStepIndicator,
  type CreateRaceStep,
} from "./create-race-step-indicator";
import { CreateRacePrizesStep } from "./create-race-prizes-step";
import { StepSlide, type StepDirection } from "./step-slide";
import { RosterChecklist, type RosterSelection } from "./roster-checklist";

const MODE_OPTIONS = Object.values(CatRaceMode).map((value) => ({
  value,
  label: CAT_RACE_MODE_LABEL[value],
}));
const MODE_HINT: Record<CatRaceMode, string> = {
  [CatRaceMode.STANDARD]: "Mỗi người 1 con mèo, cơ hội như nhau.",
  [CatRaceMode.TICKET]: `Mỗi vé là 1 con mèo, mỗi người tối đa ${CAT_RACE_TICKETS_MAX} vé.`,
};
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
    <MutationDialogShell open={open} onOpenChange={onOpenChange} className="sm:max-w-3xl">
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
  const [step, setStep] = useState<CreateRaceStep>("prizes");
  // Null until the first move, so opening the dialog does not slide the first step in.
  const [direction, setDirection] = useState<StepDirection | null>(null);
  const goTo = (next: CreateRaceStep) => {
    setDirection(next === "roster" ? "forward" : "back");
    setStep(next);
  };
  const members = characters.map((character) => ({
    characterId: character.id,
    name: character.name,
    guildClass: character.guildClass,
  }));

  const editPrize = (index: number, patch: Partial<CatRacePrizeTemplate>) =>
    setPrizes(prizes.map((prize, i) => (i === index ? { ...prize, ...patch } : prize)));

  if (step === "prizes") {
    return (
      <StepSlide key={step} direction={direction}>
        <CreateRacePrizesStep
          name={name}
          prizes={prizes}
          onNameChange={setName}
          onEditPrize={editPrize}
          onAddPrize={() => setPrizes([...prizes, EMPTY_PRIZE])}
          onRemovePrize={(index) => setPrizes(prizes.filter((_, i) => i !== index))}
          onCancel={onDone}
          onNext={() => goTo("roster")}
        />
      </StepSlide>
    );
  }

  return (
    <StepSlide key={step} direction={direction}>
      <MutationForm
        title="Tạo đợt quay"
        description={<CreateRaceStepIndicator current="roster" />}
        submitLabel="Tạo đợt"
        pendingLabel="Đang tạo..."
        submitIcon={<Save />}
        fallbackError="Không tạo được đợt quay."
        cancelLabel="Quay lại"
        cancelIcon={<ArrowLeft />}
        onCancel={() => goTo("prizes")}
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
          <span className="text-sm font-medium">Chế độ</span>
          <ChoiceButtons label="Chế độ" value={mode} options={MODE_OPTIONS} onChange={setMode} />
          <p className="text-sm text-muted-foreground">{MODE_HINT[mode]}</p>
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
    </StepSlide>
  );
}
