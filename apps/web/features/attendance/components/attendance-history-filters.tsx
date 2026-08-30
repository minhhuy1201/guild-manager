"use client";

import { CalendarDays } from "lucide-react";

import { FilterAllIcon } from "@/components/shared/filter-all-icon";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionFilter } from "../hooks/use-attendance";
import {
  PRESENCE_FILTER_LABEL,
  PRESENCE_FILTER_OPTIONS,
  type AttendancePresenceFilter,
} from "../lib/presence-filter";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";
import { AttendanceStatusIcon } from "./attendance-status-icon";

/** The scope this bar owns; the History screen is the only caller. */
const SCOPE = "history";

/** Sentinel value of the "Tất cả" session row. Not a session id — never stored. */
const ALL_SESSIONS = "all";

/** Badge size in the select — smaller than the table's, matching the shared "Tất cả" icon. */
const OPTION_ICON = "size-5";

interface PresenceOptionProps {
  /** The option being rendered, in the trigger or in the list. */
  option: AttendancePresenceFilter;
}

/**
 * One presence option: its mark plus its label.
 * "Có" and "Không" carry the very marks the table's status column shows, so the filter and the rows
 * read as the same thing; "Tất cả" is not an answer and gets the shared neutral funnel instead.
 * @param option - The option being rendered
 * @returns The icon and label pair
 */
function PresenceOption({ option }: PresenceOptionProps) {
  return (
    <span className="flex items-center gap-2">
      {option === "all" ? (
        <FilterAllIcon />
      ) : (
        <AttendanceStatusIcon
          isPresent={option === "present"}
          className={OPTION_ICON}
        />
      )}
      {PRESENCE_FILTER_LABEL[option]}
    </span>
  );
}

interface SessionOptionProps {
  /** Label of the session, or null for the "Tất cả" row. */
  label: string | null;
  /** Text of the "Tất cả" row; the trigger spells out what is unfiltered. */
  allLabel?: string;
}

/**
 * One session option: a calendar mark plus the session label, or the neutral funnel for "Tất cả".
 * @param label - Session label, null for the "Tất cả" row
 * @param allLabel - Text of the "Tất cả" row
 * @returns The icon and label pair
 */
function SessionOption({ label, allLabel = "Tất cả" }: SessionOptionProps) {
  return (
    <span className="flex items-center gap-2">
      {label === null ? (
        <FilterAllIcon />
      ) : (
        <CalendarDays className={`${OPTION_ICON} text-muted-foreground`} />
      )}
      {label ?? allLabel}
    </span>
  );
}

/**
 * The History screen's filter bar: the shared roster filter plus a presence and a session picker.
 * Those two live here rather than in `RosterFilterBar` because only this screen lists recorded
 * answers — the Attendance grid already shows every session and both answers at once.
 * @returns The filter card
 */
export function AttendanceHistoryFilters() {
  const filter = useAttendanceFilterStore((s) => s.filters[SCOPE]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);
  const presence = useAttendanceFilterStore((s) => s.presence);
  const setPresence = useAttendanceFilterStore((s) => s.setPresence);
  const { sessions, selectedSession, setSessionId } = useSessionFilter();

  return (
    <Card>
      <CardContent>
        {/*
          Four equal columns: the roster filter spans two of them and splits that span in two with
          the same gap, so all four controls end up exactly the same width.
        */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RosterFilterBar
            idPrefix={SCOPE}
            value={filter}
            onChange={(next) => setFilter(SCOPE, next)}
            className="sm:col-span-2"
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${SCOPE}-session`}>Ngày đánh</Label>
            <Select
              value={selectedSession?.id ?? ALL_SESSIONS}
              onValueChange={(next) =>
                setSessionId(next === ALL_SESSIONS ? null : next)
              }
            >
              <SelectTrigger id={`${SCOPE}-session`} className="w-full">
                <SelectValue>
                  <SessionOption
                    label={selectedSession?.label ?? null}
                    allLabel="Tất cả ngày đánh"
                  />
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={ALL_SESSIONS}>
                  <SessionOption label={null} />
                </SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    <SessionOption label={session.label} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${SCOPE}-presence`}>Trạng thái</Label>
            <Select
              value={presence}
              onValueChange={(next) =>
                setPresence(next as AttendancePresenceFilter)
              }
            >
              <SelectTrigger id={`${SCOPE}-presence`} className="w-full">
                <SelectValue>
                  <PresenceOption option={presence} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PRESENCE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <PresenceOption option={option} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
