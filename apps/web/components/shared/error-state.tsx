"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** Message to show — pass the backend's Vietnamese `ApiError.message` straight through. */
  message: string;
  /** Called when the user asks to load the data again. */
  onRetry: () => void;
}

/**
 * Error block with a retry action, shown in place of a card's or table's content
 * when its queries fail. Presentational only — the caller owns the retry logic.
 * @param message - Error message to display
 * @param onRetry - Handler invoked when the retry button is pressed
 * @returns Centered error block with a retry button
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <GuildSeal tone="destructive" glyph={<AlertCircle />} />
      <OrnamentDivider stroke="brush" align="center" className="w-24" />
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw />
        Thử lại
      </Button>
    </div>
  );
}
