"use client";

import { useMemo, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

import {
  useAttendanceRecords,
  useCharacters,
  type Character,
} from "@/features/attendance";
import { ApiError } from "@/lib/api-client";
import { isMemberDragData, toDragSource, toDropTarget } from "../lib/dnd-data";
import { isDirty } from "../lib/formation-diff";
import { createMockFormation } from "../lib/mock-formation";
import { presentCharacterIds } from "../lib/session-pool";
import { isSessionEditable } from "../lib/session-status";
import { fromWire, toWire } from "../lib/wire";
import { useFormationStore } from "../store/formation-store";
import type { Assignment } from "../types/formation";
import { useFormationWeeks } from "./use-formation-weeks";
import { useFormations } from "./use-formations";
import { usePrefill } from "./use-prefill";
import { useSaveFormation } from "./use-save-formation";
import { useSessionPool } from "./use-session-pool";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

/** HTTP status the backend returns when a battle is already locked. */
const CONFLICT_STATUS = 409;

/** Stable stand-in while no battle is selected, so memos do not rerun. */
const EMPTY_ASSIGNMENT: Assignment = {};

/**
 * Everything the formation screen needs, assembled in one place so the
 * component stays a JSX tree. Merges the saved formations from TanStack Query
 * with the per-battle drafts held in Zustand.
 * @returns Screen state plus the handlers it binds to
 */
export function useFormationScreen() {
  const weeksQuery = useFormationWeeks();
  const selectedWeekStart = useFormationStore((s) => s.selectedWeekStart);
  const setWeek = useFormationStore((s) => s.setWeek);

  const currentWeekStart = weeksQuery.data?.[0]?.weekStart ?? null;
  const weekStart = selectedWeekStart ?? currentWeekStart ?? undefined;
  const isCurrentWeek =
    !selectedWeekStart || selectedWeekStart === currentWeekStart;

  const formationsQuery = useFormations(weekStart);
  const charactersQuery = useCharacters();
  const recordsQuery = useAttendanceRecords();
  const saveMutation = useSaveFormation();

  const drafts = useFormationStore((s) => s.drafts);
  const setActiveSession = useFormationStore((s) => s.setActiveSession);
  const clearDraft = useFormationStore((s) => s.clearDraft);
  const setDraft = useFormationStore((s) => s.setDraft);
  const drop = useFormationStore((s) => s.drop);
  const storedActiveId = useFormationStore((s) => s.activeSessionId);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  const sessions = useMemo(
    () => formationsQuery.data ?? [],
    [formationsQuery.data]
  );
  const characters = useMemo(
    () => charactersQuery.data ?? [],
    [charactersQuery.data]
  );
  // useAttendanceRecords keys its records by characterId__sessionId; the pure
  // helpers here work on a flat list.
  const records = useMemo(
    () => Object.values(recordsQuery.data ?? {}),
    [recordsQuery.data]
  );

  // Default to the Guild War tab: it is the battle that matters most.
  const activeSessionId =
    storedActiveId ??
    sessions.find((session) => session.isGuildWar)?.sessionId ??
    sessions[0]?.sessionId ??
    null;

  const savedBySession = useMemo(() => {
    const map: Record<string, Assignment> = {};

    for (const session of sessions) {
      map[session.sessionId] = fromWire(session.assignment, FORMATION.slots);
    }

    return map;
  }, [sessions]);

  const assignments = useMemo(() => {
    const map: Record<string, Assignment> = {};

    for (const session of sessions) {
      map[session.sessionId] =
        drafts[session.sessionId] ?? savedBySession[session.sessionId];
    }

    return map;
  }, [sessions, drafts, savedBySession]);

  const dirtySessionIds = useMemo(() => {
    const dirty = new Set<string>();

    for (const session of sessions) {
      if (
        isDirty(drafts[session.sessionId], savedBySession[session.sessionId])
      ) {
        dirty.add(session.sessionId);
      }
    }

    return dirty;
  }, [sessions, drafts, savedBySession]);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);
  const editable = activeSession
    ? isSessionEditable(activeSession, isCurrentWeek)
    : false;

  const presentIds = useMemo(
    () =>
      activeSessionId
        ? presentCharacterIds(records, activeSessionId)
        : new Set<string>(),
    [records, activeSessionId]
  );

  const assignment = useMemo(
    () =>
      (activeSessionId ? assignments[activeSessionId] : null) ??
      EMPTY_ASSIGNMENT,
    [activeSessionId, assignments]
  );

  const prefill = usePrefill(
    sessions,
    activeSessionId,
    presentIds,
    FORMATION.slots,
    editable
  );

  const pool = useSessionPool(
    characters,
    records,
    activeSessionId ?? "",
    assignment
  );

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

  /**
   * Remember which character is moving so DragOverlay can preview it.
   * @param event - dnd-kit drag start event
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (!isMemberDragData(data)) return;
    setActiveCharacter(charactersById.get(data.characterId) ?? null);
  }

  /**
   * Hand the finished gesture to the store as a draft edit.
   * @param event - dnd-kit drag end event
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null);

    const dragData = event.active.data.current;
    if (!isMemberDragData(dragData) || !activeSessionId) return;

    drop(
      activeSessionId,
      assignment,
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
  }

  /**
   * Persist the open battle's draft.
   * A failed save keeps the draft: the toolbar shows the message and the user
   * can retry. A 409 means the battle just crossed its start time, so refetch
   * to flip the screen into read-only.
   */
  async function handleSave() {
    if (!activeSessionId) return;

    try {
      await saveMutation.mutateAsync({
        sessionId: activeSessionId,
        assignment: toWire(assignment),
      });
      clearDraft(activeSessionId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === CONFLICT_STATUS) {
        void formationsQuery.refetch();
      }
    }
  }

  return {
    weeks: weeksQuery.data ?? [],
    weekStart: weekStart ?? "",
    isCurrentWeek,
    sessions,
    activeSessionId,
    assignments,
    assignment,
    dirtySessionIds,
    dirty: activeSessionId ? dirtySessionIds.has(activeSessionId) : false,
    editable,
    pool,
    charactersById,
    absentIds,
    prefill,
    activeCharacter,
    slotCount: FORMATION.slots.length,
    isPending:
      weeksQuery.isPending ||
      formationsQuery.isPending ||
      charactersQuery.isPending,
    isError:
      weeksQuery.isError || formationsQuery.isError || charactersQuery.isError,
    errorMessage:
      formationsQuery.error?.message ?? "Không tải được dữ liệu đội hình.",
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError
        ? saveMutation.error.message
        : undefined,
    refetch: () => {
      void weeksQuery.refetch();
      void formationsQuery.refetch();
    },
    setWeek,
    setActiveSession,
    clearActiveDraft: () => {
      if (!activeSessionId) return;
      setDraft(activeSessionId, fromWire({}, FORMATION.slots));
    },
    resetActive: () => {
      if (!activeSessionId) return;
      clearDraft(activeSessionId);
    },
    handleDragStart,
    handleDragEnd,
    cancelDrag: () => setActiveCharacter(null),
    handleSave,
  };
}
