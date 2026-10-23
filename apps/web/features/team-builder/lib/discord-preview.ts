import {
  formationAnnouncementContent,
  teamNoticeContent,
} from "@guild/shared/lib";
import type { BattleSession } from "@guild/shared/schemas";

/** The fields of the battle day the preview wording reads. */
export type PreviewSession = Pick<
  BattleSession,
  "isGuildWar" | "dateTime" | "matchCount"
>;

/** Stand-in ids for the three Discord objects the messages mention; the real ones live on the API. */
const PREVIEW_IDS = {
  guildRoleId: "preview-guild",
  baoBanChannelId: "preview-bao-ban",
  bangChienChannelId: "preview-bang-chien",
} as const;

/** What each mention in the preview reads as, keyed by the raw token the content holds. */
export const PREVIEW_MENTION_LABELS: Readonly<Record<string, string>> = {
  [`<@&${PREVIEW_IDS.guildRoleId}>`]: "@Bang",
  [`<#${PREVIEW_IDS.baoBanChannelId}>`]: "#🤒│báo-bận",
  [`<#${PREVIEW_IDS.bangChienChannelId}>`]: "#bang-chiến",
};

/** The team and match the sample direct message is written for. */
export const SAMPLE_TEAM = 1;
export const SAMPLE_MATCH = 1;

/**
 * The text of the channel message as the guild will read it.
 * @param session - The battle day being announced
 * @param note - The Announcement note, null when there is none
 * @param now - Now, for the "TỐI NAY" phrase
 * @returns The same text the API posts, with stand-in ids
 */
export function previewChannelContent(
  session: PreviewSession,
  note: string | null,
  now: Date
): string {
  return formationAnnouncementContent(
    {
      isGuildWar: session.isGuildWar,
      dateTime: new Date(session.dateTime),
      matchCount: session.matchCount,
      now,
      note,
    },
    PREVIEW_IDS
  );
}

/**
 * The text of the sample direct message: team 1 of match 1, as if that team had a card image.
 * @param session - The battle day being announced
 * @param note - The Announcement note, null when there is none
 * @returns The same text the API sends, with stand-in ids
 */
export function previewDirectMessageContent(
  session: PreviewSession,
  note: string | null
): string {
  return teamNoticeContent({
    isGuildWar: session.isGuildWar,
    dateTime: new Date(session.dateTime),
    matchIndex: SAMPLE_MATCH,
    matchCount: session.matchCount,
    team: SAMPLE_TEAM,
    teamName: null,
    hasImage: true,
    bangChienChannelId: PREVIEW_IDS.bangChienChannelId,
    note,
  });
}
