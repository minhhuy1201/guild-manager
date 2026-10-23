/**
 * An admin Discord command an Admin can grant to a Manager one by one, independent of any
 * Capability. `/ping` and `/diem-danh` are open to everyone and are not listed. Must match Prisma's
 * `GrantableCommand` enum values.
 */
export enum GrantableCommand {
  /** `/diem-danh-ho` */
  DIEM_DANH_HO = "DIEM_DANH_HO",
  /** `/chao-mung` */
  CHAO_MUNG = "CHAO_MUNG",
  /** `/cau-hinh-kenh` */
  CAU_HINH_KENH = "CAU_HINH_KENH",
  /** `/thong-bao` */
  THONG_BAO = "THONG_BAO",
  /** `/nhac-diem-danh` */
  NHAC_DIEM_DANH = "NHAC_DIEM_DANH",
}

/** Display label per command: the slash command as typed in Discord, keys in display order. */
export const GRANTABLE_COMMAND_LABEL: Record<GrantableCommand, string> = {
  [GrantableCommand.DIEM_DANH_HO]: "/diem-danh-ho",
  [GrantableCommand.CHAO_MUNG]: "/chao-mung",
  [GrantableCommand.CAU_HINH_KENH]: "/cau-hinh-kenh",
  [GrantableCommand.THONG_BAO]: "/thong-bao",
  [GrantableCommand.NHAC_DIEM_DANH]: "/nhac-diem-danh",
};
