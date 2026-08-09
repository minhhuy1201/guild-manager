"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, LoaderCircle, Save } from "lucide-react";

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
import { useCreateMember, useUpdateMember } from "../hooks/use-member-mutations";

interface MemberFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Thành viên đang sửa; null nghĩa là đang thêm mới */
  member: Member | null;
  /** Gọi khi dialog đóng lại */
  onOpenChange: (open: boolean) => void;
}

/**
 * Form thêm/sửa một thành viên.
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
 * Hai ô nhập của một thành viên: tên và lưu phái.
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
      } else {
        await createMutation.mutateAsync(input);
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không lưu được thay đổi."
      );
    }
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

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
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
