import { randomInt } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CAT_RACE_MIN_ENTRANTS,
  catRaceDrawResultSchema,
  type CatRaceDrawResult,
  type CatRaceEventDetail,
  type CatRaceEventSummary,
  type CatRacePrizeInput,
  type CreateCatRaceEventInput,
  type DrawCatRaceRoundInput,
  type SetCatRaceEntrantsInput,
  type SetCatRaceParticipantsInput,
  type UpdateCatRaceEventInput,
  type UpdateCatRacePrizeInput,
  type VoidCatRaceRoundInput,
} from '@guild/shared/schemas';

import { Clock } from '../../common/clock/clock';
import { verifyResponse } from '../../config';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '../../infrastructure/prisma/prisma.service';
import {
  EVENT_DETAIL_INCLUDE,
  EVENT_SUMMARY_INCLUDE,
  toEventDetail,
  toEventSummary,
  toPrizeTemplate,
  toRound,
} from './cat-race.codec';
import {
  defaultEventName,
  drawTicket,
  reconcileParticipants,
  type RandomInt,
} from './cat-race.rules';

/** DI token for the random source, so tests can fix the draw. */
export const CAT_RACE_RANDOM_INT = Symbol('CAT_RACE_RANDOM_INT');

/** Production random source: cryptographically strong, as the draw decides who wins a prize. */
export const cryptoRandomInt: RandomInt = (maxExclusive) =>
  randomInt(maxExclusive);

/** `CatRaceMode.STANDARD` as the string the database column holds. */
const STANDARD_MODE = 'STANDARD';

const EVENT_NOT_FOUND = 'Không tìm thấy đợt quay.';
const PRIZE_NOT_FOUND = 'Không tìm thấy hạng mục.';
const ROUND_NOT_FOUND = 'Không tìm thấy vòng quay.';
const EVENT_ENDED = 'Đợt quay đã kết thúc.';
const MODE_LOCKED = 'Không đổi chế độ khi đợt đã quay.';
const EVENT_HAS_ROUNDS = 'Không xoá được đợt đã có vòng quay.';
const PRIZE_HAS_ROUNDS = 'Không xoá được hạng mục đã có vòng quay.';
const PRIZE_FULL = 'Hạng mục đã đủ giải.';
const TOO_FEW_ENTRANTS = 'Cần ít nhất 2 người để đua.';
const ROUND_ALREADY_VOID = 'Vòng này đã huỷ.';
const UNKNOWN_MEMBER = 'Có thành viên không tồn tại.';
const DUPLICATE_MEMBER = 'Danh sách có người trùng nhau.';
const STANDARD_TICKETS = 'Chế độ Thường chỉ có 1 vé mỗi người.';
const NOT_A_PARTICIPANT = 'Có người không thuộc đợt quay này.';

/** What the Discord summary needs of an ended event: prizes in order, each with its winners. */
export interface CatRaceAnnouncement {
  readonly eventName: string;
  readonly prizes: readonly {
    readonly name: string;
    readonly winners: readonly {
      readonly discordId: string | null;
      readonly name: string;
    }[];
  }[];
}

const NOT_ENDED_YET = 'Kết thúc đợt trước khi đăng tổng kết.';
const ALREADY_POSTED = 'Đợt này đã đăng lên Discord.';

/** One participant as the roster writers receive it. */
interface RosterEntry {
  readonly characterId: string;
  readonly tickets: number;
}

