import type { ReactNode } from "react";

import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";

interface EmptyStateProps {
  /** Vietnamese sentence saying why there is nothing here. */
  message: string;
  /** Optional glyph for the seal (the icon sits inside it); the guild's cat by default. */
  icon?: ReactNode;
  /** Optional suggested action, e.g. a "Thêm thành viên" button. */
  action?: ReactNode;
}

/**
 * The empty block shown in place of a card's or table's content when the data
 * loaded fine but holds nothing. Deliberately the same frame, spacing and type
 * scale as `error-state.tsx`: two branches of one story should look alike.
 * @param message - Sentence describing the empty result
 * @param icon - Glyph inside the guild seal above the message
 * @param action - Suggested action below the message
 * @returns Centered empty block
 */
export function EmptyState({
  message,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <GuildSeal glyph={icon} />
      <OrnamentDivider stroke="brush" align="center" className="w-24" />
      <p className="text-sm text-pretty text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
