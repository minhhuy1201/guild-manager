"use client";

import type { Character } from "@guild/shared/schemas";

import {
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { TableCell, TableRow } from "@/components/ui/table";

interface MemberRowProps {
  /** Thành viên của hàng này */
  member: Character;
  /** Gọi khi bấm Sửa */
  onEdit: (member: Character) => void;
  /** Gọi khi bấm Xoá */
  onDelete: (member: Character) => void;
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
      <TableCell>
        <GuildClassIcon guildClass={member.guildClass} />
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
