"use client";

import { useState } from "react";
import Image from "next/image";
import { AtSign, Save, ShieldCheck, Swords, UserRound } from "lucide-react";

import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  GUILD_ROLE_LABEL,
  GUILD_ROLE_OPTIONS,
  GuildRole,
  type GuildClass,
} from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import { MutationDialogShell } from "@/components/shared/mutation-dialog";
import { MutationForm } from "@/components/shared/mutation-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { useSession } from "@/features/auth";
import {
  useCreateMember,
  useUpdateMember,
} from "../hooks/use-member-mutations";

interface MemberFormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Member being edited; null means creating */
  member: GuildMember | null;
  /** Called when the dialog closes */
  onOpenChange: (open: boolean) => void;
}

/**
 * The create/edit member form.
 * @param open - Whether the dialog is open
 * @param member - Member being edited; null means creating
 * @param onOpenChange - Called when the dialog closes
 * @returns The form dialog
 */
export function MemberFormDialog({
  open,
  member,
  onOpenChange,
}: MemberFormDialogProps) {
  return (
    // The shell only mounts the body while open, so the form state resets on every open.
    <MutationDialogShell open={open} onOpenChange={onOpenChange}>
      <MemberForm member={member} onDone={() => onOpenChange(false)} />
    </MutationDialogShell>
  );
}

interface MemberFormProps {
  /** Member being edited; null means creating */
  member: GuildMember | null;
  /** Called when the dialog closes */
  onDone: () => void;
}

/**
 * A member's input fields: name, class, Discord ID and role.
 * @param member - Member being edited; null means creating
 * @param onDone - Called when the dialog closes
 * @returns The create/edit member form
 */
function MemberForm({ member, onDone }: MemberFormProps) {
  const { data: session } = useSession();
  const [name, setName] = useState(member?.name ?? "");
  const [guildClass, setGuildClass] = useState<GuildClass>(
    member?.guildClass ?? GUILD_CLASS_OPTIONS[0],
  );
  const [discordId, setDiscordId] = useState(member?.discordId ?? "");
  const [role, setRole] = useState<GuildRole>(member?.role ?? GuildRole.MEMBER);

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  // A role is meaningless without a Discord ID; and nobody may demote themselves.
  const isRoleLocked =
    discordId.trim() === "" || member?.discordId === session?.discordId;

  return (
    <MutationForm
      title={member ? "Sửa thành viên" : "Thêm thành viên"}
      submitLabel="Lưu"
      pendingLabel="Đang lưu…"
      submitIcon={<Save />}
      fallbackError="Không lưu được thay đổi."
      onDone={onDone}
      run={async () => {
        // The backend takes null for "no Discord account yet", and unlinks on it when editing.
        const input = {
          name: name.trim(),
          guildClass,
          discordId: discordId.trim() || null,
        };

        if (member) {
          await updateMutation.mutateAsync({
            id: member.id,
            input: {
              ...input,
              // Locked means the picker could not be touched — the member keeps the role they have.
              ...(isRoleLocked ? {} : { role }),
            },
          });
          return;
        }
        await createMutation.mutateAsync(input);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="member-name" icon={<UserRound />}>
          Tên
        </FieldLabel>
        <Input
          id="member-name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="member-discord-id" icon={<AtSign />}>
          Discord ID
        </FieldLabel>
        <Input
          id="member-discord-id"
          inputMode="numeric"
          placeholder="17–19 chữ số, để trống nếu chưa gán"
          value={discordId}
          onChange={(event) => setDiscordId(event.target.value)}
        />
      </div>

      {/* Only a saved member has a role to change: a new one always starts as MEMBER. */}
      {member && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="member-role" icon={<ShieldCheck />}>
            Quyền
          </FieldLabel>
          <Select
            value={role}
            disabled={isRoleLocked}
            onValueChange={(next) => setRole(String(next) as GuildRole)}
          >
            <SelectTrigger id="member-role" className="w-full">
              <SelectValue>{() => GUILD_ROLE_LABEL[role]}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {GUILD_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {GUILD_ROLE_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isRoleLocked && (
            <p className="text-xs text-muted-foreground">
              {member.discordId === session?.discordId
                ? "Không thể tự đổi quyền của chính mình."
                : "Cần gán Discord ID trước khi đổi quyền."}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="member-class" icon={<Swords />}>
          Lưu phái
        </FieldLabel>
        <Select
          value={guildClass}
          onValueChange={(next) => setGuildClass(String(next) as GuildClass)}
        >
          <SelectTrigger id="member-class" className="w-full">
            <SelectValue>
              {() => <GuildClassOption guildClass={guildClass} />}
            </SelectValue>
          </SelectTrigger>
          {/* Open as a popover under the trigger instead of anchoring the selected item to it. */}
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
  /** Class to display */
  guildClass: GuildClass;
}

/**
 * One class row in the select: icon then name, like the class filter.
 * @param guildClass - Class to display
 * @returns The icon with the class name
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
