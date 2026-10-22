// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// snapDOM rasterises through a real canvas, which jsdom has none of, so each test says what the
// stub answers.
const toWebp = vi.hoisted(() => vi.fn());

vi.mock("@zumer/snapdom", () => ({ snapdom: { toWebp } }));

// `CAPTURE_NODE_ATTRIBUTE` sits beside the sheet, whose banner title reaches the attendance barrel
// and so `server-only` — harmless here, since no server action ever runs. Same stub as
// `formation-capture-sheet.test.tsx`.
vi.mock("server-only", () => ({}));

const { CAPTURE_NODE_ATTRIBUTE } = await import(
  "../../components/formation-capture-sheet"
);
const {
  TEAM_CAPTURE_MATCH_ATTRIBUTE,
  TEAM_CAPTURE_MEMBERS_ATTRIBUTE,
  TEAM_CAPTURE_TEAM_ATTRIBUTE,
} = await import("../team-capture-attributes");
const {
  CaptureCountError,
  DuplicateTeamCaptureError,
  captureTeamImages,
  readCaptureNodes,
  readTeamCaptureNodes,
} = await import("../announce-capture");

afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * Put `count` capture nodes in the document, in order.
 * @param count - How many nodes to render
 * @returns Nothing
 */
function renderCaptureNodes(count: number): void {
  document.body.innerHTML = Array.from(
    { length: count },
    (_, index) =>
      `<div ${CAPTURE_NODE_ATTRIBUTE}="${index}">trận ${index + 1}</div>`
  ).join("");
}

describe("readCaptureNodes", () => {
  it("trả về đúng một node cho mỗi trận, theo thứ tự", () => {
    renderCaptureNodes(2);

    expect(readCaptureNodes(2).map((node) => node.textContent)).toEqual([
      "trận 1",
      "trận 2",
    ]);
  });

  // The images go straight to the whole guild with no review step, so silently sending one match
  // short is a far worse failure than raising an error and making someone press again.
  it("thiếu node so với số trận thì ném, không gửi thiếu", () => {
    renderCaptureNodes(1);

    expect(() => readCaptureNodes(2)).toThrow(CaptureCountError);
  });

  it("chưa có sheet nào mount thì cũng ném", () => {
    expect(() => readCaptureNodes(1)).toThrow(CaptureCountError);
  });

  // Two sheets mounted at once produce colliding indexes, so there is no way to match an image to
  // its match correctly.
  it("thừa node — hai sheet cùng mount — thì ném", () => {
    renderCaptureNodes(4);

    expect(() => readCaptureNodes(2)).toThrow(CaptureCountError);
  });

  it("lỗi nói rõ tìm được bao nhiêu trên tổng bao nhiêu", () => {
    renderCaptureNodes(1);

    expect(() => readCaptureNodes(2)).toThrow(/1.*2/);
  });
});

/**
 * Put team cards in the document.
 * @param cards - One `[match, team, members]` per card
 * @returns Nothing
 */
function renderTeamCards(cards: [number, number, string[]][]): void {
  document.body.innerHTML = cards
    .map(
      ([match, team, members]) =>
        `<div ${TEAM_CAPTURE_MATCH_ATTRIBUTE}="${match}" ${TEAM_CAPTURE_TEAM_ATTRIBUTE}="${team}" ${TEAM_CAPTURE_MEMBERS_ATTRIBUTE}="${members.join(" ")}"></div>`
    )
    .join("");
}

describe("readTeamCaptureNodes", () => {
  it("đọc card theo số trận và số team", () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [2, 3, ["asuna", "klein"]],
    ]);

    expect(
      readTeamCaptureNodes().map(({ matchIndex, team, memberIds }) => ({
        matchIndex,
        team,
        memberIds,
      }))
    ).toEqual([
      { matchIndex: 1, team: 1, memberIds: ["kirito"] },
      { matchIndex: 2, team: 3, memberIds: ["asuna", "klein"] },
    ]);
  });

  it("nhắn lại chỉ lấy card chứa người trong notices, đúng trận", () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [1, 2, ["asuna"]],
      [2, 1, ["kirito"]],
    ]);

    expect(
      readTeamCaptureNodes([{ characterId: "kirito", matchIndex: 2 }]).map(
        ({ matchIndex, team }) => [matchIndex, team]
      )
    ).toEqual([[2, 1]]);
  });

  it("không có card nào thì trả mảng rỗng, không ném", () => {
    expect(readTeamCaptureNodes()).toEqual([]);
  });

  // Two sheets in the document would hand one pair two different images.
  it("trùng một cặp (trận, team) thì ném", () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [1, 1, ["kirito"]],
    ]);

    expect(() => readTeamCaptureNodes()).toThrow(DuplicateTeamCaptureError);
  });
});

describe("captureTeamImages", () => {
  it("chụp mỗi card thành một ảnh mang đúng trận và team", async () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [2, 3, ["asuna"]],
    ]);
    toWebp.mockImplementation((node: HTMLElement) =>
      Promise.resolve({
        src: `data:image/webp;base64,${node.getAttribute(TEAM_CAPTURE_TEAM_ATTRIBUTE)}`,
      })
    );

    await expect(captureTeamImages()).resolves.toEqual([
      { matchIndex: 1, team: 1, image: "data:image/webp;base64,1" },
      { matchIndex: 2, team: 3, image: "data:image/webp;base64,3" },
    ]);
  });

  it("một team chụp lỗi thì chỉ team đó thiếu ảnh", async () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [1, 2, ["asuna"]],
    ]);
    toWebp.mockImplementation((node: HTMLElement) =>
      node.getAttribute(TEAM_CAPTURE_TEAM_ATTRIBUTE) === "1"
        ? Promise.reject(new Error("canvas"))
        : Promise.resolve({ src: "data:image/webp;base64,AQID" })
    );

    await expect(captureTeamImages()).resolves.toEqual([
      { matchIndex: 1, team: 2, image: "data:image/webp;base64,AQID" },
    ]);
  });

  it("trùng cặp thì ném để người gọi bỏ hết ảnh team", async () => {
    renderTeamCards([
      [1, 1, ["kirito"]],
      [1, 1, ["kirito"]],
    ]);

    await expect(captureTeamImages()).rejects.toThrow(
      DuplicateTeamCaptureError
    );
  });
});
