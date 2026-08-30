/**
 * CSS classes pinning the attendance table's outer columns while scrolling horizontally on a narrow
 * screen: the name column sticks left, the actions column sticks right. `bg-inherit` takes the row's
 * own stripe colour, which is opaque, so scrolled content does not show through a pinned column.
 */

/** The "Thành viên" column — pinned to the left edge of the scroll area. */
export const STICKY_NAME_COLUMN = "sticky left-0 z-10 border-r bg-inherit";

/** The "Thao tác" column — pinned to the right edge of the scroll area. */
export const STICKY_ACTION_COLUMN =
  "sticky right-0 z-10 w-28 border-l bg-inherit text-center";
