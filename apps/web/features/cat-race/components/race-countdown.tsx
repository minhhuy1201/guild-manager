import { COUNTDOWN_STEPS } from "../lib/race-timeline";

interface RaceCountdownProps {
  /** Last lantern lit, 0-based; -1 before the first */
  step: number;
  isOn: boolean;
}

/**
 * Three lanterns lit one by one with the number popping in under them; the third is gold.
 * @param props.step - Last lantern lit
 * @param props.isOn - Whether the countdown is on screen
 * @returns The countdown layer
 */
export function RaceCountdown({ step, isOn }: RaceCountdownProps) {
  return (
    <div className="race-ov race-countdown" data-on={isOn}>
      <div className="race-lanterns">
        {Array.from({ length: COUNTDOWN_STEPS }, (_, index) => (
          <div
            key={index}
            className="race-lantern"
            data-lit={index <= step}
            data-gold={index === COUNTDOWN_STEPS - 1}
          />
        ))}
      </div>
      {/* Keyed by the step so each number pops in again. */}
      <div key={step} className="race-display race-digit" aria-hidden>
        {step < 0 ? "" : COUNTDOWN_STEPS - step}
      </div>
    </div>
  );
}
