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

/** Giá trị của hai tab — mở mặc định ở lịch đánh, việc hay làm nhất. */
const TAB = {
  battles: "battles",
  members: "members",
} as const;

/**
 * Màn Thiết lập với hai tab: lịch đánh và quản lý thành viên.
 * Tab đang mở chỉ là state cục bộ — không đưa vào URL vì không có nhu cầu
 * gửi link thẳng tới một tab.
 * @returns Màn thiết lập dạng tab
 */
export function SettingsTabs() {
  return (
    <Tabs defaultValue={TAB.battles}>
      <TabsList>
        <TabsTrigger value={TAB.battles}>
          <Swords />
          Thiết lập trận đánh
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
                Thêm thành viên mới, sửa lưu phái, xem và cấp lại mật khẩu điểm
                danh.
              </p>
            </div>
            <MembersPanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
