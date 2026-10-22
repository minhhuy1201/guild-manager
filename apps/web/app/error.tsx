"use client";

import Link from "next/link";
import { House, RotateCcw, TriangleAlert } from "lucide-react";

import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PAGE_NAV_TRANSITION } from "@/lib/page-transition";
import { ROUTES } from "@/config/routes";

interface ErrorPageProps {
  /** What was thrown; its `digest` identifies the server-side log entry */
  error: Error & { digest?: string };
  /** Render the failed segment again */
  reset: () => void;
}

/**
 * The error boundary of every page: something threw while rendering. A short sentence, a retry that
 * renders the page again, and the way back to the attendance page. The thrown message is not shown
 * - it is written for developers, not for the guild - but the digest is, so an admin can quote it.
 * @param error - What was thrown
 * @param reset - Render the failed segment again
 * @returns The error page content
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <section className="py-12 sm:py-16">
      <Card
        variant="raised"
        className="mx-auto max-w-md items-center gap-4 px-6 py-10 text-center"
      >
        <GuildSeal size="lg" tone="destructive" glyph={<TriangleAlert />} />
        <OrnamentDivider stroke="brush" align="center" className="w-32" />
        <h1 className="font-heading text-2xl font-semibold">Có lỗi xảy ra</h1>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          Trang này vừa gặp sự cố. Thử lại, hoặc về trang Điểm danh.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Mã lỗi: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            <RotateCcw />
            Thử lại
          </Button>
          {/* A real link dressed as a button: a `Button` rendering a link carries `role="button"`,
              and a screen reader would announce the way back as an action. */}
          <Link
            href={ROUTES.attendance}
            transitionTypes={PAGE_NAV_TRANSITION}
            className={buttonVariants({ variant: "outline" })}
          >
            <House />
            Về trang Điểm danh
          </Link>
        </div>
      </Card>
    </section>
  );
}
