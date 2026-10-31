"use client";

import { useQuery } from "@tanstack/react-query";
import type { TeamColor } from "@guild/shared/enums";

import { fromAction } from "@/lib/action-result";
import { NO_CHOSEN_COLORS } from "@/lib/team-color";
import { fetchTeamColors } from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * The colours teams were given on the team builder, for the "Đội N" tokens on the map.
 * @returns Team number (as a decimal string) → colour. Empty while loading or when the read failed, so
 * every token shows its team's default group colour rather than hiding the map behind a spinner
 */
export function useTeamColors(): Readonly<Record<string, TeamColor>> {
  const { data } = useQuery({
    queryKey: tacticKeys.teamColors(),
    queryFn: fromAction(fetchTeamColors),
  });

  return data ?? NO_CHOSEN_COLORS;
}
