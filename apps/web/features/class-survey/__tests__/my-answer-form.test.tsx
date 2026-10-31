// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassChangeConfidence, GuildClass } from "@guild/shared/enums";
import type { ClassSurveyMember } from "@guild/shared/schemas";

const { mutateAsync, toastSuccess } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("../hooks/use-class-survey", () => ({
  useAnswerClassSurvey: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({ useSessionRecovery: () => () => false }));
vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError: vi.fn() }));
// The real picker is a Base UI popup; what the form owns is which options it offers and what it
// sends, so a flat list of buttons stands in for it.
vi.mock("@/components/ui/select", async () => {
  const { createContext, useContext } = await import("react");
  const Ctx = createContext<(value: string) => void>(() => undefined);

  return {
    Select: (props: {
      value: string | null;
      disabled?: boolean;
      onValueChange: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <Ctx.Provider value={props.onValueChange}>
        <div data-testid="picker" data-value={props.value ?? ""} data-disabled={props.disabled}>
          {props.children}
        </div>
      </Ctx.Provider>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
    SelectItem: (props: { value: string; children: React.ReactNode }) => {
      const pick = useContext(Ctx);

      return (
        <button type="button" onClick={() => pick(props.value)}>
          {props.children}
        </button>
      );
    },
  };
});

import { MyAnswerForm } from "../components/my-answer-form";

const SURVEY = {
  id: "s1",
  title: "Update 06/11",
  closesAt: "2026-11-06T16:59:59.999Z",
  isOpen: true,
};

const UNANSWERED: ClassSurveyMember = {
  id: "me",
  name: "Mèo",
  guildClass: GuildClass.CUU_LINH,
  answer: null,
};

const ANSWERED: ClassSurveyMember = {
  ...UNANSWERED,
  answer: {
    kind: "CHANGE",
    fromClass: GuildClass.CUU_LINH,
    targetClass: GuildClass.TO_VAN,
    confidence: ClassChangeConfidence.CONSIDERING,
  },
};

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
});

describe("MyAnswerForm", () => {
  it("offers stay and every class except the current one", () => {
    render(<MyAnswerForm survey={SURVEY} member={UNANSWERED} />);

    expect(screen.getByText("Giữ nguyên")).toBeTruthy();
    expect(screen.getByText("Chuyển sang Tố Vấn")).toBeTruthy();
    expect(screen.queryByText("Chuyển sang Cửu Linh")).toBeNull();
  });

  it("starts from the saved answer", () => {
    render(<MyAnswerForm survey={SURVEY} member={ANSWERED} />);

    expect(screen.getByTestId("picker").dataset.value).toBe(GuildClass.TO_VAN);
    expect(screen.getByText("Đang cân nhắc").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Chắc chắn").getAttribute("aria-pressed")).toBe("false");
  });

  it("cannot save before anything is picked", () => {
    render(<MyAnswerForm survey={SURVEY} member={UNANSWERED} />);

    expect((screen.getByText("Lưu câu trả lời") as HTMLButtonElement).disabled).toBe(true);
  });

  it("locks the confidence while staying", () => {
    render(<MyAnswerForm survey={SURVEY} member={ANSWERED} />);
    fireEvent.click(screen.getByText("Giữ nguyên"));

    expect((screen.getByText("Chắc chắn") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("Đang cân nhắc") as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves a change with the picked class and confidence", async () => {
    mutateAsync.mockResolvedValue({});
    render(<MyAnswerForm survey={SURVEY} member={UNANSWERED} />);
    fireEvent.click(screen.getByText("Chuyển sang Huyền Cơ"));
    fireEvent.click(screen.getByText("Đang cân nhắc"));
    fireEvent.click(screen.getByText("Lưu câu trả lời"));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({
      surveyId: "s1",
      input: {
        kind: "CHANGE",
        targetClass: GuildClass.HUYEN_CO,
        confidence: ClassChangeConfidence.CONSIDERING,
      },
    });
  });

  it("saves stay without a confidence", async () => {
    mutateAsync.mockResolvedValue({});
    render(<MyAnswerForm survey={SURVEY} member={ANSWERED} />);
    fireEvent.click(screen.getByText("Giữ nguyên"));
    fireEvent.click(screen.getByText("Lưu câu trả lời"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({ surveyId: "s1", input: { kind: "KEEP" } });
  });

  it("shows the server's refusal verbatim and raises no toast", async () => {
    mutateAsync.mockRejectedValue(new Error("Đợt khảo sát đã đóng, không sửa được câu trả lời."));
    render(<MyAnswerForm survey={SURVEY} member={UNANSWERED} />);
    fireEvent.click(screen.getByText("Giữ nguyên"));
    fireEvent.click(screen.getByText("Lưu câu trả lời"));

    expect(
      await screen.findByText("Đợt khảo sát đã đóng, không sửa được câu trả lời.")
    ).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("is read-only once the survey has closed", () => {
    render(<MyAnswerForm survey={{ ...SURVEY, isOpen: false }} member={ANSWERED} />);

    expect(screen.queryByText("Lưu câu trả lời")).toBeNull();
    expect(screen.getByTestId("picker").dataset.disabled).toBe("true");
    expect((screen.getByText("Chắc chắn") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Đợt khảo sát đã đóng, không sửa được câu trả lời.")).toBeTruthy();
  });
});
