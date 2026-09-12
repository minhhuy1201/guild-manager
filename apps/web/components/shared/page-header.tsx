import type { ReactNode } from "react";

import { OrnamentDivider } from "@/components/shared/ornament-divider";

interface PageHeaderProps {
  /** The page's one `<h1>` */
  title: string;
  /** One sentence under the title saying what the page is for */
  description?: ReactNode;
  /** Controls that act on the whole page, e.g. the team builder's week picker */
  actions?: ReactNode;
}

/**
 * The top of every page: a serif title, an optional description, page-wide actions on the right,
 * and the jade-diamond rule that closes the block. Every page opens with it, so the hierarchy reads
 * the same from one screen to the next.
 * @param title - The page title
 * @param description - Sentence under the title, if any
 * @param actions - Page-wide controls, if any
 * @returns The page header block
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <OrnamentDivider />
    </div>
  );
}
