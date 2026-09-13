"use client";

import { useState } from "react";
import { ATTENDANCE_REASON_MAX_LENGTH } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Placeholder of the reason field. It names the key rather than describing the field, because the
 * field is the only control on this screen that a click on an answer does not save.
 */
const REASON_PLACEHOLDER = "Lý do vắng — Enter để lưu";

/** The whole contract of the reason field, shown as a tooltip and as the native `title`. */
const REASON_HINT =
  "Nhập lý do rồi bấm Enter hoặc nút Lưu để lưu. Bỏ trống cũng được, Esc để huỷ thay đổi.";

interface AbsenceReasonInputProps {
  /** Reason already stored for this session — "" when none was given */
  savedReason: string;
  /** A write is already in flight, so this one may not start */
  disabled: boolean;
  /** Send the typed reason; the caller performs the write and shows the toast */
  onSubmit: (reason: string) => void;
}

/**
 * The one-line reason that goes with a "Không" answer.
 *
 * Enter or the Save button sends, Escape restores what is stored — blur does neither: leaving the
 * field is something that happens by accident, and here it would fire a request rather than touch a
 * local draft. What blur must not do either is leave the member believing the text was kept, so
 * while the field differs from what is stored it carries a small Save button and a "chưa lưu" note.
 *
 * The caller remounts this component on the stored value (`key`), so a save that lands resets it
 * and hides both marks, while a failed save keeps the typed text.
 * @param savedReason - Reason already stored for this session
 * @param disabled - Whether a write is already in flight
 * @param onSubmit - Send the typed reason
 * @returns The reason input
 */
export function AbsenceReasonInput({
  savedReason,
  disabled,
  onSubmit,
}: AbsenceReasonInputProps) {
  const [value, setValue] = useState(savedReason);
  // Trimmed on both sides, like the write itself: spaces around a stored reason are not an edit.
  const isUnsaved = value.trim() !== savedReason.trim();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Input
                value={value}
                disabled={disabled}
                aria-label="Lý do vắng"
                placeholder={REASON_PLACEHOLDER}
                title={REASON_HINT}
                maxLength={ATTENDANCE_REASON_MAX_LENGTH}
                className="h-8 min-w-0 flex-1 text-sm"
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit(value);
                    return;
                  }
                  if (event.key === "Escape") {
                    setValue(savedReason);
                    event.currentTarget.blur();
                  }
                }}
              />
            }
          />
          <TooltipContent>{REASON_HINT}</TooltipContent>
        </Tooltip>
        {isUnsaved ? (
          <Button
            type="button"
            size="xs"
            aria-label="Lưu lý do"
            disabled={disabled}
            onClick={() => onSubmit(value)}
          >
            Lưu
          </Button>
        ) : null}
      </div>
      {isUnsaved ? (
        <span className="text-xs text-muted-foreground">chưa lưu</span>
      ) : null}
    </div>
  );
}
