"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";
import { logout } from "../api/login-action";

interface LoginButtonProps {
  /** Nhãn của người đang đăng nhập — tên nhân vật hoặc tên Discord, null khi chưa đọc được */
  label: string | null;
}

/**
 * Nhãn tài khoản và nút đăng xuất trên header.
 * Chỉ render khi đã có phiên: khách chưa đăng nhập không đi tới được trang nào ngoài
 * `/dang-nhap`, nên không còn nhánh "chưa đăng nhập" ở đây nữa.
 * @param props.label - Nhãn hiển thị của người đang đăng nhập
 * @returns Nhãn tài khoản kèm nút đăng xuất
 */
export function LoginButton({ label }: LoginButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
