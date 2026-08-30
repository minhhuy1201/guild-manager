"use client";

import { GuildRole, GUILD_ROLE_LABEL } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

/** Badge variant per role: the administrator stands out, everyone else stays quiet. */
const ROLE_BADGE_VARIANT: Record<
  GuildRole,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  [GuildRole.ADMIN]: "default",
  [GuildRole.MEMBER]: "outline",
};

interface MemberRowProps {
  /** Member of this row */
  member: GuildMember;
  /** Called on Edit */
  onEdit: (member: GuildMember) => void;
  /** Called on Delete */
  onDelete: (member: GuildMember) => void;
}

/**
 * One member row in the management table. Read-only: every change goes through the member form.
 * @param props.member - Member of this row
 * @param props.onEdit - Called on Edit
 * @param props.onDelete - Called on Delete
 * @returns The table row
 */
export function MemberRow({ member, onEdit, onDelete }: MemberRowProps) {
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
        <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
          {GUILD_ROLE_LABEL[member.role]}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
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
