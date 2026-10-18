"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { TeamNoticeReport } from "@guild/shared/schemas";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { useInvalidate } from "@/hooks/use-invalidate";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import {
  announceFormation,
  notifyTeamMembers,
  type AnnounceFormationArgs,
} from "../api/team-builder-api";
import {
  CaptureCountError,
  captureFormations,
  readCaptureNodes,
} from "../lib/announce-capture";

/** Shown when the browser cannot rasterise the off-screen line-up. */
const CAPTURE_FAILED = "Không chụp được ảnh đội hình.";

/**
 * Shown when the off-screen sheet does not hold the day's matches. Says to reopen rather than to
 * retry: the sheet is mounted by the dialog, so closing and opening it is what rebuilds them.
 */
const CAPTURE_INCOMPLETE =
  "Chưa chụp được đủ đội hình của ngày này. Đóng rồi mở lại rồi gửi.";

/** Shown when the announcement went out. */
const SENT = "Đã gửi thông báo vào Discord.";

/** Shown when the request failed with no message of its own. */
const SEND_FAILED = "Không gửi được thông báo vào Discord.";

/** Shown in the dialog when the session ran out before the direct messages could go. */
const NOTIFY_INTERRUPTED =
  "Phiên đăng nhập vừa hết hạn nên chưa nhắn riêng được cho thành viên.";

/** Shown when the direct messages failed as a whole, with no message of their own. */
const NOTIFY_FAILED = "Không nhắn riêng được cho thành viên.";

/**
 * How the direct messages ended, once the announcement itself has gone out. Both fields null means
 * they are still being sent.
 */
export interface TeamNoticeOutcome {
  /** What the server answered, null while sending or after a failure */
  report: TeamNoticeReport | null;
  /** Why the request failed as a whole, null otherwise */
  error: string | null;
}

/** The Discord announcement: the dialog's state and the action behind its confirm button. */
export interface FormationAnnounceState {
  /** Whether the confirmation dialog is open */
  open: boolean;
  /** Whether a capture or a request is in flight */
  sending: boolean;
  /** Whether to message each placed member after the announcement */
  notifyMembers: boolean;
  /** Set whether to message each placed member */
  setNotifyMembers: (notify: boolean) => void;
  /** Null until the announcement went out with the direct messages switched on */
  outcome: TeamNoticeOutcome | null;
  /** Open or close the confirmation dialog */
  setOpen: (open: boolean) => void;
  /** Capture the line-ups and send them */
  confirm: () => Promise<void>;
}

/**
 * Screenshot the day's line-ups and post them to Discord, which also closes that day's attendance,
 * then message each placed member when the admin left that switched on.
 *
 * The capture and the request are caught separately: they fail for unrelated reasons, and one
 * message covering both would tell the admin nothing about which half to retry.
 *
 * @param sessionId - Battle day on screen, null when there is none
 * @param matchCount - How many matches that day holds — one image is captured per match
 * @param blocked - Whether unsaved changes refuse the send
 * @returns The dialog's state and its confirm action
 */
export function useFormationAnnounce(
  sessionId: string | null,
  matchCount: number,
  blocked: boolean
): FormationAnnounceState {
  const [open, setOpen] = useState(false);
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [outcome, setOutcome] = useState<TeamNoticeOutcome | null>(null);
  const [capturing, setCapturing] = useState(false);
  const recoverSession = useSessionRecovery();
  // The send closes the day's attendance on the server, so the cached sessions and records go stale
  // the moment it answers — without this the attendance screen keeps offering its answer buttons for
  // a day the server has just closed, until something else happens to refetch.
  const invalidate = useInvalidate("attendance-window");
  const mutation = useMutation({
    mutationFn: (input: AnnounceFormationArgs) => announceFormation(input),
    onSuccess: invalidate,
  });
  // Wrapped: a bare Server Action would also receive the mutation context TanStack passes second.
  const notifyMutation = useMutation({
    mutationFn: (id: string) => notifyTeamMembers(id),
  });

  /**
   * Open or close the dialog. Opening starts from a clean slate: the switch back on and the last
   * send's result gone, so a second visit never shows the first one's report.
   * @param next - Whether the dialog should be open
   */
  function changeOpen(next: boolean): void {
    if (next) {
      setNotifyMembers(true);
      setOutcome(null);
    }

    setOpen(next);
  }

  /**
   * Capture the off-screen sheet, send it, then message the members when that is switched on.
   * @returns A promise resolving once the outcome has been shown in a toast or in the dialog
   */
  async function confirm(): Promise<void> {
    if (!sessionId || blocked) return;

    let images: string[];

    setCapturing(true);
    try {
      images = await captureFormations(readCaptureNodes(matchCount));
    } catch (error) {
      // Swallowed on purpose: snapDOM's own error names a DOM node, and the count error a pair of
      // numbers — neither tells an admin what to do about it.
      toastError(
        error instanceof CaptureCountError ? CAPTURE_INCOMPLETE : CAPTURE_FAILED
      );
      return;
    } finally {
      setCapturing(false);
    }

    try {
      await mutation.mutateAsync({ sessionId, images });
    } catch (error) {
      toastError(error instanceof Error ? error.message : SEND_FAILED);
      return;
    }

    toastSuccess(SENT);

    if (!notifyMembers) {
      setOpen(false);
      return;
    }

    // The announcement is already in the channel, so a failure from here on must not read as one
    // that undoes it: it stays in the dialog, beside the success the admin just saw.
    setOutcome({ report: null, error: null });
    try {
      setOutcome({
        report: await notifyMutation.mutateAsync(sessionId),
        error: null,
      });
    } catch (error) {
      // Recovery runs for its side effects (refresh and its toast); the dialog still has to leave
      // the "sending" state, or it would wait for a report that is never coming.
      const recovered = recoverSession(error);

      setOutcome({
        report: null,
        error: recovered
          ? NOTIFY_INTERRUPTED
          : error instanceof Error
            ? error.message
            : NOTIFY_FAILED,
      });
    }
  }

  return {
    open,
    sending: capturing || mutation.isPending || notifyMutation.isPending,
    notifyMembers,
    setNotifyMembers,
    outcome,
    setOpen: changeOpen,
    confirm,
  };
}
