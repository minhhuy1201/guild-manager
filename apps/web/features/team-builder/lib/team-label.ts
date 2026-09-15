/**
 * What a team is called on screen: its name, or its number while it has none. One rule for the
 * column header and the phone's team chips, so the two never disagree.
 * @param team - Team number
 * @param name - The team's name, empty string when it has none
 * @returns The name, or the number as text
 */
export function teamLabel(team: number, name: string): string {
  return name || String(team);
}
