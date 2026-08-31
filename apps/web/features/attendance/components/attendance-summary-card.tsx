"use client";

import { useId } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { GUILD_CLASS_LABEL, type GuildClass } from "@guild/shared/enums";
import type { BattleSession } from "@guild/shared/schemas";

import { SessionLabel, sessionTintClass } from "@/components/shared/session-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { cn } from "@/lib/utils";
import type { ClassAttendanceSummary } from "../lib/attendance-summary";
import { getSessionSubtitle } from "../lib/session-subtitle";

/**
 * The three answers, in the order they stack from the left, with the tones §6 of
 * `docs/frontend.md` already gives them on the member card: emerald for "Có", destructive for
 * "Không", amber for a day still waiting for an answer.
 *
 * Full-strength fills, not the tile's `/5`: a bar is a thin band on a card rather than a whole
 * surface, and at 16px tall a fifth of a tone is indistinguishable from the card behind it.
 */
const CHART_CONFIG = {
  co: { label: "Có", color: "var(--color-emerald-500)" },
  khong: { label: "Không", color: "var(--color-destructive)" },
  chuaTraLoi: { label: "Chưa điểm danh", color: "var(--color-amber-500)" },
} satisfies ChartConfig;

/** Thickness of one class's bar, and the corner radius of a stacked segment. */
const BAR_SIZE = 16;
const BAR_RADIUS = 2;

/** Seven rows at `BAR_SIZE` plus the legend need a fixed height — `aspect-video` would crop them. */
const CHART_HEIGHT = "aspect-auto h-64 w-full";

/** Size of a class icon on the Y axis, and the gap between it and its bar. */
const ICON_SIZE = 24;
const ICON_GAP = 8;

/**
 * How far the disc behind an icon reaches past it. The class images are transparent PNGs, so on the
 * Guild War card's tinted surface they lose their edge; an opaque `card` disc with the standard
 * border gives every icon the same ground whatever the card behind it is tinted.
 */
const ICON_RING = 2;

/** Room for one icon plus its gap — a class is an icon here, never its name (see §6). */
const AXIS_WIDTH = ICON_SIZE + 2 * ICON_RING + ICON_GAP;

/** The empty part of a bar, so a class nobody answered for still reads as a row. */
const TRACK = { fill: "var(--color-foreground)", fillOpacity: 0.05 } as const;

/** Highlight under the hovered row; the same neutral hover surface §6 prescribes. */
const CURSOR = { fill: "var(--color-foreground)", fillOpacity: 0.05 } as const;

interface ClassTickProps {
  /** Id of the circular clip path, unique per card */
  clipId: string;
  /** Tick anchor, injected by recharts */
  x?: number;
  y?: number;
  /** Tick data, injected by recharts; `value` is the row's `guildClass` */
  payload?: { value: GuildClass };
}

/**
 * One Y axis tick: the class icon, the way every other screen names a class (§6 of
 * `docs/frontend.md`). `GuildClassIcon` cannot be reused here — a recharts tick renders inside the
 * chart's SVG, where an `Avatar` div is not valid content — so the same image map is drawn as an
 * SVG `<image>`, clipped to a circle to match the avatars elsewhere. The `<title>` carries the class
 * name for a hover and for screen readers, standing in for the avatar's tooltip and `alt`.
 * @param clipId - Id of the circular clip path
 * @param x - Tick anchor x, at the axis line
 * @param y - Tick anchor y, the centre of the bar
 * @param payload - Tick data whose `value` is the guild class
 * @returns The icon tick
 */
function ClassTick({ clipId, x = 0, y = 0, payload }: ClassTickProps) {
  if (!payload) return null;

  const label = GUILD_CLASS_LABEL[payload.value];
  const left = x - ICON_SIZE - ICON_RING - ICON_GAP;
  const top = y - ICON_SIZE / 2;

  return (
    <g>
      <title>{label}</title>
      <circle
        cx={left + ICON_SIZE / 2}
        cy={y}
        r={ICON_SIZE / 2 + ICON_RING}
        fill="var(--color-card)"
        stroke="var(--color-border)"
      />
      <clipPath id={`${clipId}-${payload.value}`}>
        <circle
          cx={left + ICON_SIZE / 2}
          cy={y}
          r={ICON_SIZE / 2}
        />
      </clipPath>
      <image
        href={GUILD_CLASS_IMAGE[payload.value]}
        x={left}
        y={top}
        width={ICON_SIZE}
        height={ICON_SIZE}
        clipPath={`url(#${clipId}-${payload.value})`}
      />
    </g>
  );
}

interface AttendanceSummaryCardProps {
  /** Session this card tallies */
  session: BattleSession;
  /** One row per guild class, in display order */
  rows: ClassAttendanceSummary[];
  /** X axis maximum, shared by every card so bar lengths are comparable */
  domainMax: number;
}

/**
 * One battle session's attendance, as seven horizontal stacked bars — one per guild class.
 * The frame repeats the week timeline's tile (`SessionLabel`, the subtitle, `sessionTintClass`), so
 * a day is recognised the same way here as everywhere else.
 * @param session - Session this card tallies
 * @param rows - Per-class counts for that session
 * @param domainMax - Shared X axis maximum
 * @returns The session's summary card
 */
export function AttendanceSummaryCard({
  session,
  rows,
  domainMax,
}: AttendanceSummaryCardProps) {
  // `useId` returns a value with characters an SVG id and a `url(#…)` reference cannot carry —
  // the same reason `ChartContainer` strips them from its own chart id.
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const answered = rows.reduce((sum, row) => sum + row.co + row.khong, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Card className={cn(sessionTintClass(session.isGuildWar))}>
      <CardHeader>
        <CardTitle>
          <SessionLabel session={session} />
        </CardTitle>
        <div className="text-xs font-medium text-muted-foreground">
          {getSessionSubtitle(session)} · đã điểm danh {answered}/{total}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG} className={CHART_HEIGHT}>
          <BarChart accessibilityLayer layout="vertical" data={rows}>
            <XAxis type="number" domain={[0, domainMax]} hide />
            <YAxis
              type="category"
              dataKey="guildClass"
              width={AXIS_WIDTH}
              tickLine={false}
              axisLine={false}
              tick={<ClassTick clipId={clipId} />}
            />
            <ChartTooltip
              cursor={CURSOR}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as
                      | ClassAttendanceSummary
                      | undefined;
                    if (!row) return null;

                    return `${GUILD_CLASS_LABEL[row.guildClass]} · ${row.total} thành viên`;
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="co"
              stackId="attendance"
              fill="var(--color-co)"
              barSize={BAR_SIZE}
              radius={BAR_RADIUS}
              background={TRACK}
            />
            <Bar
              dataKey="khong"
              stackId="attendance"
              fill="var(--color-khong)"
              barSize={BAR_SIZE}
              radius={BAR_RADIUS}
            />
            <Bar
              dataKey="chuaTraLoi"
              stackId="attendance"
              fill="var(--color-chuaTraLoi)"
              barSize={BAR_SIZE}
              radius={BAR_RADIUS}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
