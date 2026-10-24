import { z } from "zod";

import { CatRaceMode } from "../enums/cat-race-mode.enum";
import { GuildClass } from "../enums/guild-class.enum";
import { PrizeTier } from "../enums/prize-tier.enum";

export const CAT_RACE_TICKETS_MIN = 1;
export const CAT_RACE_TICKETS_MAX = 3;
export const CAT_RACE_NAME_MAX = 80;
export const CAT_RACE_PRIZE_NAME_MAX = 60;
export const CAT_RACE_PRIZE_QUANTITY_MAX = 999;
export const CAT_RACE_VOID_REASON_MAX = 255;
/** A race needs at least this many entrants, or there is nothing to race. */
export const CAT_RACE_MIN_ENTRANTS = 2;

const ticketsSchema = z
  .number("Số vé không hợp lệ.")
  .int("Số vé không hợp lệ.")
  .min(CAT_RACE_TICKETS_MIN, "Số vé tối thiểu là 1.")
  .max(CAT_RACE_TICKETS_MAX, "Số vé tối đa là 3.");

const standardModeTicketsMessage = "Chế độ Thường chỉ có 1 vé mỗi người.";

export const catRaceParticipantInputSchema = z.object({
  characterId: z.string().min(1, "Thiếu mã thành viên."),
  tickets: ticketsSchema,
});

export const catRacePrizeInputSchema = z.object({
  name: z
    .string("Tên giải không hợp lệ.")
    .trim()
    .min(1, "Tên giải không được để trống.")
    .max(CAT_RACE_PRIZE_NAME_MAX, "Tên giải quá dài."),
  quantity: z
    .number("Số lượng không hợp lệ.")
    .int("Số lượng không hợp lệ.")
    .min(1, "Số lượng tối thiểu là 1.")
    .max(CAT_RACE_PRIZE_QUANTITY_MAX, "Số lượng quá lớn."),
  tier: z.enum(PrizeTier, { error: "Bậc giải không hợp lệ." }),
});

/** Rejects any ticket count other than 1 in STANDARD mode, where tickets do not exist. */
function rejectExtraTicketsInStandard(
  value: {
    mode: CatRaceMode;
    participants: { tickets: number }[];
  },
  ctx: z.RefinementCtx,
): void {
  if (value.mode !== CatRaceMode.STANDARD) return;
  const index = value.participants.findIndex((p) => p.tickets !== 1);
  if (index === -1) return;
  ctx.addIssue({
    code: "custom",
    path: ["participants", index, "tickets"],
    message: standardModeTicketsMessage,
  });
}

export const createCatRaceEventSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(CAT_RACE_NAME_MAX, "Tên đợt quá dài.")
      .optional(),
    mode: z.enum(CatRaceMode, { error: "Chế độ không hợp lệ." }),
    participants: z
      .array(catRaceParticipantInputSchema)
      .min(1, "Cần ít nhất 1 người tham gia."),
    prizes: z
      .array(catRacePrizeInputSchema)
      .min(1, "Cần ít nhất 1 hạng mục."),
  })
  .superRefine(rejectExtraTicketsInStandard);

export const updateCatRaceEventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên đợt không được để trống.")
    .max(CAT_RACE_NAME_MAX, "Tên đợt quá dài.")
    .optional(),
  mode: z.enum(CatRaceMode, { error: "Chế độ không hợp lệ." }).optional(),
});

export const setCatRaceParticipantsSchema = z.object({
  participants: z.array(catRaceParticipantInputSchema),
});

export const updateCatRacePrizeSchema = catRacePrizeInputSchema
  .partial()
  .extend({ sortOrder: z.number().int().min(0).optional() });

export const setCatRaceEntrantsSchema = z.object({
  characterIds: z.array(z.string().min(1)),
});

export const drawCatRaceRoundSchema = z.object({
  prizeId: z.string().min(1, "Thiếu mã hạng mục."),
});

