// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";

const updateTactic = vi.fn();

vi.mock("../api/tactics-api", () => ({
  updateTactic: (input: unknown) => updateTactic(input),
}));

import { useTacticNotesDraft } from "../hooks/use-tactic-notes-draft";
import { TacticNotesPanel } from "../components/tactic-notes-panel";

afterEach(cleanup);

beforeEach(() => {
  updateTactic.mockReset();
  updateTactic.mockResolvedValue({});
});

interface HarnessProps {
  /** Notes as saved */
  notes: string | null;
}

/**
 * The panel wired to the real draft hook, as the editor screen wires it.
 * @param props - Saved notes
 * @returns The panel
 */
function Harness({ notes }: HarnessProps) {
  const draft = useTacticNotesDraft("t1", notes);

  return <TacticNotesPanel notes={notes} draft={draft} />;
}

/**
 * Render the harness inside a fresh QueryClient.
 * @param props - Saved notes
 */
function renderPanel(props: HarnessProps) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  render(
    (
      <QueryClientProvider client={queryClient}>
        <Harness {...props} />
      </QueryClientProvider>
    ) as ReactNode
  );
}

describe("TacticNotesPanel", () => {
  it("opens on the notes when there are some, keeping their line breaks", () => {
    renderPanel({ notes: "- Mở màn\n- Rút" });

    const text = screen.getByText(/Mở màn/);

    expect(text.textContent).toBe("- Mở màn\n- Rút");
    expect(text.className).toContain("whitespace-pre-wrap");
  });

  it("starts folded when there is nothing to read, and unfolds on demand", () => {
    renderPanel({ notes: null });

    expect(screen.queryByText("Chưa có ghi chú.")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Mở ghi chú chiến thuật" })
    );

    expect(screen.getByText("Chưa có ghi chú.")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Thu ghi chú chiến thuật" })
    );

    expect(screen.queryByText("Chưa có ghi chú.")).toBeNull();
  });

  it("saves what the admin wrote, trimmed", async () => {
    renderPanel({ notes: "Giữ cổng." });

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Giữ cổng tây.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));

    await waitFor(() =>
      expect(updateTactic).toHaveBeenCalledWith({
        id: "t1",
        notes: "Giữ cổng tây.",
      })
    );
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
  });

  it("clears the notes when saved empty", async () => {
    renderPanel({ notes: "Giữ cổng." });

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));

    await waitFor(() =>
      expect(updateTactic).toHaveBeenCalledWith({ id: "t1", notes: null })
    );
  });

  it("drops the draft on cancel", () => {
    renderPanel({ notes: "Giữ cổng." });

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Bỏ cổng." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Giữ cổng.")).toBeTruthy();
    expect(updateTactic).not.toHaveBeenCalled();
  });

  it("keeps the draft and says why when the save is refused", async () => {
    updateTactic.mockRejectedValue(
      new ApiError("Ghi chú chiến thuật tối đa 5000 ký tự.", 400)
    );
    renderPanel({ notes: null });

    fireEvent.click(
      screen.getByRole("button", { name: "Mở ghi chú chiến thuật" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Giữ cổng." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));

    await waitFor(() =>
      expect(
        screen.getByText("Ghi chú chiến thuật tối đa 5000 ký tự.")
      ).toBeTruthy()
    );
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Giữ cổng."
    );
  });
});
