import { fromVnParts, vnParts } from "@guild/shared/lib";

/**
 * `<input type="datetime-local">` takes and returns "YYYY-MM-DDTHH:mm" with no zone attached, while
 * the API uses ISO UTC. These two functions are the only place the two are converted.
 *
 * The wall clock on both sides of that conversion is **fixed UTC+7**, never the browser's. A match
 * time means the same instant to everyone in the guild, and the backend computes deadlines in
 * Vietnam time regardless of where the admin sits; reading the machine's clock here made an admin
 * abroad save a different instant from the one they typed, with no error and no warning.
 */

/**
 * Pad a number to two digits.
 * @param value - Number to pad
 * @returns The value as a two-character string
 */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Convert an ISO string into a datetime-local input value.
 * @param iso - The instant as an ISO string
 * @returns "YYYY-MM-DDTHH:mm" in Vietnam time
 */
export function toInputValue(iso: string): string {
  const { year, month, day, hour, minute } = vnParts(new Date(iso));

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/**
 * Read a datetime-local input value as the instant it means.
 * The deadline rules take `Date`s, so they need this rather than the ISO string.
 * @param value - "YYYY-MM-DDTHH:mm" read as Vietnam time
 * @returns The instant
 */
export function toInstant(value: string): Date {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  return fromVnParts({ year, month, day, hour, minute });
}

/**
 * Convert a datetime-local input value into the ISO string sent to the API.
 * @param value - "YYYY-MM-DDTHH:mm" read as Vietnam time
 * @returns The instant as an ISO string
 */
export function fromInputValue(value: string): string {
  return toInstant(value).toISOString();
}
