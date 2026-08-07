"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Member } from "../types/member";

/** Thời gian giữ icon dấu tích sau khi copy (ms). */
const COPIED_FEEDBACK_MS = 1500;

interface PasswordCellProps {
  /** Mật khẩu điểm danh của thành viên */
  password: string;
}

/**
 * Ô mật khẩu: mặc định che, bấm con mắt để hiện, bấm copy để chép.
 * Che sẵn để lúc chia sẻ màn hình không phơi mật khẩu của cả bang.
 * @param password - Mật khẩu điểm danh của thành viên
 * @returns Ô mật khẩu kèm hai nút
 */
export function PasswordCell({ password }: PasswordCellProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Chép mật khẩu vào clipboard rồi đổi icon trong giây lát làm phản hồi.
   * @returns Promise hoàn tất khi đã chép xong
   */
  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm">
        {visible ? password : "••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copy mật khẩu"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
}

interface MemberRowProps {
  /** Thành viên của hàng này */
  member: Member;
  /** Gọi khi bấm Sửa */
  onEdit: (member: Member) => void;
  /** Gọi khi bấm Xoá */
  onDelete: (member: Member) => void;
}

/**
 * Một hàng thành viên trong bảng quản lý.
 * @param member - Thành viên của hàng này
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @returns Hàng bảng
 */
export function MemberRow({ member, onEdit, onDelete }: MemberRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell>{GUILD_CLASS_LABEL[member.guildClass]}</TableCell>
      <TableCell>
        <PasswordCell password={member.password} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Sửa ${member.name}`}
          onClick={() => onEdit(member)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Xoá ${member.name}`}
          onClick={() => onDelete(member)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
