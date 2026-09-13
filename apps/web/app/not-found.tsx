import Link from "next/link";
import { House } from "lucide-react";

import { GuildSeal } from "@/components/shared/guild-seal";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

/**
 * Route not found: an address nothing answers - an old bookmark, a mistyped link. Says so in one
 * line under the guild's seal and offers the way back to the page most members came for.
 *
 * The way back is a real link dressed as a button (`buttonVariants`), not a `Button` rendering a
 * link: that one carries `role="button"`, and a screen reader would announce navigation as an action.
 * @returns The 404 page content
 */
export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <GuildSeal size="lg" />
      <h1 className="font-heading text-2xl font-semibold">
        Không tìm thấy trang này
      </h1>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        Đường dẫn có thể đã cũ hoặc bị gõ nhầm.
      </p>
      <Link href={ROUTES.attendance} className={buttonVariants()}>
        <House />
        Về trang Điểm danh
      </Link>
    </section>
  );
}
