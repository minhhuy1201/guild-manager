import { z } from "zod";

/**
 * A formation on the wire: slotId → characterId. Empty slots carry NO key (not null) so the
 * payload does not balloon with 60 empty entries.
 */
export const assignmentSchema = z.record(z.string().min(1), z.string().min(1));

/** Max length of one note — sized to the width of the grid cell's input. */
export const NOTE_MAX_LENGTH = 60;

/**
 * Per-slot notes: slotId → text. A slot with no note carries no key, exactly like an empty
 * assignment slot. `.trim()` rejects a whitespace-only cell instead of storing an empty note.
 */
export const notesSchema = z.record(
  z.string().min(1),
  z.string().trim().min(1).max(NOTE_MAX_LENGTH),
);

/** Max length of a team's name — sized to the width of the team column header. */
export const TEAM_NAME_MAX_LENGTH = 24;

/**
 * Team names: team number (as a decimal string key) → name. Global data, not per session: the
 * same ten names apply to every week and every match. A team still showing its number carries NO
 * key, the same rule empty slots and note-less slots follow.
 *
 * The key is the team number rather than a slot id because the grid layout lives entirely in the
 * frontend — the backend only stores what the user typed against a number it never interprets.
 */
export const teamNamesSchema = z.record(
  z.string().regex(/^\d+$/, "Số đội không hợp lệ."),
  z.string().trim().min(1).max(TEAM_NAME_MAX_LENGTH),
);

/**
 * Body of PUT /team-builder/team-names — the WHOLE map every time, like the formation save.
 * A name dropped from the map is a name deleted.
 */
export const saveTeamNamesSchema = z.object({
  names: teamNamesSchema,
});

export type TeamNames = z.infer<typeof teamNamesSchema>;

export type SaveTeamNamesInput = z.infer<typeof saveTeamNamesSchema>;

/** One match: who stands where, plus each slot's note. */
export const matchSchema = z.object({
  slots: assignmentSchema,
  notes: notesSchema,
});

/**
 * Body of PUT /team-builder/formations/:sessionId — the WHOLE day's formation. A day holds
 * 1 or 2 matches; the cap of 2 lives here rather than in the table shape, so allowing 3 later
 * means changing only this number.
 */
export const saveFormationSchema = z.object({
  matches: z.array(matchSchema).min(1).max(2),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

export type MatchInput = z.infer<typeof matchSchema>;

export type SaveFormationInput = z.infer<typeof saveFormationSchema>;

/**
 * A match's formation and notes as the API returns it. Empty slots and note-less slots carry
 * no key, exactly like the inbound direction. Unlike `matchSchema` it carries no length
 * constraints: the outbound direction is not validated, this schema only derives the type.
 */
export const matchFormationSchema = z.object({
  /** slotId → characterId. Empty slots carry no key. */
  slots: z.record(z.string(), z.string()),
  /** slotId → note. Note-less slots carry no key. */
  notes: z.record(z.string(), z.string()),
});

/** A session with its saved formation, as the API returns it. */
export const sessionFormationSchema = z.object({
  sessionId: z.string(),
  /** Display label, e.g. "Thứ 7 · Bang Chiến" */
  label: z.string(),
  /** Battle time (ISO string) */
  dateTime: z.string(),
  /** Saturday Guild War */
  isGuildWar: z.boolean(),
  /** Opponent guild name, null for a Guild War or an unscheduled scrim */
  opponent: z.string().nullable(),
  /** Battle already played — the formation is frozen */
  locked: z.boolean(),
  /** Matches of the day, in order. Empty means nothing laid out and nothing noted. */
  matches: z.array(matchFormationSchema),
});

/**
 * A week that still holds formation data. Sharing a shape with `weekSchema` is coincidental:
 * `Week` describes a week whose schedule may be edited, this one a week with formation data —
 * two different sets, do not merge them.
 */
export const formationWeekSchema = z.object({
  /** Monday 00:00 of the week (ISO string) */
  weekStart: z.string(),
  /** Saturday 23:59 of the week (ISO string) */
  weekEnd: z.string(),
  /** The open attendance week. The list also carries the next week, so the first element is NOT necessarily the open one. */
  isActive: z.boolean(),
});

export type MatchFormation = z.infer<typeof matchFormationSchema>;

export type SessionFormation = z.infer<typeof sessionFormationSchema>;

export type FormationWeek = z.infer<typeof formationWeekSchema>;
