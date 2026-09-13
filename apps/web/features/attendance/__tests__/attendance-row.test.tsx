// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import type { GridDraft } from "../lib/grid-draft";
import { recordKey } from "../lib/record-key";
import { AttendanceRow } from "../components/attendance-row";

const CHARACTER: Character = {
  id: "char-1",
  name: "Mèo Mập",
  guildClass: GuildClass.CUU_LINH,
};

const SESSION: BattleSession = {
  id: "sess-1",
  label: "Trận sess-1",
  dateTime: "2026-08-24T20:00:00.000Z",
  deadline: "2026-08-24T03:00:00.000Z",
  isDeadlinePassed: false,
  isGuildWar: false,
  opponent: null,
  weekStart: "2026-08-24T00:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

const KEY = recordKey(CHARACTER.id, SESSION.id);

/**
 * Build the one-entry record map the row reads.
 * @param reason - Reason stored with the "Không" answer
 * @returns The records keyed the way the app keys them
 */
function makeRecordMap(reason: string | null): Record<string, AttendanceRecord> {
  return {
    [KEY]: {
      characterId: CHARACTER.id,
      sessionId: SESSION.id,
      isPresent: false,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason,
    },
  };
}

/**
 * Render one row inside a table.
 * @param options - Records, draft, and whether the viewer may click the cells
 * @returns The click spy
 */
function renderRow({
  recordMap = {},
  draft = {},
  canEdit = true,
  disabled = false,
}: {
  recordMap?: Record<string, AttendanceRecord>;
  draft?: GridDraft;
  canEdit?: boolean;
  disabled?: boolean;
} = {}) {
  const onCellClick = vi.fn();
  render(
    <table>
      <tbody>
        <AttendanceRow
          character={CHARACTER}
          sessions={[SESSION]}
          recordMap={recordMap}
          canEdit={canEdit}
          disabled={disabled}
          draft={draft}
          onCellClick={onCellClick}
        />
      </tbody>
    </table>
  );

  return onCellClick;
}

/**
 * The clickable cell of the row's only session.
 * @returns The cell button
 */
function cellButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Trận sess-1/ }) as HTMLButtonElement;
}

afterEach(cleanup);

describe("AttendanceRow - chỉ đọc", () => {
  it("hiện lý do vắng dưới trạng thái", () => {
    renderRow({ recordMap: makeRecordMap("Bận đi công tác"), canEdit: false });

    expect(screen.getByText("Bận đi công tác")).toBeTruthy();
  });

  it("member không bấm được ô nào", () => {
    renderRow({ canEdit: false });

    expect(screen.queryByRole("button")).toBeNull();
  });

  // Cột thao tác bên phải đã bỏ: hàng chỉ còn cột tên và các cột ngày.
  it("hàng chỉ có cột tên và các cột ngày", () => {
    renderRow();

    expect(document.querySelectorAll("td").length).toBe(2);
  });
});

describe("AttendanceRow - admin bấm thẳng vào ô", () => {
  it("ô là một nút, đọc được trạng thái mà không cần hover", () => {
    renderRow();

    expect(cellButton().getAttribute("aria-label")).toContain("Chưa điểm danh");
  });

  it("bấm ô thì báo lên bảng đúng người, đúng trận", () => {
    const onCellClick = renderRow();

    fireEvent.click(cellButton());

    expect(onCellClick).toHaveBeenCalledWith(CHARACTER, SESSION);
  });

  it("ô đã đổi hiện câu trả lời mới và được đánh dấu", () => {
    renderRow({
      recordMap: makeRecordMap("Bận"),
      draft: {
        [KEY]: { characterId: CHARACTER.id, sessionId: SESSION.id, isPresent: true },
      },
    });

    expect(cellButton().getAttribute("aria-label")).toContain("Có");
    expect(cellButton().dataset.changed).toBe("true");
    // Lý do cũ đi với câu trả lời cũ, nên không hiện dưới câu trả lời mới.
    expect(screen.queryByText("Bận")).toBeNull();
  });

  it("ô chưa đổi không bị đánh dấu", () => {
    renderRow();

    expect(cellButton().dataset.changed).toBe("false");
  });

  it("đang lưu thì khoá mọi ô", () => {
    renderRow({ disabled: true });

    expect(cellButton().disabled).toBe(true);
  });
});
