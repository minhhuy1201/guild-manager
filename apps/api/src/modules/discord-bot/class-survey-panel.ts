import {
  CLASS_CHANGE_CONFIDENCE_LABEL,
  ClassChangeConfidence,
  GUILD_CLASS_LABEL,
  GuildClass,
} from '@guild/shared/enums';
import type {
  ClassSurvey,
  ClassSurveyAnswer,
  ClassSurveyAnswerInput,
} from '@guild/shared/schemas';

import { formatVnDay } from './class-survey-message';
import type {
  ActionRow,
  CommandDeps,
  CommandReply,
  MessagePayload,
  UpdateMessageReply,
} from './commands/command.types';
import {
  encodeSurveyLevelId,
  encodeSurveySelectId,
  type SurveyLevelId,
} from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
} from './discord.constants';
import { resolveOwnCaller, type OwnCaller } from './own-caller';
import { ephemeral, ephemeralText } from './reply';

/** Value of the select's "Giữ nguyên" option; no class value can equal it. */
export const SURVEY_KEEP_VALUE = 'KEEP';

/** One message for a survey that is closed and one that is gone: the panel cannot tell them apart. */
const SURVEY_UNAVAILABLE = 'Đợt khảo sát này đã đóng hoặc không còn nữa.';

/** Shown when a select value is not one this build offers, e.g. from a panel of an older deploy. */
const STALE_CHOICE =
  'Lựa chọn này không còn dùng được. Bấm lại nút Điền khảo sát.';

/** What the panel needs to draw itself. */
interface PanelState {
  survey: ClassSurvey;
  fromClass: GuildClass;
  saved: ClassSurveyAnswer | null;
  /** The class picked in the select but not yet saved: asks for a confidence next */
  pendingClass?: GuildClass;
  /** A line shown under the answer, e.g. the confirmation after a save */
  notice?: string;
}

function describeAnswer(answer: ClassSurveyAnswer | null): string {
  if (!answer) return 'chưa điền';
  if (answer.kind === 'KEEP') return '**Giữ nguyên**';

  return `**Chuyển sang ${GUILD_CLASS_LABEL[answer.targetClass]}** (${CLASS_CHANGE_CONFIDENCE_LABEL[answer.confidence]})`;
}

function buildSelectRow(surveyId: string, fromClass: GuildClass): ActionRow {
  const classes = Object.values(GuildClass).filter(
    (guildClass) => guildClass !== fromClass,
  );

  return {
    type: COMPONENT_TYPE.actionRow,
    components: [
      {
        type: COMPONENT_TYPE.stringSelect,
        custom_id: encodeSurveySelectId(surveyId),
        placeholder: 'Sau cập nhật bạn chơi phái nào?',
        options: [
          { label: 'Giữ nguyên', value: SURVEY_KEEP_VALUE },
          ...classes.map((guildClass) => ({
            label: `Chuyển sang ${GUILD_CLASS_LABEL[guildClass]}`,
            value: guildClass,
          })),
        ],
      },
    ],
  };
}

function buildLevelRow(level: Omit<SurveyLevelId, 'confidence'>): ActionRow {
  const style: Record<ClassChangeConfidence, number> = {
    [ClassChangeConfidence.SURE]: BUTTON_STYLE.primary,
    [ClassChangeConfidence.CONSIDERING]: BUTTON_STYLE.secondary,
  };

  return {
    type: COMPONENT_TYPE.actionRow,
    components: Object.values(ClassChangeConfidence).map((confidence) => ({
      type: COMPONENT_TYPE.button,
      style: style[confidence],
      label: CLASS_CHANGE_CONFIDENCE_LABEL[confidence],
      custom_id: encodeSurveyLevelId({ ...level, confidence }),
    })),
  };
}

/**
 * The private answer panel: the caller's class, their saved answer, and what to press next.
 * @param state - What the panel shows
 * @returns The message body
 */
export function buildSurveyPanel(state: PanelState): MessagePayload {
  const { survey, fromClass, saved, pendingClass, notice } = state;
  const lines = [
    `📋 **${survey.title}** - hạn hết ngày ${formatVnDay(new Date(survey.closesAt))}`,
    `Phái hiện tại: **${GUILD_CLASS_LABEL[fromClass]}**`,
    `Câu trả lời đã lưu: ${describeAnswer(saved)}`,
  ];

  if (notice) lines.push('', notice);
  if (pendingClass) {
    lines.push(
      '',
      `Bạn chọn chuyển sang **${GUILD_CLASS_LABEL[pendingClass]}**. Mức độ chắc chắn?`,
    );
  }

  return {
    content: lines.join('\n'),
    components: [
      buildSelectRow(survey.id, fromClass),
      ...(pendingClass
        ? [buildLevelRow({ surveyId: survey.id, targetClass: pendingClass })]
        : []),
    ],
  };
}

