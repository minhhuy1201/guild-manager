/**
 * Khóa duy nhất cho một record điểm danh: cặp (characterId, sessionId).
 * Chỉ là khoá map phía client — không phải shape đi qua mạng, nên không nằm ở
 * `packages/shared`.
 * @param characterId - ID nhân vật
 * @param sessionId - ID buổi đánh
 * @returns Chuỗi khóa duy nhất
 */
export function recordKey(characterId: string, sessionId: string): string {
  return `${characterId}__${sessionId}`;
}
