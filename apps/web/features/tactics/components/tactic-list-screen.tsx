"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Swords } from "lucide-react";
import type { TacticSummary } from "@guild/shared/schemas";

import {
  CreateButton,
  DeleteAction,
  EditAction,
  RowActions,
} from "@/components/shared/action-buttons";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tacticEditorPath } from "@/config/routes";
import { formatDateTime } from "@/lib/format";
import { combineQueries } from "@/lib/query-group";
import { useDeleteTactic } from "../hooks/use-tactic-mutations";
import { useTactics } from "../hooks/use-tactics";
import { TacticFormDialog } from "./tactic-form-dialog";

interface TacticListScreenProps {
  /** Whether the viewer may write — the API is what actually enforces it */
  isAdmin: boolean;
}

/**
 * The tactics list: every saved tactic, newest edit first, each linking to its own page.
 * Members read it; admins also create, rename and delete from here.
 * @param isAdmin - Whether the viewer may write
 * @returns The tactics list screen
 */
export function TacticListScreen({ isAdmin }: TacticListScreenProps) {
  const tacticsQuery = useTactics();
  const deleteTactic = useDeleteTactic();
  const [editing, setEditing] = useState<TacticSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TacticSummary | null>(null);

  const tactics = tacticsQuery.data ?? [];
  const state = combineQueries(
    [tacticsQuery],
    "Không tải được danh sách chiến thuật."
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner="tactics"
        size="compact"
        title="Chiến thuật"
        description="Bản vẽ chiến thuật cho bang chiến."
        actions={
          isAdmin ? (
            <CreateButton
              label="Tạo chiến thuật"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          ) : undefined
        }
      />

      <QueryBoundary
        state={state}
        skeleton={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        {tactics.length === 0 ? (
          <EmptyState
            message="Chưa có chiến thuật nào."
            icon={<Swords className="size-6" />}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {tactics.map((tactic) => (
              <li key={tactic.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={tacticEditorPath(tactic.id)}
                        className="font-medium hover:underline"
                      >
                        {tactic.name}
                      </Link>
                      {tactic.description ? (
                        <p className="text-sm text-muted-foreground">
                          {tactic.description}
                        </p>
                      ) : null}
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Layers className="size-3.5" />
                        <span>{tactic.stageCount} giai đoạn</span>
                        <span>· Sửa lúc {formatDateTime(tactic.updatedAt)}</span>
                      </p>
                    </div>

                    {isAdmin ? (
                      <RowActions>
                        <EditAction
                          label="Sửa chiến thuật"
                          onClick={() => {
                            setEditing(tactic);
                            setFormOpen(true);
                          }}
                        />
                        <DeleteAction
                          label="Xoá chiến thuật"
                          onClick={() => setDeleting(tactic)}
                        />
                      </RowActions>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <TacticFormDialog
        open={formOpen}
        tactic={editing}
        onOpenChange={setFormOpen}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Xoá chiến thuật"
        submitLabel="Xoá"
        pendingLabel="Đang xoá..."
        fallbackError="Không xoá được chiến thuật."
        run={async () => {
          if (deleting) await deleteTactic.mutateAsync(deleting.id);
        }}
      >
        <p className="text-sm text-muted-foreground">
          Xoá &ldquo;{deleting?.name}&rdquo;? Bản vẽ sẽ mất hẳn.
        </p>
      </ConfirmDeleteDialog>
    </div>
  );
}
