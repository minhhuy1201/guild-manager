import { z } from "zod";

/** Body of the Auto-attend switch: on or off for the caller's own character. */
export const setAutoAttendSchema = z.object({
  enabled: z.boolean(),
});

export type SetAutoAttendInput = z.infer<typeof setAutoAttendSchema>;

/** Where the caller's Auto-attend stands. */
export const autoAttendStatusSchema = z.object({
  enabled: z.boolean(),
  /** ISO instant the running period started; null while it is off. */
  enabledAt: z.string().nullable(),
});

export type AutoAttendStatus = z.infer<typeof autoAttendStatusSchema>;
