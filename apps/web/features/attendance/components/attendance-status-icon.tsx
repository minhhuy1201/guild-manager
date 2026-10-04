"use client";

import { Plane, Swords, X } from "lucide-react";
import { attendanceLabel } from "@guild/shared/enums";
import { assertNever } from "@guild/shared/lib";
import type { AttendanceSource } from "@guild/shared/schemas";

import { StatusIcon } from "@/components/shared/status-icon";

/** Screen reader and tooltip text of an answer implied by a leave. */
export const LEAVE_LABEL = "Không · Nghỉ phép";

interface AttendanceStatusIconProps {
  /** The recorded answer */
  isPresent: boolean;
  /** Whether somebody pressed the answer or a leave implies it */
  source: AttendanceSource;
  /** Extra classes (e.g. to change the size), merged after the defaults. */
  className?: string;
}

/**
 * A recorded answer, read-only: emerald swords for "Có", destructive cross for "Không".
 * The marks are the ones the answer buttons carry, so the grid, the history table and the member
 * card all say the same thing the same way.
 * A "Không" that comes from a leave keeps the danger tone but swaps the mark for a plane and says
 * so, because "chưa phản hồi" and "đang nghỉ" are different things to whoever reads the grid.
 * @param isPresent - The recorded answer
 * @param source - Whether the answer was pressed or implied by a leave
 * @param className - Extra classes, merged after the defaults
 * @returns The coloured status icon with its screen reader label
 */
export function AttendanceStatusIcon({
  isPresent,
  source,
  className,
}: AttendanceStatusIconProps) {
  switch (source) {
    case "leave":
      return (
        <StatusIcon
          tone="danger"
          icon={Plane}
          label={LEAVE_LABEL}
          className={className}
        />
      );

    case "answer":
      return (
        <StatusIcon
          tone={isPresent ? "success" : "danger"}
          icon={isPresent ? Swords : X}
          label={attendanceLabel(isPresent)}
          className={className}
        />
      );

    default:
      return assertNever(source);
  }
}
