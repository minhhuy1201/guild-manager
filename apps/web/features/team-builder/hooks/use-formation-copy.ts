"use client";

import { useMemo } from "react";
import type { FormationWeek, SessionFormation } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { copyMatch } from "../lib/copy-match";
import { findCopySource, type CopyCandidate } from "../lib/copy-source";
import { FORMATION } from "../lib/mock-formation";
import { findPreviousWeekStart } from "../lib/week-status";
import { fromWireMatches } from "../lib/wire";
import type { MatchDraft } from "../types/formation";
import { useFormations } from "./use-formations";

/** Stable stand-in while the previous week is unread, so memos do not rerun. */
const NO_SESSIONS: SessionFormation[] = [];

/** The copy button's branch: where it would copy from, and the action itself. */
export interface FormationCopyState {
  /** Label of the day the button would copy from, null when there is nothing to copy */
  sourceLabel: string | null;
  /** Whether the button may be pressed */
  canCopy: boolean;
  /** Copy the source into the open match; a no-op when there is no source */
  copy: () => void;
}

/**
 * Turn the days of a week into copy candidates.
 * @param sessions - Battles of that week, ordered by battle time
 * @param matchesBySession - Matches shown for a day, falling back to the saved copy
 * @returns One candidate per battle, in the same order
 */
function toCandidates(
  sessions: SessionFormation[],
  matchesBySession: Record<string, MatchDraft[]> = {}
): CopyCandidate[] {
  return sessions.map((session) => ({
    sessionId: session.sessionId,
    label: session.label,
    matches:
      matchesBySession[session.sessionId] ??
      fromWireMatches(session.matches, FORMATION.slots),
  }));
}

/**
 * Copying a line-up onto the open battle. The source is picked automatically —
 * the nearest earlier day holding one, reaching back into the previous week for
 * the first battle of a new week. That previous week is fetched ONLY when the
 * week on screen offers no source of its own, so an ordinary day costs no extra
 * request.
 *
 * Like the prefill, this hook proposes and `useFormationDraft` writes: the copy
 * leaves through `copyIntoActiveMatch` rather than touching the store.
 * @param sessions - Battles of the week on screen, ordered by battle time
 * @param activeSessionId - Battle whose tab is open, null when there is none
 * @param editable - Whether the open battle still accepts edits
 * @param weeks - Weeks that still hold formation data, newest first
 * @param weekStart - Monday of the week on screen
 * @param matchesBySession - Matches shown for each day: the draft, or the saved copy
 * @param presentIds - Ids of characters attending the open battle
 * @param copyIntoActiveMatch - Draft handler that overwrites the open match
 * @returns The source's label, whether copying is possible, and the action
 */
export function useFormationCopy(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  editable: boolean,
  weeks: FormationWeek[],
  weekStart: string,
  matchesBySession: Record<string, MatchDraft[]>,
  presentIds: Set<string>,
  copyIntoActiveMatch: (match: MatchDraft) => void
): FormationCopyState {
  const weekCandidates = useMemo(
    () => toCandidates(sessions, matchesBySession),
    [sessions, matchesBySession]
  );

  // Asked twice on purpose: this first answer decides whether the previous week
  // is worth a request at all.
  const inWeekSource = activeSessionId
    ? findCopySource(weekCandidates, activeSessionId, [])
    : null;

  const previousWeekStart = weekStart
    ? findPreviousWeekStart(weeks, weekStart)
    : null;
  const needsPreviousWeek = Boolean(
    editable && activeSessionId && !inWeekSource && previousWeekStart
  );

  const previousQuery = useFormations(
    previousWeekStart ?? undefined,
    needsPreviousWeek
  );
  // A parked query shares its cache entry with the open week when there is no
  // previous week to key on, so its data only counts once it was asked for.
  const previousSessions = previousWeekStart
    ? (previousQuery.data ?? NO_SESSIONS)
    : NO_SESSIONS;

  // Another week is never on screen, so it never has a draft: switching weeks
  // clears them.
  const previousCandidates = useMemo(
    () => toCandidates(previousSessions),
    [previousSessions]
  );

  const source = activeSessionId
    ? findCopySource(weekCandidates, activeSessionId, previousCandidates)
    : null;

  /** Copy the source line-up into the open match and say what it did. */
  function copy() {
    if (!source || !editable) return;

    const copied = copyMatch(source.match, presentIds, FORMATION.slots);
    copyIntoActiveMatch({ assignment: copied.assignment, notes: copied.notes });

    const dropped =
      copied.droppedCount > 0
        ? ` · bỏ ${copied.droppedCount} người không đánh trận này`
        : "";
    toastSuccess(`Đã copy từ ${source.label}${dropped}. Chưa lưu.`);
  }

  return {
    sourceLabel: source?.label ?? null,
    canCopy: Boolean(editable && source),
    copy,
  };
}
