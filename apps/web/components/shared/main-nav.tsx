"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, History, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: ROUTES.attendance,
    label: "Điểm danh",
    icon: ClipboardCheck,
    adminOnly: false,
  },
  {
    href: ROUTES.attendanceHistory,
    label: "Lịch sử điểm danh",
    icon: History,
    adminOnly: false,
  },
  {
    href: ROUTES.teamBuilder,
    label: "Xếp team",
    icon: Users,
    adminOnly: true,
  },
  {
    href: ROUTES.settings,
    label: "Thiết lập",
    icon: Settings,
    adminOnly: true,
  },
] as const;

interface MainNavProps {
  /** Whether the current user is an admin (determined on the server) */
  isAdmin: boolean;
}

/**
 * The main navigation bar, highlighting the active item by pathname.
 * `adminOnly` items only render when signed in — the actual access control is the proxy's and the
 * server layout's job.
 * @param props.isAdmin - Whether to show the admin-only items
 * @returns The navigation bar
 */
export function MainNav({ isAdmin }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="flex items-center gap-1.5">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(
        ({ href, label, icon: Icon }) => {
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
              // Below `sm` the item is an icon alone, and `lg`'s padding made four of them plus the
              // avatar wider than a phone, pushing the nav over the guild seal.
              className={cn(
                "relative px-3 sm:px-5 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-jade after:opacity-0 after:transition-opacity after:duration-[var(--duration-fast)]",
                isActive
                  ? "text-foreground after:opacity-100 [&_svg]:text-jade"
                  : "text-muted-foreground"
              )}
              nativeButton={false}
              render={<Link href={href} />}
            >
              <Icon />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        }
      )}
    </nav>
  );
}
