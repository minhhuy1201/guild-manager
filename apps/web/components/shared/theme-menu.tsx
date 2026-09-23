"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The two themes, in the order the menu lists them. The values are next-themes' theme names. */
const THEME_OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
] as const;

/**
 * The "Giao diện" group of a dropdown menu: one radio item per theme, the active one checked.
 *
 * Rendered only inside an open menu, so it never takes part in the server render - next-themes
 * knows the stored theme by the time it shows, and no mounted-check is needed.
 * @returns The labelled radio group switching the theme
 */
export function ThemeRadioItems() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Giao diện</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={theme}
        onValueChange={(value: string) => setTheme(value)}
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <Icon />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

/**
 * The theme switcher for a signed-out visitor, who has no account menu to hold it: an icon button
 * opening the same "Giao diện" group.
 * @returns The icon button and its theme menu
 */
export function ThemeMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Giao diện" />}
      >
        <Palette />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <ThemeRadioItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
