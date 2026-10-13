"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { GuildClass } from "@guild/shared/enums";
import {
  CAT_RACE_TICKETS_MAX,
  CAT_RACE_TICKETS_MIN,
} from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchesRosterFilter } from "@/lib/roster-filter";

/** One person the checklist can tick. */
export interface RosterMember {
  characterId: string;
  name: string;
  guildClass: GuildClass;
  /** Short sentence printed beside the name, e.g. "đã trúng" */
  note?: string;
}

/** Ticked people and, in TICKET mode, how many tickets each holds. */
export type RosterSelection = ReadonlyMap<string, number>;

interface RosterChecklistProps {
  members: readonly RosterMember[];
  selection: RosterSelection;
  /** Show a 1-3 ticket picker on every ticked row */
  showTickets: boolean;
  onChange: (next: RosterSelection) => void;
  /** Prefix of the search input id, unique per dialog */
  idPrefix: string;
}

const TICKET_CHOICES = Array.from(
  { length: CAT_RACE_TICKETS_MAX - CAT_RACE_TICKETS_MIN + 1 },
  (_, index) => CAT_RACE_TICKETS_MIN + index
);

/**
 * A searchable list of people to tick, with a ticket picker on ticked rows in TICKET mode. One
 * piece for the create form, the participants dialog and the entrants dialog.
 * @param members - Everyone that can be ticked
 * @param selection - Ticked ids with their tickets
 * @param showTickets - Whether to show the ticket picker
 * @param onChange - Receives the new selection
 * @param idPrefix - Prefix of the search input id
 * @returns The checklist
 */
export function RosterChecklist({
  members,
  selection,
  showTickets,
  onChange,
  idPrefix,
}: RosterChecklistProps) {
  const [search, setSearch] = useState("");
  const visible = members.filter((member) =>
    matchesRosterFilter(member, { search, guildClasses: [] })
  );

  const toggle = (characterId: string) => {
    const next = new Map(selection);
    if (next.has(characterId)) next.delete(characterId);
    else next.set(characterId, CAT_RACE_TICKETS_MIN);
    onChange(next);
  };
  const setTickets = (characterId: string, tickets: number) =>
    onChange(new Map(selection).set(characterId, tickets));
  const setAll = (ticked: boolean) =>
    onChange(
      new Map(
        ticked
          ? visible.map((member) => [
              member.characterId,
              selection.get(member.characterId) ?? CAT_RACE_TICKETS_MIN,
            ])
          : [...selection].filter(
              ([id]) => !visible.some((member) => member.characterId === id)
            )
      )
    );

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${idPrefix}-search`}
          aria-label="Tìm theo tên"
          placeholder="Tìm theo tên"
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Đã chọn {selection.size}/{members.length}
        </span>
        <span className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
            Chọn tất cả
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
            Bỏ chọn
          </Button>
        </span>
      </div>
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {visible.map((member) => {
          const tickets = selection.get(member.characterId);

          return (
            <li
              key={member.characterId}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-primary"
                  checked={tickets !== undefined}
                  onChange={() => toggle(member.characterId)}
                />
                <GuildClassIcon guildClass={member.guildClass} />
                <span className="truncate">{member.name}</span>
                {member.note ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {member.note}
                  </span>
                ) : null}
              </label>
              {showTickets && tickets !== undefined ? (
                <span className="flex shrink-0 gap-1" role="group" aria-label={`Số vé của ${member.name}`}>
                  {TICKET_CHOICES.map((choice) => (
                    <Button
                      key={choice}
                      type="button"
                      size="icon-sm"
                      variant={choice === tickets ? "default" : "outline"}
                      aria-pressed={choice === tickets}
                      onClick={() => setTickets(member.characterId, choice)}
                    >
                      {choice}
                    </Button>
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
