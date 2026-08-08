"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Ô nhập mật khẩu kèm nút con mắt bật/tắt hiển thị. Nhận mọi prop của `Input`
 * trừ `type` — kiểu input do trạng thái ẩn/hiện quyết định.
 * @param className - Class bổ sung cho ô nhập
 * @returns Ô nhập mật khẩu kèm nút hiện/ẩn
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {/* Chừa chỗ bên phải cho nút con mắt nằm đè lên input. */}
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      {/*
        Căn giữa bằng flex chứ không phải -translate-y-1/2: Button dùng
        translate-y cho hiệu ứng nhún lúc bấm, đặt cả hai lên cùng một phần tử
        thì nút rơi xuống nửa chiều cao mỗi lần click.
      */}
      <div className="absolute inset-y-0 right-0.5 flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
