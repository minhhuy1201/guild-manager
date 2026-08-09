"use client";

import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PrefillResult } from "../lib/prefill";

interface PrefillBannerProps {
  /** The proposal that was filled in, null when nothing was */
  result: PrefillResult | null;
  /** Empty the proposed formation */
  onClear: () => void;
}

/**
 * Tell the user their formation was copied from an earlier battle and how many
 * people were dropped for not attending this one. Nothing is saved until they
 * press the save button.
 * @param result - The proposal that was filled in
 * @param onClear - Empty the proposed formation
 * @returns The banner, or nothing when no prefill happened
 */
export function PrefillBanner({ result, onClear }: PrefillBannerProps) {
  if (!result) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2">
      <p className="text-sm">
        Đã điền sẵn từ <span className="font-medium">{result.sourceLabel}</span>
        {result.droppedCount > 0
          ? ` · bỏ ${result.droppedCount} người không đánh trận này`
          : ""}
        . Chưa lưu.
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        <Eraser />
        Xoá hết
      </Button>
    </div>
  );
}
