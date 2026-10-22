"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import type { TacticSummary } from "@guild/shared/schemas";

import { tacticEditorPath } from "@/config/routes";
import { useSpotlight } from "@/hooks/use-spotlight";
import { formatDateTime } from "@/lib/format";

interface TacticCardProps {
  /** The tactic this card opens */
  tactic: TacticSummary;
  /** Row actions for an admin, already `relative` so they sit above the link overlay */
  actions?: ReactNode;
}

/**
 * One tactic in the list grid: name, notes line, stage count and last edit.
 * The whole card is the link (an `absolute inset-0` overlay) and the actions sit above it. It
 * lifts on hover and a lit edge follows the pointer (`spotlight-edge` in `globals.css`). The card
 * is a leaf in a grid, so it takes the inner radius rather than the container one.
 * @param tactic - The tactic to show
 * @param actions - Row actions for an admin
 * @returns The card
 */
export function TacticCard({ tactic, actions }: TacticCardProps) {
  const spotlight = useSpotlight();

  return (
    <div
      data-slot="tactic-card"
      {...spotlight}
      className="spotlight-edge relative flex h-full flex-col gap-3 rounded-inner border bg-card p-4 text-card-foreground shadow-sm transition-[translate] duration-[var(--duration-fast)] ease-spring hover:-translate-y-0.5 focus-within:ring-3 focus-within:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={tacticEditorPath(tactic.id)}
          className="min-w-0 text-base leading-snug font-semibold hover:underline"
        >
          {/* The overlay is the link's hit area; the actions sit above it and keep their own clicks. */}
          <span className="absolute inset-0 rounded-inner" />
          <span className="break-words">{tactic.name}</span>
        </Link>
        {actions}
      </div>

      {tactic.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {tactic.description}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Layers className="size-3.5 text-jade" />
          <span>{tactic.stageCount} giai đoạn</span>
        </p>
        <p>Sửa lúc {formatDateTime(tactic.updatedAt)}</p>
      </div>
    </div>
  );
}
