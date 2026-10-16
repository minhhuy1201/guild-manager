"use client";

import { Timer } from "lucide-react";

import { FieldLabel } from "@/components/shared/field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RACE_DURATION_ERROR,
  RACE_DURATION_MAX_SECONDS,
  RACE_DURATION_MIN_SECONDS,
  parseRaceDuration,
} from "../lib/race-duration";

interface RaceControlsProps {
  /** What the duration field holds, valid or not */
  durationText: string;
  onDurationTextChange: (text: string) => void;
  /** The field and the buttons lock while a round runs */
  isLocked: boolean;
  /** Whether the two list buttons show */
  canEdit: boolean;
  /** Whether a prize is selected, so its list can be edited */
  hasPrize: boolean;
  entrantCount: number;
  participantCount: number;
  onEditEntrants: () => void;
  onEditParticipants: () => void;
}

/**
 * Duration field and the entrants and participants buttons, laid out to sit beside the prize chips.
 * @param durationText - What the duration field holds
 * @param onDurationTextChange - Receives the typed text
 * @param isLocked - Whether a round is running
 * @param canEdit - Whether the list buttons show
 * @param hasPrize - Whether a prize is selected
 * @param entrantCount - People in the selected prize's list
 * @param participantCount - People in the event
 * @param onEditEntrants - Opens the entrants dialog
 * @param onEditParticipants - Opens the participants dialog
 * @returns The control group
 */
export function RaceControls({
  durationText,
  onDurationTextChange,
  isLocked,
  canEdit,
  hasPrize,
  entrantCount,
  participantCount,
  onEditEntrants,
  onEditParticipants,
}: RaceControlsProps) {
  const isValid = parseRaceDuration(durationText) !== null;

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor="cat-race-duration" icon={<Timer />}>
            Thời gian đua (giây)
          </FieldLabel>
          <Input
            id="cat-race-duration"
            type="number"
            inputMode="numeric"
            min={RACE_DURATION_MIN_SECONDS}
            max={RACE_DURATION_MAX_SECONDS}
            step={1}
            className="w-20"
            value={durationText}
            // A new duration would rebuild the script and restart the replay mid-race.
            disabled={isLocked}
            aria-invalid={!isValid}
            onChange={(event) => onDurationTextChange(event.target.value)}
          />
        </div>
        {isValid ? null : <p className="text-sm text-destructive">{RACE_DURATION_ERROR}</p>}
      </div>
      {canEdit ? (
        <>
          <Button type="button" variant="outline" disabled={!hasPrize || isLocked} onClick={onEditEntrants}>
            Danh sách đua {entrantCount}
          </Button>
          <Button type="button" variant="outline" disabled={isLocked} onClick={onEditParticipants}>
            Người tham gia {participantCount}
          </Button>
        </>
      ) : null}
    </div>
  );
}
