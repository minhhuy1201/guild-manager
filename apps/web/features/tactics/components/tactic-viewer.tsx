"use client";

import { useState } from "react";
import type { TacticDetail } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { useStageSize } from "../hooks/use-stage-size";
import { TacticCanvas } from "./tactic-canvas";

interface TacticViewerProps {
  /** The tactic being read */
  tactic: TacticDetail;
}

/**
 * The read-only view of a tactic: one stage at a time, switched from the tabs above it.
 * This is what a member sees, and what the editor shows on a phone.
 * @param tactic - The tactic being read
 * @returns The viewer
 */
export function TacticViewer({ tactic }: TacticViewerProps) {
  const [activeStageId, setActiveStageId] = useState(
    tactic.scene.stages[0]?.id ?? null
  );
  const { ref, width } = useStageSize();

  const stage =
    tactic.scene.stages.find((candidate) => candidate.id === activeStageId) ??
    tactic.scene.stages[0];

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Giai đoạn"
        className="flex flex-wrap items-center gap-2"
      >
        {tactic.scene.stages.map((candidate) => (
          <Button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={candidate.id === stage.id}
            size="sm"
            variant={candidate.id === stage.id ? "default" : "ghost"}
            onClick={() => setActiveStageId(candidate.id)}
          >
            {candidate.name}
          </Button>
        ))}
      </div>

      <div ref={ref} className="overflow-x-auto">
        <TacticCanvas stage={stage} width={width} readOnly />
      </div>
    </div>
  );
}
