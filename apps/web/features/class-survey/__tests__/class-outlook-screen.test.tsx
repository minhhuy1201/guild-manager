// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassChangeConfidence, GuildClass } from "@guild/shared/enums";
import type { ClassSurveyMember, ClassSurveyView } from "@guild/shared/schemas";

const query = vi.hoisted(() => ({
  current: {} as {
    data?: ClassSurveyView;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  },
}));

const session = vi.hoisted(() => ({ character: null as { id: string } | null }));

vi.mock("../hooks/use-class-survey", () => ({
  useClassSurvey: () => query.current,
  useAnswerClassSurvey: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/features/auth", () => ({
  useSession: () => ({ data: { character: session.character } }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({ useSessionRecovery: () => () => false }));
// The scene is next/image; what is under test is the page's own content.
vi.mock("@/components/shared/banner-image", () => ({ BannerImage: () => null }));

import { ClassOutlookScreen } from "../components/class-outlook-screen";

const SURVEY = {
  id: "s1",
  title: "Update 06/11",
  // 23:59:59.999 on 06/11 in Vietnam time
  closesAt: "2026-11-06T16:59:59.999Z",
  isOpen: true,
};

const MEMBERS: ClassSurveyMember[] = [
  {
    id: "a",
    name: "An",
    guildClass: GuildClass.CUU_LINH,
    answer: {
      kind: "CHANGE",
      fromClass: GuildClass.CUU_LINH,
      targetClass: GuildClass.TO_VAN,
      confidence: ClassChangeConfidence.SURE,
    },
  },
  {
    id: "b",
    name: "Bình",
    guildClass: GuildClass.CUU_LINH,
    answer: { kind: "KEEP", fromClass: GuildClass.CUU_LINH },
  },
  { id: "c", name: "Chi", guildClass: GuildClass.THIET_Y, answer: null },
];

/**
 * Make the hook return a loaded view.
 * @param view - What the API returned
 */
function load(view: ClassSurveyView) {
  query.current = {
    data: view,
    isPending: false,
    isError: false,
    error: null,
    refetch: async () => undefined,
  };
}

afterEach(() => {
  cleanup();
  session.character = null;
});

describe("ClassOutlookScreen", () => {
  it("đợt đang mở: banner có tên và hạn chót, bốn ô số, tab Trước / sau", () => {
    load({ survey: SURVEY, members: MEMBERS });
    render(<ClassOutlookScreen />);

    expect(screen.getByText("Update 06/11 - hạn chót hết ngày 06/11")).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy(); // đã điền / tổng
    expect(screen.getByText("Định chuyển").nextSibling?.textContent).toBe("1");
    expect(screen.getByText("Trong đó chắc chắn").nextSibling?.textContent).toBe("1");
    expect(screen.getByText("Phái tăng mạnh nhất").nextSibling?.textContent).toBe("Tố Vấn +1");
    expect(screen.getByText("Trước / sau")).toBeTruthy();
    expect(screen.getByText("Danh sách")).toBeTruthy();
  });

  it("tab Danh sách: giữ nguyên, chuyển kèm mức độ, và chưa điền", () => {
    load({ survey: SURVEY, members: MEMBERS });
    render(<ClassOutlookScreen />);
    fireEvent.click(screen.getByText("Danh sách"));

    expect(screen.getByText("An")).toBeTruthy();
    expect(screen.getByText("Tố Vấn")).toBeTruthy();
    expect(screen.getByText("Chắc chắn")).toBeTruthy();
    expect(screen.getByText("Giữ nguyên")).toBeTruthy();
    expect(screen.getByText("Chưa điền")).toBeTruthy();
  });

  it("đợt đã đóng: banner ghi đã đóng, kết quả vẫn hiện", () => {
    load({ survey: { ...SURVEY, isOpen: false }, members: MEMBERS });
    render(<ClassOutlookScreen />);

    expect(screen.getByText("Update 06/11 - đã đóng ngày 06/11")).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText("Trước / sau")).toBeTruthy();
  });

  it("chưa có đợt nào: chỉ cơ cấu hiện tại, không ô số, không tab", () => {
    load({ survey: null, members: MEMBERS });
    render(<ClassOutlookScreen />);

    expect(screen.getByText("Cơ cấu phái hiện tại")).toBeTruthy();
    expect(screen.queryByText("Đã điền")).toBeNull();
    expect(screen.queryByText("Danh sách")).toBeNull();
    expect(screen.queryByText("Trước / sau")).toBeNull();
  });

  it("viewer with a Character sees the form; without one it is hidden", () => {
    load({ survey: SURVEY, members: MEMBERS });
    session.character = { id: "c" };
    const { unmount } = render(<ClassOutlookScreen />);

    expect(screen.getByText("Câu trả lời của bạn")).toBeTruthy();
    unmount();

    session.character = null;
    render(<ClassOutlookScreen />);

    expect(screen.queryByText("Câu trả lời của bạn")).toBeNull();
  });

  it("no survey yet: no form even for a member", () => {
    load({ survey: null, members: MEMBERS });
    session.character = { id: "c" };
    render(<ClassOutlookScreen />);

    expect(screen.queryByText("Câu trả lời của bạn")).toBeNull();
  });
});
