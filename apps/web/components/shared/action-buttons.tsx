"use client";

import type { ComponentProps, ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Bộ nút thao tác dùng chung cho toàn app: thêm / sửa / xoá.
 *
 * Quy ước:
 * - Thêm mới → nút có chữ (`CreateButton`), đặt ở đầu hoặc cuối danh sách.
 * - Sửa / xoá trên từng dòng → nút icon (`EditAction`, `DeleteAction`) bọc trong
 *   `RowActions`, luôn có tooltip + `sr-only` để vừa gợi ý được bằng chuột
 *   vừa đọc được bằng trình đọc màn hình.
 */

type ButtonVariant = ComponentProps<typeof Button>["variant"];

interface CreateButtonProps {
  /** Chữ trên nút, vd "Thêm thành viên" */
  label: string;
  /** Icon đứng trước chữ, mặc định dấu cộng */
  icon?: ReactNode;
  /** Kiểu nút, mặc định `default` (nhấn mạnh hành động chính) */
  variant?: ButtonVariant;
  /** Class bổ sung cho nút */
  className?: string;
  /** Gọi khi bấm nút */
  onClick: () => void;
}

/**
 * Nút thêm mới: luôn hiện chữ vì đây là hành động chính, không nên bắt đoán icon.
 * @param label - Chữ trên nút
 * @param icon - Icon đứng trước chữ
 * @param variant - Kiểu nút
 * @param className - Class bổ sung
 * @param onClick - Gọi khi bấm nút
 * @returns Nút thêm mới
 */
export function CreateButton({
  label,
  icon = <Plus className="size-4" />,
  variant = "default",
  className,
  onClick,
}: CreateButtonProps) {
  return (
    <Button variant={variant} className={className} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

interface RowActionsProps {
  /** Các nút thao tác của dòng */
  children: ReactNode;
  /** Class bổ sung cho nhóm */
  className?: string;
}

/**
 * Nhóm các nút thao tác của một dòng để khoảng cách giữa chúng đồng nhất.
 * @param children - Các nút thao tác
 * @param className - Class bổ sung
 * @returns Nhóm nút thao tác
 */
export function RowActions({ children, className }: RowActionsProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {children}
    </div>
  );
}

interface RowActionButtonProps {
  /** Nhãn dùng cho cả tooltip lẫn trình đọc màn hình */
  label: string;
  /** Icon của nút */
  icon: ReactNode;
  /** Kiểu nút, mặc định `ghost` để không cạnh tranh với nội dung dòng */
  variant?: ButtonVariant;
  /** Khoá nút (vd đã quá hạn chỉnh sửa) */
  disabled?: boolean;
  /** Class bổ sung cho nút */
  className?: string;
  /** Gọi khi bấm nút */
  onClick: () => void;
}

/**
 * Nút icon kèm tooltip cho thao tác trên một dòng.
 * Là nền của `EditAction`/`DeleteAction`; dùng trực tiếp cho các thao tác khác
 * (huỷ, xác nhận…) để giữ đúng một kiểu nút icon trong bảng.
 * @param label - Nhãn cho tooltip và trình đọc màn hình
 * @param icon - Icon của nút
 * @param variant - Kiểu nút
 * @param disabled - Khoá nút
 * @param className - Class bổ sung
 * @param onClick - Gọi khi bấm nút
 * @returns Nút icon kèm tooltip
 */
export function RowActionButton({
  label,
  icon,
  variant = "ghost",
  disabled,
  className,
  onClick,
}: RowActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon-sm"
            disabled={disabled}
            className={className}
            onClick={onClick}
          />
        }
      >
        {icon}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type ActionButtonProps = Omit<RowActionButtonProps, "icon" | "label"> & {
  /** Nhãn ghi đè, dùng khi cần nói rõ đối tượng (vd "Sửa Mèo Mập") */
  label?: string;
};

/**
 * Nút sửa của một dòng.
 * @param label - Nhãn ghi đè, mặc định "Sửa"
 * @param props - Các thuộc tính còn lại của nút thao tác
 * @returns Nút sửa
 */
export function EditAction({ label = "Sửa", ...props }: ActionButtonProps) {
  return (
    <RowActionButton
      label={label}
      icon={<Pencil className="size-4" />}
      {...props}
    />
  );
}

/**
 * Nút xoá của một dòng, luôn tô màu destructive để phân biệt hành động phá huỷ.
 * @param label - Nhãn ghi đè, mặc định "Xoá"
 * @param className - Class bổ sung
 * @param props - Các thuộc tính còn lại của nút thao tác
 * @returns Nút xoá
 */
export function DeleteAction({
  label = "Xoá",
  className,
  ...props
}: ActionButtonProps) {
  return (
    <RowActionButton
      label={label}
      icon={<Trash2 className="size-4" />}
      className={cn("text-destructive", className)}
      {...props}
    />
  );
}
