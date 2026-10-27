"use client";

import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";

import { ErrorNotice } from "@/components/shared/error-notice";
import { FieldLabel } from "@/components/shared/field-label";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { ApiError } from "@/lib/api-client";
import { errorMessageOf } from "@/lib/error-message";
import { cn } from "@/lib/utils";
import { useAutoAttend, useSetAutoAttend } from "../hooks/use-auto-attend";
import { AutoAttendConfirmDialog } from "./auto-attend-confirm-dialog";

const SWITCH_ID = "auto-attend-switch";

/** What the API answers an account with no character (a rescue admin): nothing to switch. */
const NO_CHARACTER = 404;

/** Shown when turning it off fails with something that carries no message of its own. */
const FALLBACK_ERROR = "Không tắt được tự động điểm danh, thử lại giúp mình.";

/** Shown when the state cannot be read for a reason other than having no character. */
const LOAD_ERROR = "Không tải được trạng thái tự động điểm danh.";

/**
 * The switch for the member's own Auto-attend. Turning it on opens a confirmation first, because it
 * commits them to every future battle; turning it off acts at once.
 *
 * Shows a skeleton while the state loads. An account with no character (a rescue admin) gets
 * nothing: there is no standing answer to switch. Any other failure to read it is said out loud, so
 * a member whose switch went missing can tell it is not meant to be that way.
 * @returns The switch with its dialog, a skeleton, an error line, or nothing
 */
export function AutoAttendToggle() {
  const { data: status, error, isPending } = useAutoAttend();
  const setAutoAttend = useSetAutoAttend();
  const recoverSession = useSessionRecovery();
  const [isConfirming, setIsConfirming] = useState(false);

  // A 401 is the session running out, not the state being unreadable: hand it to the recovery,
  // which renews the pair through the proxy so the next read works.
  useEffect(() => {
    if (error) recoverSession(error);
  }, [error, recoverSession]);

  if (error) {
    if (error instanceof ApiError && error.statusCode === NO_CHARACTER) return null;

    return <ErrorNotice message={errorMessageOf(error, LOAD_ERROR)} />;
  }
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
