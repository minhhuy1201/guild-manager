"use client";

import { Layers, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StagePlaybackControlsProps {
  /** Whether the stages are walking themselves */
  playing: boolean;
  /** Whether the stage before the active one is ghosted underneath */
  onionSkin: boolean;
  /** True when there is only one stage, so neither button has anything to do */
  disabled: boolean;
  onTogglePlay: () => void;
  onToggleOnionSkin: () => void;
}

/**
 * The two buttons that read a tactic rather than change it: play the stages, and ghost the one
 * before.
 *
 * One component for the viewer and for the editor, so the two screens cannot drift apart on what
 * reading a tactic looks like.
 * @param props - The two states and the two callbacks
 * @returns The button pair
 */
export function StagePlaybackControls({
  playing,
  onionSkin,
  disabled,
  onTogglePlay,
  onToggleOnionSkin,
}: StagePlaybackControlsProps) {
  const playLabel = playing ? "Dừng" : "Chạy các giai đoạn";

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={disabled}
        aria-label={playLabel}
        title={playLabel}
        onClick={onTogglePlay}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant={onionSkin ? "secondary" : "ghost"}
        disabled={disabled}
        aria-pressed={onionSkin}
        aria-label="Bóng mờ giai đoạn trước"
        title="Bóng mờ vị trí quân ở giai đoạn trước"
        onClick={onToggleOnionSkin}
      >
        <Layers />
      </Button>
    </div>
  );
}
