import { z } from "zod";

import { SLOTS_PER_TEAM, TEAM_COUNT } from "../lib/slot-id";

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
 * The version a save was based on. Required, never defaulted: a body without it comes from a client
 * that predates the check, and saving it would be the silent overwrite this field exists to stop.
 */
const versionSchema = z.number().int().nonnegative();

/**
 * Body of PUT /team-builder/team-names — the WHOLE map every time, like the formation save.
 * A name dropped from the map is a name deleted.
 */
export const saveTeamNamesSchema = z.object({
  names: teamNamesSchema,
  version: versionSchema,
});

export type TeamNames = z.infer<typeof teamNamesSchema>;

export type SaveTeamNamesInput = z.infer<typeof saveTeamNamesSchema>;

/** GET/PUT /team-builder/team-names answer: the map plus the version it is at. */
export const teamNamesStateSchema = z.object({
  names: teamNamesSchema,
  version: z.number().int(),
});

export type TeamNamesState = z.infer<typeof teamNamesStateSchema>;

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
  version: versionSchema,
});

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
  /** Bumped by every save and by every server-side release (spec F14 4.3) */
  version: z.number().int(),
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

/** A webp image as a base64 data URL, the one format line-up and team card images travel in. */
const WEBP_DATA_URL = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * One line-up image on the wire. The format is pinned to webp — the browser encodes it, the API
 * hands it to Discord, and one constant deciding both is what keeps them from drifting.
 */
const announcementImageSchema = z
  .string()
  .regex(WEBP_DATA_URL, "Ảnh đội hình không hợp lệ.")
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

/**
 * One Team notice: a member and the match it is about. `matchIndex` is the stored one (1 or 2),
 * the same number `FormationMatch.matchIndex` carries, so "match 2" reads the same everywhere.
 */
export const teamNoticeTargetSchema = z.object({
  characterId: z.string(),
  /** Character name, so the admin can read the report without a lookup */
  name: z.string(),
  matchIndex: z.number().int(),
});

/**
 * What POST /team-builder/formations/:sessionId/notify-members answers. Every Team notice the day
 * calls for lands in exactly one place: `sentCount`, or one of the four groups that explain why not.
 */
export const teamNoticeReportSchema = z.object({
  sentCount: z.number().int(),
  /** Sent plus every group below: the denominator of "đã nhắn X/Y" */
  totalCount: z.number().int(),
  /** The member does not accept DMs from the bot (Discord error 50007) */
  blocked: z.array(teamNoticeTargetSchema),
  /** The member has no Discord ID yet */
  missingDiscordId: z.array(teamNoticeTargetSchema),
  /** Placed in the line-up but no "Có" answer for the day */
  notPresent: z.array(teamNoticeTargetSchema),
  /** Discord did not take it for a temporary reason; worth sending again */
  unsent: z.array(teamNoticeTargetSchema),
});

export type TeamNoticeTarget = z.infer<typeof teamNoticeTargetSchema>;

export type TeamNoticeReport = z.infer<typeof teamNoticeReportSchema>;

/** A day is played over at most 2 matches, the same ceiling `saveFormationSchema` carries. */
const MAX_MATCHES = 2;

/**
 * Longest a single team card image may be as a base64 data URL.
 *
 * Up to `TEAM_COUNT * MAX_MATCHES` (20) of these travel in one notify-members body next to the
 * `notices` list, and that sum has to clear the API's `JSON_BODY_LIMIT` (4 MiB) with room to spare,
 * which in turn sits under the 4.5MB a Vercel Function accepts. 180,000 characters puts the images
 * at 3.6MB, leaving about 0.5MB over the largest valid `notices`. A six-row card is far smaller
 * than a full line-up image, but its real size was not measured when this was set: confirm it on
 * the first real send (the browser console warns for every image dropped here). An image over this
 * cap is dropped by the browser, so the member gets the text notice instead of a rejected request.
 * `apps/api/src/config/__tests__/body-limit.spec.ts` holds the numbers in order.
 */
export const TEAM_IMAGE_MAX_CHARS = 180_000;

/**
 * Most notices one body can carry: every position of every team in every match. Bounds the list so
 * the largest valid body is a number the body-limit test can add up.
 */
export const MAX_NOTICES = TEAM_COUNT * SLOTS_PER_TEAM * MAX_MATCHES;

/** Longest `characterId` a notice may carry, far above any real id and a bound for the same reason. */
export const NOTICE_CHARACTER_ID_MAX_CHARS = 64;

/**
 * One team card image, shared by every recipient on that team in that match. `matchIndex` is the
 * stored one (1 or 2) like in `notices`.
 */
const teamImageSchema = z.object({
  matchIndex: z.number().int().min(1).max(MAX_MATCHES),
  team: z.number().int().min(1).max(TEAM_COUNT),
  image: z
    .string()
    .regex(WEBP_DATA_URL, "Ảnh team không hợp lệ.")
    .max(TEAM_IMAGE_MAX_CHARS, "Ảnh team quá lớn."),
});

/**
 * Body of POST /team-builder/formations/:sessionId/notify-members. `notices` narrows the send to
 * those members and matches, the retry of whoever did not get theirs. Left out, everyone the day
 * calls for is messaged. `teamImages` holds the card image of each (match, team); a team without
 * one is messaged in text, so leaving it out is valid.
 */
export const notifyMembersSchema = z.object({
  notices: z
    .array(
      z.object({
        characterId: z.string().min(1).max(NOTICE_CHARACTER_ID_MAX_CHARS),
        matchIndex: z.number().int().min(1).max(MAX_MATCHES),
      }),
    )
    .max(MAX_NOTICES)
    .optional(),
  teamImages: z
    .array(teamImageSchema)
    .max(TEAM_COUNT * MAX_MATCHES)
    .refine(
      (images) =>
        new Set(images.map((i) => `${i.matchIndex}:${i.team}`)).size ===
        images.length,
      "Mỗi team chỉ được có một ảnh cho mỗi trận.",
    )
    .optional(),
});

export type NotifyMembersInput = z.infer<typeof notifyMembersSchema>;
