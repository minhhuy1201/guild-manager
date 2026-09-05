"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { announceFormation } from "../api/team-builder-api";
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

/** The Discord announcement: the dialog's state and the action behind its confirm button. */
export interface FormationAnnounceState {
  /** Whether the confirmation dialog is open */
  open: boolean;
  /** Whether a capture or a request is in flight */
  sending: boolean;
  /** Open or close the confirmation dialog */
  setOpen: (open: boolean) => void;
  /** Capture the line-ups and send them */
  confirm: () => Promise<void>;
}

/**
 * Screenshot the day's line-ups and post them to Discord.
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
  const [capturing, setCapturing] = useState(false);
  const mutation = useMutation({ mutationFn: announceFormation });

  /**
   * Capture the off-screen sheet, then send it.
   * @returns A promise resolving once the outcome has been shown in a toast
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
      toastSuccess(SENT);
      setOpen(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : SEND_FAILED);
    }
  }

  return {
    open,
    sending: capturing || mutation.isPending,
    setOpen,
    confirm,
  };
}
