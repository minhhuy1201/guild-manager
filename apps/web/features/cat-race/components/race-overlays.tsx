import { useMemo } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { catLabels } from "../lib/cat-label";
import type { PhotoRow } from "../lib/draw-photo-finish";
import type { OverlayState } from "../lib/race-overlay";
import { rankAt, type RaceScript } from "../lib/race-script";
import { COUNTDOWN_STEPS } from "../lib/race-timeline";
import { FALLBACK_SPRITE_CLASS } from "../lib/sprite-rows";
import { PhotoFinishPanel } from "./photo-finish-panel";
import { RaceCountdown } from "./race-countdown";

/** Cats in the finish photo. */
const PHOTO_CATS = 2;

interface RaceOverlaysProps {
  state: OverlayState;
  script: RaceScript;
  participants: readonly CatRaceParticipant[];
}

/**
 * The broadcast layer over the track: countdown, banners, lead-change bar, slow-motion frame,
 * finish flash and finish photo. It only reacts to the stage's state and takes no input.
 * @param props.state - What to show now
 * @param props.script - The race, for names and the photo
 * @param props.participants - Who is racing, for names and colours
 * @returns The overlays
 */
export function RaceOverlays({ state, script, participants }: RaceOverlaysProps) {
  const labels = useMemo(() => catLabels(script.cats, participants), [script, participants]);
  const photoRows = useMemo<PhotoRow[]>(() => {
    if (!state.photo) return [];
    const owners = new Map(script.cats.map((cat) => [cat.key, cat.characterId]));
    const classes = new Map(participants.map((p) => [p.characterId, p.guildClass]));

    return rankAt(script, 1)
      .slice(0, PHOTO_CATS)
      .map((key, index) => {
        const guildClass = classes.get(owners.get(key) ?? "");

        return {
          label: labels.get(key)!,
          guildClass: guildClass ?? FALLBACK_SPRITE_CLASS,
          lengthsBehind: index === 0 ? 0 : state.photo!.lengthsBehind,
        };
      });
  }, [state.photo, script, participants, labels]);
  const announcement = state.leadToast
    ? `Đổi ngôi: ${labels.get(state.leadToast.catKey)} vượt lên dẫn đầu`
    : state.banner
      ? state.banner.text
      : state.isCountingDown && state.countdownStep >= 0
        ? String(COUNTDOWN_STEPS - state.countdownStep)
        : "";

  return (
    <>
      {/* Mounted once: a live region inserted together with its text is often not read out. */}
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <div className="race-ov race-vignette" data-on={state.isSlow} />
      <div className="race-ov race-display race-slowmo" data-on={state.isSlow}>
        CHẬM ×3
      </div>
      {state.leadToast ? (
        <div key={state.leadToast.id} className="race-ov race-lead-bar" aria-hidden>
          <b className="race-display">ĐỔI NGÔI</b>
          <span>
            <em>{labels.get(state.leadToast.catKey)}</em> vượt lên dẫn đầu
          </span>
        </div>
      ) : null}
      {state.banner ? (
        <div key={state.banner.id} className="race-ov race-banner" aria-hidden>
          <span className="race-display">{state.banner.text}</span>
        </div>
      ) : null}
      <RaceCountdown step={state.countdownStep} isOn={state.isCountingDown} />
      {state.photo ? (
        <PhotoFinishPanel rows={photoRows} lengthsBehind={state.photo.lengthsBehind} />
      ) : null}
      {state.flashId === null ? null : <div key={state.flashId} className="race-ov race-flash" />}
    </>
  );
}
