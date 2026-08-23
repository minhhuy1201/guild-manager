"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import type { Character } from "@guild/shared/schemas";

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
import { useMembers } from "../hooks/use-members";
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
  const [filter, setFilter] = useState<RosterFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<Character | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Character | null>(null);

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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Lưu phái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pagedItems.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
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
