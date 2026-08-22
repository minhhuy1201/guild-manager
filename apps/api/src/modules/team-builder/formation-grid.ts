import type { MatchFormation } from '@guild/shared/schemas';

/**
 * Codec giữa đội hình một trận (`MatchFormation`) và các hàng `FormationSlot` dưới database.
 *
 * Luật của cả hai chiều, nói một lần ở đây: **một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ.**
 * Ô vừa trống vừa không ghi gì thì không có hàng, nên chiều mã hoá phải lấy hợp của hai tập khoá
 * (duyệt riêng `slots` sẽ đánh rơi ô chỉ có ghi chú) và chiều giải mã phải lọc riêng từng cột
 * (`characterId` và `note` đều có thể null).
 *
 * `prisma/schema.prisma` mô tả cùng luật này ở phía dữ liệu; file này là chỗ duy nhất luật đó
 * thành code.
 */

/** Một hàng `FormationSlot` — chiều ghi dựng ra, chiều đọc nhận vào. */
export interface SlotRow {
  slotId: string;
  characterId: string | null;
  note: string | null;
}

/** Hàng đã biết chắc là có người, dùng để thu hẹp kiểu thay cho `as string`. */
type OccupiedRow = SlotRow & { characterId: string };

/** Hàng đã biết chắc là có ghi chú. */
type AnnotatedRow = SlotRow & { note: string };

/**
 * Đổi đội hình một trận thành các hàng `FormationSlot`.
 * @param match - Đội hình và ghi chú của một trận, characterId đã lọc sạch
 * @returns Mảng hàng để đưa vào nested create của Prisma; thứ tự không có ý nghĩa
 */
export function encodeMatch(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([
    ...Object.keys(match.slots),
    ...Object.keys(match.notes),
  ]);

  return [...slotIds].map((slotId) => ({
    slotId,
    characterId: match.slots[slotId] ?? null,
    note: match.notes[slotId] ?? null,
  }));
}

/**
 * Dựng lại đội hình một trận từ các hàng `FormationSlot`.
 * Nghịch đảo của `encodeMatch`: `decodeMatch(encodeMatch(x))` sâu bằng `x`.
 * @param rows - Các hàng của một trận, thứ tự không quan trọng
 * @returns Đội hình một trận; không có hàng nào cho `{ slots: {}, notes: {} }`
 */
export function decodeMatch(rows: SlotRow[]): MatchFormation {
  return {
    slots: Object.fromEntries(
      rows
        .filter(isOccupied)
        .map((row) => [row.slotId, row.characterId] as const),
    ),
    notes: Object.fromEntries(
      rows.filter(isAnnotated).map((row) => [row.slotId, row.note] as const),
    ),
  };
}

/**
 * Hàng này có xếp người không.
 * @param row - Hàng cần kiểm
 * @returns true khi `characterId` không null, đồng thời thu hẹp kiểu của hàng
 */
function isOccupied(row: SlotRow): row is OccupiedRow {
  return row.characterId !== null;
}

/**
 * Hàng này có ghi chú không.
 * @param row - Hàng cần kiểm
 * @returns true khi `note` không null, đồng thời thu hẹp kiểu của hàng
 */
function isAnnotated(row: SlotRow): row is AnnotatedRow {
  return row.note !== null;
}
