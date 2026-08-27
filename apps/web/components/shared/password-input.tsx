"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password field with an eye button toggling visibility. Accepts every `Input` prop except `type` —
 * the input type follows the hidden/shown state.
 * @param className - Extra classes for the field
 * @returns The password field with its toggle
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {/* Leave room on the right for the eye button overlaying the input. */}
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
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
          {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
        </Button>
      </div>
    </div>
  );
}
