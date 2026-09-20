"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BUILT_IN_TOKENS, type BuiltInToken } from "../lib/built-in-tokens";
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
 * The token palette: the seventeen fixed entries first, then whatever an admin saved.
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
  const savedTokens: BuiltInToken[] = (presets.data ?? []).map((preset) => ({
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

  return (
    <div className="flex w-44 shrink-0 flex-col gap-1 border-r px-2 py-2">
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

      <ul className="flex flex-col gap-0.5 overflow-y-auto">
        {[...BUILT_IN_TOKENS, ...savedTokens].map((token) => {
          const Icon = tokenIcon(token.icon);

          return (
            <li key={token.label}>
              <Button
                type="button"
                size="sm"
                variant={selected?.label === token.label ? "default" : "ghost"}
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

      {isAdmin ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-1"
          onClick={onManagePresets}
        >
          <Plus />
          Thêm đội
        </Button>
      ) : null}
    </div>
  );
}
