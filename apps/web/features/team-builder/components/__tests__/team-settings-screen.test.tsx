// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamSettingsState } from "@guild/shared/schemas";
import {
  fetchAttendanceRecords,
  fetchCharacters,
} from "@/features/attendance/api/attendance-api";
import {
  fetchFormations,
  fetchFormationWeeks,
  fetchTeamSettings,
  saveTeamSettings,
} from "../../api/team-builder-api";
import { useFormationStore } from "../../store/formation-store";
import { useTeamSettingsStore } from "../../store/team-settings-store";
import { makeSession } from "../../hooks/__tests__/render-formation-hook";
import { TeamBuilderScreen } from "../team-builder-screen";

vi.mock("server-only", () => ({}));
vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  fetchTeamSettings: vi.fn(),
  saveFormation: vi.fn(),
  saveTeamSettings: vi.fn(),
}));
vi.mock("@/features/attendance/api/attendance-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/attendance/api/attendance-api")
  >()),
  fetchCharacters: vi.fn(),
  fetchAttendanceRecords: vi.fn(),
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));
vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const SAVED: TeamSettingsState = {
  names: {},
  colors: { "1": TeamColor.RED },
  icons: {},
  version: 4,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  useFormationStore.setState({
    drafts: {},
    baseVersions: {},
    history: {},
    activeSessionId: null,
    activeMatchIndex: 0,
    selectedWeekStart: null,
  });
  useTeamSettingsStore.setState({ draft: null, baseVersion: null });
  vi.mocked(fetchFormationWeeks).mockResolvedValue({
    ok: true,
    data: [{ weekStart: "2026-08-17T00:00:00.000Z", weekEnd: "x", isActive: true }],
  });
  vi.mocked(fetchFormations).mockResolvedValue({
    ok: true,
    data: [makeSession("thu-7", { matchCount: 1 })],
  });
  vi.mocked(fetchCharacters).mockResolvedValue({ ok: true, data: [] });
  vi.mocked(fetchAttendanceRecords).mockResolvedValue({ ok: true, data: {} });
  vi.mocked(fetchTeamSettings).mockResolvedValue({ ok: true, data: SAVED });
  vi.mocked(saveTeamSettings).mockResolvedValue({
    ok: true,
    data: { ...SAVED, version: 5 },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Render the real screen over mocked network calls.
 * @returns The testing-library render result
 */
function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <TeamBuilderScreen />
    </QueryClientProvider>
  );
}

/**
 * Wait for team 1's colour button, which only exists once the settings have loaded.
 * @returns The button
 */
async function colorButtonOfTeam1(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: /^Màu đội 1:/ });
}

/**
 * Click an entry of the open colour popover.
 * @param name - Accessible name of the entry
 */
async function pick(name: string | RegExp) {
  fireEvent.click(await screen.findByRole("button", { name }));
}

describe("TeamBuilderScreen - màu đội", () => {
  it("nút màu đọc ra màu hiện tại của đội", async () => {
    renderScreen();

    expect((await colorButtonOfTeam1()).getAttribute("aria-label")).toContain(
      "Đỏ"
    );
    expect(
      (await screen.findByRole("button", { name: /^Màu đội 2:/ })).getAttribute(
        "aria-label"
      )
    ).toContain("Ngọc bích");
  });

  it("chọn một màu thì card đổi ngay, Save gửi names + colors + version", async () => {
    renderScreen();
    const button = await colorButtonOfTeam1();
    const before = button.querySelector('[data-slot="team-marker"]')?.className;

    fireEvent.click(button);
    await pick("Xanh trời");

    expect(button.querySelector('[data-slot="team-marker"]')?.className).not.toBe(
      before
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveTeamSettings).mock.calls[0][0]).toEqual({
      names: {},
      colors: { "1": TeamColor.SKY },
      icons: {},
      version: 4,
    });
  });

  it("\"Mặc định\" đứng đầu popover và xoá key màu khi lưu", async () => {
    renderScreen();
    fireEvent.click(await colorButtonOfTeam1());

    const popover = await screen.findByRole("dialog");
    const cells = within(popover).getAllByRole("button");
    expect(cells[0].textContent).toBe("Mặc định");
    // "Mặc định" + 8 colours, then "Không biểu tượng" + 9 icons
    expect(cells).toHaveLength(19);
    fireEvent.click(cells[0]);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveTeamSettings).mock.calls[0][0]).toEqual({
      names: {},
      colors: {},
      icons: {},
      version: 4,
    });
  });

  it("trận đã khoá (readOnly) không có nút màu, chỉ còn chấm tĩnh", async () => {
    vi.mocked(fetchFormations).mockResolvedValue({
      ok: true,
      data: [makeSession("thu-7", { matchCount: 1, locked: true })],
    });
    const { container } = renderScreen();

    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="team-marker"]').length).toBeGreaterThan(0)
    );
    expect(screen.queryByRole("button", { name: /Màu đội/ })).toBeNull();
  });

  it("Save gặp 412 thì hiện dialog xung đột nói tới tên, màu và biểu tượng", async () => {
    vi.mocked(saveTeamSettings).mockResolvedValue({
      ok: false,
      message: "Cũ rồi.",
      statusCode: 412,
    });
    renderScreen();
    fireEvent.click(await colorButtonOfTeam1());
    await pick("Tím");
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Tên, màu và biểu tượng đội")).toBeTruthy();
  });
});

