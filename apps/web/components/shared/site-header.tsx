import Link from "next/link";
import { Cat } from "lucide-react";

import { MainNav } from "@/components/shared/main-nav";
import { ROUTES } from "@/config/routes";
import { getSession, LoginButton } from "@/features/auth";

/**
 * Thanh header trên cùng của ứng dụng: tên bang "Mèo Mập Giang Hồ" và nav chính.
 * Đọc phiên đăng nhập ở server để quyết định hiển thị mục nav dành cho quản trị.
 * @returns Header đã style
 */
export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center gap-2.5 px-4">
        <Link
          href={ROUTES.attendance}
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cat className="size-5" />
          </span>
          <span className="truncate text-base font-bold tracking-tight sm:text-lg">
            Mèo Mập Giang Hồ
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <MainNav isAdmin={Boolean(session)} />
          <LoginButton username={session?.username ?? null} />
        </div>
      </div>
    </header>
  );
}
