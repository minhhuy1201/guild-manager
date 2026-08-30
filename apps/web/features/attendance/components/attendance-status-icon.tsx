"use client";

import { Swords, X } from "lucide-react";
import { attendanceLabel } from "@guild/shared/enums";

import { StatusIcon } from "@/components/shared/status-icon";

interface AttendanceStatusIconProps {
  /** The recorded answer */
  isPresent: boolean;
  /** Extra classes (e.g. to change the size), merged after the defaults. */
  className?: string;
}

/**
 * A recorded answer, read-only: emerald swords for "Có", destructive cross for "Không".
 * The marks are the ones the answer buttons carry, so the grid, the history table and the member
 * card all say the same thing the same way.
 * @param isPresent - The recorded answer
 * @param className - Extra classes, merged after the defaults
 * @returns The coloured status icon with its screen reader label
 */
export function AttendanceStatusIcon({
  isPresent,
  className,
}: AttendanceStatusIconProps) {
  return (
    <StatusIcon
      tone={isPresent ? "success" : "danger"}
      icon={isPresent ? Swords : X}
      label={attendanceLabel(isPresent)}
      className={className}
    />
  );
}
