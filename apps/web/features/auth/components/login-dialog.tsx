"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../api/login-action";
import { useAuthStore } from "../store/auth-store";

/**
 * Modal đăng nhập quản trị.
 * Form nằm ở component con nên state tự reset mỗi lần mở lại (popup unmount khi đóng).
 * @returns Dialog đăng nhập
 */
export function LoginDialog() {
  const isOpen = useAuthStore((s) => s.isDialogOpen);
  const setDialogOpen = useAuthStore((s) => s.setDialogOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Form đăng nhập: nhập tên đăng nhập + mật khẩu, xác thực qua server action.
 * @returns Form đăng nhập
 */
function LoginForm() {
  const router = useRouter();
  const setDialogOpen = useAuthStore((s) => s.setDialogOpen);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Xử lý submit form đăng nhập: gọi server action, hiển thị lỗi nếu thất bại.
   * @param event - Sự kiện submit form
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await login(username, password);
    if (!result.success) {
      setError(result.message ?? "Đăng nhập thất bại.");
      setSubmitting(false);
      return;
    }

    // Cookie phiên đã được ghi ở server → refresh để layout server render lại
    // (hiện tên tài khoản và route dành cho quản trị).
    setDialogOpen(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-username">Tên đăng nhập</Label>
        <Input
          id="login-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nhập tên đăng nhập..."
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Mật khẩu</Label>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu..."
        />
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDialogOpen(false)}
          disabled={submitting}
        >
          Huỷ
        </Button>
        <Button
          type="submit"
          disabled={
            submitting || username.trim() === "" || password.trim() === ""
          }
        >
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </DialogFooter>
    </form>
  );
}
