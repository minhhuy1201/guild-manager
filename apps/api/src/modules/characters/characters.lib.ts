import { randomInt } from 'node:crypto';

/**
 * Alphabet for the id suffix.
 * `l`, `o`, `0` and `1` are dropped so ids cannot be misread or mistyped.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Length of the random part of an id — the part that makes it unique. */
const ID_SUFFIX_LENGTH = 6;

/** Prefix used when a name has no sluggable characters left (e.g. a purely Han name). */
const FALLBACK_PREFIX = 'thanh-vien';

/**
 * Generate a random string from ALPHABET.
 * @param length - Number of characters to generate
 * @returns The random string
 */
function randomString(length: number): string {
  return Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
}

/**
 * Slugify a character name: strip Vietnamese diacritics, lowercase, join with hyphens.
 * @param name - Display name of the character
 * @returns A slug of [a-z0-9-] only, or `thanh-vien` when nothing is left
 */
export function slugifyName(name: string): string {
  const slug = name
    .normalize('NFD')
    // Drop the tone and circumflex marks NFD split off.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // NFD does not decompose đ/Đ, so it needs its own rule.
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? FALLBACK_PREFIX : slug;
}

/**
 * Generate the primary key for a new character: name slug plus a random suffix.
 * The prefix only makes rows guessable when reading the database; the suffix is what guarantees uniqueness.
 * @param name - Display name of the character
 * @returns An id of the form `meo-beo-k7ma3x`
 */
export function generateId(name: string): string {
  return `${slugifyName(name)}-${randomString(ID_SUFFIX_LENGTH)}`;
}
