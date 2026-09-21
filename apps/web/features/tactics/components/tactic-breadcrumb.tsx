"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

interface TacticBreadcrumbProps {
  /** Name of the tactic on screen; empty while it is still loading */
  name: string;
}

/**
 * The top of a tactic's page: where you are, and the way back to the list.
 * A banner is what the list page opens with; this page opens with the drawing, so a strip of
 * scenery would only push the map down.
 * @param name - Name of the tactic on screen
 * @returns The breadcrumb row
 */
export function TacticBreadcrumb({ name }: TacticBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2">
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

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={ROUTES.tactics} />}>
              Chiến thuật
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{name || "Đang tải..."}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
