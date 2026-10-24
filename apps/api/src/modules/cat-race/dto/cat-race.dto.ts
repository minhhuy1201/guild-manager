import {
  createCatRaceEventSchema,
  drawCatRaceRoundSchema,
  setCatRaceEntrantsSchema,
  setCatRaceFeaturedSchema,
  setCatRaceParticipantsSchema,
  catRacePrizeInputSchema,
  updateCatRaceEventSchema,
  updateCatRacePrizeSchema,
  voidCatRaceRoundSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /cat-races. */
export class CreateCatRaceEventDto extends createZodDto(
  createCatRaceEventSchema,
) {}

/** Body of PATCH /cat-races/:id. */
export class UpdateCatRaceEventDto extends createZodDto(
  updateCatRaceEventSchema,
) {}

/** Body of PUT /cat-races/:id/participants. */
export class SetCatRaceParticipantsDto extends createZodDto(
  setCatRaceParticipantsSchema,
) {}

/** Body of POST /cat-races/:id/prizes. */
export class AddCatRacePrizeDto extends createZodDto(catRacePrizeInputSchema) {}

/** Body of PATCH /cat-races/:id/prizes/:prizeId. */
export class UpdateCatRacePrizeDto extends createZodDto(
  updateCatRacePrizeSchema,
) {}

/** Body of PUT /cat-races/:id/prizes/:prizeId/entrants. */
export class SetCatRaceEntrantsDto extends createZodDto(
  setCatRaceEntrantsSchema,
) {}

/** Body of POST /cat-races/:id/rounds. */
export class DrawCatRaceRoundDto extends createZodDto(drawCatRaceRoundSchema) {}

/** Body of POST /cat-races/:id/rounds/:roundId/void. */
export class VoidCatRaceRoundDto extends createZodDto(voidCatRaceRoundSchema) {}

/** Body of PUT /cat-races/:id/featured. */
export class SetCatRaceFeaturedDto extends createZodDto(
  setCatRaceFeaturedSchema,
) {}
