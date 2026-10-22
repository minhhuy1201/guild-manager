import { TEAM_IMAGE_MAX_CHARS } from "@guild/shared/schemas";
import { describe, expect, it } from "vitest";

import { dropOversizedTeamImages } from "../team-images";

const SMALL = "data:image/webp;base64,AQID";
const HUGE = `data:image/webp;base64,${"A".repeat(TEAM_IMAGE_MAX_CHARS)}`;

describe("dropOversizedTeamImages", () => {
  it("giữ ảnh vừa giới hạn", () => {
    const images = [{ matchIndex: 1, team: 1, image: SMALL }];

    expect(dropOversizedTeamImages(images)).toEqual(images);
  });

  // The server would refuse the whole body for one over-size image, and every member would lose
  // their notice instead of one team receiving text.
  it("bỏ ảnh dài hơn TEAM_IMAGE_MAX_CHARS, giữ các ảnh còn lại", () => {
    const kept = { matchIndex: 1, team: 2, image: SMALL };

    expect(
      dropOversizedTeamImages([{ matchIndex: 1, team: 1, image: HUGE }, kept])
    ).toEqual([kept]);
  });
});
