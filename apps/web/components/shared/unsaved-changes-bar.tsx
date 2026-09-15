"use client";

import { RotateCcw, Save, Undo2 } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";

/** An undo the bar offers beside its reset, for a screen that keeps undo steps. */
export interface UndoAction {
  /** Take back the latest edit */
  onUndo: () => void;
  /** Whether there is an edit to take back */
  canUndo: boolean;
}

interface UnsavedChangesBarProps {
  /** What is waiting to be saved, e.g. "3 thay đổi chưa lưu" */
  message: string;
  /** Label of the button that throws the draft away */
  resetLabel: string;
  /** Whether the save is in flight */
  saving: boolean;
  /** Messages from the failed saves, shown in place of `message` */
  errorMessages?: string[];
  /** Persist the draft */
  onSave: () => void;
  /** Throw the draft away */
  onReset: () => void;
  /** The screen's undo, when it keeps undo steps - Ctrl+Z's twin for a phone, which has no keyboard */
  undo?: UndoAction;
}

/**
 * The bar holding a screen's Save button while a draft is open, pinned to the bottom of the
 * viewport so the button stays in reach wherever the page is scrolled. The caller renders it only
 * while there is something to save.
 *
 * `sticky`, not `fixed`: it sits at the end of the screen's column, so the last row of content is
 * never hidden behind it, and unlike a transform it creates no containing block for the
 * `position: fixed` elements of the screen (the team builder's drag overlay and capture sheet).
 * @param message - What is waiting to be saved
 * @param resetLabel - Label of the discard button
 * @param saving - Whether the save is in flight
 * @param errorMessages - Messages from the failed saves
 * @param onSave - Persist the draft
 * @param onReset - Throw the draft away
 * @param undo - The screen's undo, if it has one
 * @returns The bar
 */
export function UnsavedChangesBar({
  message,
  resetLabel,
  saving,
  errorMessages = [],
  onSave,
  onReset,
  undo,
}: UnsavedChangesBarProps) {
  return (
    // `--app-bottom-inset` lifts it above the phone's tab bar; it is 0 wherever that bar is absent.
    <div className="sticky bottom-[calc(var(--app-bottom-inset)_+_--spacing(4))] z-20 flex animate-reveal flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 shadow-md">
      <div className="flex min-w-0 flex-col text-sm" aria-live="polite">
        {errorMessages.length > 0 ? (
          errorMessages.map((error) => (
            <span key={error} className="text-destructive">
              {error}
            </span>
          ))
        ) : (
          <span className="font-medium">{message}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={saving}
        >
          <RotateCcw />
          {resetLabel}
        </Button>
        {undo ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undo.onUndo}
            disabled={saving || !undo.canUndo}
          >
            <Undo2 />
            Hoàn tác
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Spinner /> : <Save />}
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
