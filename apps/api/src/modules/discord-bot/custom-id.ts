import { ClassChangeConfidence, GuildClass } from '@guild/shared/enums';

import { z } from 'zod';

import { MAX_CUSTOM_ID_LENGTH } from './discord.constants';

/** Marks a custom_id as belonging to the attendance board, so other components can share the route. */
const PREFIX = 'dd';

/** Safe because ids are cuids, `gw-<date>` markers, or name slugs — none of them contain a colon. */
const SEPARATOR = ':';

/** How many parts a well-formed attendance custom_id has, prefix included. */
const PART_COUNT = 4;

/**
 * custom_id of the "Điểm danh ngay" button, on both the `/thong-bao` announcement and the daily
 * attendance reminder.
 *
 * A fixed string rather than an encoded value: the button always means "open the presser's own
 * board", and who is pressing arrives inside the signed interaction — so the same id works on any
 * message the bot sends. Two parts behind an `ann` prefix, so `decodeAttendanceButtonId` — which
 * wants four parts behind `dd` — can never take it for an attendance button.
 */
export const ANNOUNCEMENT_ATTENDANCE_ID = 'ann:diem-danh';

/** custom_id of the "Xin nghỉ" button; it opens the leave modal for whoever presses it. */
export const ANNOUNCEMENT_LEAVE_ID = 'ann:nghi-phep';

/** custom_id of the "Tự động điểm danh" button; it opens a private panel for whoever presses it. */
export const ANNOUNCEMENT_AUTO_ATTEND_ID = 'ann:tu-dong';

/** custom_id of the panel's "Bật" button, on the private message the button above opens. */
export const AUTO_ATTEND_ON_ID = 'auto:bat';

/** custom_id of the panel's "Tắt" button. */
export const AUTO_ATTEND_OFF_ID = 'auto:tat';

/** custom_id of the leave modal, read back when it is submitted. */
export const LEAVE_MODAL_ID = 'modal:nghi-phep';

/** What one attendance button carries, since Discord keeps no state between presses. */
export interface AttendanceButtonId {
  sessionId: string;
  characterId: string;
  isPresent: boolean;
}

/**
 * Build the custom_id for one attendance button.
 *
 * The value is client data on the way back — `decodeAttendanceButtonId` returns it, and the write
 * path still re-checks who may mark whom. It is a convenience, never a proof.
 *
 * @param value - Session, character and the answer the button records
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit — Discord rejects the entire
 *   message in that case, so it must surface here rather than as a failed reply
 */
export function encodeAttendanceButtonId(value: AttendanceButtonId): string {
  const customId = [
    PREFIX,
    value.sessionId,
    value.characterId,
    value.isPresent ? '1' : '0',
  ].join(SEPARATOR);

  if (customId.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(
      `custom_id dài ${customId.length} ký tự, vượt giới hạn ${MAX_CUSTOM_ID_LENGTH} của Discord: ${customId}`,
    );
  }

  return customId;
}

/**
 * Read an attendance button's custom_id back.
 * @param customId - Raw custom_id from the interaction
 * @returns The three parts, or null when this component is not an attendance button
 */
export function decodeAttendanceButtonId(
  customId: string,
): AttendanceButtonId | null {
  const parts = customId.split(SEPARATOR);

  if (parts.length !== PART_COUNT) return null;

  const [prefix, sessionId, characterId, answer] = parts;

  if (prefix !== PREFIX) return null;
  if (answer !== '1' && answer !== '0') return null;

  return { sessionId, characterId, isPresent: answer === '1' };
}

/** Marks a custom_id as belonging to a Class survey message. */
const SURVEY_PREFIX = 'cs';

/** Second part of the "Điền khảo sát" button's custom_id. */
const SURVEY_FILL = 'dien';

/** Parts of the fill button and select custom_ids: prefix, action, survey id. */
const SURVEY_ID_ONLY_PART_COUNT = 3;

/**
 * Build the custom_id of the "Điền khảo sát" button. It carries the survey id because Discord keeps
 * no state between presses and the same message may outlive its survey.
 *
 * @param surveyId - Id of the Class survey the button belongs to
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit
 */
export function encodeSurveyFillId(surveyId: string): string {
  return assertWithinLimit(
    [SURVEY_PREFIX, SURVEY_FILL, surveyId].join(SEPARATOR),
  );
}

