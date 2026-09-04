"use client";

import type {
  Character,
  SessionFormation,
  TeamNames,
} from "@guild/shared/schemas";

import { buildBannerTitle } from "../lib/banner-title";
import type { MatchDraft } from "../types/formation";
import { FormationGrid } from "./formation-grid";

/**
 * Marks a node the Discord announcement screenshots. The capture step finds its nodes by this
 * attribute rather than by threading refs down through the dialog that owns the confirm click —
 * the attribute is also what the test asserts on, so there is one way in, not two.
 */
export const CAPTURE_NODE_ATTRIBUTE = "data-formation-capture";

/** How wide each captured line-up is rendered, in CSS pixels. */
const CAPTURE_WIDTH = 1280;

interface FormationCaptureSheetProps {
  /** The battle day being announced — the banner is built from it */
  session: SessionFormation;
  /** Matches of that day, in order; one image is captured per entry */
  matches: MatchDraft[];
  /** Full roster indexed by character id */
  charactersById: Map<string, Character>;
  /** Ids of members who are placed but marked absent for this battle */
  absentIds: Set<string>;
  /** Team names, keyed by team number */
  names: TeamNames;
}

/**
 * A copy of the day's line-ups, drawn outside the viewport for the screenshot.
 *
 * Positioned off to the left rather than hidden: snapDOM reads real layout, and a subtree with
 * `display: none` measures zero in every direction. Its width is pinned and the grid forced to five
 * columns so the image is the same picture whatever window the admin happens to be on — without
 * that, announcing from a narrow laptop sends the guild a one-column strip ten screens tall.
 *
 * Read-only: no drag handles, no note inputs to focus. The banner rides inside the grid already,
 * so screenshotting the grid is what puts the battle's name on the image.
 *
 * @param session - The battle day being announced
 * @param matches - Matches of that day, in order
 * @param charactersById - Full roster indexed by character id
 * @param absentIds - Ids of placed members who dropped out
 * @param names - Team names, keyed by team number
 * @returns The off-screen sheet, one grid per match
 */
export function FormationCaptureSheet({
  session,
  matches,
  charactersById,
  absentIds,
  names,
}: FormationCaptureSheetProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-[-10000px] z-[-1]"
    >
      {matches.map((match, index) => (
        <div
          key={index}
          {...{ [CAPTURE_NODE_ATTRIBUTE]: String(index) }}
          className="bg-background p-4"
          style={{ width: CAPTURE_WIDTH }}
        >
          <FormationGrid
            bannerTitle={buildBannerTitle({
              isGuildWar: session.isGuildWar,
              dateTime: session.dateTime,
              opponent: session.opponent,
              activeMatchIndex: index,
              draftMatchCount: matches.length,
              scheduledMatchCount: session.matchCount,
            })}
            isGuildWar={session.isGuildWar}
            locked={false}
            assignment={match.assignment}
            charactersById={charactersById}
            readOnly
            absentIds={absentIds}
            notes={match.notes}
            onNoteChange={() => {}}
            names={names}
            onNameChange={() => {}}
            fixedColumns
          />
        </div>
      ))}
    </div>
  );
}
