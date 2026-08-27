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
              // The selected item takes the same solid primary surface as a
              // selected tab. --secondary and --muted are within a hair of
              // --background, so neither reads as "selected" on the header.
              className={cn(
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
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
