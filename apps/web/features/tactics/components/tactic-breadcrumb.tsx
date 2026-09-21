"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

/**
 * The trail inside the tactic page's banner: the way back to the list, and the list itself.
 *
 * It stops at the parent on purpose — the banner's `<h1>` is already the tactic's name, and a last
 * crumb repeating it would print the same words twice in the same block. White on the scrim, like
 * everything else drawn over a banner scene.
 * @returns The breadcrumb row
 */
export function TacticBreadcrumb() {
  return (
    <div className="flex items-center gap-1.5">
      {/* A plain link wearing the icon button's clothes. This control navigates, so it has to be an
          anchor: Base UI's `Button` warns at runtime when it acts as a button while rendering
          something that is not one. */}
      <Link
        href={ROUTES.tactics}
        aria-label="Về danh sách chiến thuật"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-white/80 hover:bg-white/15 hover:text-white"
        )}
      >
        <ArrowLeft />
      </Link>

      <Breadcrumb>
        <BreadcrumbList className="text-white/70">
          <BreadcrumbItem>
            <BreadcrumbLink
              className="hover:text-white"
              render={<Link href={ROUTES.tactics} />}
            >
              Chiến thuật
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
