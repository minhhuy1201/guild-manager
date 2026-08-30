"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import type { GuildMember } from "@guild/shared/schemas";

import { CreateButton } from "@/components/shared/action-buttons";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { TableBodyState } from "@/components/shared/table-body-state";
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

/** The empty filter the screen opens with — this screen keeps its filters in its own state. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/** Header column count: name, class, Discord, role, actions. */
const COLUMN_COUNT = 5;

/**
 * The member management table: search by name, filter by class, create/edit/delete.
 * The guild is only a few dozen people, so filtering and paging happen on the client.
 * @returns The member management panel
 */
export function MembersPanel() {
  const membersQuery = useMembers();
  const [filter, setFilter] = useState<RosterFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<GuildMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<GuildMember | null>(null);

  const normalized = filter.search.trim().toLowerCase();
  const allMembers = membersQuery.data ?? [];
  const isFiltering = normalized.length > 0 || filter.guildClasses.length > 0;
  const members = allMembers.filter((member) =>
    matchesRosterFilter(member, filter),
  );

  const pagination = useTablePagination({
    items: members,
    // Stringified for comparison by value: a new class array always differs by reference.
    resetKey: `${normalized}|${filter.guildClasses.join(",")}`,
  });

  const state = combineQueries(
    [membersQuery],
    "Không tải được danh sách thành viên.",
  );

  return (
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
            <TableHead>Discord</TableHead>
            <TableHead>Quyền</TableHead>
            <TableHead className="text-center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableBodyState
            state={state}
            columns={COLUMN_COUNT}
            rows={pagination.pagedItems}
            emptyMessage={
              isFiltering
                ? "Không có thành viên nào khớp."
                : "Bang chưa có thành viên nào."
            }
            renderRow={(member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
              />
            )}
          />
        </TableBody>
      </Table>

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

      <MemberFormDialog
        open={formOpen}
        member={editing}
        onOpenChange={setFormOpen}
      />
      <DeleteMemberDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
