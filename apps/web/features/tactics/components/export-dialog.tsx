"use client";

import { FileArchive, Image as ImageIcon } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Whether an export is running */
  exporting: boolean;
  /** How many stages the tactic holds, shown on the zip option */
  stageCount: number;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
  /** Save the stage on screen as one PNG */
  onExportActive: () => void;
  /** Save every stage as PNGs inside one zip */
  onExportAll: () => void;
}

/**
 * The two ways a tactic leaves the app as pictures: the open stage, or all of them in a zip.
 * Both are admin-only; the button that opens this dialog is not rendered for a member.
 * @param props - The dialog state and the two export actions
 * @returns The dialog
 */
export function ExportDialog({
  open,
  exporting,
  stageCount,
  onOpenChange,
  onExportActive,
  onExportAll,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="mb-2">
          <DialogTitle>Xuất ảnh</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={onExportActive}
          >
            <ImageIcon />
            Giai đoạn đang mở (PNG)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={onExportAll}
          >
            {exporting ? <Spinner /> : <FileArchive />}
            {exporting
              ? "Đang xuất..."
              : `Tất cả ${stageCount} giai đoạn (ZIP)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
