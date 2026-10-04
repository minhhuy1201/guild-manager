"use client";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { ApiError } from "@/lib/api-client";
import { useCancelLeave } from "./use-leaves";

/** Shown when the cancel fails with something other than an `ApiError`. */
const FALLBACK_ERROR = "Không hủy được lần nghỉ, thử lại giúp mình.";

/** What a cancel button needs: the action, and which leave is being cancelled right now. */
export interface CancelLeaveAction {
  /** Cancel one leave and report the outcome in a toast; never rejects */
  cancel: (id: string) => Promise<void>;
  /** Whether the leave with this id is the one being cancelled */
  isCancelling: (id: string) => boolean;
}

/**
 * Cancelling a leave from a button, shared by the member's banner and the admin's table so both
 * report the same way and lock the same button while it runs.
 * @returns The cancel action and a per-leave pending check
 */
export function useCancelLeaveWithToast(): CancelLeaveAction {
  const { mutateAsync, isPending, variables } = useCancelLeave();

  return {
    cancel: async (id) => {
      try {
        await mutateAsync(id);
        toastSuccess("Đã hủy lần nghỉ.");
      } catch (error) {
        toastError(error instanceof ApiError ? error.message : FALLBACK_ERROR);
      }
    },
    isCancelling: (id) => isPending && variables === id,
  };
}
