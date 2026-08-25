"use client";

import {
  GUILD_ROLE_LABEL,
  GUILD_ROLE_OPTIONS,
  type GuildRole,
} from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

interface MemberRowProps {
  /** Member of this row */
  member: GuildMember;
  /** Discord ID of the signed-in user — used to lock the role dropdown on their own row */
  currentDiscordId: string;
  /** Called on Edit */
  onEdit: (member: GuildMember) => void;
  /** Called on Delete */
  onDelete: (member: GuildMember) => void;
  /** Called when this member's role changes */
  onRoleChange: (member: GuildMember, role: GuildRole) => void;
}

/**
 * One member row in the management table.
 * @param props.member - Member of this row
 * @param props.currentDiscordId - Discord ID of the signed-in user
 * @param props.onEdit - Called on Edit
 * @param props.onDelete - Called on Delete
 * @param props.onRoleChange - Called when the role changes
 * @returns The table row
 */
export function MemberRow({
  member,
  currentDiscordId,
  onEdit,
  onDelete,
  onRoleChange,
}: MemberRowProps) {
  // A role is meaningless without a Discord ID; and nobody may demote themselves.
  const isRoleLocked =
    member.discordId === null || member.discordId === currentDiscordId;

  return (
    <TableRow>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell>
        <GuildClassIcon guildClass={member.guildClass} />
      </TableCell>
      <TableCell>
        {member.discordId === null ? (
          <span className="text-sm text-muted-foreground">Chưa liên kết</span>
        ) : (
          <div className="flex flex-col">
            <span className="text-sm">
              {member.discordUsername ?? member.discordId}
            </span>
            <span className="text-xs text-muted-foreground">
              {member.lastLoginAt
                ? formatDateTime(member.lastLoginAt)
                : "Chưa đăng nhập lần nào"}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <Select
          value={member.role}
          disabled={isRoleLocked}
          onValueChange={(next) => onRoleChange(member, String(next) as GuildRole)}
        >
          <SelectTrigger
            aria-label={`Quyền của ${member.name}`}
            className="w-36"
          >
            <SelectValue>{() => GUILD_ROLE_LABEL[member.role]}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {GUILD_ROLE_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <RowActions>
          <EditAction
            label={`Sửa ${member.name}`}
            onClick={() => onEdit(member)}
          />
          <DeleteAction
            label={`Xoá ${member.name}`}
            onClick={() => onDelete(member)}
          />
        </RowActions>
      </TableCell>
    </TableRow>
  );
}