/**
 * Read a "Điền khảo sát" button's custom_id back.
 * @param customId - Raw custom_id from the interaction
 * @returns The survey id, or null when this component is not that button
 */
export function decodeSurveyFillId(customId: string): string | null {
  return decodeSurveyIdOnly(customId, SURVEY_FILL);
}

/**
 * Read a `cs:<action>:<surveyId>` custom_id, the shape the fill button and the select share.
 * @param customId - Raw custom_id from the interaction
 * @param action - The second part the id must carry
 * @returns The survey id, or null when the id has another shape or action
 */
function decodeSurveyIdOnly(customId: string, action: string): string | null {
  const parts = customId.split(SEPARATOR);

  if (parts.length !== SURVEY_ID_ONLY_PART_COUNT) return null;

  const [prefix, actual, surveyId] = parts;

  if (prefix !== SURVEY_PREFIX || actual !== action) return null;
  if (surveyId.length === 0) return null;

  return surveyId;
}

/** Second part of the answer panel's select menu custom_id. */
const SURVEY_SELECT = 'chon';

/** Second part of the panel's confidence buttons. */
const SURVEY_LEVEL = 'muc';

/** Parts of a confidence button custom_id: prefix, action, survey id, target class, confidence. */
const SURVEY_LEVEL_PART_COUNT = 5;

/** What a confidence button carries, since the panel keeps no state between presses. */
export interface SurveyLevelId {
  surveyId: string;
  targetClass: GuildClass;
  confidence: ClassChangeConfidence;
}

/** Every component of the Class survey flow, told apart by `kind`. */
export type SurveyComponentId =
  | { kind: 'fill'; surveyId: string }
  | { kind: 'select'; surveyId: string }
  | ({ kind: 'level' } & SurveyLevelId);

/**
 * @param customId - The id to measure
 * @returns The same id
 * @throws Error when it exceeds Discord's 100-character limit
 */
function assertWithinLimit(customId: string): string {
  if (customId.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(
      `custom_id dài ${customId.length} ký tự, vượt giới hạn ${MAX_CUSTOM_ID_LENGTH} của Discord: ${customId}`,
    );
  }

  return customId;
}

/**
 * Build the custom_id of the answer panel's select menu.
 * @param surveyId - Id of the Class survey being answered
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit
 */
export function encodeSurveySelectId(surveyId: string): string {
  return assertWithinLimit(
    [SURVEY_PREFIX, SURVEY_SELECT, surveyId].join(SEPARATOR),
  );
}

/**
 * Build the custom_id of a confidence button. It carries the chosen class, so the press itself holds
 * everything needed to save.
 * @param value - Survey, class picked in the select and the confidence this button stands for
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit
 */
export function encodeSurveyLevelId(value: SurveyLevelId): string {
  return assertWithinLimit(
    [
      SURVEY_PREFIX,
      SURVEY_LEVEL,
      value.surveyId,
      value.targetClass,
      value.confidence,
    ].join(SEPARATOR),
  );
}

/**
 * Read any Class survey component's custom_id back.
 * @param customId - Raw custom_id from the interaction
 * @returns The component, or null when the id is not one of the survey's (including an id from an
 *   older build)
 */
export function decodeSurveyComponentId(
  customId: string,
): SurveyComponentId | null {
  const fillSurveyId = decodeSurveyFillId(customId);

  if (fillSurveyId !== null) return { kind: 'fill', surveyId: fillSurveyId };

  const selectSurveyId = decodeSurveyIdOnly(customId, SURVEY_SELECT);

  if (selectSurveyId !== null) {
    return { kind: 'select', surveyId: selectSurveyId };
  }

  const parts = customId.split(SEPARATOR);

  if (parts[0] !== SURVEY_PREFIX) return null;

  if (parts[1] === SURVEY_LEVEL) {
    if (parts.length !== SURVEY_LEVEL_PART_COUNT) return null;

    const [, , surveyId, targetClass, confidence] = parts;
    const knownClass = z.enum(GuildClass).safeParse(targetClass);
    const knownConfidence = z.enum(ClassChangeConfidence).safeParse(confidence);

    if (
      surveyId.length === 0 ||
      !knownClass.success ||
      !knownConfidence.success
    ) {
      return null;
    }

    return {
      kind: 'level',
      surveyId,
      targetClass: knownClass.data,
      confidence: knownConfidence.data,
    };
  }

  return null;
}
