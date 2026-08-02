"use client";

import { Search } from "lucide-react";

import { GuildClassFilterSelect } from "@/components/shared/guild-class-filter-select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

interface AttendanceFiltersProps {
  /** Màn đang dùng bộ lọc — mỗi màn giữ state riêng. */
  scope: AttendanceFilterScope;
}

/**
 * Thanh lọc: tìm kiếm theo tên/ID trong game và chọn lưu phái.
 * Đọc/ghi vào phần store ứng với `scope`, nên hai màn không dùng chung giá trị lọc.
 * @param scope - Màn đang dùng bộ lọc
 * @returns Card chứa các bộ lọc
 */
export function AttendanceFilters({ scope }: AttendanceFiltersProps) {
  const search = useAttendanceFilterStore((s) => s.filters[scope].search);
  const guildClasses = useAttendanceFilterStore(
    (s) => s.filters[scope].guildClasses
  );
  const setSearch = useAttendanceFilterStore((s) => s.setSearch);
  const setGuildClasses = useAttendanceFilterStore((s) => s.setGuildClasses);

  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${scope}-search`}>Tìm kiếm</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${scope}-search`}
              value={search}
              onChange={(e) => setSearch(scope, e.target.value)}
              placeholder="Tên thành viên hoặc ID..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${scope}-guild-class`}>Lưu phái</Label>
          <GuildClassFilterSelect
            id={`${scope}-guild-class`}
            value={guildClasses}
            onChange={(value) => setGuildClasses(scope, value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
