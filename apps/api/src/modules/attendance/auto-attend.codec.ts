import {
  autoAttendStatusSchema,
  type AutoAttendStatus,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { AutoAttendWindow } from './auto-attend-coverage';

/** The AutoAttendPeriod columns the codec needs. */
export type AutoAttendRow = {
  id: string;
  characterId: string;
  enabledAt: Date;
  disabledAt: Date | null;
};

/**
 * Turn the running period (or its absence) into the object returned to the client.
 * @param row - The character's period with no `disabledAt`, or null when Auto-attend is off
 * @returns The contract-shaped status
 */
export function toAutoAttendStatus(
  row: AutoAttendRow | null,
): AutoAttendStatus {
  return verifyResponse(autoAttendStatusSchema, {
    enabled: row !== null,
    enabledAt: row ? row.enabledAt.toISOString() : null,
  } satisfies AutoAttendStatus);
}

/**
 * Turn an AutoAttendPeriod row into what the coverage rule reads.
 * @param row - Row read from Prisma
 * @returns The period with its moments as instants
 */
export function toAutoAttendWindow(row: AutoAttendRow): AutoAttendWindow {
  return {
    id: row.id,
    characterId: row.characterId,
    enabledAt: row.enabledAt,
    disabledAt: row.disabledAt,
  };
}
