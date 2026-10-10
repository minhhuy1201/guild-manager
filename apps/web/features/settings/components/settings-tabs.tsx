"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plane, Swords, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LeavePanel } from "@/features/attendance";
import { MembersPanel } from "@/features/members";
import { SettingsScreen } from "./settings-screen";
import { SettingsSkeleton } from "./settings-skeleton";

/** The tab values — the schedule opens by default, being the most common task. */
const TAB = {
  battles: "battles",
  members: "members",
  leaves: "leaves",
} as const;

/** One of the tabs. */
type SettingsTab = (typeof TAB)[keyof typeof TAB];

/** Query parameter the open tab is kept in: `?tab=members`. */
const TAB_PARAM = "tab";

/**
 * Phone layout shared by the three triggers: icon stacked over the short name, equal shares of the
 * row. `flex-1` items keep `min-width: auto`, so they cannot shrink below their text; `min-w-0`
 * lets the three split the row evenly. Phone-only: from `sm` the list is `w-fit` and the longest
 * full name needs the room its content asks for.
 */
const PHONE_TRIGGER_CLASS =
  "max-sm:min-w-0 max-sm:flex-col max-sm:gap-0.5 max-sm:px-1 max-sm:py-1.5 max-sm:text-xs";

/**
 * Read the tab out of the address. Anything but "members" or "leaves" - no parameter, an old or
 * mistyped value - opens the schedule, the default.
 * @param value - The `tab` query parameter, null when absent
 * @returns The tab to open
 */
function tabFrom(value: string | null): SettingsTab {
  if (value === TAB.members) return TAB.members;
  if (value === TAB.leaves) return TAB.leaves;

  return TAB.battles;
}

/**
 * The settings screen with its tabs: schedule, member management and leaves.
 *
 * Only the tabs read the address, so only they sit inside the `Suspense` boundary Next requires
 * around `useSearchParams`: the page is dynamic today (it reads the session cookie), but were it
 * ever prerendered, the header would still render on the server and the build would not fail.
 * @returns The page header over the tabbed settings screen
 */
export function SettingsTabs() {
  return (
    <>
      <PageHeader
        banner="settings"
        size="compact"
        title="Thiết lập"
        description="Lịch đánh trong tuần và danh sách thành viên của bang."
      />

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsTabPanels />
      </Suspense>
    </>
  );
}

/**
 * The tab list and its panels.
 *
 * The open tab lives in the address (`?tab=members`) rather than in local state, so a reload, or
 * a link an admin sends another, opens the tab they were on instead of falling back to the
 * schedule. A tab switch replaces the history entry rather than pushing one: Back should leave the
 * settings page, not step through every tab pressed on it. The default tab keeps a bare address.
 * @returns The tabbed settings screen
 */
function SettingsTabPanels() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFrom(searchParams.get(TAB_PARAM));

  /**
   * Open another tab by rewriting the address.
   * @param next - The tab to open
   */
  function selectTab(next: SettingsTab) {
    const href =
      next === TAB.battles ? pathname : `${pathname}?${TAB_PARAM}=${next}`;
    router.replace(href, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={(next) => selectTab(tabFrom(String(next)))}>
      {/* Both full names side by side are wider than a phone: the strip overflowed and widened the
          whole page. Below `sm` the list spans the row at its natural height, each tab takes an equal
          share with its icon over a short name, and the accessible name stays the full one. */}
      <TabsList className="max-sm:w-full max-sm:group-data-horizontal/tabs:h-auto">
        <TabsTrigger
          value={TAB.battles}
          aria-label="Thiết lập lịch đánh"
          className={PHONE_TRIGGER_CLASS}
        >
          <Swords />
          <span className="sm:hidden">Lịch đánh</span>
          <span className="max-sm:hidden">Thiết lập lịch đánh</span>
        </TabsTrigger>
        <TabsTrigger
          value={TAB.members}
          aria-label="Quản lý thành viên"
          className={PHONE_TRIGGER_CLASS}
        >
          <Users />
          <span className="sm:hidden">Thành viên</span>
          <span className="max-sm:hidden">Quản lý thành viên</span>
        </TabsTrigger>
        <TabsTrigger
          value={TAB.leaves}
          aria-label="Nghỉ phép của thành viên"
          className={PHONE_TRIGGER_CLASS}
        >
          <Plane />
          <span className="sm:hidden">Nghỉ phép</span>
          <span className="max-sm:hidden">Nghỉ phép của thành viên</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TAB.battles}>
        <SettingsScreen />
      </TabsContent>

      <TabsContent value={TAB.members}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            {/* No heading: the tab right above already names the panel. */}
            <p className="text-sm text-muted-foreground">
              Thêm thành viên, sửa lưu phái, gán Discord ID và phân quyền.
            </p>
            <MembersPanel />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value={TAB.leaves}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <LeavePanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
