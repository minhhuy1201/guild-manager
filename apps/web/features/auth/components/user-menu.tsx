"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Cat, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { logout } from "../api/login-action";
import { accountInitials } from "../lib/account-initials";
import { discordAvatarUrl } from "../lib/discord-avatar";

interface UserMenuProps {
  /** Label of the signed-in user — character name or Discord name, null when unknown */
  label: string | null;
  /** Discord ID, used to build the avatar URL */
  discordId: string;
  /** Discord avatar hash from the last login, null on the default picture */
  avatarHash: string | null;
  /** Whether the viewer may open the cat race screen */
  canRaceCats: boolean;
}

/**
 * The account avatar in the header; clicking it opens a menu holding the cat race entry and Sign out.
 *
 * The header shows the avatar alone, so the name moves into the menu as its label — the shadcn
 * account-menu pattern: identity at the top, the destructive action last, a separator between them.
 *
 * Only rendered with a session: a signed-out visitor cannot reach any page other than `/dang-nhap`, so
 * there is no signed-out branch here.
 * @param props.label - Display label of the signed-in user
 * @param props.discordId - Discord ID used to build the avatar URL
 * @param props.avatarHash - Discord avatar hash
 * @param props.canRaceCats - Whether to show the cat race entry
 * @returns The account avatar that opens the menu
 */
export function UserMenu({
  label,
  discordId,
  avatarHash,
  canRaceCats,
}: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const avatarUrl = discordAvatarUrl(discordId, avatarHash);

  /** Sign out: clear the session cookies, then go to the login page. */
  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.replace(ROUTES.login);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={isPending}
            aria-label={label ? `Menu tài khoản — ${label}` : "Menu tài khoản"}
          />
        }
      >
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{accountInitials(label)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      {/*
        Opens rightwards, and flips to align on the right edge of the avatar when there is not enough
        room — `shift`, Base UI's default, only slides the menu and can still leave it clipped.
      */}
      <DropdownMenuContent
        align="start"
        collisionAvoidance={{ align: "flip" }}
        className="min-w-48"
      >
        {label && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate text-foreground">
                {label}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        {canRaceCats && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push(ROUTES.catRace)}>
                <Cat />
                Đua mèo
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
