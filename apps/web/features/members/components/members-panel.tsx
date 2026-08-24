"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import type { GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { CreateButton } from "@/components/shared/action-buttons";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { combineQueries } from "@/lib/query-group";
import { matchesRosterFilter, type RosterFilter } from "@/lib/roster-filter";
import { useSession } from "@/features/auth";
import { useMembers } from "../hooks/use-members";
import { useUpdateMember } from "../hooks/use-member-mutations";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { MemberFormDialog } from "./member-form-dialog";
import { MemberRow } from "./member-row";
import { MembersSkeleton } from "./members-skeleton";

/** Bộ lọc rỗng khi mới mở màn — màn này giữ bộ lọc trong state của chính nó. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/**
 * Bảng quản lý thành viên: tìm theo tên, lọc lưu phái, thêm/sửa/xoá.
 * Cả bang chỉ vài chục người nên lọc và phân trang ngay ở client.
 * @returns Panel quản lý thành viên
 */
export function MembersPanel() {
  const membersQuery = useMembers();
  const { data: session } = useSession();
  const updateMutation = useUpdateMember();
  const [filter, setFilter] = useState<RosterFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<GuildMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<GuildMember | null>(null);

  const normalized = filter.search.trim().toLowerCase();
  const allMembers = membersQuery.data ?? [];
  const isFiltering = normalized.length > 0 || filter.guildClasses.length > 0;
  const members = allMembers.filter((member) =>
    matchesRosterFilter(member, filter)
  );

  const pagination = useTablePagination({
    items: members,
    // Chuỗi để so sánh theo giá trị: mảng lưu phái mới luôn khác tham chiếu cũ.
    resetKey: `${normalized}|${filter.guildClasses.join(",")}`,
  });

  const state = combineQueries(
    [membersQuery],
    "Không tải được danh sách thành viên."
  );

  /**
   * Đổi vai của một thành viên ngay tại hàng, không mở dialog.
   * @param member - Thành viên cần đổi vai
   * @param role - Vai mới
   */
  const handleRoleChange = (member: GuildMember, role: GuildRole) => {
    // Lỗi backend nổi lên qua `updateMutation.error` ngay dưới bảng.
    void updateMutation.mutateAsync({ id: member.id, input: { role } }).catch(() => {});
  };

  return (
    <QueryBoundary state={state} skeleton={<MembersSkeleton />}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RosterFilterBar
            layout="inline"
            idPrefix="members"
            value={filter}
            onChange={setFilter}
          />
          <CreateButton
            label="Thêm thành viên"
            icon={<UserPlus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        </div>

        {updateMutation.error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateMutation.error.message}
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Lưu phái</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pagedItems.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentDiscordId={session?.discordId ?? ""}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
                onRoleChange={handleRoleChange}
              />
            ))}
          </TableBody>
        </Table>

        {members.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {isFiltering
              ? "Không có thành viên nào khớp."
              : "Bang chưa có thành viên nào."}
          </div>
        )}

        {members.length > 0 && (
          <TablePaginationBar
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="thành viên"
            pageSizeId="members-page-size"
          />
        )}

        <MemberFormDialog
          open={formOpen}
          member={editing}
          onOpenChange={setFormOpen}
        />
        <DeleteMemberDialog
          member={deleting}
          onClose={() => setDeleting(null)}
        />
      </div>
    </QueryBoundary>
  );
}
