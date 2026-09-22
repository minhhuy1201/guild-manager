"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { TACTIC_LIMITS, type TacticStage } from "@guild/shared/schemas";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStageArrows } from "../hooks/use-stage-arrows";
import { StageArrowHint } from "./stage-arrow-hint";
import { StageTab } from "./stage-tab";

interface StageBarProps {
  /** Every stage of the tactic, in order */
  stages: TacticStage[];
  /** Stage whose tab is open */
  activeStageId: string | null;
  /** Whether the viewer may write */
  isAdmin: boolean;
  /** The play and onion-skin buttons, built by the screen so this strip stays about stages */
  playbackControls?: React.ReactNode;
  onSelect: (stageId: string) => void;
  onAdd: () => void;
  onDuplicate: (stageId: string) => void;
  onRename: (stageId: string, name: string) => void;
  onRemove: (stageId: string) => void;
}

/**
 * The stage strip: one tab per stage, plus add, duplicate, rename and delete for an admin.
 *
 * A tab is a clock face — the first stage wears one o'clock, the second two — so twenty stages
 * stay one short row above the map instead of a wall of names. The name itself is the tooltip and
 * the tab's accessible name; renaming still happens in place, on a double-click.
 * @param props - The stages and the callbacks that change them
 * @returns The stage strip
 */
export function StageBar({
  stages,
  activeStageId,
  isAdmin,
  playbackControls,
  onSelect,
  onAdd,
  onDuplicate,
  onRename,
  onRemove,
}: StageBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TacticStage | null>(null);
  const atLimit = stages.length >= TACTIC_LIMITS.stagesPerTactic;

  const tablistRef = useStageArrows(stages, activeStageId, onSelect);

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label="Giai đoạn"
      className="flex flex-wrap items-center gap-1 rounded-lg border bg-card px-2 py-1"
    >
      {stages.map((stage, index) =>
        renamingId === stage.id ? (
          <Input
            key={stage.id}
            autoFocus
            defaultValue={stage.name}
            maxLength={TACTIC_LIMITS.stageNameLength}
            className="h-7 w-36"
            aria-label="Tên giai đoạn"
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name) onRename(stage.id, name);
              setRenamingId(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setRenamingId(null);
            }}
          />
        ) : (
          <StageTab
            key={stage.id}
            stage={stage}
            position={index + 1}
            active={stage.id === activeStageId}
            onSelect={() => onSelect(stage.id)}
            onRename={() => {
              if (isAdmin) setRenamingId(stage.id);
            }}
          />
        )
      )}

      <StageArrowHint stageCount={stages.length} />

      {playbackControls}

      {isAdmin ? (
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={atLimit}
            title={
              atLimit
                ? "Một chiến thuật tối đa 20 giai đoạn."
                : "Thêm giai đoạn"
            }
            onClick={onAdd}
          >
            <Plus />
            Thêm giai đoạn
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={atLimit || !activeStageId}
            onClick={() => {
              if (activeStageId) onDuplicate(activeStageId);
            }}
          >
            <Copy />
            Nhân bản
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="text-destructive"
            disabled={stages.length <= 1 || !activeStageId}
            onClick={() => {
              setRemoving(
                stages.find((stage) => stage.id === activeStageId) ?? null
              );
            }}
          >
            <Trash2 />
            Xoá giai đoạn
          </Button>
        </div>
      ) : null}

      {/* Stage operations skip the undo stack, so this dialog is the one chance to take a delete
          back. */}
      <ConfirmDeleteDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        // The shell does not mount the body while closed, so the empty branch never renders; it
        // exists because `title` is a required string while `removing` is nullable.
        title={removing ? `Xoá ${removing.name}?` : ""}
        description="Mọi phần tử trên giai đoạn này mất theo, và không hoàn tác được."
        submitLabel="Xoá"
        pendingLabel="Đang xoá…"
        fallbackError="Không xoá được giai đoạn này."
        run={async () => {
          if (removing) onRemove(removing.id);
        }}
      />
    </div>
  );
}
