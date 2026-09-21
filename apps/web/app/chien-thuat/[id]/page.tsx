import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth/server";
import { TacticEditorScreen } from "@/features/tactics";

export const metadata: Metadata = {
  title: "Chiến thuật — Mèo Mập Giang Hồ",
  description: "Bản vẽ chiến thuật bang chiến",
};

interface TacticPageProps {
  /** Route parameters: the tactic's id */
  params: Promise<{ id: string }>;
}

/**
 * Route "/chien-thuat/[id]" — one tactic.
 * A member opens it to read the drawing; an admin gets the drawing tools, and the API is what
 * actually enforces that.
 * @param params - Route parameters carrying the tactic id
 * @returns The tactic page
 */
export default async function TacticPage({ params }: TacticPageProps) {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  const { id } = await params;

  return (
    <TacticEditorScreen
      tacticId={id}
      isAdmin={canManageGuild(session.role)}
    />
  );
}
