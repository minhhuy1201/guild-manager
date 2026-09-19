// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AbsenceReasonText } from "../components/absence-reason-text";

const REASON = "Bận đi công tác ở Đà Nẵng cả tuần, về muộn nên không kịp vào trận";

afterEach(cleanup);

// The cell only fits two lines, and a phone has no hover to open a tooltip or `title`, so a
// truncated reason has to be readable in full with one tap.
describe("AbsenceReasonText", () => {
  it("bấm vào lý do thì thấy lý do đầy đủ", async () => {
    render(<AbsenceReasonText reason={REASON} />);

    fireEvent.click(screen.getByRole("button", { name: REASON }));

    expect(await screen.findAllByText(REASON)).toHaveLength(2);
  });

  it("không dùng title làm chỗ chứa lý do", () => {
    render(<AbsenceReasonText reason={REASON} />);

    expect(screen.getByRole("button", { name: REASON }).getAttribute("title")).toBeNull();
  });
});
