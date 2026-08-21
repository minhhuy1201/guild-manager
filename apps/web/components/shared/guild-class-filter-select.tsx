"use client";

import Image from "next/image";
import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@guild/shared/enums";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";

/** Sentinel value of the "Tất cả" option. Not a guild class — never emitted. */
const ALL_CLASSES = "all";

/** What the picker can hold: a real class, or the "Tất cả" sentinel. */
type ClassFilterValue = GuildClass | typeof ALL_CLASSES;

interface GuildClassFilterSelectProps {
  /** Id put on the trigger so a `<Label htmlFor>` can point at it */
  id: string;
  /** Classes currently being filtered. An empty array means every class. */
  value: GuildClass[];
  /** Called with the new class list. Never contains the sentinel. */
  onChange: (value: GuildClass[]) => void;
}

/**
 * Multi-select filtering members by guild class, with a leading "Tất cả" row.
 *
 * Callers keep "no filter" as an empty array; the picker renders that same
 * state as a checked "Tất cả" and translates the sentinel on both ends, so it
 * never reaches the caller's store.
 * @param id - Id put on the trigger for the accompanying label
 * @param value - Classes currently being filtered, empty meaning all
 * @param onChange - Receives the new class list
 * @returns The guild class picker
 */
export function GuildClassFilterSelect({
  id,
  value,
  onChange,
}: GuildClassFilterSelectProps) {
  const isAll = value.length === 0;
  const selected: ClassFilterValue[] = isAll ? [ALL_CLASSES] : value;

  /**
   * Translate a picker selection back into the caller's representation.
   * Picking "Tất cả" while some classes are checked clears them; picking a
   * class while "Tất cả" is checked drops the sentinel.
   * @param next - Values the picker now holds
   */
  function handleValueChange(next: ClassFilterValue[]) {
    if (next.includes(ALL_CLASSES) && !isAll) {
      onChange([]);
      return;
    }
    onChange(next.filter((item) => item !== ALL_CLASSES) as GuildClass[]);
  }

  return (
    <Select multiple value={selected} onValueChange={handleValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue>
          {(current: ClassFilterValue[]) => {
            const classes = current.filter(
              (item) => item !== ALL_CLASSES
            ) as GuildClass[];
            if (classes.length === 0) return "Tất cả lưu phái";
            if (classes.length === 1)
              return (
                <span className="flex items-center gap-2">
                  <Image
                    src={GUILD_CLASS_IMAGE[classes[0]]}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-sm object-cover"
                  />
                  {GUILD_CLASS_LABEL[classes[0]]}
                </span>
              );
            return `${classes.length} lưu phái`;
          }}
        </SelectValue>
      </SelectTrigger>
      {/* Mở như popover dưới trigger thay vì neo item đang chọn vào trigger. */}
      <SelectContent alignItemWithTrigger={false}>
        <SelectItem value={ALL_CLASSES}>Tất cả</SelectItem>
        {GUILD_CLASS_OPTIONS.map((guildClass) => (
          <SelectItem key={guildClass} value={guildClass}>
            <span className="flex items-center gap-2">
              <Image
                src={GUILD_CLASS_IMAGE[guildClass]}
                alt=""
                width={20}
                height={20}
                className="size-5 rounded-sm object-cover"
              />
              {GUILD_CLASS_LABEL[guildClass]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