@Injectable()
export class CatRaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    @Inject(CAT_RACE_RANDOM_INT) private readonly random: RandomInt,
  ) {}

  /**
   * Every event, newest first.
   * @returns Event summaries
   */
  async list(): Promise<CatRaceEventSummary[]> {
    const rows = await this.prisma.catRaceEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: EVENT_SUMMARY_INCLUDE,
    });

    return rows.map((row) => toEventSummary(row));
  }

  /**
   * The prizes of the latest event, to start a new one from.
   * @returns Prize lines in display order; empty before the first event
   */
  async prefill(): Promise<CatRacePrizeInput[]> {
    const latest = await this.prisma.catRaceEvent.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        prizes: {
          orderBy: { sortOrder: 'asc' },
          select: { name: true, quantity: true, tier: true },
        },
      },
    });

    return (latest?.prizes ?? []).map((prize) => toPrizeTemplate(prize));
  }

  /**
   * One event with its roster, prizes and rounds.
   * @param id - Event id
   * @returns The event
   * @throws NotFoundException when no event carries that id
   */
  detail(id: string): Promise<CatRaceEventDetail> {
    return this.detailOf(this.prisma, id);
  }

  /**
   * Create an event; every prize starts with the whole roster as its entrants.
   * @param input - name, mode, roster and prizes
   * @param actorId - Who creates it
   * @returns The event just created
   * @throws BadRequestException when the roster is invalid
   */
  async create(
    input: CreateCatRaceEventInput,
    actorId: string,
  ): Promise<CatRaceEventDetail> {
    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      await this.assertRoster(tx, input.mode, input.participants);
      const event = await tx.catRaceEvent.create({
        data: {
          name: input.name || defaultEventName(now),
          mode: input.mode,
          createdById: actorId,
          createdAt: now,
          participants: { create: input.participants },
          prizes: {
            create: input.prizes.map((prize, sortOrder) => ({
              ...prize,
              sortOrder,
            })),
          },
        },
        include: { prizes: true },
      });
      await tx.catRaceEntrant.createMany({
        data: event.prizes.flatMap((prize) =>
          input.participants.map(({ characterId }) => ({
            prizeId: prize.id,
            characterId,
          })),
        ),
      });

      return this.detailOf(tx, event.id);
    });
  }

  /**
   * Rename an event, or switch its mode before the first round.
   * @param id - Event id
   * @param input - new name and/or mode
   * @returns The event after the change
   * @throws ConflictException when the event ended, or the mode changes after a round
   */
  update(
    id: string,
    input: UpdateCatRaceEventInput,
  ): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.lockOpenEvent(tx, id);
      // Both sides as plain strings: the database enum and the shared enum are different types.
      const nextMode: string | undefined = input.mode;
      const modeChanges = nextMode !== undefined && nextMode !== event.mode;
      if (modeChanges) {
        const rounds = await tx.catRaceRound.count({
          where: { prize: { eventId: id } },
        });
        if (rounds > 0) throw new ConflictException(MODE_LOCKED);
      }
      if (modeChanges && nextMode === STANDARD_MODE) {
        await tx.catRaceParticipant.updateMany({
          where: { eventId: id },
          data: { tickets: 1 },
        });
      }
      await tx.catRaceEvent.update({
        where: { id },
        data: { name: input.name, mode: input.mode },
      });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Delete an event that has not drawn a round yet.
   * @param id - Event id
   * @throws ConflictException when any round exists, voided or not
   */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      const rounds = await tx.catRaceRound.count({
        where: { prize: { eventId: id } },
      });
      if (rounds > 0) throw new ConflictException(EVENT_HAS_ROUNDS);
      await tx.catRaceEvent.delete({ where: { id } });
    });
  }

  /**
   * Replace the roster and ticket counts. Newcomers join every prize that is not full, unless they
   * already hold an active win there; people who leave drop out of every prize.
   * @param id - Event id
   * @param input - The new roster
   * @returns The event after the change
   * @throws BadRequestException when the roster is invalid for the event's mode
   */
  setParticipants(
    id: string,
    input: SetCatRaceParticipantsInput,
  ): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.lockOpenEvent(tx, id);
      await this.assertRoster(tx, event.mode, input.participants);

      const current = await tx.catRaceParticipant.findMany({
        where: { eventId: id },
      });
      const prizes = await tx.catRacePrize.findMany({
        where: { eventId: id },
        include: { rounds: { where: { voidedAt: null } } },
      });
      const change = reconcileParticipants(
        current.map((p) => p.characterId),
        input.participants.map((p) => p.characterId),
        prizes.map((prize) => ({
          prizeId: prize.id,
          quantity: prize.quantity,
          awardedCount: prize.rounds.length,
          activeWinnerIds: new Set(
            prize.rounds.flatMap((r) =>
              r.winnerCharacterId ? [r.winnerCharacterId] : [],
            ),
          ),
        })),
      );
      const ticketsNow = new Map(
        current.map((p) => [p.characterId, p.tickets]),
      );

      await tx.catRaceEntrant.deleteMany({
        where: {
          characterId: { in: change.removed },
          prize: { eventId: id },
        },
      });
      await tx.catRaceParticipant.deleteMany({
        where: { eventId: id, characterId: { in: change.removed } },
      });
      await tx.catRaceParticipant.createMany({
        data: input.participants
          .filter((p) => change.added.includes(p.characterId))
          .map((p) => ({ eventId: id, ...p })),
      });
      for (const p of input.participants) {
        const before = ticketsNow.get(p.characterId);
        if (before === undefined || before === p.tickets) continue;
        await tx.catRaceParticipant.update({
          where: {
            eventId_characterId: { eventId: id, characterId: p.characterId },
          },
          data: { tickets: p.tickets },
        });
      }
      await tx.catRaceEntrant.createMany({
        data: change.entrantsToAdd,
        skipDuplicates: true,
      });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Add a prize; its entrants are the whole roster.
   * @param id - Event id
   * @param input - name, quantity and tier
   * @returns The event after the change
   */
  addPrize(id: string, input: CatRacePrizeInput): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      const sortOrder = await tx.catRacePrize.count({ where: { eventId: id } });
      const prize = await tx.catRacePrize.create({
        data: { ...input, eventId: id, sortOrder },
      });
      const roster = await tx.catRaceParticipant.findMany({
        where: { eventId: id },
      });
      await tx.catRaceEntrant.createMany({
        data: roster.map(({ characterId }) => ({
          prizeId: prize.id,
          characterId,
        })),
      });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Edit a prize. The quantity may grow freely but never drops below the rounds already won.
   * @param id - Event id
   * @param prizeId - Prize id
   * @param input - fields to change
   * @returns The event after the change
   * @throws ConflictException when the quantity falls below the active wins
   */
  updatePrize(
    id: string,
    prizeId: string,
    input: UpdateCatRacePrizeInput,
  ): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      await this.findPrize(tx, id, prizeId);
      if (input.quantity !== undefined) {
        const awarded = await tx.catRaceRound.count({
          where: { prizeId, voidedAt: null },
        });
        if (input.quantity < awarded) {
          throw new ConflictException(
            `Số lượng không được thấp hơn số giải đã trao (${awarded}).`,
          );
        }
      }
      await tx.catRacePrize.update({ where: { id: prizeId }, data: input });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Delete a prize that has no round, voided ones included.
   * @param id - Event id
   * @param prizeId - Prize id
   * @returns The event after the change
   * @throws ConflictException when a round exists
   */
  removePrize(id: string, prizeId: string): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      await this.findPrize(tx, id, prizeId);
      const rounds = await tx.catRaceRound.count({ where: { prizeId } });
      if (rounds > 0) throw new ConflictException(PRIZE_HAS_ROUNDS);
      await tx.catRacePrize.delete({ where: { id: prizeId } });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Replace who may win a prize.
   * @param id - Event id
   * @param prizeId - Prize id
   * @param input - the new entrant ids
   * @returns The event after the change
   * @throws BadRequestException when someone is not a participant of the event
   */
  setEntrants(
    id: string,
    prizeId: string,
    input: SetCatRaceEntrantsInput,
  ): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      await this.findPrize(tx, id, prizeId);
      const ids = [...new Set(input.characterIds)];
      const roster = await tx.catRaceParticipant.findMany({
        where: { eventId: id },
      });
      const rosterIds = new Set(roster.map((p) => p.characterId));
      if (ids.some((characterId) => !rosterIds.has(characterId))) {
        throw new BadRequestException(NOT_A_PARTICIPANT);
      }
      await tx.catRaceEntrant.deleteMany({ where: { prizeId } });
      await tx.catRaceEntrant.createMany({
        data: ids.map((characterId) => ({ prizeId, characterId })),
      });

      return this.detailOf(tx, id);
    });
  }

  /**
   * Draw one round for a prize. The winner is chosen and stored here, before the client animates.
   * @param id - Event id
   * @param input - the prize to draw for
   * @param actorId - Who draws
   * @returns The stored round, who ran, and the winning ticket number
   * @throws ConflictException when the prize is full or fewer than two people can race
   */
  draw(
    id: string,
    input: DrawCatRaceRoundInput,
    actorId: string,
  ): Promise<CatRaceDrawResult> {
    return this.prisma.$transaction(async (tx) => {
      // The row lock comes first: the count below is only trustworthy once concurrent draws wait.
      await this.lockOpenEvent(tx, id);
      const prize = await this.findPrize(tx, id, input.prizeId);
      const awarded = await tx.catRaceRound.count({
        where: { prizeId: prize.id, voidedAt: null },
      });
      if (awarded >= prize.quantity) throw new ConflictException(PRIZE_FULL);

      const entrants = await tx.catRaceEntrant.findMany({
        where: { prizeId: prize.id },
      });
      const holders = await tx.catRaceParticipant.findMany({
        where: {
          eventId: id,
          characterId: { in: entrants.map((e) => e.characterId) },
        },
        orderBy: { characterId: 'asc' },
      });
      if (holders.length < CAT_RACE_MIN_ENTRANTS) {
        throw new ConflictException(TOO_FEW_ENTRANTS);
      }

      const ticket = drawTicket(holders, this.random);
      const winner = await tx.character.findUniqueOrThrow({
        where: { id: ticket.characterId },
      });
      const winnerHolder = holders.find((h) => h.characterId === winner.id);
      if (!winnerHolder)
        throw new Error('A drawn winner is always one of the holders');
      const round = await tx.catRaceRound.create({
        data: {
          prizeId: prize.id,
          winnerCharacterId: winner.id,
          winnerName: winner.name,
          winnerGuildClass: winner.guildClass,
          winnerTickets: winnerHolder.tickets,
          entrantCount: holders.length,
          totalTickets: holders.reduce((sum, h) => sum + h.tickets, 0),
          drawnById: actorId,
          drawnAt: this.clock.now(),
        },
      });
      await tx.catRaceEntrant.delete({
        where: {
          prizeId_characterId: { prizeId: prize.id, characterId: winner.id },
        },
      });

      return verifyResponse(catRaceDrawResultSchema, {
        round: toRound(round),
        entrants: holders.map((h) => ({
          characterId: h.characterId,
          tickets: h.tickets,
        })),
        winningTicket: ticket.ticketNo,
      } satisfies CatRaceDrawResult);
    });
  }

  /**
   * Void a round: the slot goes back to the prize and the winner can race for it again.
   * @param id - Event id
   * @param roundId - Round id
   * @param input - the reason
   * @returns The event after the change
   * @throws ConflictException when the round is already void
   */
  voidRound(
    id: string,
    roundId: string,
    input: VoidCatRaceRoundInput,
  ): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenEvent(tx, id);
      const round = await tx.catRaceRound.findFirst({
        where: { id: roundId, prize: { eventId: id } },
      });
      if (!round) throw new NotFoundException(ROUND_NOT_FOUND);
      if (round.voidedAt) throw new ConflictException(ROUND_ALREADY_VOID);

      await tx.catRaceRound.update({
        where: { id: roundId },
        data: { voidedAt: this.clock.now(), voidReason: input.reason },
      });
      if (round.winnerCharacterId) {
        const stillIn = await tx.catRaceParticipant.findUnique({
          where: {
            eventId_characterId: {
              eventId: id,
              characterId: round.winnerCharacterId,
            },
          },
        });
        if (stillIn) {
          await tx.catRaceEntrant.createMany({
            data: [
              { prizeId: round.prizeId, characterId: round.winnerCharacterId },
            ],
            skipDuplicates: true,
          });
        }
      }

      return this.detailOf(tx, id);
    });
  }

  /**
   * End an event. Calling it again on an ended event changes nothing.
   * @param id - Event id
   * @returns The event
   */
  end(id: string): Promise<CatRaceEventDetail> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "CatRaceEvent" WHERE "id" = ${id} FOR NO KEY UPDATE`;
      const event = await tx.catRaceEvent.findUnique({ where: { id } });
      if (!event) throw new NotFoundException(EVENT_NOT_FOUND);
      if (!event.endedAt) {
        await tx.catRaceEvent.update({
          where: { id },
          data: { endedAt: this.clock.now() },
        });
      }

      return this.detailOf(tx, id);
    });
  }

  /**
   * The ended event's winners, shaped for the Discord summary.
   * @param id - Event id
   * @returns Prize names with each active winner's Discord id (null once unlinked or deleted) and name
   * @throws ConflictException when the event is still open, or already posted
   */
  async announcement(id: string): Promise<CatRaceAnnouncement> {
    const event = await this.prisma.catRaceEvent.findUnique({
      where: { id },
      include: {
        prizes: {
          orderBy: { sortOrder: 'asc' },
          include: {
            rounds: {
              where: { voidedAt: null },
              orderBy: { drawnAt: 'asc' },
              include: { winner: true },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException(EVENT_NOT_FOUND);
    if (!event.endedAt) throw new ConflictException(NOT_ENDED_YET);
    if (event.discordPostedAt) throw new ConflictException(ALREADY_POSTED);

    return {
      eventName: event.name,
      prizes: event.prizes.map((prize) => ({
        name: prize.name,
        winners: prize.rounds.map((round) => ({
          discordId: round.winner?.discordId ?? null,
          name: round.winnerName,
        })),
      })),
    };
  }

  /**
   * Record that the summary reached Discord.
   * @param id - Event id
   */
  async markAnnounced(id: string): Promise<void> {
    await this.prisma.catRaceEvent.update({
      where: { id },
      data: { discordPostedAt: this.clock.now() },
    });
  }

  /**
   * Lock the event row, then require it to exist and be open. Every write starts here so two
   * admins' writes on one event run one after the other.
   * @param tx - Open transaction
   * @param id - Event id
   * @returns The event row
   * @throws NotFoundException / ConflictException
   */
  private async lockOpenEvent(tx: PrismaTransactionClient, id: string) {
    await tx.$queryRaw`SELECT 1 FROM "CatRaceEvent" WHERE "id" = ${id} FOR NO KEY UPDATE`;
    const event = await tx.catRaceEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(EVENT_NOT_FOUND);
    if (event.endedAt) throw new ConflictException(EVENT_ENDED);

    return event;
  }

  private async findPrize(
    tx: PrismaTransactionClient,
    eventId: string,
    prizeId: string,
  ) {
    const prize = await tx.catRacePrize.findFirst({
      where: { id: prizeId, eventId },
    });
    if (!prize) throw new NotFoundException(PRIZE_NOT_FOUND);

    return prize;
  }

  /** Reject a roster with repeats, unknown members, or tickets other than 1 in STANDARD mode. */
  private async assertRoster(
    tx: PrismaTransactionClient,
    mode: string,
    roster: readonly RosterEntry[],
  ): Promise<void> {
    const ids = roster.map((p) => p.characterId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(DUPLICATE_MEMBER);
    }
    if (mode === STANDARD_MODE && roster.some((p) => p.tickets !== 1)) {
      throw new BadRequestException(STANDARD_TICKETS);
    }
    const known = await tx.character.count({ where: { id: { in: ids } } });
    if (known !== ids.length) throw new BadRequestException(UNKNOWN_MEMBER);
  }

  private async detailOf(
    client: PrismaTransactionClient | PrismaService,
    id: string,
  ): Promise<CatRaceEventDetail> {
    const row = await client.catRaceEvent.findUnique({
      where: { id },
      include: EVENT_DETAIL_INCLUDE,
    });
    if (!row) throw new NotFoundException(EVENT_NOT_FOUND);

    return toEventDetail(row);
  }
}
