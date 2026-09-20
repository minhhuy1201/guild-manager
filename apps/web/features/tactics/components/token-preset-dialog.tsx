"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  TACTIC_TOKEN_ICONS,
  type TacticTokenIcon,
} from "@guild/shared/enums";
import { TACTIC_LIMITS } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateTokenPreset,
  useDeleteTokenPreset,
  useTokenPresets,
} from "../hooks/use-token-presets";
import { tokenIcon } from "../lib/token-icon";

interface TokenPresetDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
}

/**
 * The palette's preset manager: add a named token, or drop one.
 * Dropping a preset leaves every tactic already drawn untouched — a placed token captured its label
 * and icon when it was dropped on the map.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @returns The dialog
 */
export function TokenPresetDialog({
  open,
  onOpenChange,
}: TokenPresetDialogProps) {
  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <TokenPresetBody onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface TokenPresetBodyProps {
  /** Called once the write resolved */
  onDone: () => void;
}

/**
 * Fields, preset list and writes of the preset manager.
 * @param onDone - Called once the write resolved
 * @returns The form
 */
function TokenPresetBody({ onDone }: TokenPresetBodyProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<TacticTokenIcon>("swords");
  const presets = useTokenPresets();
  const createPreset = useCreateTokenPreset();
  const deletePreset = useDeleteTokenPreset();

  return (
    <MutationForm
      title="Quân cờ tự đặt"
      submitLabel="Thêm"
      pendingLabel="Đang thêm..."
      submitIcon={<Plus />}
      fallbackError="Không thêm được quân cờ."
      onCancel={onDone}
      onDone={onDone}
      run={async () => {
        const trimmed = label.trim();

        if (!trimmed) {
          throw new Error("Tên quân cờ không được để trống.");
        }

        await createPreset.mutateAsync({ label: trimmed, icon });
        setLabel("");
      }}
    >
      <div className="grid gap-2">
        <FieldLabel htmlFor="preset-label" icon={<Plus />}>
          Tên quân cờ
        </FieldLabel>
        <Input
          id="preset-label"
          value={label}
          maxLength={TACTIC_LIMITS.tokenLabelLength}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Icon quân cờ"
        className="grid grid-cols-10 gap-1"
      >
        {TACTIC_TOKEN_ICONS.map((candidate) => {
          const Icon = tokenIcon(candidate);

          return (
            <button
              key={candidate}
              type="button"
              role="radio"
              aria-checked={candidate === icon}
              aria-label={candidate}
              className={cn(
                "flex items-center justify-center rounded-md border p-2",
                candidate === icon ? "border-foreground" : "border-transparent"
              )}
              onClick={() => setIcon(candidate)}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>

      {presets.data && presets.data.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {presets.data.map((preset) => {
            const Icon = tokenIcon(preset.icon);

            return (
              <li
                key={preset.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {preset.label}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  aria-label={`Xoá ${preset.label}`}
                  onClick={() => void deletePreset.mutateAsync(preset.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </MutationForm>
  );
}
