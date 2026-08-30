"use client";

import { CalendarDays, FilterX } from "lucide-react";

import { ClearableSelectTrigger } from "@/components/shared/clearable-select-trigger";
import { FilterAllIcon } from "@/components/shared/filter-all-icon";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { isRosterFilterActive } from "@/lib/roster-filter";
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
  const resetFilters = useAttendanceFilterStore((s) => s.resetHistoryFilters);
  const { sessions, selectedSession, setSessionId } = useSessionFilter();

  // `selectedSession`, not the raw `sessionId`: a stored id whose session was deleted shows as
  // "Tất cả ngày đánh" and filters nothing, so there is nothing for the button to clear either.
  const isFiltered =
    isRosterFilterActive(filter) ||
    presence !== "all" ||
    selectedSession !== null;

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
              <ClearableSelectTrigger
                id={`${SCOPE}-session`}
                isActive={selectedSession !== null}
                clearLabel="Xoá lọc ngày đánh"
                onClear={() => setSessionId(null)}
              >
                <SelectValue>
                  <SessionOption
                    label={selectedSession?.label ?? null}
                    allLabel="Tất cả ngày đánh"
                  />
                </SelectValue>
              </ClearableSelectTrigger>
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
              <ClearableSelectTrigger
                id={`${SCOPE}-presence`}
                isActive={presence !== "all"}
                clearLabel="Xoá lọc trạng thái"
                onClear={() => setPresence("all")}
              >
                <SelectValue>
                  <PresenceOption option={presence} />
                </SelectValue>
              </ClearableSelectTrigger>
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

        {/*
          Always rendered and disabled when nothing is set, the way `formation-toolbar` holds its
          "Đặt lại": a button that appears and disappears makes the card change height every time
          the first filter is typed.
        */}
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!isFiltered}
          >
            <FilterX />
            Xoá bộ lọc
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
