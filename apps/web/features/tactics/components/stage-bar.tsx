"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { TACTIC_LIMITS, type TacticStage } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StageBarProps {
  /** Every stage of the tactic, in order */
  stages: TacticStage[];
  /** Stage whose tab is open */
  activeStageId: string | null;
  /** Whether the viewer may write */
  isAdmin: boolean;
  onSelect: (stageId: string) => void;
  onAdd: () => void;
  onDuplicate: (stageId: string) => void;
  onRename: (stageId: string, name: string) => void;
  onRemove: (stageId: string) => void;
}

/**
 * The stage strip: one tab per stage, plus add, duplicate, rename and delete for an admin.
 * Renaming happens in place — double-click a tab's name.
 * @param props - The stages and the callbacks that change them
 * @returns The stage strip
 */
export function StageBar({
  stages,
  activeStageId,
  isAdmin,
  onSelect,
  onAdd,
  onDuplicate,
  onRename,
  onRemove,
}: StageBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const atLimit = stages.length >= TACTIC_LIMITS.stagesPerTactic;

  return (
    <div
      role="tablist"
      aria-label="Giai đoạn"
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2"
    >
      {stages.map((stage) =>
        renamingId === stage.id ? (
          <Input
            key={stage.id}
            autoFocus
            defaultValue={stage.name}
            maxLength={TACTIC_LIMITS.stageNameLength}
            className="h-8 w-40"
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
          <Button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={stage.id === activeStageId}
            size="sm"
            variant={stage.id === activeStageId ? "default" : "ghost"}
            className={cn(stage.id === activeStageId && "font-medium")}
            onClick={() => onSelect(stage.id)}
            onDoubleClick={() => {
              if (isAdmin) setRenamingId(stage.id);
            }}
          >
            {stage.name}
          </Button>
        )
      )}

      {isAdmin ? (
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
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
            size="sm"
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
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={stages.length <= 1 || !activeStageId}
            onClick={() => {
              if (activeStageId) onRemove(activeStageId);
            }}
          >
            <Trash2 />
            Xoá giai đoạn
          </Button>
        </div>
      ) : null}
    </div>
  );
}
