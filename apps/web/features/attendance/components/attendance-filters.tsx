"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@shared/enums";

import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <Select
            multiple
            value={guildClasses}
            onValueChange={(value) => setGuildClasses(scope, value)}
          >
            <SelectTrigger id={`${scope}-guild-class`} className="w-full">
              <SelectValue>
                {(value: GuildClass[]) => {
                  if (value.length === 0) return "Tất cả lưu phái";
                  if (value.length === 1)
                    return (
                      <span className="flex items-center gap-2">
                        <Image
                          src={GUILD_CLASS_IMAGE[value[0]]}
                          alt=""
                          width={20}
                          height={20}
                          className="size-5 rounded-sm object-cover"
                        />
                        {GUILD_CLASS_LABEL[value[0]]}
                      </span>
                    );
                  return `${value.length} lưu phái`;
                }}
              </SelectValue>
            </SelectTrigger>
            {/* Mở như popover dưới trigger thay vì neo item đang chọn vào trigger. */}
            <SelectContent alignItemWithTrigger={false}>
              {GUILD_CLASS_OPTIONS.map((gc) => (
                <SelectItem key={gc} value={gc}>
                  <span className="flex items-center gap-2">
                    <Image
                      src={GUILD_CLASS_IMAGE[gc]}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-sm object-cover"
                    />
                    {GUILD_CLASS_LABEL[gc]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
