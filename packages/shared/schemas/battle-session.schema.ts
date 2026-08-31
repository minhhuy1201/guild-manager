import { z } from "zod";

import { isWithinDeadlineCap } from "../lib/battle-session";

/** ISO datetime string — used for every time field on the wire. */
const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Thời gian không hợp lệ.",
  });

/**
 * Opponent guild name. Optional (a scrim may have no opponent yet, a Guild War never
 * has one). The service normalises an empty string to null.
 */
const opponent = z
  .string()
  .trim()
  .max(100, "Tên bang đối thủ tối đa 100 ký tự.")
  .nullable()
  .optional();

/** Message shown when a deadline exceeds the cap — shared by the API and the form. */
export const DEADLINE_CAP_MESSAGE =
  "Hạn chót điểm danh không được muộn hơn 10:00 sáng ngày đánh.";

/**
 * Message shown when the week marker on the query string cannot be parsed.
 *
 * Its only reader is `weekStartQuerySchema` below — the single layer that builds the
 * Vietnamese sentence and the 400 for `?weekStart=`. Kept as a constant so the web app
 * can import it to repeat the exact wording, like `DEADLINE_CAP_MESSAGE`.
 */
export const INVALID_WEEK_MESSAGE = "Tuần không hợp lệ.";

/**
 * A day is played over 1 or 2 matches. Both bounds and the message are shared by the schema, the
 * service and the form, so the rule cannot drift between the three.
 */
export const MATCH_COUNT_MIN = 1;
export const MATCH_COUNT_MAX = 2;

/** Message shown when the match count falls outside its bounds. */
export const MATCH_COUNT_MESSAGE = "Một ngày đánh 1 hoặc 2 trận.";

/**
 * Query string of the week-scoped read endpoints (`?weekStart=`).
 *
 * `offset: true` because a valid client may send `+07:00`, not just `Z`. `preprocess`
 * turns an empty string into `undefined`: `?weekStart=` is harmless and must behave like
 * an omitted value rather than a 400.
 *
 * Zod only answers "is this an instant"; which week that instant belongs to is a week
 * rule owned by `parseWeekStart` in apps/api.
 */
export const weekStartQuerySchema = z.object({
  weekStart: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.iso.datetime({ offset: true, error: INVALID_WEEK_MESSAGE }).optional()
  ),
});

export type WeekStartQuery = z.infer<typeof weekStartQuerySchema>;

/** The fields of a session, before any cross-field rule. */
const battleSessionFields = z.object({
  /** When the battle takes place (ISO string) */
  dateTime: isoDateTime,
  /** Admin-set attendance deadline, at most 10:00 on the battle day (ISO string) */
  deadline: isoDateTime,
  /** How many matches are played on this day, 1 or 2 */
  matchCount: z
    .number()
    .int(MATCH_COUNT_MESSAGE)
    .min(MATCH_COUNT_MIN, MATCH_COUNT_MESSAGE)
    .max(MATCH_COUNT_MAX, MATCH_COUNT_MESSAGE),
  opponent,
});

/** Body of POST /battle-sessions (form + request body). */
export const createBattleSessionSchema = battleSessionFields.refine(
  ({ dateTime, deadline }) =>
    isWithinDeadlineCap(new Date(deadline), new Date(dateTime)),
  { path: ["deadline"], message: DEADLINE_CAP_MESSAGE }
);

/**
 * Body of PATCH /battle-sessions/:id — partial. No cap rule here: a PATCH may send only
 * one of the two fields, so the schema lacks the data to decide. The service rules on the
 * pair merged with the stored row.
 */
export const updateBattleSessionSchema = battleSessionFields.partial();

export type CreateBattleSessionInput = z.infer<typeof createBattleSessionSchema>;

export type UpdateBattleSessionInput = z.infer<typeof updateBattleSessionSchema>;

/** A battle session as the API returns it, times as ISO strings. */
export const battleSessionSchema = z.object({
  id: z.string(),
  /** Display label derived from the battle time, e.g. "Thứ 3 · 20:30". Not stored. */
  label: z.string(),
  dateTime: isoDateTime,
  /** Admin-set attendance deadline. */
  deadline: isoDateTime,
  /** Whether the deadline had passed when the server built the response. */
  isDeadlinePassed: z.boolean(),
  isGuildWar: z.boolean(),
  /** Opponent guild name, null for a Guild War or an unscheduled scrim. */
  opponent: z.string().nullable(),
  /** Monday 00:00 of the week containing this session. */
  weekStart: isoDateTime,
  /** Attendance entries recorded so far — the delete dialog needs this. */
  attendanceCount: z.number(),
  /** How many matches are played on this day. Guild War: system-owned, alternating per week. */
  matchCount: z.number(),
  /** How many formations have been laid out for this day — never more than `matchCount`. */
  formationMatchCount: z.number(),
});

/** An attendance week as the API returns it. */
export const weekSchema = z.object({
  /** Monday 00:00 (ISO string) */
  weekStart: isoDateTime,
  /** Saturday 23:59 (ISO string) */
  weekEnd: isoDateTime,
  /** Whether this is the open week (the other element is the next one) */
  isActive: z.boolean(),
});

export type BattleSession = z.infer<typeof battleSessionSchema>;

export type Week = z.infer<typeof weekSchema>;
