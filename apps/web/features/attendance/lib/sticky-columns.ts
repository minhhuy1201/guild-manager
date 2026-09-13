/**
 * CSS class pinning the attendance table's name column while scrolling horizontally on a narrow
 * screen. `bg-inherit` takes the row's own stripe colour, which is opaque, so scrolled content does
 * not show through the pinned column.
 */

/** The "Thành viên" column — pinned to the left edge of the scroll area. */
export const STICKY_NAME_COLUMN = "sticky left-0 z-10 border-r bg-inherit";
