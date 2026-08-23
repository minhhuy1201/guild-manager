"use client";

import { Trash2 } from "lucide-react";

import { MutationDialog, type MutationDialogProps } from "./mutation-dialog";

type ConfirmDeleteDialogProps = Omit<
  MutationDialogProps,
  "submitIcon" | "variant" | "showCancel"
>;

/**
 * A delete confirmation: the write protocol with the three things every
 * delete dialog would otherwise repeat — a destructive button, the bin icon,
 * and a cancel button beside it, because a destructive dialog deserves a way
 * out that is not the corner X.
 * @param props - Everything MutationDialog takes but the three fixed props
 * @returns Delete confirmation dialog
 */
export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  return (
    <MutationDialog
      {...props}
      variant="destructive"
      submitIcon={<Trash2 />}
      showCancel
    />
  );
}
