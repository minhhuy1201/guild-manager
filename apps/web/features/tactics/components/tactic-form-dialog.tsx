"use client";

import { useState } from "react";
import { FileText, Save, Swords } from "lucide-react";
import { TACTIC_LIMITS, type TacticSummary } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTactic,
  useUpdateTactic,
} from "../hooks/use-tactic-mutations";

interface TacticFormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Tactic being renamed; null means creating a new one */
  tactic: TacticSummary | null;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
}

/**
 * The create/rename tactic form. The body keeps its own field state, so it lives in a child of
 * `MutationDialogShell` and remounts clean on every open.
 * @param open - Whether the dialog is open
 * @param tactic - Tactic being renamed; null means creating
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The dialog
 */
export function TacticFormDialog({
  open,
  tactic,
  onOpenChange,
}: TacticFormDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <TacticFormBody tactic={tactic} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface TacticFormBodyProps {
  /** Tactic being renamed; null means creating */
  tactic: TacticSummary | null;
  /** Called once the write resolved */
  onDone: () => void;
}

/**
 * Fields and write of the tactic form.
 * @param tactic - Tactic being renamed; null means creating
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function TacticFormBody({ tactic, onDone }: TacticFormBodyProps) {
  const [name, setName] = useState(tactic?.name ?? "");
  const [description, setDescription] = useState(tactic?.description ?? "");
  const createTactic = useCreateTactic();
  const updateTactic = useUpdateTactic();

  return (
    <MutationForm
      title={tactic ? "Sửa chiến thuật" : "Tạo chiến thuật"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu..."
      submitIcon={<Save />}
      fallbackError="Không lưu được chiến thuật."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        const trimmed = description.trim();

        if (tactic) {
          await updateTactic.mutateAsync({
            id: tactic.id,
            name,
            description: trimmed === "" ? null : trimmed,
          });
          return;
        }

        await createTactic.mutateAsync({
          name,
          description: trimmed === "" ? undefined : trimmed,
        });
      }}
    >
      <div className="grid gap-2">
        <FieldLabel htmlFor="tactic-name" icon={<Swords />}>
          Tên chiến thuật
        </FieldLabel>
        <Input
          id="tactic-name"
          value={name}
          maxLength={TACTIC_LIMITS.tacticNameLength}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor="tactic-description" icon={<FileText />}>
          Mô tả
        </FieldLabel>
        <Textarea
          id="tactic-description"
          value={description}
          maxLength={TACTIC_LIMITS.tacticDescriptionLength}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </MutationForm>
  );
}
