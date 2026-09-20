import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth/server";
import { TacticListScreen } from "@/features/tactics";

export const metadata: Metadata = {
  title: "Chiến thuật — Mèo Mập Giang Hồ",
  description: "Bảng chiến thuật bang chiến",
};

/**
 * Route "/chien-thuat" — the tactics list.
 * Every signed-in member reads it; only an admin sees the buttons that write, and the API is what
 * actually enforces that.
 * @returns The tactics list page
 */
export default async function TacticsPage() {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  return <TacticListScreen isAdmin={canManageGuild(session.role)} />;
}
