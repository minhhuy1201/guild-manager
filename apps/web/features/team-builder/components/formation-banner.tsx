import { Lock, Swords } from "lucide-react";

interface FormationBannerProps {
  /** Headline text, already built by `buildBannerTitle` */
  title: string;
  /** A Guild War banner carries the crossed swords, like every other battle label */
  isGuildWar: boolean;
  /** Battle already played — the formation below can only be read */
  locked: boolean;
}

/**
 * The headline sitting above the ten team columns — which battle, when, against whom, and
 * which match of the day the grid below belongs to.
 *
 * Lives inside the grid and spans every column, so it lines up with the columns instead
 * of with the page; its height is about two slot cells and grows when the line wraps.
 *
 * Both kinds of battle share one violet frame — the wording already says which one this
 * is, and a second colour would compete with the team headers right underneath. Fixed
 * palette classes, like `team-colors.ts`, so the banner reads the same in both themes.
 * @param title - Headline text
 * @param isGuildWar - Whether the battle is the Guild War
 * @param locked - Whether the battle is already played
 * @returns The banner row
 */
export function FormationBanner({
  title,
  isGuildWar,
  locked,
}: FormationBannerProps) {
  return (
    <h2 className="col-span-full flex min-h-24 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border-2 border-violet-600 bg-violet-200 px-4 py-3 text-center text-xl font-bold tracking-wide text-violet-950 uppercase sm:text-2xl">
      {isGuildWar ? <Swords className="size-6 shrink-0" /> : null}
      {title}
      {locked ? (
        <span className="inline-flex items-center gap-1 text-base font-semibold text-violet-800">
          <Lock className="size-4 shrink-0" />
          Đã khoá
        </span>
      ) : null}
    </h2>
  );
}
