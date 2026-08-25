import type { Character } from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";

interface CharacterNameProps {
  /** Character to display */
  character: Character;
}

/**
 * A character cell: class icon plus name.
 * @param character - Character to display
 * @returns The avatar and name pair
 */
export function CharacterName({ character }: CharacterNameProps) {
  return (
    // Cap the width on phones so the (left-pinned) name column does not eat the whole screen when a
    // character name is long.
    <div className="flex max-w-36 items-center gap-2 sm:max-w-none">
      <GuildClassIcon guildClass={character.guildClass} />
      <span className="truncate font-medium">{character.name}</span>
    </div>
  );
}
