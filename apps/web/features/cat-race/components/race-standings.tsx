"use client";

import { useLayoutEffect, useRef } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { cn } from "@/lib/utils";
import { catLabels } from "../lib/cat-label";
import { gapLabel, moveOf, type BoardState } from "../lib/race-board";
import type { RaceScript } from "../lib/race-script";

/** Medal of each podium place, first to third; the CSS paints gold, silver and bronze. */
const MEDALS = ["gold", "silver", "bronze"] as const;

interface RaceStandingsProps {
  /** The race being replayed; null before the first round */
  script: RaceScript | null;
  participants: readonly CatRaceParticipant[];
  /** Every cat, leader first, and the order one update ago */
  board: BoardState;
  className?: string;
}

/**
 * The live board: every cat in the race, one row each, in the order they run. The same ranking
 * orders the track, so the board and the lanes never disagree. A row that changes place slides
 * there (FLIP: it starts at the old place and the transition runs to the new one) unless the
 * viewer asked for less motion.
 * @param props.script - The race being replayed
 * @param props.participants - Who is racing, for names and colours
 * @param props.board - The standings and the order before them
 * @param props.className - Sizing from the screen
 * @returns The board
 */
export function RaceStandings({ script, participants, board, className }: RaceStandingsProps) {
  const reducedMotion = useReducedMotion();
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  const labels = script ? catLabels(script.cats, participants) : null;
  const ownerOf = new Map(script?.cats.map((cat) => [cat.key, cat.characterId]));
  const classOf = new Map(participants.map((p) => [p.characterId, p.guildClass]));
  const order = board.rows.map((row) => row.key).join("|");

  useLayoutEffect(() => {
    const before = tops.current;
    const after = new Map<string, number>();
    const moved: HTMLLIElement[] = [];
    for (const [key, row] of rowRefs.current) {
      // offsetTop ignores the transform of a slide still running, so it is always the settled place.
      after.set(key, row.offsetTop);
      const from = before.get(key);
      if (reducedMotion || from === undefined || from === row.offsetTop) continue;
      row.style.transition = "none";
      row.style.transform = `translateY(${from - row.offsetTop}px)`;
      moved.push(row);
    }
    tops.current = after;
    if (moved.length === 0) return;
    // Flush the starting transforms; otherwise the last row written has none to slide from.
    void moved[0].parentElement?.offsetHeight;
    // A cancelled frame would strand the rows at their old place, so the frame is never cancelled.
    requestAnimationFrame(() => {
      for (const row of moved) {
        row.style.transition = "";
        row.style.transform = "";
      }
    });
  }, [order, reducedMotion]);

  return (
    <aside
      aria-label="Bảng xếp hạng"
      data-slot="cat-race-hud"
      className={cn("race-board", className)}
    >
      <h2 className="race-display">
        BẢNG XẾP HẠNG
        {script ? <small>{script.cats.length} mèo</small> : null}
      </h2>
      {labels && board.rows.length > 0 ? (
        <ol>
          {board.rows.map((row, index) => {
            const guildClass = classOf.get(ownerOf.get(row.key) ?? "");
            const move = moveOf(board.previousKeys, row.key, index);

            return (
              <li
                key={row.key}
                ref={(element) => {
                  if (element) rowRefs.current.set(row.key, element);
                  else rowRefs.current.delete(row.key);
                }}
                data-lead={index === 0}
              >
                <span className="race-rank" data-medal={MEDALS[index]}>
                  {index + 1}
                </span>
                <span className="race-move" data-move={move}>
                  {move ? (
                    <>
                      <span aria-hidden>{move === "up" ? "▲" : "▼"}</span>
                      <span className="sr-only">{move === "up" ? "Lên hạng" : "Xuống hạng"}</span>
                    </>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className="race-dot"
                  style={{ backgroundColor: guildClass ? GUILD_CLASS_COLOR[guildClass] : undefined }}
                />
                <span className="race-name" data-podium={index < MEDALS.length}>
                  {labels.get(row.key)}
                </span>
                <span className="race-gap">{gapLabel(row, index)}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p>Bảng xếp hạng hiện khi bắt đầu đua.</p>
      )}
    </aside>
  );
}
