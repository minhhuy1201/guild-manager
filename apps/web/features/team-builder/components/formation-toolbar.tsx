"use client";

import { LoaderCircle, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FormationToolbarProps {
  /** Whether this battle holds unsaved changes */
  dirty: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Message from a failed save, if any */
  errorMessage?: string;
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
 * @param dirty - Whether this battle holds unsaved changes
 * @param saving - Whether a save is in flight
 * @param errorMessage - Message from a failed save, if any
 * @param editable - Whether this battle still accepts edits
 * @param onSave - Persist the current draft
 * @param onReset - Discard the draft
 * @returns The toolbar row
 */
export function FormationToolbar({
  dirty,
  saving,
  errorMessage,
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
      {errorMessage ? (
        <span className="text-sm text-destructive">{errorMessage}</span>
      ) : null}
      {dirty && !errorMessage ? (
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
        {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
        {saving ? "Đang lưu..." : "Lưu đội hình cả ngày"}
      </Button>
    </div>
  );
}
