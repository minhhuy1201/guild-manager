"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-1">
        <span className="hidden text-sm font-medium sm:inline">{username}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isPending}
          aria-label="Đăng xuất"
        >
          <LogOut />
          <span className="hidden sm:inline">Đăng xuất</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <LogIn />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Button>
      <LoginDialog />
    </>
  );
}
