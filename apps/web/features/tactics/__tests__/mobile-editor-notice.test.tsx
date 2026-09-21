// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MobileEditorNotice } from "../components/mobile-editor-notice";

afterEach(cleanup);

describe("MobileEditorNotice", () => {
  it("tells a phone user where to draw", () => {
    render(<MobileEditorNotice />);

    expect(screen.getByText("Mở trên máy tính để vẽ chiến thuật.")).toBeTruthy();
  });
});
