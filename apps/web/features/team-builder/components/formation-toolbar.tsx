"use client";

import { RotateCcw, Save } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";

interface FormationToolbarProps {
  /** Whether the battle or the team names hold unsaved changes */
  dirty: boolean;
  /** Whether either save is in flight */
  saving: boolean;
  /** Messages from the failed saves, if any */
  errorMessages?: string[];
  /** Whether this battle still accepts edits */
  editable: boolean;
  /** Persist the current draft */
  onSave: () => void;
  /** Discard the draft, returning to the saved copy */
  onReset: () => void;
}

/**
 * Save and reset controls for the battle on screen, plus the save status.
 * A failed save leaves the draft untouched on purpose — losing the arrangement
 * is far worse than retrying.
 *
 * One button commits two independent drafts — the day's formation and the
 * global team names — so every prop here is already the union of the two. The
 * label says "Lưu" rather than naming the formation, because it does more.
 * @param dirty - Whether the battle or the team names hold unsaved changes
 * @param saving - Whether either save is in flight
 * @param errorMessages - Messages from the failed saves, if any
 * @param editable - Whether this battle still accepts edits
 * @param onSave - Persist the current draft
 * @param onReset - Discard the draft
 * @returns The toolbar row
 */
export function FormationToolbar({
  dirty,
  saving,
  errorMessages = [],
  editable,
  onSave,
  onReset,
}: FormationToolbarProps) {
  if (!editable) {
    return (
      <p className="text-sm text-muted-foreground">
        Ngày này đã đánh xong, chỉ xem lại được.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {errorMessages.map((message) => (
        <span key={message} className="text-sm text-destructive">
          {message}
        </span>
      ))}
      {dirty && errorMessages.length === 0 ? (
        <span className="text-sm text-muted-foreground">Chưa lưu</span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={!dirty || saving}
      >
        <RotateCcw />
        Đặt lại
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={!dirty || saving}
      >
        {saving ? <Spinner /> : <Save />}
        {saving ? "Đang lưu..." : "Lưu"}
      </Button>
    </div>
  );
}
