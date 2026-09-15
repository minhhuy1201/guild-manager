// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AbsenceReasonText } from "../components/absence-reason-text";

const REASON = "Bận đi công tác ở Đà Nẵng cả tuần, về muộn nên không kịp vào trận";

afterEach(cleanup);

// Ô chỉ đủ chỗ cho hai dòng, và trên điện thoại không có hover để mở tooltip hay `title`, nên lý do
// bị cắt phải đọc đủ được bằng một lần chạm.
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
