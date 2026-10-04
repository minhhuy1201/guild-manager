"use client";

import { useState } from "react";
import { ChevronDown, Search, User } from "lucide-react";
import type { Character } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { matchesName } from "../lib/name-search";

interface MemberPickerProps {
  /** Id of the trigger, for its label */
  id: string;
  /** Everyone that can be picked */
  characters: Character[];
  /** The picked character's id, empty while none */
  value: string;
  /** Called with the picked character's id */
  onChange: (characterId: string) => void;
}

/**
 * A member picker with a search box: a button that opens a filtered list.
 * A guild is dozens of names, too many to scroll a plain select for.
 * @param id - Id of the trigger
 * @param characters - Everyone that can be picked
 * @param value - The picked character's id
 * @param onChange - Called with the picked character's id
 * @returns The labelled picker
 */
export function MemberPicker({
  id,
  characters,
  value,
  onChange,
}: MemberPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = characters.find((character) => character.id === value);
  const matches = characters.filter((character) =>
    matchesName(character.name, query)
  );

  /**
   * Report the pick and close the list.
   * @param characterId - The picked character
   */
  function handlePick(characterId: string) {
    onChange(characterId);
    setIsOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} icon={<User />}>
        Thành viên
      </FieldLabel>
      <Popover
        open={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next);
          // A fresh search each time: last visit's filter would hide the list the admin expects.
          if (next) setQuery("");
        }}
      >
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="lg" id={id} />}
          className="justify-between font-normal"
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected?.name ?? "Chọn thành viên"}
          </span>
          <ChevronDown className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              role="searchbox"
              aria-label="Tìm thành viên"
              autoFocus
              autoComplete="off"
              placeholder="Tìm theo tên"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {matches.map((character) => (
              <li key={character.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    character.id === value && "font-medium"
                  )}
                  onClick={() => handlePick(character.id)}
                >
                  {character.name}
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p className="px-2 py-1.5 text-muted-foreground">
              Không tìm thấy thành viên.
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
