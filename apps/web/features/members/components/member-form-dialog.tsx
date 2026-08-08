"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Check, Copy } from "lucide-react";

import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@shared/enums";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import type { Member } from "../types/member";
import {
  useCreateMember,
  useResetMemberPassword,
  useUpdateMember,
} from "../hooks/use-member-mutations";

/** Thời gian giữ icon dấu tích sau khi copy (ms). */
const COPIED_FEEDBACK_MS = 1500;

interface MemberFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Thành viên đang sửa; null nghĩa là đang thêm mới */
  member: Member | null;
  /** Gọi khi dialog đóng lại */
  onOpenChange: (open: boolean) => void;
}

/**
 * Form thêm/sửa một thành viên. Thêm xong thì dialog chuyển sang màn kết quả
 * hiện tên + mật khẩu vừa cấp để copy gửi cho họ.
 * @param open - Dialog đang mở hay không
 * @param member - Thành viên đang sửa; null nghĩa là thêm mới
 * @param onOpenChange - Gọi khi dialog đóng lại
 * @returns Dialog form
 */
export function MemberFormDialog({
  open,
  member,
  onOpenChange,
}: MemberFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form nằm ở component con nên state tự reset mỗi lần mở lại. */}
        {open && (
          <MemberForm member={member} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MemberFormProps {
  /** Thành viên đang sửa; null nghĩa là thêm mới */
  member: Member | null;
  /** Gọi khi đóng dialog */
  onDone: () => void;
}

/**
 * Hai ô nhập của một thành viên: tên và lưu phái, kèm nút cấp lại mật khẩu khi sửa.
 * @param member - Thành viên đang sửa; null nghĩa là thêm mới
 * @param onDone - Gọi khi đóng dialog
 * @returns Form thêm/sửa thành viên
 */
function MemberForm({ member, onDone }: MemberFormProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [guildClass, setGuildClass] = useState<GuildClass>(
    member?.guildClass ?? GUILD_CLASS_OPTIONS[0]
  );
  const [error, setError] = useState<string | null>(null);
  /** Thành viên vừa tạo — có giá trị thì dialog chuyển sang màn kết quả. */
  const [created, setCreated] = useState<Member | null>(null);

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const saving = createMutation.isPending || updateMutation.isPending;

  /**
   * Gửi form: tạo mới hoặc cập nhật tuỳ theo đang sửa ai.
   * @param event - Sự kiện submit form
   * @returns Promise hoàn tất khi đã lưu xong hoặc đã hiển thị lỗi
   */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = { name: name.trim(), guildClass };

    try {
      if (member) {
        await updateMutation.mutateAsync({ id: member.id, input });
        onDone();
      } else {
        setCreated(await createMutation.mutateAsync(input));
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không lưu được thay đổi."
      );
    }
  }

  if (created) {
    return <CreatedMember member={created} onDone={onDone} />;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {member ? "Sửa thành viên" : "Thêm thành viên"}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-name">Tên</Label>
        <Input
          id="member-name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-class">Lưu phái</Label>
        <Select
          value={guildClass}
          onValueChange={(next) => setGuildClass(String(next) as GuildClass)}
        >
          <SelectTrigger id="member-class" className="w-full">
            <SelectValue>
              {() => <GuildClassOption guildClass={guildClass} />}
            </SelectValue>
          </SelectTrigger>
          {/* Mở như popover dưới trigger thay vì neo item đang chọn vào trigger. */}
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_CLASS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                <GuildClassOption guildClass={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {member && <ResetPasswordButton member={member} onError={setError} />}

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface GuildClassOptionProps {
  /** Lưu phái cần hiển thị */
  guildClass: GuildClass;
}

/**
 * Một dòng lưu phái trong select: icon rồi tới tên, giống ô lọc lưu phái.
 * @param guildClass - Lưu phái cần hiển thị
 * @returns Icon kèm tên lưu phái
 */
function GuildClassOption({ guildClass }: GuildClassOptionProps) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src={GUILD_CLASS_IMAGE[guildClass]}
        alt=""
        width={20}
        height={20}
        className="size-5 rounded-sm object-cover"
      />
      {GUILD_CLASS_LABEL[guildClass]}
    </span>
  );
}

interface ResetPasswordButtonProps {
  /** Thành viên đang sửa */
  member: Member;
  /** Gọi khi cấp lại mật khẩu thất bại */
  onError: (message: string) => void;
}

/**
 * Nút cấp lại mật khẩu, có một bước xác nhận ngay tại chỗ vì thao tác này
 * làm mật khẩu cũ hết hiệu lực ngay lập tức.
 * @param member - Thành viên đang sửa
 * @param onError - Gọi khi cấp lại mật khẩu thất bại
 * @returns Nút cấp lại mật khẩu
 */
function ResetPasswordButton({ member, onError }: ResetPasswordButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const resetMutation = useResetMemberPassword();

  /**
   * Cấp lại mật khẩu mới cho thành viên đang sửa.
   * @returns Promise hoàn tất khi đã cấp xong hoặc đã báo lỗi
   */
  async function handleReset() {
    try {
      await resetMutation.mutateAsync(member.id);
      setConfirming(false);
    } catch (caught) {
      onError(
        caught instanceof ApiError
          ? caught.message
          : "Không cấp lại được mật khẩu."
      );
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setConfirming(true)}
      >
        Cấp lại mật khẩu
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <p className="mb-2">
        Mật khẩu cũ của {member.name} sẽ hết hiệu lực ngay. Tiếp tục?
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={resetMutation.isPending}
          onClick={handleReset}
        >
          {resetMutation.isPending ? "Đang cấp…" : "Cấp lại"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
        >
          Huỷ
        </Button>
      </div>
    </div>
  );
}

interface CreatedMemberProps {
  /** Thành viên vừa tạo */
  member: Member;
  /** Gọi khi đóng dialog */
  onDone: () => void;
}

/**
 * Màn kết quả sau khi thêm: hiện tên và mật khẩu vừa cấp để copy gửi cho thành viên.
 * Đóng lại là thôi — mật khẩu vẫn xem lại được ở bảng.
 * @param member - Thành viên vừa tạo
 * @param onDone - Gọi khi đóng dialog
 * @returns Nội dung màn kết quả
 */
function CreatedMember({ member, onDone }: CreatedMemberProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Chép cả tên lẫn mật khẩu để dán thẳng vào tin nhắn.
   * @returns Promise hoàn tất khi đã chép xong
   */
  async function handleCopy() {
    await navigator.clipboard.writeText(`${member.name}: ${member.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Đã thêm {member.name}</DialogTitle>
      </DialogHeader>

      <div className="rounded-lg border p-3">
        <div className="text-sm text-muted-foreground">Mật khẩu điểm danh</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg">{member.password}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy tên và mật khẩu"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Gửi mật khẩu này cho thành viên. Xem lại được bất cứ lúc nào ở bảng.
      </p>

      <DialogFooter>
        <Button onClick={onDone}>Xong</Button>
      </DialogFooter>
    </div>
  );
}
