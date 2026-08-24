import Link from "next/link";
import { Cat } from "lucide-react";

import { canManageGuild } from "@guild/shared/lib";

import { MainNav } from "@/components/shared/main-nav";
import { ROUTES } from "@/config/routes";
import { fetchMe, getSession, LoginButton } from "@/features/auth";

/**
 * Thanh header trên cùng của ứng dụng: tên bang "Mèo Mập Giang Hồ" và nav chính.
 * Đọc phiên đăng nhập ở server để quyết định hiển thị mục nav dành cho quản trị.
 * @returns Header đã style
 */
export async function SiteHeader() {
  const session = await getSession();
  // Trang đăng nhập cũng dựng header này, nên phiên hỏng chỉ có nghĩa "chưa đăng nhập".
  const me = session ? await fetchMe().catch(() => null) : null;

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Link
          href={ROUTES.attendance}
          className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cat className="size-6" />
          </span>
          <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
            Mèo Mập Giang Hồ
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <MainNav isAdmin={session ? canManageGuild(session.role) : false} />
          {session && (
            <LoginButton
              label={me?.character?.name ?? me?.discordUsername ?? null}
            />
          )}
        </div>
      </div>
    </header>
  );
}
