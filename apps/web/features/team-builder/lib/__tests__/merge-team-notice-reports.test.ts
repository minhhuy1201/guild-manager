import { describe, expect, it } from "vitest";
import type { TeamNoticeReport, TeamNoticeTarget } from "@guild/shared/schemas";

import { mergeTeamNoticeReports } from "../merge-team-notice-reports";

/**
 * A member of a match, as a report lists it.
 * @param name - Character name, also used as the id
 * @param matchIndex - Stored match number
 * @returns The target
 */
function target(name: string, matchIndex = 1): TeamNoticeTarget {
  return { characterId: name, name, matchIndex };
}

/**
 * A report with the groups given and the counts worked out from them.
 * @param groups - The groups to fill; the rest are empty
 * @param sentCount - How many were sent
 * @returns A consistent report
 */
function report(
  groups: Partial<
    Pick<
      TeamNoticeReport,
      "blocked" | "missingDiscordId" | "notPresent" | "unsent"
    >
  >,
  sentCount: number
): TeamNoticeReport {
  const full = {
    blocked: [],
    missingDiscordId: [],
    notPresent: [],
    unsent: [],
    ...groups,
  };

  return {
    ...full,
    sentCount,
    totalCount:
      sentCount +
      full.blocked.length +
      full.missingDiscordId.length +
      full.notPresent.length +
      full.unsent.length,
  };
}

describe("mergeTeamNoticeReports", () => {
  it("cộng số đã nhắn của lần nhắn lại vào lần trước", () => {
    const previous = report({ unsent: [target("Asuna"), target("Klein")] }, 5);
    const retry = report({}, 2);

    expect(mergeTeamNoticeReports(previous, retry).sentCount).toBe(7);
  });

  it("danh sách chưa nhắn được chỉ còn những người lần nhắn lại vẫn lỗi", () => {
    const previous = report({ unsent: [target("Asuna"), target("Klein")] }, 5);
    const retry = report({ unsent: [target("Klein")] }, 1);

    expect(mergeTeamNoticeReports(previous, retry).unsent).toEqual([
      target("Klein"),
    ]);
  });

  it("giữ nguyên các nhóm lần trước không liên quan tới nhắn lại", () => {
    const previous = report(
      {
        missingDiscordId: [target("Sinon")],
        notPresent: [target("Rika")],
        unsent: [target("Asuna")],
      },
      4
    );
    const merged = mergeTeamNoticeReports(previous, report({}, 1));

    expect(merged.missingDiscordId).toEqual([target("Sinon")]);
    expect(merged.notPresent).toEqual([target("Rika")]);
  });

  it("người bị chặn DM ở lần nhắn lại được thêm vào nhóm chặn", () => {
    const previous = report(
      { blocked: [target("Lisbeth")], unsent: [target("Asuna")] },
      4
    );
    const retry = report({ blocked: [target("Asuna")] }, 0);

    expect(mergeTeamNoticeReports(previous, retry).blocked).toEqual([
      target("Lisbeth"),
      target("Asuna"),
    ]);
  });

  it("tổng không đổi sau khi nhắn lại: mỗi người vẫn nằm đúng một chỗ", () => {
    const previous = report({ unsent: [target("Asuna"), target("Klein")] }, 5);
    const retry = report({ unsent: [target("Klein")] }, 1);

    const merged = mergeTeamNoticeReports(previous, retry);

    expect(merged.totalCount).toBe(previous.totalCount);
    expect(merged.sentCount).toBe(6);
  });
});
