"use client";

import { ChevronLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  INSIGNIA_TOKENS,
  TEAM_TOKENS,
  TOKEN_DRAG_TYPE,
  TOKEN_GROUP_LABELS,
  type BuiltInToken,
  type TokenGroup,
} from "../lib/built-in-tokens";
import { useTokenPresets } from "../hooks/use-token-presets";
import { TokenGlyph } from "./token-glyph";

/**
 * The tint each group wears, off the three accents the app already uses: gold for the named roles,
 * the brand indigo for the numbered teams, jade for whatever an admin saved. The box and its
 * heading share one hue, so the column reads as three shelves rather than one long list.
 */
const GROUP_STYLES: Record<TokenGroup, { box: string; hue: string }> = {
  insignia: { box: "border-gold/35 bg-gold/10", hue: "var(--gold)" },
  team: { box: "border-primary/25 bg-primary/8", hue: "var(--primary)" },
  custom: { box: "border-jade/35 bg-jade/10", hue: "var(--jade)" },
};

/**
 * A heading in its group's hue, pulled towards the page's text colour so it stays readable on both
 * themes — gold at full strength is a light wash on a light card.
 * @param hue - The group's colour
 * @returns The colour to set on the heading
 */
function headingColor(hue: string): string {
  return `color-mix(in oklch, ${hue}, var(--foreground) 40%)`;
}

interface TokenPaletteProps {
  /** Whether the palette is folded away */
  collapsed: boolean;
  /** Whether the viewer may write */
  isAdmin: boolean;
  /** Palette entry the next click on the map drops */
  selected: BuiltInToken | null;
  onToggle: () => void;
  onSelect: (token: BuiltInToken) => void;
  onManagePresets: () => void;
  /** An entry started being dragged towards the map */
  onDragStart: (token: BuiltInToken) => void;
  /** That drag ended, dropped or cancelled */
  onDragEnd: () => void;
}

/**
 * The token palette, in three groups: the named roles ("Quân hiệu"), the ten numbered teams
 * ("Đội"), and whatever an admin saved ("Custom").
 * Picking an entry arms the token tool; the next click on the map drops it there. Dragging an entry
 * onto the map drops it where it is let go, in one move.
 *
 * Entries show their icon alone and carry the name as a tooltip plus `sr-only` text: the column
 * stays narrow next to the map, and every entry is still reachable by name.
 * Collapsing changes the width of this same element rather than swapping it for another one, which
 * is what lets the fold animate instead of jumping.
 * @param props - The palette state and its callbacks
 * @returns The palette column
 */
export function TokenPalette({
  collapsed,
  isAdmin,
  selected,
  onToggle,
  onSelect,
  onManagePresets,
  onDragStart,
  onDragEnd,
}: TokenPaletteProps) {
  const presets = useTokenPresets();
  const customTokens: BuiltInToken[] = (presets.data ?? []).map((preset) => ({
    label: preset.label,
    icon: preset.icon,
  }));

  const groups: { group: TokenGroup; tokens: readonly BuiltInToken[] }[] = [
    { group: "insignia", tokens: INSIGNIA_TOKENS },
    { group: "team", tokens: TEAM_TOKENS },
    { group: "custom", tokens: customTokens },
  ];

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-r transition-[width] duration-300 ease-out",
        collapsed ? "w-12" : "w-28"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 py-2 transition-[padding] duration-300 ease-out",
          collapsed ? "justify-center px-1" : "justify-between pr-1 pl-2"
        )}
      >
        {/* The title gives up its width when folded: left at its own, it pushed the toggle past
            the folded column's edge, and `overflow-hidden` clipped the only way back open. */}
        <span
          className={cn(
            "overflow-hidden text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase transition-all duration-200",
            collapsed && "w-0 opacity-0"
          )}
        >
          Quân cờ
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0"
          aria-label={collapsed ? "Mở bảng quân cờ" : "Thu bảng quân cờ"}
          title={collapsed ? "Mở bảng quân cờ" : "Thu bảng quân cờ"}
          onClick={onToggle}
        >
          <ChevronLeft
            className={cn(
              "transition-transform duration-300 ease-out",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Kept mounted while folded, so the width can animate; `inert` takes it out of the page. */}
      <div
        inert={collapsed}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-2 pb-2 transition-opacity duration-200",
          collapsed && "opacity-0"
        )}
      >
        {groups.map(({ group, tokens }) =>
          // The custom group keeps its heading even while empty, so the "Thêm đội" button below it
          // has something to belong to.
          tokens.length === 0 && group !== "custom" ? null : (
            <section
              key={group}
              className={cn(
                "flex flex-col gap-1 rounded-lg border p-1.5",
                GROUP_STYLES[group].box
              )}
            >
              <h3
                className="text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: headingColor(GROUP_STYLES[group].hue) }}
              >
                {TOKEN_GROUP_LABELS[group]}
              </h3>

              {tokens.length === 0 ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Chưa có quân cờ tự đặt.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-1">
                  {tokens.map((token) => (
                    <li key={token.label}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              size="icon-sm"
                              variant={
                                selected?.label === token.label
                                  ? "default"
                                  : "ghost"
                              }
                              aria-pressed={selected?.label === token.label}
                              className="size-9 max-sm:size-9 transition-colors hover:bg-primary/15 hover:text-primary"
                              onClick={() => onSelect(token)}
                              draggable
                              onDragStart={(event) => {
                                // Firefox starts no drag with an empty payload.
                                event.dataTransfer.setData(
                                  TOKEN_DRAG_TYPE,
                                  token.label
                                );
                                event.dataTransfer.effectAllowed = "copy";
                                onDragStart(token);
                              }}
                              onDragEnd={onDragEnd}
                            />
                          }
                        >
                          <TokenGlyph icon={token.icon} />
                          <span className="sr-only">{token.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {token.label}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        )}
      </div>

      {/* Outside the scrolling list, so it stays reachable however long the palette grows. */}
      {isAdmin ? (
        <div
          inert={collapsed}
          className={cn(
            "px-2 pb-2 transition-opacity duration-200",
            collapsed && "opacity-0"
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="size-9 max-sm:size-9"
                  onClick={onManagePresets}
                />
              }
            >
              <Plus />
              <span className="sr-only">Thêm đội</span>
            </TooltipTrigger>
            <TooltipContent side="right">Thêm đội</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </aside>
  );
}
