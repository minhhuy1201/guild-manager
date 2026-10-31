"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  CLASS_CHANGE_CONFIDENCE_LABEL,
  ClassChangeConfidence,
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
} from "@guild/shared/enums";
import type { ClassSurvey, ClassSurveyMember } from "@guild/shared/schemas";

import { ErrorNotice } from "@/components/shared/error-notice";
import { Spinner } from "@/components/shared/spinner";
import { toastSuccess } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionRecovery } from "@/hooks/use-session-recovery";
import { errorMessageOf } from "@/lib/error-message";
import { useAnswerClassSurvey } from "../hooks/use-class-survey";
import {
  type AnswerChoice,
  type AnswerDraft,
  KEEP_CHOICE,
  draftOf,
  isSameAnswer,
  toAnswerInput,
} from "../lib/answer-draft";

const FALLBACK_ERROR = "Không lưu được câu trả lời, thử lại giúp mình.";
const CONFIDENCES = [ClassChangeConfidence.SURE, ClassChangeConfidence.CONSIDERING];
const PICKER_ID = "class-survey-choice";

interface MyAnswerFormProps {
  /** The survey being answered */
  survey: ClassSurvey;
  /** The signed-in member's own row */
  member: ClassSurveyMember;
}

/**
 * The label of a picker value.
 * @param choice - Stay, a class, or nothing picked
 * @returns The sentence shown in the picker
 */
function choiceLabel(choice: AnswerChoice): string {
  if (choice === null) return "Chọn...";
  if (choice === KEEP_CHOICE) return "Giữ nguyên";

  return `Chuyển sang ${GUILD_CLASS_LABEL[choice]}`;
}

/**
 * The member's own answer: stay, or move to another class and say how sure. It starts from the saved
 * answer, saves through the survey's service (which owns the deadline and same-class rules), and is
 * read-only once the survey has closed.
 * @param survey - The survey being answered
 * @param member - The signed-in member's own row
 * @returns The form
 */
export function MyAnswerForm({ survey, member }: MyAnswerFormProps) {
  const [draft, setDraft] = useState<AnswerDraft>(() => draftOf(member.answer));
  const [error, setError] = useState<string | null>(null);
  const answer = useAnswerClassSurvey();
  const recoverSession = useSessionRecovery();
  const isClosed = !survey.isOpen;
  const isMover = draft.choice !== null && draft.choice !== KEEP_CHOICE;
  const input = toAnswerInput(draft);
  const classes = GUILD_CLASS_OPTIONS.filter((guildClass) => guildClass !== member.guildClass);

  /** Save the draft; a refusal stays in the form with the server's sentence. */
  async function handleSave() {
    if (!input) return;
    setError(null);

    try {
      await answer.mutateAsync({ surveyId: survey.id, input });
      toastSuccess("Đã lưu câu trả lời.");
    } catch (caught) {
      if (recoverSession(caught)) return;
      setError(errorMessageOf(caught, FALLBACK_ERROR));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Phái hiện tại của bạn: <strong className="text-foreground">{GUILD_CLASS_LABEL[member.guildClass]}</strong>
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={PICKER_ID}>Sau bản cập nhật</Label>
        <Select<AnswerChoice>
          value={draft.choice}
          disabled={isClosed || answer.isPending}
          onValueChange={(next) =>
            setDraft((current) => ({ ...current, choice: next }))
          }
        >
          <SelectTrigger id={PICKER_ID} className="w-full">
            <SelectValue>{(value: AnswerChoice) => choiceLabel(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={KEEP_CHOICE}>Giữ nguyên</SelectItem>
            {classes.map((guildClass) => (
              <SelectItem key={guildClass} value={guildClass}>
                Chuyển sang {GUILD_CLASS_LABEL[guildClass]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Mức độ</span>
        <div role="group" aria-label="Mức độ" className="grid grid-cols-2 gap-2">
          {CONFIDENCES.map((confidence) => (
            <Button
              key={confidence}
              type="button"
              variant={isMover && draft.confidence === confidence ? "default" : "outline"}
              aria-pressed={isMover && draft.confidence === confidence}
              disabled={isClosed || !isMover || answer.isPending}
              onClick={() => setDraft((current) => ({ ...current, confidence }))}
            >
              {CLASS_CHANGE_CONFIDENCE_LABEL[confidence]}
            </Button>
          ))}
        </div>
        {draft.choice === KEEP_CHOICE && (
          <p className="text-sm text-muted-foreground">Giữ nguyên thì không cần chọn mức độ.</p>
        )}
      </div>

      <div className="min-h-10">{error && <ErrorNotice message={error} />}</div>

      {isClosed ? (
        <p className="text-sm text-muted-foreground">
          Đợt khảo sát đã đóng, không sửa được câu trả lời.
        </p>
      ) : (
        <Button
          type="button"
          disabled={!input || isSameAnswer(draft, member.answer) || answer.isPending}
          onClick={handleSave}
        >
          {answer.isPending ? <Spinner size="sm" /> : <Save />}
          {answer.isPending ? "Đang lưu..." : "Lưu câu trả lời"}
        </Button>
      )}
    </div>
  );
}
