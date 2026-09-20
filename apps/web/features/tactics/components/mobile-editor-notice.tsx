import { MonitorSmartphone } from "lucide-react";

/**
 * What a phone is told in place of the drawing tools.
 * Reading a tactic works everywhere; drawing one needs a pointer and a keyboard, and a touch
 * drawing mode is deliberately out of scope.
 * @returns The notice
 */
export function MobileEditorNotice() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
      <MonitorSmartphone className="size-5 shrink-0" />
      <p>Mở trên máy tính để vẽ chiến thuật.</p>
    </div>
  );
}
