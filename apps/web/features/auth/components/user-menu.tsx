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
  /** Nhãn của người đang đăng nhập — tên nhân vật hoặc tên Discord, null khi chưa đọc được */
  label: string | null;
  /** Discord ID, dùng để dựng URL avatar */
  discordId: string;
  /** Hash avatar Discord đọc ở lần đăng nhập gần nhất, null khi để ảnh mặc định */
  avatarHash: string | null;
}

/**
 * Avatar tài khoản trên header, bấm vào mở menu chứa mục Đăng xuất.
 *
 * Chỉ render khi đã có phiên: khách chưa đăng nhập không đi tới được trang nào ngoài
 * `/dang-nhap`, nên không có nhánh "chưa đăng nhập" ở đây.
 * @param props.label - Nhãn hiển thị của người đang đăng nhập
 * @param props.discordId - Discord ID để dựng URL avatar
 * @param props.avatarHash - Hash avatar Discord
 * @returns Nhãn tài khoản kèm avatar mở được menu
 */
export function UserMenu({ label, discordId, avatarHash }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const avatarUrl = discordAvatarUrl(discordId, avatarHash);

  /** Đăng xuất: xóa cookie phiên rồi đưa về trang đăng nhập. */
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
