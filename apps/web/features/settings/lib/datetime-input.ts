/**
 * `<input type="datetime-local">` takes and returns "YYYY-MM-DDTHH:mm" in the user's local time, while
 * the API uses ISO UTC. These two functions are the only place the two are converted.
 */

/**
 * Convert an ISO string into a datetime-local input value.
 * @param iso - The instant as an ISO string
 * @returns "YYYY-MM-DDTHH:mm" in local time
 */
export function toInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

/**
 * Convert a datetime-local input value into the ISO string sent to the API.
 * @param value - "YYYY-MM-DDTHH:mm" in local time
 * @returns The instant as an ISO string
 */
export function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}
