"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteMatchDialog } from "./delete-match-dialog";

interface MatchTabsProps {
  /** How many matches the open day has, 1 or 2 */
  matchCount: number;
  /** Match whose sub-tab is open, 0-based */
  activeMatchIndex: number;
  /** Whether match 2 still holds someone — decides if removing needs confirming */
  secondMatchHasMembers: boolean;
  /** Whether a second match can still be added */
  canAddMatch: boolean;
  /** Switch to another match */
  onSelect: (index: number) => void;
  /** Clone match 1 into a new match 2 */
  onAdd: () => void;
  /** Drop match 2 from the day */
  onRemove: () => void;
}

/**
 * Sub-tabs for the matches of one day, plus the button that creates match 2 by
 * cloning match 1 or removes it again.
 * @param matchCount - How many matches the open day has
 * @param activeMatchIndex - Match whose sub-tab is open
 * @param secondMatchHasMembers - Whether match 2 still holds someone
 * @param canAddMatch - Whether a second match can still be added
 * @param onSelect - Switch to another match
 * @param onAdd - Clone match 1 into a new match 2
 * @param onRemove - Drop match 2 from the day
 * @returns The match sub-tab row
 */
export function MatchTabs({
  matchCount,
  activeMatchIndex,
  secondMatchHasMembers,
  canAddMatch,
  onSelect,
  onAdd,
  onRemove,
}: MatchTabsProps) {
  const [confirming, setConfirming] = useState(false);

  // Một trận duy nhất và không thêm được nữa (tuần cũ, trận đã đánh) thì hàng
  // này không nói lên điều gì — ẩn hẳn.
  if (matchCount < 2 && !canAddMatch) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs
        value={String(activeMatchIndex)}
        onValueChange={(value) => onSelect(Number(value))}
      >
        <TabsList>
          {Array.from({ length: matchCount }, (_, index) => (
            <TabsTrigger key={index} value={String(index)}>
              Trận {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {canAddMatch ? (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Tạo trận 2
        </Button>
      ) : null}

      {matchCount > 1 && activeMatchIndex === 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            secondMatchHasMembers ? setConfirming(true) : onRemove()
          }
        >
          <Trash2 className="size-4" />
          Xoá trận 2
        </Button>
      ) : null}

      <DeleteMatchDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={onRemove}
      />
    </div>
  );
}
