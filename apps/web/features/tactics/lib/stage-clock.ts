import {
  Clock,
  Clock1,
  Clock2,
  Clock3,
  Clock4,
  Clock5,
  Clock6,
  Clock7,
  Clock8,
  Clock9,
  Clock10,
  Clock11,
  Clock12,
  type LucideIcon,
} from "lucide-react";

/**
 * A clock face per hour, so a stage tab reads as "the first hour", "the second hour", and the
 * strip reads as a timeline rather than as a row of identical buttons.
 *
 * A table a tab reads out of, rather than a function returning one: a component picked by a call
 * during render is a component the React compiler has to assume was built there.
 */
export const STAGE_CLOCK_FACES: readonly LucideIcon[] = [
  Clock1,
  Clock2,
  Clock3,
  Clock4,
  Clock5,
  Clock6,
  Clock7,
  Clock8,
  Clock9,
  Clock10,
  Clock11,
  Clock12,
];

/** The face a stage past the twelfth falls back to; the number beside it tells those apart. */
export const PLAIN_CLOCK_FACE = Clock;
