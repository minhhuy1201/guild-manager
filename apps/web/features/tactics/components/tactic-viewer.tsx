"use client";

import { useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { useStageSize } from "../hooks/use-stage-size";
import { TacticCanvas } from "./tactic-canvas";

interface TacticViewerProps {
  /** Every stage of the tactic, in order */
  stages: TacticStage[];
}

/**
 * The read-only view of a tactic: one stage at a time, switched from the tabs above it.
 * This is what a member sees, and what the editor falls back to on a phone.
 * @param stages - Every stage of the tactic, in order
 * @returns The viewer
 */
export function TacticViewer({ stages }: TacticViewerProps) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const { ref, width } = useStageSize();

  const stage =
    stages.find((candidate) => candidate.id === activeStageId) ?? stages[0];

  if (!stage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {stages.length > 1 ? (
        <div
          role="tablist"
          aria-label="Giai đoạn"
          className="flex flex-wrap items-center gap-2"
        >
          {stages.map((candidate) => (
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
      ) : null}

      <div ref={ref} className="overflow-x-auto">
        <TacticCanvas stage={stage} width={width} readOnly />
      </div>
    </div>
  );
}
