"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import {
  useAttendanceRecords,
  useFilteredCharacters,
  useSessionFilter,
} from "../hooks/use-attendance";
import { maxClassSize, summarizeByClass } from "../lib/attendance-summary";
import { AttendanceSummaryCard } from "./attendance-summary-card";

/** The scope whose filters this dashboard follows — the History screen's. */
const SCOPE = "history";

/** Grid of the week's days, the same one the week timeline and the member card use. */
const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Placeholder cards while loading — as many as a week usually has sessions. */
const SKELETON_CARDS = 3;

/**
 * Per-class attendance for every battle day of the open week: one card per day, seven horizontal
 * bars per card.
 *
 * It follows the screen's roster search and its session picker, but deliberately not its class and
 * presence filters: those two are the chart's own axes — filtering by class would leave a single
 * bar, filtering by presence would drop the segments the card exists to compare.
 * @returns The dashboard grid, or the loading/error/empty branch
 */
export function AttendanceSummaryDashboard() {
  const { data: records } = useAttendanceRecords();
  const { sessions, selectedSession } = useSessionFilter();
  const characters = useFilteredCharacters(SCOPE);
  const state = useAttendanceBoard();

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
                  : "Không có thành viên phù hợp với bộ lọc."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className={GRID}>
          {shownSessions.map((session, index) => (
            <AttendanceSummaryCard
              key={session.id}
              session={session}
              rows={summaries[index]}
              domainMax={domainMax}
            />
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
