import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Vietnamese sentence saying why there is nothing here. */
  message: string;
  /** Optional icon, an inbox by default. */
  icon?: ReactNode;
  /** Optional suggested action, e.g. a "Thêm thành viên" button. */
  action?: ReactNode;
}

/**
 * The empty block shown in place of a card's or table's content when the data
 * loaded fine but holds nothing. Deliberately the same frame, spacing and type
 * scale as `error-state.tsx`: two branches of one story should look alike.
 * @param message - Sentence describing the empty result
 * @param icon - Icon above the message
 * @param action - Suggested action below the message
 * @returns Centered empty block
 */
export function EmptyState({
  message,
  icon = <Inbox className="size-6" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
