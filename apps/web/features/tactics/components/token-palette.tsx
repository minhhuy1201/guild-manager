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
  TOKEN_GROUP_LABELS,
  type BuiltInToken,
  type TokenGroup,
} from "../lib/built-in-tokens";
import { useTokenPresets } from "../hooks/use-token-presets";
import { TokenGlyph } from "./token-glyph";

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
}

/**
 * The token palette, in three groups: the named roles ("Quân hiệu"), the ten numbered teams
 * ("Đội"), and whatever an admin saved ("Custom").
 * Picking an entry arms the token tool; the next click on the map drops it there.
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
        collapsed ? "w-12" : "w-24"
      )}
    >
      <div className="flex items-center justify-between gap-1 py-2 pr-1 pl-2">
        <span
          className={cn(
            "text-[11px] font-medium tracking-wide text-muted-foreground uppercase transition-opacity duration-200",
            collapsed && "opacity-0"
          )}
        >
          Quân cờ
        </span>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={collapsed ? "Mở bảng quân cờ" : "Thu bảng quân cờ"}
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
            <section key={group} className="flex flex-col gap-1">
              <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
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
                              className="size-9 max-sm:size-9"
                              onClick={() => onSelect(token)}
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
