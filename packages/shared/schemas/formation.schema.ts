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
  /** How many matches are played on this day — the ceiling on how many formations it may hold */
  matchCount: z.number(),
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

/**
 * Longest a single line-up image may be as a base64 data URL.
 *
 * A day is played over at most 2 matches, so **two** of these travel in one body — that product, not
 * this number alone, is what has to clear the API's own body limit and stay under the 4.5MB a Vercel
 * Function accepts. It was first written as 3,000,000, which put two images at 6MB: past the
 * platform ceiling, where the request dies at the edge with no Vietnamese sentence to show.
 * `apps/api/src/config/__tests__/body-limit.spec.ts` holds the three numbers in order.
 */
export const ANNOUNCEMENT_IMAGE_MAX_CHARS = 2_000_000;

/**
 * One line-up image on the wire. The format is pinned to webp — the browser encodes it, the API
 * hands it to Discord, and one constant deciding both is what keeps them from drifting.
 */
const announcementImageSchema = z
  .string()
  .regex(
    /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/,
    "Ảnh đội hình không hợp lệ.",
  )
  .max(ANNOUNCEMENT_IMAGE_MAX_CHARS, "Ảnh đội hình quá lớn.");

/**
 * Body of POST /team-builder/formations/:sessionId/announce — one image per match laid out, in
 * match order. `min(1)` because an announcement with no line-up is not one; `max(2)` is the same
 * ceiling a day's match count carries.
 */
export const announceFormationSchema = z.object({
  images: z
    .array(announcementImageSchema)
    .min(1, "Chưa có ảnh đội hình nào để gửi.")
    .max(2, "Một ngày nhiều nhất 2 trận."),
});

/** What the announce endpoint answers: how many images reached Discord. */
export const announcementResultSchema = z.object({
  imageCount: z.number(),
});

export type AnnounceFormationInput = z.infer<typeof announceFormationSchema>;

export type AnnouncementResult = z.infer<typeof announcementResultSchema>;
