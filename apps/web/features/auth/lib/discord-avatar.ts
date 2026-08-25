/** Image size requested from the CDN: the avatar renders at 32px, fetched at 2x for retina. */
const AVATAR_SIZE = 64;

/** Prefix Discord puts on an animated avatar's hash. */
const ANIMATED_PREFIX = "a_";

/**
 * Build the Discord avatar URL from the hash stored in the database.
 *
 * The backend stores the hash, not a URL, because the CDN URL format is Discord's business — it can
 * change without notice while the hash does not. The URL is assembled here, at the point of use.
 * @param discordId - Discord ID of the signed-in user
 * @param avatarHash - Avatar hash from the last login, null on the default picture
 * @returns The image URL, or null when there is no hash to build from
 */
export function discordAvatarUrl(
  discordId: string,
  avatarHash: string | null
): string | null {
  if (!avatarHash) return null;

  // An animated avatar's hash starts with "a_" and only yields an image with the .gif extension.
  const extension = avatarHash.startsWith(ANIMATED_PREFIX) ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=${AVATAR_SIZE}`;
}
