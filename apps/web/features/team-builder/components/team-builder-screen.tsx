import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Màn hình xếp team (chỉ quản trị viên truy cập được).
 * Hiện là khung trống, chờ bổ sung logic chia đội.
 * @returns Nội dung trang xếp team
 */
export function TeamBuilderScreen() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Xếp team</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Users className="size-8" />
        <p>Chức năng xếp team đang được xây dựng.</p>
      </CardContent>
    </Card>
  );
}
