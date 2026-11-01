"use client";

import {
  CLASS_CHANGE_CONFIDENCE_LABEL,
  ClassChangeConfidence,
  GUILD_CLASS_LABEL,
} from "@guild/shared/enums";
import type { ClassSurveyMember } from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MemberListTabProps {
  /** Every guild member with their answer */
  members: ClassSurveyMember[];
}

/**
 * What one member plans: staying, moving (with how sure), or no answer yet. "Chưa điền" is its own
 * wording so a silent member is never read as staying.
 * @param member - The member
 * @returns The planned-class cell content
 */
function PlannedClass({ member }: { member: ClassSurveyMember }) {
  const { answer } = member;
  if (!answer) return <span className="text-muted-foreground">Chưa điền</span>;
  if (answer.kind === "KEEP") return <span>Giữ nguyên</span>;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <GuildClassIcon guildClass={answer.targetClass} />
      <span>{GUILD_CLASS_LABEL[answer.targetClass]}</span>
      <Badge
        variant="outline"
        className={cn(
          answer.confidence === ClassChangeConfidence.SURE
            ? "border-jade/50 bg-jade/10 text-foreground"
            : "text-muted-foreground"
        )}
      >
        {CLASS_CHANGE_CONFIDENCE_LABEL[answer.confidence]}
      </Badge>
    </span>
  );
}

/**
 * Every member with their class now and the class they plan to play.
 * @param members - Every guild member with their answer
 * @returns The member table
 */
export function MemberListTab({ members }: MemberListTabProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Thành viên</TableHead>
          <TableHead>Hiện tại</TableHead>
          <TableHead>Dự định</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <GuildClassIcon guildClass={member.guildClass} />
                <span className="max-sm:sr-only">{GUILD_CLASS_LABEL[member.guildClass]}</span>
              </span>
            </TableCell>
            <TableCell>
              <PlannedClass member={member} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