export const voidCatRaceRoundSchema = z.object({
  reason: z
    .string("Cần nhập lý do huỷ.")
    .trim()
    .min(1, "Cần nhập lý do huỷ.")
    .max(CAT_RACE_VOID_REASON_MAX, "Lý do huỷ quá dài."),
});

export const setCatRaceFeaturedSchema = z.object({
  featured: z.boolean("Thiếu trạng thái hiện ở trang chủ."),
});

export const catRaceEventSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(CatRaceMode),
  status: z.enum(["OPEN", "ENDED"]),
  createdAt: z.string(),
  discordPostedAt: z.string().nullable(),
  /** Shown on the landing page's Bảng vàng. */
  featured: z.boolean(),
  awardedCount: z.number().int(),
});

export const catRaceParticipantSchema = z.object({
  characterId: z.string(),
  name: z.string(),
  guildClass: z.enum(GuildClass),
  discordId: z.string().nullable(),
  discordAvatar: z.string().nullable(),
  tickets: ticketsSchema,
});

export const catRacePrizeSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int(),
  tier: z.enum(PrizeTier),
  sortOrder: z.number().int(),
  awardedCount: z.number().int(),
  entrantIds: z.array(z.string()),
});

export const catRaceRoundSchema = z.object({
  id: z.string(),
  prizeId: z.string(),
  winnerCharacterId: z.string().nullable(),
  winnerName: z.string(),
  winnerGuildClass: z.enum(GuildClass),
  winnerTickets: z.number().int(),
  entrantCount: z.number().int(),
  totalTickets: z.number().int(),
  drawnAt: z.string(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
});

export const catRaceEventDetailSchema = catRaceEventSummarySchema.extend({
  participants: z.array(catRaceParticipantSchema),
  prizes: z.array(catRacePrizeSchema),
  rounds: z.array(catRaceRoundSchema),
});

export const catRaceDrawResultSchema = z.object({
  round: catRaceRoundSchema,
  /** Who ran, with their tickets, as it stood before the winner left the list. */
  entrants: z.array(
    z.object({ characterId: z.string(), tickets: ticketsSchema }),
  ),
  /** 1-based number of the winning ticket among the winner's own tickets. */
  winningTicket: z.number().int().min(1),
});

/** A prize line a new event can start from. */
export const catRacePrizeTemplateSchema = catRacePrizeInputSchema;

export type CreateCatRaceEventInput = z.infer<typeof createCatRaceEventSchema>;
export type UpdateCatRaceEventInput = z.infer<typeof updateCatRaceEventSchema>;
export type SetCatRaceParticipantsInput = z.infer<
  typeof setCatRaceParticipantsSchema
>;
export type SetCatRaceFeaturedInput = z.infer<typeof setCatRaceFeaturedSchema>;
export type CatRacePrizeInput = z.infer<typeof catRacePrizeInputSchema>;
export type UpdateCatRacePrizeInput = z.infer<typeof updateCatRacePrizeSchema>;
export type SetCatRaceEntrantsInput = z.infer<typeof setCatRaceEntrantsSchema>;
export type DrawCatRaceRoundInput = z.infer<typeof drawCatRaceRoundSchema>;
export type VoidCatRaceRoundInput = z.infer<typeof voidCatRaceRoundSchema>;
export type CatRaceEventStatus = z.infer<
  typeof catRaceEventSummarySchema
>["status"];
export type CatRaceEventSummary = z.infer<typeof catRaceEventSummarySchema>;
export type CatRaceParticipant = z.infer<typeof catRaceParticipantSchema>;
export type CatRacePrize = z.infer<typeof catRacePrizeSchema>;
export type CatRaceRound = z.infer<typeof catRaceRoundSchema>;
export type CatRaceEventDetail = z.infer<typeof catRaceEventDetailSchema>;
export type CatRaceDrawResult = z.infer<typeof catRaceDrawResultSchema>;
export type CatRacePrizeTemplate = z.infer<typeof catRacePrizeTemplateSchema>;
