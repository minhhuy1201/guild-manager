import { CAT_RACE_MODE_LABEL } from "@guild/shared/enums";
import type { CatRaceEventDetail } from "@guild/shared/schemas";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";

interface CatRaceHeaderProps {
  event: CatRaceEventDetail;
  actions: ReactNode;
}

/**
 * The banner of one event, shared by the open and the ended screen.
 * @param event - The event
 * @param actions - What sits on the banner's right
 * @returns The page header
 */
export function CatRaceHeader({ event, actions }: CatRaceHeaderProps) {
  return (
    <PageHeader
      banner="teamBuilder"
      title={event.name}
      description={`Chế độ ${CAT_RACE_MODE_LABEL[event.mode]}`}
      actions={actions}
    />
  );
}
