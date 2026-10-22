import { TEAM_IMAGE_MAX_CHARS } from "@guild/shared/schemas";

import type { TeamImage } from "./announce-capture";

/**
 * Drop the images the API would refuse for size.
 *
 * One image over `TEAM_IMAGE_MAX_CHARS` would make the server reject the whole body, and every
 * member would lose their notice; dropped here, only that team is messaged in text.
 *
 * @param images - Captured team images
 * @returns The images that fit the limit, in the same order
 */
export function dropOversizedTeamImages(images: TeamImage[]): TeamImage[] {
  return images.filter((image) => image.image.length <= TEAM_IMAGE_MAX_CHARS);
}
