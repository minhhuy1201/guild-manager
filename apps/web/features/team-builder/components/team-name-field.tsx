"use client";

import { useState } from "react";
import { TEAM_NAME_MAX_LENGTH } from "@guild/shared/schemas";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TeamNameFieldProps {
  /** Team number, shown when the team has no name of its own */
  team: number;
  /** Current name, empty string when the team still shows its number */
  value: string;
  /** Render uneditable — a past week or a battle already fought */
  readOnly?: boolean;
  /** Called with the committed text; an empty string clears the name */
  onCommit: (team: number, name: string) => void;
}

/**
 * The team column's header: the team's name, or its number while it has none.
 * Double-click (or Enter/Space, so the keyboard reaches it too) opens an input;
 * Enter and blur commit, Escape restores the text as it was and closes.
 *
 * Committing writes to the draft, not to the server — the screen's Save button
 * is what reaches the API, exactly like a slot note.
 * @param team - Team number, the fallback label
 * @param value - Current name, empty when the team shows its number
 * @param readOnly - Render uneditable
 * @param onCommit - Called with the committed text
 * @returns The header label, or its input while being edited
 */
export function TeamNameField({
  team,
  value,
  readOnly = false,
  onCommit,
}: TeamNameFieldProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  const label = value || String(team);

  /** Write the text into the draft and leave edit mode. */
  function commit() {
    setEditing(false);
    if (text.trim() !== value) onCommit(team, text);
  }

  /** Leave edit mode, throwing away what was typed. */
  function cancel() {
    setText(value);
    setEditing(false);
  }

  /** Enter edit mode with the current name selected, ready to be typed over. */
  function startEditing() {
    setText(value);
    setEditing(true);
  }

  if (readOnly) {
    return (
      <span className="block truncate text-center text-lg font-semibold">
        {label}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={startEditing}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          startEditing();
        }}
        title="Nhấn đúp để đổi tên đội"
        aria-label={`Đội ${label}. Nhấn đúp hoặc Enter để đổi tên.`}
        className={cn(
          "w-full truncate rounded-md px-1 text-center text-lg font-semibold",
          "cursor-text outline-none transition-colors duration-[var(--duration-fast)]",
          "hover:bg-primary-foreground/15 focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <Input
      // Mounted only while editing, so autoFocus runs exactly when the user
      // asked for the input rather than on every render of the grid.
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") cancel();
      }}
      maxLength={TEAM_NAME_MAX_LENGTH}
      placeholder={String(team)}
      aria-label={`Tên đội ${team}`}
      className="h-8 bg-card px-2 text-center text-base font-semibold text-foreground"
    />
  );
}
