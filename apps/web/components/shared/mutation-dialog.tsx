"use client";

import { useState, type ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MutationForm, type MutationFormProps } from "./mutation-form";
import { MutationPendingContext } from "./mutation-pending";

interface MutationDialogShellProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
  /** Body — mounted only while open */
  children: ReactNode;
}

/**
 * The dialog around a write.
 *
 * Two rules live here. A close requested while the write is in flight is
 * ignored, so a mutation cannot land in a dialog that is gone. And the body
 * mounts only while open, so the fields and the error of the previous visit
 * die with it — which is why a caller can keep its form state in a child and
 * still get a clean form every time.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @param children - Body, mounted only while open
 * @returns Dialog shell holding the two dialog-level rules
 */
export function MutationDialogShell({
  open,
  onOpenChange,
  children,
}: MutationDialogShellProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <MutationPendingContext.Provider value={setIsPending}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isPending) return;
          onOpenChange(next);
        }}
      >
        <DialogContent>{open && children}</DialogContent>
      </Dialog>
    </MutationPendingContext.Provider>
  );
}

export interface MutationDialogProps
  extends Omit<MutationFormProps, "onDone" | "onCancel"> {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog wants to open or close */
  onOpenChange: (open: boolean) => void;
  /** Render a "Huỷ" button beside the confirm one */
  showCancel?: boolean;
}

/**
 * A dialog whose whole job is one write: the shell plus the protocol.
 *
 * Use this when the body has no state of its own. A dialog whose body holds
 * state that must reset per visit builds the two halves itself —
 * `MutationDialogShell` outside, `MutationForm` in a child — so the child
 * remounts on every open.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the dialog wants to open or close
 * @param showCancel - Render a "Huỷ" button beside the confirm one
 * @param form - Everything MutationForm needs except onDone and onCancel
 * @returns Dialog wired to the write protocol
 */
export function MutationDialog({
  open,
  onOpenChange,
  showCancel = false,
  ...form
}: MutationDialogProps) {
  const close = () => onOpenChange(false);

  return (
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <MutationForm
        {...form}
        onDone={close}
        onCancel={showCancel ? close : undefined}
      />
    </MutationDialogShell>
  );
}
