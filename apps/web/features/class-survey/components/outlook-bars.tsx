"use client";

import { useId } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { GUILD_CLASS_LABEL } from "@guild/shared/enums";
import type { ClassOutlookRow } from "@guild/shared/lib";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { cn } from "@/lib/utils";
import { formatDelta } from "../lib/outlook-rows";

const BAR_SIZE = 12;
const BAR_RADIUS = 2;
/** Two thin bars (before, after) stacked as separate categories need this much height. */
const CHART_HEIGHT = "aspect-auto h-14 w-full";
/** The "before" bar is the class colour at this strength, so "after" reads as the solid one. */
const BEFORE_OPACITY = 0.35;
const STRIPE_SIZE = 6;

interface OutlookBarsProps {
  /** The class this row draws */
  row: ClassOutlookRow;
  /** X axis maximum, shared by every row so lengths compare */
  domainMax: number;
  /** Whether a survey exists; without one only the current head-count is drawn */
  hasSurvey: boolean;
}

/**
 * One class's row: its icon and name, a "before" and an "after" bar, and the figures
 * `before -> after` with the signed change. In the "after" bar the solid part is who is sure
 * (staying or moving in) and the striped part is who is still considering.
 * @param row - The class's counts
 * @param domainMax - Shared X axis maximum
 * @param hasSurvey - Whether to draw the "after" bar and the change
 * @returns The row
 */
export function OutlookBars({ row, domainMax, hasSurvey }: OutlookBarsProps) {
  const patternId = `stripe-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const color = GUILD_CLASS_COLOR[row.guildClass];
  const config = {
    before: { label: "Trước", color },
    afterSure: { label: "Chắc chắn", color },
    afterConsidering: { label: "Đang cân nhắc", color },
  } satisfies ChartConfig;
  const data = [
    { phase: "before", before: row.before },
    ...(hasSurvey
      ? [{ phase: "after", afterSure: row.afterSure, afterConsidering: row.afterConsidering }]
      : []),
  ];

  return (
    <li className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex items-center gap-2">
        <GuildClassIcon guildClass={row.guildClass} />
        <span className="truncate text-sm font-medium">
          {GUILD_CLASS_LABEL[row.guildClass]}
        </span>
      </div>
      <ChartContainer config={config} className={CHART_HEIGHT}>
        <BarChart accessibilityLayer layout="vertical" data={data} margin={{ left: 0, right: 0 }}>
          <defs>
            <pattern
              id={patternId}
              width={STRIPE_SIZE}
              height={STRIPE_SIZE}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={STRIPE_SIZE / 2} height={STRIPE_SIZE} fill={color} />
            </pattern>
          </defs>
          <XAxis type="number" domain={[0, domainMax]} hide />
          <YAxis type="category" dataKey="phase" hide />
          <Bar
            dataKey="before"
            stackId="bar"
            fill="var(--color-before)"
            fillOpacity={BEFORE_OPACITY}
            barSize={BAR_SIZE}
            radius={BAR_RADIUS}
          />
          <Bar
            dataKey="afterSure"
            stackId="bar"
            fill="var(--color-afterSure)"
            barSize={BAR_SIZE}
          />
          <Bar
            dataKey="afterConsidering"
            stackId="bar"
            fill={`url(#${patternId})`}
            stroke="var(--color-afterConsidering)"
            barSize={BAR_SIZE}
            radius={BAR_RADIUS}
          />
        </BarChart>
      </ChartContainer>
      <div className="text-right text-sm tabular-nums">
        {hasSurvey ? (
          <>
            <span className="text-muted-foreground">{row.before} → </span>
            <span className="font-semibold">{row.after}</span>
            <span
              className={cn(
                "ml-2 font-medium",
                row.delta > 0 ? "text-jade" : "text-muted-foreground"
              )}
            >
              {formatDelta(row.delta)}
            </span>
          </>
        ) : (
          <span className="font-semibold">{row.before}</span>
        )}
      </div>
    </li>
  );
}
