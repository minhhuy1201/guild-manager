import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { STAGE_STEP_SHORTCUT } from "../lib/shortcuts";

interface StageArrowHintProps {
  /** How many stages the tactic has */
  stageCount: number;
}

/**
 * The two arrow caps beside the stage tabs, so the keyboard walk is readable off the screen.
 *
 * A one-stage tactic has nowhere to walk, so the hint stays away.
 * @param stageCount - How many stages the tactic has
 * @returns The key caps, or null when there is only one stage
 */
export function StageArrowHint({ stageCount }: StageArrowHintProps) {
  if (stageCount < 2) {
    return null;
  }

  return (
    // aria-hidden like every other key cap: the tabs are a real tablist, whose arrow keys a screen
    // reader already announces, so the caps would only repeat it.
    <KbdGroup
      aria-hidden
      className="gap-0.5"
      title="Mũi tên trái/phải để chuyển giai đoạn"
    >
      {STAGE_STEP_SHORTCUT.keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}
