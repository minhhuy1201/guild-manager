"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
}

/**
 * The account avatar in the header; clicking it opens a menu holding Sign out.
 *
 * Only rendered with a session: a signed-out visitor cannot reach any page other than `/dang-nhap`, so
 * there is no signed-out branch here.
 * @param props.label - Display label of the signed-in user
 * @param props.discordId - Discord ID used to build the avatar URL
 * @param props.avatarHash - Discord avatar hash
 * @returns The account label and avatar that opens the menu
 */
export function UserMenu({ label, discordId, avatarHash }: UserMenuProps) {
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
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="hidden text-sm font-medium sm:inline">{label}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              disabled={isPending}
              aria-label="Menu tài khoản"
            />
          }
        >
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback>{accountInitials(label)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleLogout} disabled={isPending}>
              <LogOut />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
