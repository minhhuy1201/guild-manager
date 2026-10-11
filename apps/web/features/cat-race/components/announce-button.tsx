"use client";

import { Send } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { toastError, toastSuccess } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { useAnnounceCatRace } from "../hooks/use-cat-race-mutations";

interface AnnounceButtonProps {
  eventId: string;
}

/**
 * "Đăng tổng kết lên Discord". The event screen hides it once the post went through.
 * @param eventId - Ended event to announce
 * @returns The button
 */
export function AnnounceButton({ eventId }: AnnounceButtonProps) {
  const announce = useAnnounceCatRace();
  const recoverSession = useSessionRecovery();

  const post = async () => {
    try {
      await announce.mutateAsync(eventId);
      toastSuccess("Đã đăng tổng kết lên Discord.");
    } catch (error) {
      if (recoverSession(error)) return;
      toastError(errorMessageOf(error, "Không đăng được lên Discord."));
    }
  };

  return (
    <Button type="button" disabled={announce.isPending} onClick={() => void post()}>
      {announce.isPending ? <Spinner size="sm" /> : <Send />}
      Đăng tổng kết lên Discord
    </Button>
  );
}
