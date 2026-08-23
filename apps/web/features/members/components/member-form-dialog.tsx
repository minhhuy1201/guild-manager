"use client";

import { useState } from "react";
import Image from "next/image";
import { Save } from "lucide-react";

import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { useCreateMember, useUpdateMember } from "../hooks/use-member-mutations";

interface MemberFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Thành viên đang sửa; null nghĩa là đang thêm mới */
  member: Character | null;
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
    // Vỏ chỉ mount thân khi mở, nên state của form tự reset mỗi lần mở lại.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <MemberForm member={member} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface MemberFormProps {
  /** Thành viên đang sửa; null nghĩa là thêm mới */
  member: Character | null;
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

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  return (
    <MutationForm
      title={member ? "Sửa thành viên" : "Thêm thành viên"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu…"
      submitIcon={<Save />}
      fallbackError="Không lưu được thay đổi."
      onDone={onDone}
      run={async () => {
        const input = { name: name.trim(), guildClass };

        if (member) {
          await updateMutation.mutateAsync({ id: member.id, input });
          return;
        }
        await createMutation.mutateAsync(input);
      }}
    >
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
    </MutationForm>
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
