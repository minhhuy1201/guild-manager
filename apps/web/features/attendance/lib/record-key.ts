/**
 * Unique key for an attendance record: the (characterId, sessionId) pair.
 * A client-side map key only — not a shape crossing the network, so it does not live in
 * `packages/shared`.
 * @param characterId - Character id
 * @param sessionId - Battle session id
 * @returns The unique key string
 */
export function recordKey(characterId: string, sessionId: string): string {
  return `${characterId}__${sessionId}`;
}
