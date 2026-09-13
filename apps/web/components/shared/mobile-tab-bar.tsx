"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemsFor } from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  /** Whether the current user is an admin (determined on the server) */
  isAdmin: boolean;
}

/**
 * The main navigation on a phone: a tab bar fixed to the bottom of the screen, below `sm` only.
 * Members mostly open the site from a Discord link on their phone, where the header had room for
 * four bare icons - and "Điểm danh" and "Lịch sử điểm danh" were two clipboards apart. Here every
 * entry carries its short name under its icon, and the current page takes the header nav's marks:
 * full-strength text, a jade icon and a jade bar, on the top edge this time.
 *
 * `data-slot` is what `globals.css` looks for to reserve the bar's height at the bottom of the page
 * (`--app-bottom-inset`), so no content - the save bars included - ends up under it. The bar must be
 * rendered outside the site header: the header's backdrop blur would otherwise become the containing
 * block of this `position: fixed` element.
 * @param props.isAdmin - Whether to show the admin-only entries
 * @returns The tab bar
 */
export function MobileTabBar({ isAdmin }: MobileTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      data-slot="mobile-tab-bar"
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="flex h-16">
        {navItemsFor(isAdmin).map(({ href, shortLabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-xs font-medium outline-none",
                  "transition-colors duration-[var(--duration-fast)] focus-visible:bg-foreground/5",
                  "before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-jade before:opacity-0",
                  isActive
                    ? "text-foreground before:opacity-100 [&_svg]:text-jade"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
