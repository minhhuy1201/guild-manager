import { ClassOutlookScreen } from "@/features/class-survey";

/**
 * Route /luu-phai - composes the class survey feature's outlook screen. The proxy already requires
 * a session; the API serves every signed-in member.
 * @returns The Class outlook page
 */
export default function ClassOutlookPage() {
  return <ClassOutlookScreen />;
}
