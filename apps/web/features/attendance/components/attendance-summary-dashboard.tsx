"use client";

import { useMemo } from "react";
import type { Character } from "@guild/shared/schemas";

import { EmptyState } from "@/components/shared/empty-state";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { REVEAL_CLASS, revealStyle } from "@/lib/motion";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import {
  useAttendanceRecords,
  useCharacters,
  useHistoryWeek,
  useSessionFilter,
} from "../hooks/use-attendance";
import { maxClassSize, summarizeByClass } from "../lib/attendance-summary";
import { AttendanceSummaryCard } from "./attendance-summary-card";

/** Grid of the week's days, the same one the member card uses. */
const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Placeholder cards while loading — as many as a week usually has sessions. */
const SKELETON_CARDS = 3;

/** Stable stand-in while the roster has not loaded, so the memos below do not rerun. */
const EMPTY_ROSTER: Character[] = [];

/**
 * Per-class attendance for every battle day of the selected week: one card per day, seven horizontal
 * bars per card.
 *
 * It counts the whole guild and follows only the page-wide pickers above it, the week and the
 * battle day. The filters on people - search, class, answer - narrow the history table instead and
 * sit in its header: the chart answers "how many of the guild are coming, by class", and a name, a
 * class or an answer filtered out of that would empty the very comparison the card is for.
 * @returns The dashboard grid, or the loading/error/empty branch
 */
export function AttendanceSummaryDashboard() {
  const { weekStart } = useHistoryWeek();
  const { data: records } = useAttendanceRecords(weekStart);
  const { sessions, selectedSession } = useSessionFilter(weekStart);
  const { data: roster } = useCharacters();
  const state = useAttendanceBoard(weekStart);

  const characters = roster ?? EMPTY_ROSTER;

  const shownSessions = useMemo(
    () => (selectedSession ? [selectedSession] : sessions),
    [selectedSession, sessions]
  );

  const summaries = useMemo(
    () =>
      shownSessions.map((session) =>
        summarizeByClass(characters, records ?? {}, session.id)
      ),
    [shownSessions, characters, records]
  );

  const domainMax = useMemo(() => maxClassSize(summaries), [summaries]);

  return (
    <QueryBoundary
      state={state}
      skeleton={
        <div className={GRID}>
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      }
    >
      {shownSessions.length === 0 || characters.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              message={
                shownSessions.length === 0
                  ? "Tuần này chưa có ngày đánh nào."
                  : "Bang chưa có thành viên nào."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className={GRID}>
          {shownSessions.map((session, index) => (
            // A one-cell grid, so the card still stretches to the row's height like a direct grid
            // item would.
            <div
              key={session.id}
              className={`grid ${REVEAL_CLASS}`}
              style={revealStyle(index)}
            >
              <AttendanceSummaryCard
                session={session}
                rows={summaries[index]}
                domainMax={domainMax}
              />
            </div>
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
