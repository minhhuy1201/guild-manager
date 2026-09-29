"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

interface TacticHeaderProps {
  /** The tactic's name, or a loading placeholder until it arrives */
  title: string;
}

/**
 * The top of the tactic page, on one line: the way back to the list, the list itself, and the
 * tactic's name.
 *
 * It replaces the banner every other page opens with: this page is a drawing tool, and the banner
 * spent the top of the screen on decoration before the map. The name is the page's `<h1>`, placed
 * after the trail rather than inside it - it titles the page, it is not a step on the way to it.
 * @param title - The tactic's name
 * @returns The header row
 */
export function TacticHeader({ title }: TacticHeaderProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {/* A plain link wearing the icon button's clothes. This control navigates, so it has to be an
          anchor: Base UI's `Button` warns at runtime when it acts as a button while rendering
          something that is not one. */}
      <Link
        href={ROUTES.tactics}
        aria-label="Về danh sách chiến thuật"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <ArrowLeft />
      </Link>

      <Breadcrumb className="shrink-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={ROUTES.tactics} />}>
              Chiến thuật
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="min-w-0 truncate font-heading text-lg font-semibold tracking-tight">
        {title}
      </h1>
    </div>
  );
}
