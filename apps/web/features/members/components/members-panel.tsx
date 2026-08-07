"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member } from "../types/member";
import { useMembers } from "../hooks/use-members";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { MemberFormDialog } from "./member-form-dialog";
import { MemberRow } from "./member-row";

/** Số hàng khung xương hiện trong lúc chờ dữ liệu. */
const SKELETON_ROWS = 5;

/**
 * Bảng quản lý thành viên: tìm theo tên, thêm/sửa/xoá, xem và copy mật khẩu.
 * Cả bang chỉ vài chục người nên lọc ngay ở client, không phân trang.
 * @returns Panel quản lý thành viên
 */
export function MembersPanel() {
  const membersQuery = useMembers();
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);

  if (membersQuery.isError) {
    return (
      <ErrorState
        message="Không tải được danh sách thành viên."
        onRetry={() => void membersQuery.refetch()}
      />
    );
  }

  if (membersQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const normalized = keyword.trim().toLowerCase();
  const members = normalized
    ? membersQuery.data.filter((member) =>
        member.name.toLowerCase().includes(normalized)
      )
    : membersQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          className="max-w-64"
          placeholder="Tìm theo tên…"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus className="size-4" />
          Thêm thành viên
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Lưu phái</TableHead>
            <TableHead>Mật khẩu</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
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
          {normalized
            ? "Không có thành viên nào khớp."
            : "Bang chưa có thành viên nào."}
        </div>
      )}

      <MemberFormDialog
        open={formOpen}
        member={editing}
        onOpenChange={setFormOpen}
      />
      <DeleteMemberDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
