"use client";

import { ClipboardCopy, Send } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";

/** The copy button's name with no source day, and its short name on a phone. */
const SHORT_COPY_LABEL = "Copy đội hình";

interface FormationToolbarProps {
  /** Whether the battle or the team names hold unsaved changes */
  dirty: boolean;
  /** Whether either save is in flight */
  saving: boolean;
  /** Whether this battle still accepts edits */
  editable: boolean;
  /** Label of the day the copy button would copy from, null when there is none */
  copySourceLabel: string | null;
  /** Whether the copy button may be pressed */
  canCopy: boolean;
  /** Copy that day's line-up into the match currently open */
  onCopy: () => void;
  /** Whether the Discord announcement is in flight */
  announcing: boolean;
  /** Open the confirmation dialog for the Discord announcement */
  onAnnounce: () => void;
}

/**
 * The actions that sit above the formation: copy a line-up in, announce it on Discord. Save and
 * reset live in the screen's `UnsavedChangesBar` instead, so they stay in reach while the admin is
 * scrolled down to the member pool.
 *
 * The announcement is locked while anything is unsaved - the image sent is the saved formation -
 * and a line under the buttons says why, rather than letting the dialog open only to refuse. A line
 * and not a tooltip: a phone has no hover, and a disabled button fires no events to open one. The
 * dialog keeps its own refusal as a second guard.
 *
 * Below `sm` the two buttons share the row, and the copy button shows a short name: its full name
 * ("Copy từ <day>") nearly filled a phone's width. The full name stays its accessible name.
 * @param dirty - Whether the battle or the team names hold unsaved changes
 * @param saving - Whether either save is in flight
 * @param editable - Whether this battle still accepts edits
 * @param copySourceLabel - Label of the day the copy button would copy from
 * @param canCopy - Whether the copy button may be pressed
 * @param onCopy - Copy that day's line-up into the match currently open
 * @param announcing - Whether the Discord announcement is in flight
 * @param onAnnounce - Open the confirmation dialog for the Discord announcement
 * @returns The toolbar row
 */
export function FormationToolbar({
  dirty,
  saving,
  editable,
  copySourceLabel,
  canCopy,
  onCopy,
  announcing,
  onAnnounce,
}: FormationToolbarProps) {
  if (!editable) {
    return (
      <p className="text-sm text-muted-foreground">
        Ngày này đã đánh xong, chỉ xem lại được.
      </p>
    );
  }

  const copyLabel = copySourceLabel
    ? `Copy từ ${copySourceLabel}`
    : SHORT_COPY_LABEL;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        disabled={!canCopy || saving}
        // Only when the visible name can be the short one, so it never repeats the text.
        aria-label={copySourceLabel ? copyLabel : undefined}
        className="max-sm:flex-1"
      >
        <ClipboardCopy />
        {copySourceLabel ? (
          <>
            <span className="sm:hidden">{SHORT_COPY_LABEL}</span>
            <span className="max-sm:hidden">{copyLabel}</span>
          </>
        ) : (
          copyLabel
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAnnounce}
        disabled={dirty || saving || announcing}
        className="max-sm:flex-1"
      >
        {announcing ? <Spinner /> : <Send />}
        {announcing ? "Đang gửi..." : "Gửi Discord"}
      </Button>
      {dirty ? (
        <p className="w-full text-right text-xs text-muted-foreground">
          Lưu trước khi gửi
        </p>
      ) : null}
    </div>
  );
}
