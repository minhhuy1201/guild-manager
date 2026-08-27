"use client";

import { Swords, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MembersPanel } from "@/features/members";
import { SettingsScreen } from "./settings-screen";

/** The two tab values — the schedule opens by default, being the most common task. */
const TAB = {
  battles: "battles",
  members: "members",
} as const;

/**
 * The settings screen with its two tabs: schedule and member management.
 * The active tab is local state only — not in the URL, since nobody needs to link straight to a tab.
 * @returns The tabbed settings screen
 */
export function SettingsTabs() {
  return (
    <Tabs defaultValue={TAB.battles}>
      <TabsList>
        <TabsTrigger value={TAB.battles}>
          <Swords />
          Thiết lập lịch đánh
        </TabsTrigger>
        <TabsTrigger value={TAB.members}>
          <Users />
          Quản lý thành viên
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TAB.battles}>
        <SettingsScreen />
      </TabsContent>

      <TabsContent value={TAB.members}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-semibold">Quản lý thành viên</h1>
              <p className="text-sm text-muted-foreground">
                Thêm thành viên, sửa lưu phái, gán Discord ID và phân quyền.
              </p>
            </div>
            <MembersPanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
