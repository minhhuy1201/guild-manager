"use client";

import { useEffect, useMemo } from "react";

import { buildPrefill, type PrefillResult } from "../lib/prefill";
import { useFormationStore } from "../store/formation-store";
import type { Slot } from "../types/formation";
import type { SessionFormation } from "../types/session-formation";

/**
 * Fill an untouched battle with the previous battle's line-up, as a draft.
 * Runs only when the battle has no saved formation AND no draft yet, which
 * makes it self-limiting: clearing the proposal leaves an empty draft that
 * still exists, so nothing refills it.
 * @param sessions - Every battle of the week, ordered by battle time
 * @param activeSessionId - Battle whose tab is open, null while loading
 * @param presentIds - Ids of characters attending the active battle
 * @param slots - Slots of the current layout
 * @param editable - Whether this battle still accepts edits
 * @returns The proposal shown in the banner, or null when nothing was filled
 */
export function usePrefill(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  presentIds: Set<string>,
  slots: Slot[],
  editable: boolean
): PrefillResult | null {
  const drafts = useFormationStore((state) => state.drafts);
  const setDraft = useFormationStore((state) => state.setDraft);

  const active = sessions.find(
    (session) => session.sessionId === activeSessionId
  );
  const hasSaved = Boolean(
    active && active.matches.some((match) => Object.keys(match).length > 0)
  );
  const hasDraft = Boolean(activeSessionId && drafts[activeSessionId]);

  const proposal = useMemo(() => {
    if (!activeSessionId || !editable || hasSaved || hasDraft) return null;

    return buildPrefill(sessions, activeSessionId, presentIds, slots);
  }, [
    sessions,
    activeSessionId,
    presentIds,
    slots,
    editable,
    hasSaved,
    hasDraft,
  ]);

  useEffect(() => {
    if (!activeSessionId || !proposal) return;
    // Ngày mới bắt đầu với một trận; muốn trận 2 thì bấm nút "Tạo trận 2".
    setDraft(activeSessionId, [proposal.assignment]);
  }, [activeSessionId, proposal, setDraft]);

  return proposal;
}
