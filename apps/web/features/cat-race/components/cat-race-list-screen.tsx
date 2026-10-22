"use client";

import { useState } from "react";
import Link from "next/link";
import { Cat } from "lucide-react";
import { CAT_RACE_MODE_LABEL } from "@guild/shared/enums";

import { CreateButton } from "@/components/shared/action-buttons";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { catRaceEventPath } from "@/config/routes";
import { useCharacters } from "@/features/attendance";
import { formatDate } from "@/lib/format";
import { combineQueries } from "@/lib/query-group";
import { cn } from "@/lib/utils";
import { useCatRacePrefill, useCatRaces } from "../hooks/use-cat-races";
import { CreateCatRaceDialog } from "./create-cat-race-dialog";

/**
 * The cat race events, newest first, and the button that opens the create form.
 * @returns The list screen
 */
export function CatRaceListScreen() {
  const racesQuery = useCatRaces();
  const prefillQuery = useCatRacePrefill();
  const charactersQuery = useCharacters();
  const [createOpen, setCreateOpen] = useState(false);
  const state = combineQueries(
    [racesQuery, prefillQuery, charactersQuery],
    "Không tải được danh sách đợt quay."
  );
  const races = racesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner="teamBuilder"
        title="Đua mèo"
        description="Quay thưởng trong bang: mỗi vòng đua ra một người thắng."
        // The create form seeds itself from these queries once, so it only opens with them loaded.
        actions={
          state.isPending || state.isError ? undefined : (
            <CreateButton
              label="Tạo đợt quay"
              onClick={() => setCreateOpen(true)}
            />
          )
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
        {races.length === 0 ? (
          <EmptyState
            message="Chưa có đợt quay nào."
            icon={<Cat className="size-6" />}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {races.map((race) => (
              <li key={race.id}>
                <Card
                  className={cn(
                    "relative transition-colors duration-[var(--duration-fast)]",
                    "hover:bg-foreground/5 focus-within:ring-3 focus-within:ring-ring/50"
                  )}
                >
                  <CardContent className="flex flex-col gap-1">
                    <Link
                      href={catRaceEventPath(race.id)}
                      className="font-medium hover:underline"
                    >
                      <span className="absolute inset-0 rounded-container" />
                      {race.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Chế độ {CAT_RACE_MODE_LABEL[race.mode]} ·{" "}
                      {race.status === "OPEN"
                        ? "Đang mở"
                        : race.discordPostedAt
                          ? "Đã post"
                          : "Đã kết thúc"}{" "}
                      · {race.awardedCount} giải đã trao ·{" "}
                      {formatDate(race.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <CreateCatRaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        characters={charactersQuery.data ?? []}
        prefill={prefillQuery.data ?? []}
      />
    </div>
  );
}