/**
 * Wait for team 1's style button, which only exists once the settings have loaded.
 * @returns The button
 */
async function styleButtonOfTeam1(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: /^Màu đội 1:/ });
}

describe("TeamBuilderScreen - biểu tượng đội", () => {
  it("nút đọc ra cả màu lẫn biểu tượng của đội", async () => {
    vi.mocked(fetchTeamSettings).mockResolvedValue({
      ok: true,
      data: { ...SAVED, icons: { "1": TeamIcon.SWORDS } },
    });
    renderScreen();

    const label = (await styleButtonOfTeam1()).getAttribute("aria-label");
    expect(label).toContain("Đỏ");
    expect(label).toContain("Công");
  });

  it("chọn icon thì header hiện icon thay chấm, Save gửi đủ ba record", async () => {
    renderScreen();
    const button = await styleButtonOfTeam1();
    expect(button.querySelector('[data-slot="team-marker"]')).not.toBeNull();
    expect(button.querySelector('[data-slot="team-icon"]')).toBeNull();

    fireEvent.click(button);
    await pick("Thủ");

    expect(button.querySelector('[data-slot="team-icon"]')).not.toBeNull();
    expect(button.querySelector('[data-slot="team-marker"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveTeamSettings).mock.calls[0][0]).toEqual({
      names: {},
      colors: { "1": TeamColor.RED },
      icons: { "1": TeamIcon.SHIELD },
      version: 4,
    });
  });

  it("\"Không biểu tượng\" đứng đầu lưới icon, xoá key và chấm hiện lại", async () => {
    vi.mocked(fetchTeamSettings).mockResolvedValue({
      ok: true,
      data: { ...SAVED, icons: { "1": TeamIcon.EYE } },
    });
    renderScreen();
    const button = await styleButtonOfTeam1();
    expect(button.querySelector('[data-slot="team-icon"]')).not.toBeNull();

    fireEvent.click(button);
    const popover = await screen.findByRole("dialog");
    const cells = within(popover).getAllByRole("button");
    expect(cells[9].textContent).toBe("Không biểu tượng");
    fireEvent.click(cells[9]);

    expect(button.querySelector('[data-slot="team-marker"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveTeamSettings).mock.calls[0][0]).toEqual({
      names: {},
      colors: { "1": TeamColor.RED },
      icons: {},
      version: 4,
    });
  });

  it("trận đã khoá (readOnly) hiện icon tĩnh, không có nút", async () => {
    vi.mocked(fetchTeamSettings).mockResolvedValue({
      ok: true,
      data: { ...SAVED, icons: { "1": TeamIcon.CASTLE } },
    });
    vi.mocked(fetchFormations).mockResolvedValue({
      ok: true,
      data: [makeSession("thu-7", { matchCount: 1, locked: true })],
    });
    const { container } = renderScreen();

    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="team-icon"]')).toHaveLength(1)
    );
    expect(screen.queryByRole("button", { name: /Màu đội/ })).toBeNull();
  });
});
