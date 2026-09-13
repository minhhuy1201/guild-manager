"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemsFor } from "@/components/shared/nav-items";
import { Button } from "@/components/ui/button";
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
 * same entries move to `MobileTabBar` at the bottom of the screen, each with its name.
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
      {navItemsFor(isAdmin).map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Button
            key={href}
            variant="ghost"
            size="lg"
            aria-current={isActive ? "page" : undefined}
            // Navigation is not an in-page selection, so it does not take the navy surface of a
            // selected tab: the current page gets full-strength text, a jade icon and a jade bar
            // under it. Only colour and opacity change, never the width, so the row never shifts.
            className={cn(
              "relative px-5 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-jade after:opacity-0 after:transition-opacity after:duration-[var(--duration-fast)]",
              isActive
                ? "text-foreground after:opacity-100 [&_svg]:text-jade"
                : "text-muted-foreground"
            )}
            nativeButton={false}
            render={<Link href={href} />}
          >
            <Icon />
            {label}
          </Button>
        );
      })}
    </nav>
  );
}
