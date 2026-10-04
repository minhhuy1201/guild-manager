"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import type { Leave } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/features/auth";
import { useCharacters } from "../hooks/use-attendance";
import { useLeaves } from "../hooks/use-leaves";
import { formatLeaveRange } from "../lib/leave-label";
import { CancelLeaveDialog } from "./cancel-leave-dialog";
import { LeaveDialog } from "./leave-dialog";

/**
 * The admin's view of every active or upcoming leave, with the means to file one on a member's
 * behalf or cancel one.
 * @returns The panel
 */
export function LeavePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const { data: leaves } = useLeaves();
  const { data: characters } = useCharacters();
  const [cancelling, setCancelling] = useState<Leave | null>(null);

  const nameOf = new Map((characters ?? []).map((c) => [c.id, c.name]));

  /**
   * Who filed a leave, as the table shows it.
   * @param filerId - Character of the filer; null when a rescue admin without a character did
   * @returns The character's name, "Admin" for a rescue admin, "—" for a character since removed
   */
  function filerName(filerId: string | null): string {
    if (filerId === null) return "Admin";

    return nameOf.get(filerId) ?? "—";
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Các lần nghỉ chưa hủy và chưa kết thúc của cả bang.
        </p>
        <Button type="button" onClick={() => setIsOpen(true)}>
          <Plane />
          Khai hộ
        </Button>
      </div>

      {leaves === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : leaves.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ai khai nghỉ.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thành viên</TableHead>
              <TableHead>Khoảng ngày</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Người khai</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave.id}>
                <TableCell className="font-medium">
                  {nameOf.get(leave.characterId) ?? "—"}
                </TableCell>
                <TableCell>
                  {formatLeaveRange(leave.startDate, leave.endDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {leave.reason ?? ""}
                </TableCell>
                <TableCell>{filerName(leave.createdByCharacterId)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelling(leave)}
                  >
                    Hủy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CancelLeaveDialog
        leave={cancelling}
        memberName={cancelling ? (nameOf.get(cancelling.characterId) ?? "—") : ""}
        onClose={() => setCancelling(null)}
      />
      <LeaveDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        isAdmin
        ownCharacterId={session?.character?.id ?? null}
        characters={characters ?? []}
      />
    </>
  );
}
