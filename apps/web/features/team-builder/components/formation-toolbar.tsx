"use client";

import { ClipboardCopy, Send } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * and says why on hover, rather than letting the dialog open only to refuse. The dialog keeps its
 * own refusal as a second guard.
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

  const announceButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAnnounce}
      disabled={dirty || saving || announcing}
    >
      {announcing ? <Spinner /> : <Send />}
      {announcing ? "Đang gửi..." : "Gửi Discord"}
    </Button>
  );

  return (
    // Wraps on a phone: the copy button names its source day and is wider than the screen there.
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        disabled={!canCopy || saving}
      >
        <ClipboardCopy />
        {copySourceLabel ? `Copy từ ${copySourceLabel}` : "Copy đội hình"}
      </Button>
      {dirty ? (
        <Tooltip>
          {/* A disabled button fires no pointer events, so the span carries the hover. */}
          <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
            {announceButton}
          </TooltipTrigger>
          <TooltipContent>Lưu trước khi gửi</TooltipContent>
        </Tooltip>
      ) : (
        announceButton
      )}
    </div>
  );
}
