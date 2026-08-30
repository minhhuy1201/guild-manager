"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessageOf } from "@/lib/error-message";
import { useReportMutationPending } from "./mutation-pending";

export interface MutationFormProps {
  /** Dialog title */
  title: string;
  /** Optional line rendered between the title and the body */
  description?: ReactNode;
  /** Confirm button label while idle */
  submitLabel: string;
  /** Confirm button label while the write runs */
  pendingLabel: string;
  /** Confirm button icon while idle (Save, Trash2…) */
  submitIcon: ReactNode;
  /** Sentence shown when the thrown value carries no message of its own */
  fallbackError: string;
  /** Confirm button style */
  variant?: "default" | "destructive";
  /** Cancel handler. Omit for no cancel button — the corner X is still there. */
  onCancel?: () => void;
  /** The write. Throwing keeps the form up and shows the error. */
  run: () => Promise<unknown>;
  /** Called once, after the write resolved */
  onDone: () => void;
  /** Body: the inputs, or the delete warning */
  children?: ReactNode;
}

/**
 * The write protocol every mutation dialog follows, written once.
 *
 * Five rules live here and nowhere else: the error resets before sending, the
 * caller is told to close only on success, a failure keeps the form up with
 * the message the error carried, and the confirm button locks and swaps its
 * label while the write runs. Callers say *what* is written (`run`) and what
 * it *looks like* (`children`, the labels) — never how the protocol goes.
 *
 * It holds its own pending flag rather than taking one: `member-form-dialog`
 * has two mutations to fold into one flag, and folding is exactly what should
 * not be repeated per caller.
 * @param title - Dialog title
 * @param description - Optional line under the title
 * @param submitLabel - Confirm button label while idle
 * @param pendingLabel - Confirm button label while the write runs
 * @param submitIcon - Confirm button icon while idle
 * @param fallbackError - Sentence shown when the thrown value has no message
 * @param variant - Confirm button style
 * @param onCancel - Cancel handler; omit for no cancel button
 * @param run - The write; throwing keeps the form up
 * @param onDone - Called once the write resolved
 * @param children - Body of the dialog
 * @returns Form holding the whole write protocol
 */
export function MutationForm({
  title,
  description,
  submitLabel,
  pendingLabel,
  submitIcon,
  fallbackError,
  variant = "default",
  onCancel,
  run,
  onDone,
  children,
}: MutationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const reportPending = useReportMutationPending();

  /**
   * Run the write, then either close or show what went wrong.
   * @param event - Submit event of the form
   * @returns Promise settled once the dialog closed or the error is on screen
   */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    reportPending(true);

    try {
      await run();
    } catch (caught) {
      setError(errorMessageOf(caught, fallbackError));
      return;
    } finally {
      // Both flags drop however the write ended. The shell's copy matters most
      // on the failure path: the form stays up, and its X must work again.
      setIsPending(false);
      reportPending(false);
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {/* The title needs more air than the grid's own gap gives it, or it reads as part of the body. */}
      <DialogHeader className="mb-2">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      {description}
      {children}

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        {onCancel && (
          // Disabled while running: this button calls the caller directly, bypassing the shell's
          // close guard.
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={onCancel}
          >
            <X />
            Huỷ
          </Button>
        )}
        <Button type="submit" variant={variant} disabled={isPending}>
          {isPending ? <Spinner /> : submitIcon}
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
