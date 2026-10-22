import type { NotifyMembersInput } from "@guild/shared/schemas";

import { CAPTURE_NODE_ATTRIBUTE } from "../components/formation-capture-sheet";
import {
  TEAM_CAPTURE_MATCH_ATTRIBUTE,
  TEAM_CAPTURE_MEMBERS_ATTRIBUTE,
  TEAM_CAPTURE_TEAM_ATTRIBUTE,
} from "./team-capture-attributes";

/** Pixel density of the screenshot — 2 keeps the names readable when Discord scales the image. */
const CAPTURE_SCALE = 2;

/**
 * Rasterise at 1 device pixel per CSS pixel, so the image is `CAPTURE_WIDTH × CAPTURE_SCALE` wide
 * on every machine.
 *
 * snapDOM otherwise multiplies `scale` by the screen's own `devicePixelRatio`, which puts the
 * output — and the payload — at the mercy of whoever presses the button: the same formation came
 * out 2560px wide on a plain monitor and 7680px on a 3x one, and that last one encodes to more
 * base64 than `ANNOUNCEMENT_IMAGE_MAX_CHARS` allows, so the announcement would be refused for the
 * admin's choice of screen. Pinning the width was already the point of the capture sheet; this is
 * the other half of it.
 */
const CAPTURE_DPR = 1;

/** WebP quality. High enough that the grid's borders stay clean, low enough to stay small. */
const CAPTURE_QUALITY = 0.92;

/** The document held a different number of line-ups than the day being announced. */
export class CaptureCountError extends Error {
  constructor(
    /** How many capture nodes the document actually held */
    readonly found: number,
    /** How many the day being announced has */
    readonly expected: number,
  ) {
    super(`Found ${found} capture nodes, expected ${expected}.`);
    this.name = "CaptureCountError";
  }
}

/**
 * The off-screen nodes to screenshot, in match order.
 *
 * Read from the document rather than from refs: the sheet is mounted by the screen while the
 * dialog owns the confirm click, and passing an array of refs between the two only to find the
 * same elements is more moving parts for the same answer. `querySelectorAll` answers in document
 * order, and the sheet renders its matches in order, so the nodes line up with the matches without
 * anything having to sort them.
 *
 * What that reasoning does not survive is a second sheet in the document, or a sheet that has not
 * finished mounting — and then the announcement would go out with a match missing or with images
 * from two different days, to the whole guild, with nothing downstream to catch it. So the count is
 * checked rather than assumed: a mismatch is somebody's bug, and the only safe answer is to refuse.
 *
 * @param expected - How many matches the day being announced holds
 * @returns One element per match, in match order
 * @throws CaptureCountError when the document does not hold exactly that many
 */
export function readCaptureNodes(expected: number): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${CAPTURE_NODE_ATTRIBUTE}]`)
  );

  if (nodes.length !== expected) {
    throw new CaptureCountError(nodes.length, expected);
  }

  return nodes;
}

/**
 * Screenshot nodes into webp data URLs, in order. One place holds the snapDOM settings, so a team
 * card and a line-up image are made the same way.
 *
 * Fonts are embedded because the image is read on somebody else's machine: without them Discord
 * shows the grid in a fallback face, with every name a different width.
 *
 * snapDOM is imported here rather than at the top of the module: it is only ever used behind the
 * "Thông báo đội hình" button an admin presses rarely, and a static import put it in the first
 * bundle of every visit to /xep-team.
 *
 * @param nodes - Elements to capture
 * @returns One settled result per node, in the same order
 */
async function rasterise(
  nodes: HTMLElement[]
): Promise<PromiseSettledResult<string>[]> {
  const { snapdom } = await import("@zumer/snapdom");

  return Promise.allSettled(
    nodes.map((node) =>
      snapdom
        .toWebp(node, {
          scale: CAPTURE_SCALE,
          dpr: CAPTURE_DPR,
          quality: CAPTURE_QUALITY,
          embedFonts: true,
        })
        .then((image) => image.src)
    )
  );
}

/**
 * Screenshot each line-up into a webp data URL.
 *
 * All or nothing: an announcement missing one match must not go out.
 *
 * @param nodes - Elements to capture, in match order
 * @returns One `data:image/webp;base64,…` per node, in the same order
 * @throws Error when the browser cannot rasterise a node
 */
export async function captureFormations(
  nodes: HTMLElement[]
): Promise<string[]> {
  const results = await rasterise(nodes);

  return results.map((result) => {
    if (result.status === "rejected") throw result.reason;

    return result.value;
  });
}

/** A team card in the capture sheet, with what the card says about itself. */
interface TeamCaptureNode {
  /** The element to screenshot */
  node: HTMLElement;
  /** Stored match number, 1 or 2 */
  matchIndex: number;
  /** Team number */
  team: number;
  /** Ids of the members standing in the card */
  memberIds: string[];
}

/** One team card image, in the shape the notify-members body carries. */
export type TeamImage = NonNullable<NotifyMembersInput["teamImages"]>[number];

/**
 * The team cards to screenshot.
 *
 * Read from the document for the reason `readCaptureNodes` is. Unlike it, the expected count is
 * not known up front (it is however many teams have someone in them), so what is checked is that no
 * (match, team) pair appears twice: a second sheet in the document would hand one pair two
 * different images, and the only safe answer is to refuse.
 *
 * @param only - A retry's notices; only cards holding one of those members in that match are read.
 *   Undefined reads every marked card.
 * @returns The cards in document order
 * @throws CaptureCountError when a pair appears more than once
 */
export function readTeamCaptureNodes(
  only?: NotifyMembersInput["notices"]
): TeamCaptureNode[] {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(`[${TEAM_CAPTURE_MATCH_ATTRIBUTE}]`)
  ).map((node) => ({
    node,
    matchIndex: Number(node.getAttribute(TEAM_CAPTURE_MATCH_ATTRIBUTE)),
    team: Number(node.getAttribute(TEAM_CAPTURE_TEAM_ATTRIBUTE)),
    memberIds: (node.getAttribute(TEAM_CAPTURE_MEMBERS_ATTRIBUTE) ?? "")
      .split(" ")
      .filter(Boolean),
  }));
  const distinct = new Set(cards.map((card) => `${card.matchIndex}:${card.team}`));

  if (distinct.size !== cards.length) {
    throw new CaptureCountError(cards.length, distinct.size);
  }

  if (only === undefined) return cards;

  return cards.filter((card) =>
    only.some(
      (notice) =>
        notice.matchIndex === card.matchIndex &&
        card.memberIds.includes(notice.characterId)
    )
  );
}

/**
 * Screenshot the team cards the Team notices carry.
 *
 * A card that fails to rasterise is left out rather than failing the rest: its team is messaged in
 * text, which is the same fallback as a team with no image.
 *
 * @param only - A retry's notices; left out, every team with someone in it is captured
 * @returns One image per card that was captured
 * @throws CaptureCountError when the document holds a pair twice, so no image can be trusted
 * @throws Error when the capture library itself cannot load
 */
export async function captureTeamImages(
  only?: NotifyMembersInput["notices"]
): Promise<TeamImage[]> {
  const cards = readTeamCaptureNodes(only);
  const results = await rasterise(cards.map((card) => card.node));

  return results.flatMap((result, index) =>
    result.status === "fulfilled"
      ? [
          {
            matchIndex: cards[index].matchIndex,
            team: cards[index].team,
            image: result.value,
          },
        ]
      : []
  );
}
