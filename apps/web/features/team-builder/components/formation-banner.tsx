import { Lock, Swords } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * How much room the banner takes. `compact` is the screen's, where the day tab right above already
 * names the battle; `tall` is the Discord image's, where the banner is the only headline.
 */
export type FormationBannerSize = "compact" | "tall";

interface FormationBannerProps {
  /** Headline text, already built by `buildBannerTitle` */
  title: string;
  /** A Guild War banner carries the crossed swords, like every other battle label */
  isGuildWar: boolean;
  /** Battle already played — the formation below can only be read */
  locked: boolean;
  /** How much room the banner takes */
  size: FormationBannerSize;
}

/**
 * The headline sitting above the ten team columns — which battle, when, against whom, and
 * which match of the day the grid below belongs to.
 *
 * Lives inside the grid and spans every column, so it lines up with the columns instead
 * of with the page. `tall` is about two slot cells high and grows when the line wraps;
 * `compact` is one line of text, since on screen it repeats what the day tab says.
 *
 * Both kinds of battle share one frame - the wording already says which one this is, and a
 * second colour would compete with the team headers right underneath. It is the one headline
 * of the screen, so it takes the palette's gold: a thin edge with a heavier top rule, on the
 * plain card, the title in the serif heading face and the navy of a battle.
 *
 * No `uppercase` here: the kind is already written in capitals by `sessionKindLabel`, while
 * an opponent guild's name must render exactly as its members spell it.
 * @param title - Headline text
 * @param isGuildWar - Whether the battle is the Guild War
 * @param locked - Whether the battle is already played
 * @param size - How much room the banner takes
 * @returns The banner row
 */
export function FormationBanner({
  title,
  isGuildWar,
  locked,
  size,
}: FormationBannerProps) {
  const isTall = size === "tall";

  return (
    <h2
      className={cn(
        "col-span-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-t-2 border-gold/60 border-t-gold bg-card px-4 text-center font-heading font-semibold tracking-wide text-primary",
        isTall ? "min-h-24 py-3 text-xl sm:text-2xl" : "py-1.5 text-base sm:text-lg"
      )}
    >
      {isGuildWar ? (
        <Swords className={cn("shrink-0", isTall ? "size-6" : "size-5")} />
      ) : null}
      {title}
      {locked ? (
        <span className="inline-flex items-center gap-1 font-sans text-base font-medium text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          Đã khoá
        </span>
      ) : null}
    </h2>
  );
}
