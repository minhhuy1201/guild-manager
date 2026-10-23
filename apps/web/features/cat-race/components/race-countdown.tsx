import { COUNTDOWN_STEPS } from "../lib/race-timeline";

type CountdownSignal = "red" | "amber" | "green";

/** One colour per countdown step, in the order a traffic light shows them. */
const SIGNALS: readonly CountdownSignal[] = ["red", "amber", "green"];

interface RaceCountdownProps {
  /** Lamp lit now, 0-based; -1 before the first */
  step: number;
  isOn: boolean;
}

/**
 * A traffic light counting down: three lamps in a housing, one lit at a time red, amber, green,
 * with the number popping in under them in the lit lamp's colour.
 * @param props.step - Lamp lit now
 * @param props.isOn - Whether the countdown is on screen
 * @returns The countdown layer
 */
export function RaceCountdown({ step, isOn }: RaceCountdownProps) {
  return (
    <div className="race-ov race-countdown" data-on={isOn}>
      <div className="race-lanterns">
        {SIGNALS.map((signal, index) => (
          <div key={signal} className="race-lantern" data-signal={signal} data-lit={index === step} />
        ))}
      </div>
      {/* Keyed by the step so each number pops in again. */}
      <div key={step} className="race-display race-digit" data-signal={SIGNALS[step]} aria-hidden>
        {step < 0 ? "" : COUNTDOWN_STEPS - step}
      </div>
    </div>
  );
}
