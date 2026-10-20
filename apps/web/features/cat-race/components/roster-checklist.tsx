"use client";

import { useState } from "react";
import { FilterX } from "lucide-react";
import type { GuildClass } from "@guild/shared/enums";
import {
  CAT_RACE_TICKETS_MAX,
  CAT_RACE_TICKETS_MIN,
} from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import {
  isRosterFilterActive,
  matchesRosterFilter,
  type RosterFilter,
} from "@/lib/roster-filter";

const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

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
  /** Prefix of the filter input ids, unique per dialog */
  idPrefix: string;
}

const TICKET_CHOICES = Array.from(
  { length: CAT_RACE_TICKETS_MAX - CAT_RACE_TICKETS_MIN + 1 },
  (_, index) => CAT_RACE_TICKETS_MIN + index
);

/**
 * A list of people to tick, filterable by name and guild class, with a ticket picker on ticked
 * rows in TICKET mode. One piece for the create form, the participants dialog and the entrants
 * dialog.
 * @param members - Everyone that can be ticked
 * @param selection - Ticked ids with their tickets
 * @param showTickets - Whether to show the ticket picker
 * @param onChange - Receives the new selection
 * @param idPrefix - Prefix of the filter input ids
 * @returns The checklist
 */
export function RosterChecklist({
  members,
  selection,
  showTickets,
  onChange,
  idPrefix,
}: RosterChecklistProps) {
  const [filter, setFilter] = useState<RosterFilter>(EMPTY_FILTER);
  const visible = members.filter((member) => matchesRosterFilter(member, filter));

  const toggle = (characterId: string) => {
    const next = new Map(selection);
    if (next.has(characterId)) next.delete(characterId);
    else next.set(characterId, CAT_RACE_TICKETS_MIN);
    onChange(next);
  };
  const setTickets = (characterId: string, tickets: number) =>
    onChange(new Map(selection).set(characterId, tickets));
  const visibleTicked = visible.filter((member) => selection.has(member.characterId));
  const isAllTicked = visible.length > 0 && visibleTicked.length === visible.length;
  const isSomeTicked = visibleTicked.length > 0 && !isAllTicked;
  // Ticking keeps the tickets already set and everyone the filter hides; unticking drops only the
  // people the filter shows.
  const toggleAll = () =>
    onChange(
      isAllTicked
        ? new Map(
            [...selection].filter(
              ([id]) => !visible.some((member) => member.characterId === id)
            )
          )
        : new Map([
            ...selection,
            ...visible.map(
              (member): [string, number] => [
                member.characterId,
                selection.get(member.characterId) ?? CAT_RACE_TICKETS_MIN,
              ]
            ),
          ])
    );

  return (
    <div className="grid gap-2">
      <RosterFilterBar idPrefix={idPrefix} value={filter} onChange={setFilter} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-end"
        disabled={!isRosterFilterActive(filter)}
        onClick={() => setFilter(EMPTY_FILTER)}
      >
        <FilterX />
        Xoá bộ lọc
      </Button>
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between gap-3 border-b border-border rounded-t-lg bg-foreground/5 px-3 py-2">
          <label className="flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              checked={isAllTicked}
              disabled={visible.length === 0}
              ref={(input) => {
                if (input) input.indeterminate = isSomeTicked;
              }}
              onChange={toggleAll}
            />
            Chọn tất cả
          </label>
          <span className="text-sm text-muted-foreground">
            Đã chọn {selection.size}/{members.length}
          </span>
        </div>
        <ul className="max-h-[50dvh] overflow-y-auto">
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
    </div>
  );
}
