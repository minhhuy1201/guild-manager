import type { ShownCommentary } from "../hooks/use-race-commentary";

/**
 * The commentator's current line, bottom left of the track where the lead-change bar sits. It stays
 * until the next line comes.
 * @param props.line - What is being said, or null for nothing yet
 * @returns The bar
 */
export function RaceCommentaryBar({ line }: { line: ShownCommentary | null }) {
  return (
    // Mounted before the first line: a live region inserted together with its text is often not read out.
    <div className="race-ov race-commentary-bar" aria-live="polite">
      {line ? (
        <>
          <b className="race-display">BÌNH LUẬN</b>
          <span key={line.id} data-hype={line.isHype || undefined}>
            {line.text}
          </span>
        </>
      ) : null}
    </div>
  );
}
