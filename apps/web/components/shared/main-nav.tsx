"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemsFor } from "@/components/shared/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MainNavProps {
  /** Whether the current user is an admin (determined on the server) */
  isAdmin: boolean;
}

/**
 * The main navigation bar in the header, highlighting the active item by pathname.
 * `adminOnly` items only render for an admin - the actual access control is the proxy's and the
 * server layout's job.
 *
 * From `sm` up only: on a phone four icons without words were hard to tell apart, so there the
 * same entries move to `MobileTabBar` at the bottom of the screen, each with its name. Up to `lg`
 * the entries show their short names, which is what leaves room for the rest of the header.
 * @param props.isAdmin - Whether to show the admin-only items
 * @returns The navigation bar
 */
export function MainNav({ isAdmin }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="hidden items-center gap-1.5 sm:flex"
    >
      {navItemsFor(isAdmin).map(({ href, label, shortLabel, icon: Icon }) => {
        const isActive = pathname === href;
        const hasShortLabel = shortLabel !== label;
        return (
          // A plain link styled as a button: rendered through `Button`, Base UI gave the anchor
          // `role="button"`, so a screen reader announced navigation as buttons.
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            // Only when the visible name can be the short one, so it never repeats the text.
            aria-label={hasShortLabel ? label : undefined}
            // Navigation is not an in-page selection, so it does not take the navy surface of a
            // selected tab: the current page gets full-strength text, a jade icon and a jade bar
            // under it. Only colour and opacity change, never the width, so the row never shifts.
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "relative px-3 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-jade after:opacity-0 after:transition-opacity after:duration-[var(--duration-fast)] lg:px-5",
              isActive
                ? "text-foreground after:opacity-100 [&_svg]:text-jade"
                : "text-muted-foreground"
            )}
          >
            <Icon />
            {/* From `sm` to `lg` (a phone turned sideways, a tablet) the four full names squeezed
                the guild's name out of the header, so there the short names show. */}
            {hasShortLabel ? (
              <>
                <span className="lg:hidden">{shortLabel}</span>
                <span className="max-lg:hidden">{label}</span>
              </>
            ) : (
              label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
