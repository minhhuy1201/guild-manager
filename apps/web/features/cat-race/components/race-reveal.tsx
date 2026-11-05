import type { PodiumEntry } from "../lib/race-podium";
import { REVEAL_SECOND_MS, REVEAL_SUSPENSE_MS, REVEAL_THIRD_MS } from "../lib/reveal-beats";

interface RaceRevealProps {
  /** Ms since the overlay opened, as the beats have reached it */
  elapsedMs: number;
  second: PodiumEntry | undefined;
  third: PodiumEntry | undefined;
  onSkip: () => void;
}

/**
 * The dark "official result" screen before the winner card: the title, third and second place, then
 * a beat of suspense. A place nobody took leaves its beat out; the others keep their times.
 * @param props - See `RaceRevealProps`
 * @returns The reveal screen; a click on it skips to the card
 */
export function RaceReveal({ elapsedMs, second, third, onSkip }: RaceRevealProps) {
  return (
    <button type="button" className="race-reveal" onClick={onSkip}>
      <span className="race-reveal-title race-display">KẾT QUẢ CHÍNH THỨC</span>
      {elapsedMs >= REVEAL_THIRD_MS && third ? (
        <span className="race-reveal-place race-display" data-place="3">
          <span>HẠNG 3</span> · {third.label}
        </span>
      ) : null}
      {elapsedMs >= REVEAL_SECOND_MS && second ? (
        <span className="race-reveal-place race-display" data-place="2">
          <span>HẠNG 2</span> · {second.label}
        </span>
      ) : null}
      {elapsedMs >= REVEAL_SUSPENSE_MS ? (
        <span className="race-reveal-suspense race-display">VÀ VỀ NHẤT LÀ...</span>
      ) : null}
    </button>
  );
}
