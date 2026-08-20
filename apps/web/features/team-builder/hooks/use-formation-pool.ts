"use client";

import { useEffect, useMemo } from "react";
import type { Character, SessionFormation } from "@shared/schemas";

import { FORMATION } from "../lib/mock-formation";
import { selectPoolCharacters } from "../lib/pool";
import { buildPrefill, type PrefillResult } from "../lib/prefill";
import {
  presentCharacterIds,
  selectPresentCharacters,
  type AttendanceRecordLike,
} from "../lib/session-pool";
import { useFormationStore } from "../store/formation-store";
import { usePoolFilterStore } from "../store/pool-filter-store";
import type { Assignment, MatchDraft } from "../types/formation";

/** Who can still be placed into the open match, and what the banner proposes. */
export interface FormationPoolState {
  /** Characters still available to place, already filtered */
  pool: Character[];
  /** Every character of the roster, by id — for rendering a placed card */
  charactersById: Map<string, Character>;
  /** Placed members who have since said they are not coming */
  absentIds: Set<string>;
  /** Members placed in the other match of the same day */
  otherMatchIds: Set<string>;
  /** Line-up proposed for a day that has none yet, null when nothing was filled */
  prefill: PrefillResult | null;
}

/**
 * Everything about "who can go into this match": the pool itself, the people
 * already placed elsewhere, and the proposal that fills an untouched day.
 * The pool is never stored — it recomputes on render, so it cannot drift out of
 * step with the assignment it is derived from.
 * @param sessions - Battles of the week, ordered by battle time
 * @param activeSessionId - Battle whose tab is open, null when there is none
 * @param editable - Whether the open battle still accepts edits
 * @param characters - Full guild roster from the server
 * @param records - Attendance records of the open week
 * @param assignment - Assignment currently shown for the open match
 * @param matches - Every match of the open day
 * @param activeMatchIndex - Which of those matches is open
 * @returns The filtered pool plus the marks the cards need
 */
export function useFormationPool(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  editable: boolean,
  characters: Character[],
  records: AttendanceRecordLike[],
  assignment: Assignment,
  matches: MatchDraft[],
  activeMatchIndex: number
): FormationPoolState {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const drafts = useFormationStore((state) => state.drafts);
  const setDraft = useFormationStore((state) => state.setDraft);

  const presentIds = useMemo(
    () =>
      activeSessionId
        ? presentCharacterIds(records, activeSessionId)
        : new Set<string>(),
    [records, activeSessionId]
  );

  const pool = useMemo(() => {
    const present = selectPresentCharacters(characters, presentIds);

    return selectPoolCharacters(present, assignment, { search, guildClasses });
  }, [characters, presentIds, assignment, search, guildClasses]);

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );

  // Placed members who have since said they are not coming.
  const absentIds = useMemo(() => {
    const absent = new Set<string>();

    for (const characterId of Object.values(assignment)) {
      if (characterId && !presentIds.has(characterId)) absent.add(characterId);
    }

    return absent;
  }, [assignment, presentIds]);

  // Who is placed in the other match, so their pool card can say so.
  const otherMatchIds = useMemo(() => {
    const ids = new Set<string>();

    matches.forEach((match, index) => {
      if (index === activeMatchIndex) return;
      for (const characterId of Object.values(match.assignment)) {
        if (characterId) ids.add(characterId);
      }
    });

    return ids;
  }, [matches, activeMatchIndex]);

  const activeSession = sessions.find(
    (session) => session.sessionId === activeSessionId
  );
  const hasSaved = Boolean(
    activeSession &&
      activeSession.matches.some(
        (match) =>
          Object.keys(match.slots).length > 0 ||
          Object.keys(match.notes).length > 0
      )
  );
  const hasDraft = Boolean(activeSessionId && drafts[activeSessionId]);

  // Fill an untouched battle with the previous battle's line-up, as a draft.
  // Self-limiting: clearing the proposal leaves an empty draft that still
  // exists, so nothing refills it.
  const prefill = useMemo(() => {
    if (!activeSessionId || !editable || hasSaved || hasDraft) return null;

    return buildPrefill(
      sessions,
      activeSessionId,
      presentIds,
      FORMATION.slots
    );
  }, [sessions, activeSessionId, presentIds, editable, hasSaved, hasDraft]);

  useEffect(() => {
    if (!activeSessionId || !prefill) return;
    // A fresh day starts with one match; match 2 is an explicit button press.
    setDraft(activeSessionId, [
      { assignment: prefill.assignment, notes: prefill.notes },
    ]);
  }, [activeSessionId, prefill, setDraft]);

  return { pool, charactersById, absentIds, otherMatchIds, prefill };
}
