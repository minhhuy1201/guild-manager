import type { TeamNoticeReport } from "@guild/shared/schemas";

/**
 * Fold the result of messaging again into the report the admin already has.
 *
 * The retry only covers the members that were unsent, so its own report is a fraction of the day.
 * Replacing the old report with it would erase everyone who did get a message the first time;
 * instead the sent counts add up, the permanent groups carry over, and `unsent` becomes whoever the
 * retry could not reach either.
 *
 * A pair the server skips on the retry (no longer in the saved formation) is in no group of the
 * result, so `totalCount` can drop by that much; the day's line-up changed under the report.
 *
 * @param previous - The report on screen
 * @param retry - What the server answered to the retry
 * @returns One report for the whole day
 */
export function mergeTeamNoticeReports(
  previous: TeamNoticeReport,
  retry: TeamNoticeReport
): TeamNoticeReport {
  const blocked = [...previous.blocked, ...retry.blocked];
  const missingDiscordId = [
    ...previous.missingDiscordId,
    ...retry.missingDiscordId,
  ];
  const notPresent = [...previous.notPresent, ...retry.notPresent];
  const { unsent } = retry;
  const sentCount = previous.sentCount + retry.sentCount;

  return {
    sentCount,
    totalCount:
      sentCount +
      blocked.length +
      missingDiscordId.length +
      notPresent.length +
      unsent.length,
    blocked,
    missingDiscordId,
    notPresent,
    unsent,
  };
}
