"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  INSIGNIA_TOKENS,
  TEAM_TOKENS,
  TOKEN_GROUP_LABELS,
  type BuiltInToken,
  type TokenGroup,
} from "../lib/built-in-tokens";
import { useTokenPresets } from "../hooks/use-token-presets";
import { tokenIcon } from "../lib/token-icon";

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

  if (collapsed) {
    return (
      <div className="flex flex-col items-center border-r px-1 py-2">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Mở bảng quân cờ"
          onClick={onToggle}
        >
          <ChevronRight />
        </Button>
      </div>
    );
  }

  const groups: { group: TokenGroup; tokens: readonly BuiltInToken[] }[] = [
    { group: "insignia", tokens: INSIGNIA_TOKENS },
    { group: "team", tokens: TEAM_TOKENS },
    { group: "custom", tokens: customTokens },
  ];

  return (
    <div className="flex w-48 shrink-0 flex-col gap-2 border-r px-2 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Quân cờ
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Thu bảng quân cờ"
          onClick={onToggle}
        >
          <ChevronLeft />
        </Button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {groups.map(({ group, tokens }) =>
          // The custom group keeps its heading even while empty, so the "Thêm đội" button below it
          // has something to belong to.
          tokens.length === 0 && group !== "custom" ? null : (
            <section key={group} className="flex flex-col gap-0.5">
              <h3 className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {TOKEN_GROUP_LABELS[group]}
              </h3>

              {tokens.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">
                  Chưa có quân cờ tự đặt.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {tokens.map((token) => {
                    const Icon = tokenIcon(token.icon);

                    return (
                      <li key={token.label}>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            selected?.label === token.label ? "default" : "ghost"
                          }
                          aria-pressed={selected?.label === token.label}
                          className="w-full justify-start"
                          onClick={() => onSelect(token)}
                        >
                          <Icon />
                          {token.label}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )
        )}
      </div>

      {isAdmin ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-auto"
          onClick={onManagePresets}
        >
          <Plus />
          Thêm đội
        </Button>
      ) : null}
    </div>
  );
}
