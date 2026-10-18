import type {
  TeamNoticeReport,
  TeamNoticeTarget,
} from "@guild/shared/schemas";

interface ReportGroup {
  /** Why these members got no message */
  title: string;
  members: TeamNoticeTarget[];
}

interface TeamNoticeReportViewProps {
  /** What the server answered after sending */
  report: TeamNoticeReport;
}

/**
 * Say how many members were messaged and name everyone who was not, grouped by the reason.
 *
 * Written out rather than behind a hover or a count: the admin has to read the names to message
 * those people some other way.
 *
 * @param report - The server's answer
 * @returns The summary line and one list per non-empty group
 */
export function TeamNoticeReportView({ report }: TeamNoticeReportViewProps) {
  const groups: ReportGroup[] = [
    { title: "Chặn tin nhắn từ bot", members: report.blocked },
    { title: "Chưa có Discord ID", members: report.missingDiscordId },
    { title: "Chưa điểm danh Có", members: report.notPresent },
    { title: "Chưa nhắn được", members: report.unsent },
  ].filter((group) => group.members.length > 0);

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">
        {`Đã nhắn riêng ${report.sentCount}/${report.totalCount}`}
      </p>
      {groups.map((group) => (
        <div key={group.title} className="grid gap-1 text-sm">
          <p className="font-medium">{`${group.title} (${group.members.length})`}</p>
          <ul className="grid gap-0.5 text-muted-foreground">
            {group.members.map((member) => (
              <li key={`${member.characterId}-${member.matchIndex}`}>
                {`${member.name} - trận ${member.matchIndex}`}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
