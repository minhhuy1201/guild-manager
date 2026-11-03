"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { TacticInsigniaEntry } from "@guild/shared/schemas";
import { TACTIC_LIMITS } from "@guild/shared/schemas";

import { ErrorNotice } from "@/components/shared/error-notice";
import { toastSuccess } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import {
  useRenameTacticInsignia,
  useResetTacticInsignia,
} from "../hooks/use-tactic-insignia";
import { TokenGlyph } from "./token-glyph";

interface InsigniaNameRowProps {
  /** The Insignia this row names */
  insignia: TacticInsigniaEntry;
}

/**
 * One Insignia in the token dialog: its icon, an editable name and the way back to the default.
 * A row saves on its own (Enter or the tick), so each rename is an independent write. Leaving the
 * field unsaved drops the edit.
 * @param insignia - The Insignia this row names
 * @returns The row
 */
export function InsigniaNameRow({ insignia }: InsigniaNameRowProps) {
  const [draft, setDraft] = useState(insignia.label);
  const [seenLabel, setSeenLabel] = useState(insignia.label);
  const [error, setError] = useState<string | null>(null);
  const rename = useRenameTacticInsignia();
  const reset = useResetTacticInsignia();

  // A rename from another session lands through the refetched list; the field follows it.
  if (seenLabel !== insignia.label) {
    setSeenLabel(insignia.label);
    setDraft(insignia.label);
  }
  const recoverSession = useSessionRecovery();
  const isRenamed = insignia.label !== insignia.defaultLabel;
  const isPending = rename.isPending || reset.isPending;
  const canSave = draft.trim().length > 0 && draft.trim() !== insignia.label;

  /**
   * Run one write, keeping the reason on this row when the server refuses.
   * @param write - The mutation to await
   * @returns Whether it succeeded
   */
  async function attempt(write: () => Promise<unknown>): Promise<boolean> {
    setError(null);

    try {
      await write();
    } catch (caught) {
      // An expired session is renewed by a navigation, and the recovery says so itself.
      if (!recoverSession(caught)) {
        setError(errorMessageOf(caught, "Không đổi được tên quân hiệu."));
      }
      return false;
    }

    return true;
  }

  async function save() {
    if (!canSave || isPending) return;

    const previous = insignia.label;
    let savedLabel = "";
    const done = await attempt(async () => {
      const saved = await rename.mutateAsync({
        key: insignia.key,
        label: draft.trim(),
      });
      savedLabel = saved.label;
      setDraft(saved.label);
    });

    if (done) toastSuccess(`Đã đổi tên ${previous} thành ${savedLabel}.`);
  }

  async function restore() {
    const done = await attempt(async () => {
      await reset.mutateAsync(insignia.key);
      setDraft(insignia.defaultLabel);
    });

    if (done) toastSuccess(`Đã khôi phục tên ${insignia.defaultLabel}.`);
  }

  /**
   * Save on Enter. The field sits inside the dialog's form, so the key must not submit that form.
   * @param event - Key event of the name field
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    void save();
  }

  /**
   * Drop an unsaved edit once focus leaves the row. Moving to the row's own buttons is not leaving:
   * pressing the tick blurs the field before it clicks.
   * @param event - Blur event bubbling from the row's controls
   */
  function handleBlur(event: FocusEvent<HTMLLIElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;

    setDraft(insignia.label);
    setError(null);
  }

  return (
    <li className="grid gap-1" onBlur={handleBlur}>
      <div className="flex items-center gap-2">
        <TokenGlyph icon={insignia.icon} className="size-4 shrink-0" />
        <Input
          aria-label={`Tên quân hiệu ${insignia.defaultLabel}`}
          value={draft}
          placeholder={insignia.defaultLabel}
          maxLength={TACTIC_LIMITS.tokenLabelLength}
          readOnly={isPending}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Lưu tên ${insignia.defaultLabel}`}
          disabled={!canSave || isPending}
          onClick={() => void save()}
        >
          <Check />
        </Button>
        {isRenamed ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => void restore()}
          >
            <RotateCcw />
            Khôi phục
          </Button>
        ) : null}
      </div>
      {error ? <ErrorNotice message={error} /> : null}
    </li>
  );
}
