"use client";

import { useState } from "react";
import { RefreshCw, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessageOf } from "@/lib/error-message";

interface SaveConflictDialogProps {
  /** Label of the open day, named in the list when its formation conflicts */
  formationLabel: string;
  /** The open day's formation was saved by someone else first */
  isFormationStale: boolean;
  /** The team names were saved by someone else first */
  isTeamNamesStale: boolean;
  /** Throw the stale drafts away and load what is saved */
  onReload: () => void;
  /** Save the drafts over what is saved; rejects when the latest version cannot be read */
  onOverwrite: () => Promise<void>;
  /** Close without choosing - the drafts stay */
  onClose: () => void;
}

/** Shown when overwriting fails before the save even runs. */
const FALLBACK_ERROR = "Không ghi đè được, thử lại sau.";

/**
 * Tells the admin that someone saved first, and lets them reload, overwrite or close.
 * Open exactly while a part is stale: it has no open flag of its own, so the screen cannot show it
 * for a conflict that no longer exists. Overwriting is the one choice that can lose someone's work,
 * hence the destructive button; it locks the dialog while the write runs, so neither a second click
 * nor a close lands in the middle of it.
 * @param formationLabel - Label of the open day
 * @param isFormationStale - The open day's formation conflicts
 * @param isTeamNamesStale - The team names conflict
 * @param onReload - Discard the drafts and reload
 * @param onOverwrite - Save the drafts over what is saved
 * @param onClose - Close, keeping the drafts
 * @returns The conflict dialog
 */
export function SaveConflictDialog({
  formationLabel,
  isFormationStale,
  isTeamNamesStale,
  onReload,
  onOverwrite,
  onClose,
}: SaveConflictDialogProps) {
  const [isOverwriting, setIsOverwriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Run the overwrite, keeping the dialog up with the reason when it cannot start. */
  async function overwrite() {
    setError(null);
    setIsOverwriting(true);
    try {
      await onOverwrite();
    } catch (cause) {
      setError(errorMessageOf(cause, FALLBACK_ERROR));
    } finally {
      setIsOverwriting(false);
    }
  }

  return (
    <Dialog
      open={isFormationStale || isTeamNamesStale}
      onOpenChange={(next) => {
        if (!next && !isOverwriting) onClose();
      }}
    >
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Có người vừa lưu trước bạn</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>Những phần sau đã được lưu ở nơi khác:</p>
            <ul className="list-disc pl-5">
              {isFormationStale ? <li>Đội hình {formationLabel}</li> : null}
              {isTeamNamesStale ? <li>Tên đội</li> : null}
            </ul>
            <p>
              Tải bản mới nhất sẽ bỏ phần bạn đang sửa. Ghi đè sẽ thay bản vừa
              được lưu bằng phần bạn đang sửa.
            </p>
            {isFormationStale ? (
              <p>Người đã báo vắng có thể bị đặt lại vào đội hình.</p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={isOverwriting} onClick={onClose}>
              <X />
              Đóng
            </Button>
            <Button
              variant="outline"
              disabled={isOverwriting}
              onClick={onReload}
            >
              <RefreshCw />
              Tải bản mới nhất
            </Button>
            <Button
              variant="destructive"
              disabled={isOverwriting}
              onClick={overwrite}
            >
              <TriangleAlert />
              Vẫn ghi đè
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
