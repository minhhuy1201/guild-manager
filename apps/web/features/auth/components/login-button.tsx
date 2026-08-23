"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logout } from "../api/login-action";
import { useAuthStore } from "../store/auth-store";
import { LoginDialog } from "./login-dialog";

interface LoginButtonProps {
  /** Tên quản trị viên đang đăng nhập (do server truyền xuống), null nếu chưa đăng nhập */
  username: string | null;
}

/**
 * Nút đăng nhập trên header. Khi đã đăng nhập thì hiển thị tên tài khoản và nút đăng xuất.
 * @param props.username - Tên quản trị viên đang đăng nhập, null nếu chưa đăng nhập
 * @returns Nút đăng nhập/đăng xuất kèm modal đăng nhập
 */
export function LoginButton({ username }: LoginButtonProps) {
  const router = useRouter();
  const setDialogOpen = useAuthStore((s) => s.setDialogOpen);
  const [isPending, startTransition] = useTransition();

  /** Đăng xuất: xóa cookie phiên rồi làm mới dữ liệu server để ẩn route quản trị. */
  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      router.replace("/");
      router.refresh();
    });
  };

  if (username) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="hidden text-sm font-medium sm:inline">{username}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={handleLogout}
                disabled={isPending}
              />
            }
          >
            <LogOut />
            <span className="sr-only">Đăng xuất</span>
          </TooltipTrigger>
          <TooltipContent>Đăng xuất</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => setDialogOpen(true)}
            />
          }
        >
          <LogIn />
          <span className="sr-only">Đăng nhập</span>
        </TooltipTrigger>
        <TooltipContent>Đăng nhập</TooltipContent>
      </Tooltip>
      <LoginDialog />
    </>
  );
}
