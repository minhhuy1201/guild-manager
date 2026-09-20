/** The app's route paths — shared by the nav and by programmatic navigation. */
export const ROUTES = {
  landing: "/trang-chu",
  attendance: "/",
  attendanceHistory: "/lich-su-diem-danh",
  teamBuilder: "/xep-team",
  tactics: "/chien-thuat",
  settings: "/thiet-lap",
  login: "/dang-nhap",
  loginCallback: "/dang-nhap/discord",
} as const;

/**
 * Path of one tactic's editor.
 * @param id - Tactic id
 * @returns The editor route
 */
export function tacticEditorPath(id: string): string {
  return `${ROUTES.tactics}/${encodeURIComponent(id)}`;
}
