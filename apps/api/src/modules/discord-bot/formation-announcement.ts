import { formationAnnouncementContent } from '@guild/shared/lib';
import type {
  FormationAnnouncementInput,
  FormationAnnouncementLinks,
} from '@guild/shared/lib';

import type { MessagePayload } from './commands/command.types';

export type {
  FormationAnnouncementInput,
  FormationAnnouncementLinks,
} from '@guild/shared/lib';

/**
 * Build the formation announcement posted with the line-up images.
 *
 * The wording lives in `@guild/shared/lib` so the web app previews the same text. What stays here
 * is the part only the sender decides: the mention lives in `content` because Discord only notifies
 * people for mentions in the message text, and `allowed_mentions` is present to *close* everything
 * else — the message is assembled from admin-entered data and must not be able to grow an
 * `@everyone`.
 *
 * @param input - The battle being announced
 * @param links - The role to ping and the channel to link
 * @returns The message body, ready for `postMessageWithFiles`
 */
export function buildFormationAnnouncement(
  input: FormationAnnouncementInput,
  links: FormationAnnouncementLinks,
): MessagePayload {
  return {
    content: formationAnnouncementContent(input, links),
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
