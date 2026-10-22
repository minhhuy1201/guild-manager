"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { navItemsFor } from "@/components/shared/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { PAGE_NAV_TRANSITION } from "@/lib/page-transition";
import { cn } from "@/lib/utils";

interface IndicatorBox {
  /** Left edge of the active link inside the nav, in px */
  x: number;
  /** Width of the active link, in px */
  width: number;
}

/** Inset of the bar from the link's edges, matching the link's horizontal padding. */
const INDICATOR_INSET_PX = 12;

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
  const navRef = useRef<HTMLElement>(null);
  const [box, setBox] = useState<IndicatorBox | null>(null);
  // Off for the first placement, so the bar appears under the active link instead of sliding in
  // from the left edge on every full page load.
  const [isSettled, setIsSettled] = useState(false);
  const items = navItemsFor(isAdmin);
  const activeHref = items.find(({ href }) => href === pathname)?.href;

  // Layout, not just the route, moves the bar: the labels switch between short and full at `lg`,
  // which changes every link's width, so the nav is observed as well.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const link = activeHref
        ? nav.querySelector<HTMLElement>(`a[href="${activeHref}"]`)
        : null;
      // A zero width means the nav is `display: none` (below sm): not measured yet, so the bar
      // does not park at x=0 and slide in from the left when the nav appears.
      setBox(
        link && link.offsetWidth > 0
          ? { x: link.offsetLeft, width: link.offsetWidth }
          : null
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeHref]);

  useLayoutEffect(() => {
    if (!box) return;
    const frame = requestAnimationFrame(() => setIsSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [box]);

  return (
    <nav
      ref={navRef}
      aria-label="Điều hướng chính"
      data-measured={box ? "" : undefined}
      className="group/nav relative hidden items-center gap-1.5 sm:flex"
    >
      {/* One bar for the whole nav: it slides to the active link by transform alone (a 1px bar
          scaled to the link's width), so the move costs no layout. Hidden until measured. */}
      <span
        aria-hidden
        data-slot="nav-indicator"
        data-active-href={activeHref}
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left rounded-full bg-jade opacity-0 will-change-transform",
          box && "opacity-100",
          isSettled &&
            "transition-[transform,opacity] duration-[var(--duration-slow)] ease-out-soft"
        )}
        style={
          box
            ? {
                transform: `translateX(${box.x + INDICATOR_INSET_PX}px) scaleX(${Math.max(box.width - INDICATOR_INSET_PX * 2, 0)})`,
              }
            : undefined
        }
      />
      {items.map(({ href, label, shortLabel, icon: Icon }) => {
        const isActive = href === activeHref;
        const hasShortLabel = shortLabel !== label;
        return (
          // A plain link styled as a button: rendered through `Button`, Base UI gave the anchor
          // `role="button"`, so a screen reader announced navigation as buttons.
          <Link
            key={href}
            href={href}
            transitionTypes={PAGE_NAV_TRANSITION}
            aria-current={isActive ? "page" : undefined}
            // Only when the visible name can be the short one, so it never repeats the text.
            aria-label={hasShortLabel ? label : undefined}
            // Navigation is not an in-page selection, so it does not take the navy surface of a
            // selected tab: the current page gets full-strength text, a jade icon and the nav's
            // sliding jade bar under it. Only colour changes, never the width, so the row never
            // shifts.
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "relative px-3 lg:px-5",
              // Until the shared bar is measured (server render, first paint) the active link
              // carries its own underline, so the page never loads with no marker.
              "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-jade after:opacity-0 group-data-[measured]/nav:after:hidden",
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
