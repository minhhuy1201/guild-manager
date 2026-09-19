// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// snapDOM rasterises through a real canvas, which jsdom has none of. Nothing here calls it — the
// stub only keeps the module import from reaching for a browser that is not there.
vi.mock("@zumer/snapdom", () => ({ snapdom: {} }));

// `CAPTURE_NODE_ATTRIBUTE` sits beside the sheet, whose banner title reaches the attendance barrel
// and so `server-only` — harmless here, since no server action ever runs. Same stub as
// `formation-capture-sheet.test.tsx`.
vi.mock("server-only", () => ({}));

const { CAPTURE_NODE_ATTRIBUTE } = await import(
  "../../components/formation-capture-sheet"
);
const { CaptureCountError, readCaptureNodes } = await import(
  "../announce-capture"
);

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
