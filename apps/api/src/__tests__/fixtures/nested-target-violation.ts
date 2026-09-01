/**
 * Fixture for `module-boundary.spec.ts` — a **deliberate** module boundary violation whose target
 * sits one directory deeper than the module root.
 *
 * The other two fixtures vary the depth of the *importing* file; this one varies the depth of the
 * file being imported, which is where the rule used to stop looking: `fileInternalPath` was a
 * single-segment extglob, so `dto/mark-attendance.dto.ts` matched nothing and the `disallow` policy
 * never applied.
 */
import { MarkAttendanceDto } from '../../modules/attendance/dto/mark-attendance.dto';

export type ViolatingImport = MarkAttendanceDto;