function updatePanel(state: PanelState): UpdateMessageReply {
  return {
    type: INTERACTION_RESPONSE_TYPE.updateMessage,
    data: buildSurveyPanel(state),
  };
}

type LoadedPanel =
  | { ok: true; caller: Extract<OwnCaller, { ok: true }>; state: PanelState }
  | { ok: false; reply: CommandReply };

/**
 * Resolve the caller and read the survey with their class and saved answer. Only the open survey has a panel.
 * @param discordId - Discord ID from the signed interaction
 * @param surveyId - Survey the pressed component belongs to
 * @param deps - Services the bot reaches
 * @returns The state to draw, or the private refusal to send instead
 */
async function loadPanel(
  discordId: string,
  surveyId: string,
  deps: CommandDeps,
): Promise<LoadedPanel> {
  const caller = await resolveOwnCaller(discordId, deps);
  if (!caller.ok) return caller;

  const panel = await deps.classSurveys.panelFor(surveyId, caller.characterId);

  if (!panel?.survey.isOpen) {
    return { ok: false, reply: ephemeralText(SURVEY_UNAVAILABLE) };
  }

  return {
    ok: true,
    caller,
    state: {
      survey: panel.survey,
      fromClass: panel.fromClass,
      saved: panel.answer,
    },
  };
}

/**
 * Answer the "Điền khảo sát" button: a new private panel, never an update, because the button sits
 * on a message the whole guild reads.
 * @param discordId - Discord ID from the signed interaction
 * @param surveyId - Survey the button belongs to
 * @param deps - Services the bot reaches
 * @returns The panel, or the private refusal
 */
export async function openSurveyPanel(
  discordId: string,
  surveyId: string,
  deps: CommandDeps,
): Promise<CommandReply> {
  const loaded = await loadPanel(discordId, surveyId, deps);
  if (!loaded.ok) return loaded.reply;

  return ephemeral(buildSurveyPanel(loaded.state));
}

async function save(
  discordId: string,
  surveyId: string,
  input: ClassSurveyAnswerInput,
  deps: CommandDeps,
): Promise<UpdateMessageReply | CommandReply> {
  const loaded = await loadPanel(discordId, surveyId, deps);
  if (!loaded.ok) return loaded.reply;

  // The service owns the deadline and same-class rules; its refusals reach the user via the router.
  const saved = await deps.classSurveys.answer(
    surveyId,
    loaded.caller.actor,
    input,
  );

  return updatePanel({
    ...loaded.state,
    fromClass: saved.fromClass,
    saved,
    notice: `✅ Đã lưu: ${describeAnswer(saved)}`,
  });
}

/**
 * Answer the select menu: "Giữ nguyên" saves at once, a class asks for the confidence next.
 * @param discordId - Discord ID from the signed interaction
 * @param surveyId - Survey the menu belongs to
 * @param value - The chosen option's value
 * @param deps - Services the bot reaches
 * @returns The panel rewritten in place, or a private refusal
 */
export async function chooseSurveyOption(
  discordId: string,
  surveyId: string,
  value: string | undefined,
  deps: CommandDeps,
): Promise<UpdateMessageReply | CommandReply> {
  if (value === SURVEY_KEEP_VALUE) {
    return save(discordId, surveyId, { kind: 'KEEP' }, deps);
  }

  const targetClass = Object.values(GuildClass).find(
    (guildClass) => guildClass === value,
  );
  if (!targetClass) return ephemeralText(STALE_CHOICE);

  const loaded = await loadPanel(discordId, surveyId, deps);
  if (!loaded.ok) return loaded.reply;

  return updatePanel({ ...loaded.state, pendingClass: targetClass });
}

/**
 * Answer a confidence button: save the change the id describes.
 * @param discordId - Discord ID from the signed interaction
 * @param level - Survey, class and confidence read from the button
 * @param deps - Services the bot reaches
 * @returns The panel rewritten with a confirmation, or a private refusal
 */
export function answerSurveyLevel(
  discordId: string,
  level: SurveyLevelId,
  deps: CommandDeps,
): Promise<UpdateMessageReply | CommandReply> {
  return save(
    discordId,
    level.surveyId,
    {
      kind: 'CHANGE',
      targetClass: level.targetClass,
      confidence: level.confidence,
    },
    deps,
  );
}
