"use client";

import { Swords } from "lucide-react";

import { MATCH_COUNT_MAX, MATCH_COUNT_MIN } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Every allowed match count, built from the shared bounds so the two cannot drift. */
const OPTIONS = Array.from(
  { length: MATCH_COUNT_MAX - MATCH_COUNT_MIN + 1 },
  (_, index) => MATCH_COUNT_MIN + index
);

interface MatchCountFieldProps {
  /** Match count currently chosen */
  value: number;
  /** Whether this is the Guild War, whose count the system owns */
  isGuildWar: boolean;
  /** Called with the newly chosen count */
  onChange: (value: number) => void;
}

/**
 * How many matches the day is played over. A Select rather than a number input: with two options
 * the list states the whole range, so nobody has to read an error message to learn it.
 * @param value - Match count currently chosen
 * @param isGuildWar - Whether this is the Guild War, whose count the system owns
 * @param onChange - Called with the newly chosen count
 * @returns The match count field, or the read-only line for a Guild War
 */
export function MatchCountField({
  value,
  isGuildWar,
  onChange,
}: MatchCountFieldProps) {
  if (isGuildWar) {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel icon={<Swords />}>Số trận</FieldLabel>
        <p className="text-sm text-muted-foreground">
          {value} trận — hệ thống tự tính theo tuần, không sửa được.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor="session-match-count" icon={<Swords />}>
        Số trận
      </FieldLabel>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id="session-match-count" aria-label="Số trận">
          {/* The trigger says "2 trận", not a bare "2" — the unit belongs with the number. */}
          <SelectValue>{(current: string) => `${current} trận`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((count) => (
            <SelectItem key={count} value={String(count)}>
              {count} trận
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
