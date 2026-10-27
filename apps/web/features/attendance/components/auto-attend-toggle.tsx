"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";

import { FieldLabel } from "@/components/shared/field-label";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { cn } from "@/lib/utils";
import { useAutoAttend, useSetAutoAttend } from "../hooks/use-auto-attend";
import { AutoAttendConfirmDialog } from "./auto-attend-confirm-dialog";

const SWITCH_ID = "auto-attend-switch";

/** Shown when turning it off fails with something that carries no message of its own. */
const FALLBACK_ERROR = "Không tắt được tự động điểm danh, thử lại giúp mình.";

/**
 * The switch for the member's own Auto-attend. Turning it on opens a confirmation first, because it
 * commits them to every future battle; turning it off acts at once.
 *
 * Shows a skeleton while the state loads and nothing when it cannot be read, which is what a
 * rescue admin with no character gets: there is no standing answer to switch.
 * @returns The switch with its dialog, a skeleton, or nothing
 */
export function AutoAttendToggle() {
  const { data: status, isPending } = useAutoAttend();
  const setAutoAttend = useSetAutoAttend();
  const recoverSession = useSessionRecovery();
  const [isConfirming, setIsConfirming] = useState(false);

  if (isPending) return <Skeleton className="h-10 w-60 rounded-inner" />;
  if (!status) return null;

  /**
   * Turn on after the dialog confirmed, turn off straight away.
   * @param next - The state the member asked for
   */
  async function handleChange(next: boolean) {
    if (next) {
      setIsConfirming(true);
      return;
    }

    try {
      await setAutoAttend.mutateAsync(false);
      toastSuccess("Đã tắt tự động điểm danh.");
    } catch (error) {
      if (recoverSession(error)) return;
      toastError(errorMessageOf(error, FALLBACK_ERROR));
    }
  }

  return (
    <>
      <div
        data-enabled={status.enabled}
        className={cn(
          "flex h-10 items-center gap-3 rounded-inner border bg-card px-3",
          "transition-colors duration-[var(--duration-fast)]",
          status.enabled ? "border-emerald-500 bg-emerald-500/5" : "border-input"
        )}
      >
        <FieldLabel htmlFor={SWITCH_ID} icon={<Repeat />} className="flex-1">
          Tự động điểm danh
        </FieldLabel>
        <Switch
          id={SWITCH_ID}
          checked={status.enabled}
          disabled={setAutoAttend.isPending}
          onCheckedChange={handleChange}
          className="data-checked:bg-emerald-600"
        />
      </div>
      <AutoAttendConfirmDialog open={isConfirming} onOpenChange={setIsConfirming} />
    </>
  );
}
