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
  /** Người dùng hiện tại có phải quản trị viên không (xác định ở server) */
  isAdmin: boolean;
}

/**
 * Thanh điều hướng chính, highlight mục đang mở theo pathname.
 * Mục `adminOnly` chỉ hiện khi đã đăng nhập — việc chặn truy cập thật sự do
 * proxy và layout server đảm nhiệm.
 * @param props.isAdmin - Có hiển thị mục dành riêng cho quản trị hay không
 * @returns Nav chứa các nút điều hướng
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
              variant={isActive ? "secondary" : "ghost"}
              size="lg"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "h-10 gap-2 px-3.5 text-sm",
                !isActive && "text-muted-foreground"
              )}
              nativeButton={false}
              render={<Link href={href} />}
            >
              <Icon className="size-5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        }
      )}
    </nav>
  );
}
