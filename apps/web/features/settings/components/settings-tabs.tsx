"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Swords, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MembersPanel } from "@/features/members";
import { SettingsScreen } from "./settings-screen";
import { SettingsSkeleton } from "./settings-skeleton";

/** The two tab values — the schedule opens by default, being the most common task. */
const TAB = {
  battles: "battles",
  members: "members",
} as const;

/** One of the two tabs. */
type SettingsTab = (typeof TAB)[keyof typeof TAB];

/** Query parameter the open tab is kept in: `?tab=members`. */
const TAB_PARAM = "tab";

/**
 * Read the tab out of the address. Anything but "members" - no parameter, an old or mistyped
 * value - opens the schedule, the default.
 * @param value - The `tab` query parameter, null when absent
 * @returns The tab to open
 */
function tabFrom(value: string | null): SettingsTab {
  return value === TAB.members ? TAB.members : TAB.battles;
}

/**
 * The settings screen with its two tabs: schedule and member management.
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
 * The tab list and its two panels.
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
          whole page. Below `sm` the list spans the row, each tab takes half of it with a short name,
          and the accessible name stays the full one. */}
      <TabsList className="max-sm:w-full">
        <TabsTrigger value={TAB.battles} aria-label="Thiết lập lịch đánh">
          <Swords />
          <span className="sm:hidden">Lịch đánh</span>
          <span className="max-sm:hidden">Thiết lập lịch đánh</span>
        </TabsTrigger>
        <TabsTrigger value={TAB.members} aria-label="Quản lý thành viên">
          <Users />
          <span className="sm:hidden">Thành viên</span>
          <span className="max-sm:hidden">Quản lý thành viên</span>
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
    </Tabs>
  );
}
