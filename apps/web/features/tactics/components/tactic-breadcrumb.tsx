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
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

interface TacticBreadcrumbProps {
  /** Name of the tactic on screen; empty while it is still loading */
  name: string;
}

/**
 * The top of a tactic's page: where you are, and the way back to the list.
 * A banner is what the list page opens with; this page opens with the drawing, so the strip of
 * scenery would only push the map down.
 * @param name - Name of the tactic on screen
 * @returns The breadcrumb row
 */
export function TacticBreadcrumb({ name }: TacticBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Về danh sách chiến thuật"
        render={<Link href={ROUTES.tactics} />}
      >
        <ArrowLeft />
      </Button>

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
