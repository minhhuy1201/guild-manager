"use client";

import { useState } from "react";
import { Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth";
import { useCharacters } from "../hooks/use-attendance";
import { LeaveDialog } from "./leave-dialog";
import { MyLeaveBanner } from "./my-leave-banner";

interface LeaveSectionProps {
  /** Whether the viewer may file leaves for others */
  isAdmin: boolean;
}

/**
 * The attendance screen's leave entry: the button that opens the dialog, and the viewer's own
 * leaves under it.
 * @param isAdmin - Whether the viewer may file leaves for others
 * @returns The section
 */
export function LeaveSection({ isAdmin }: LeaveSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const { data: characters } = useCharacters();

  return (
    <section className="flex flex-col gap-3">
      <div>
        <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
          <Plane />
          Xin nghỉ phép
        </Button>
      </div>
      <MyLeaveBanner />
      <LeaveDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        isAdmin={isAdmin}
        ownCharacterId={session?.character?.id ?? null}
        characters={characters ?? []}
      />
    </section>
  );
}
