import { teamNoticeContent } from '@guild/shared/lib';
import type { TeamNoticeInput } from '@guild/shared/lib';

import type { MessagePayload } from './commands/command.types';

export type { TeamNoticeInput } from '@guild/shared/lib';

/**
 * Build the direct message that tells one member which team they are in for one match.
 *
 * The wording lives in `@guild/shared/lib` so the web app previews the same text.
 * `allowed_mentions` closes every mention because the team name is typed by an admin and must not
 * be able to ping anybody; the channel link is not a pinging mention, so it needs no opening.
 *
 * @param input - The match, the team and whether an image goes with it
 * @returns The message body, ready for `postMessage` or `postMessageWithFiles`
 */
export function buildTeamNotice(input: TeamNoticeInput): MessagePayload {
  return {
    content: teamNoticeContent(input),
    allowed_mentions: { parse: [] },
  };
}
