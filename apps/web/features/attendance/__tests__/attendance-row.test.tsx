// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

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
  hasFormation: false,
};

/**
 * Build the one-entry record map the row reads.
 * @param reason - Reason stored with the "Không" answer
 * @returns The records keyed the way the app keys them
 */
function makeRecordMap(reason: string | null): Record<string, AttendanceRecord> {
  return {
    [recordKey(CHARACTER.id, SESSION.id)]: {
      characterId: CHARACTER.id,
      sessionId: SESSION.id,
      isPresent: false,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason,
    },
  };
}

/**
 * Render one row inside a table, with the props a read-only row needs.
 * @param reason - Reason stored with the answer
 * @param isEditing - Whether the row is in editing mode
 * @param canEdit - Whether the viewer gets the action column
 */
function renderRow(reason: string | null, isEditing = false, canEdit = true) {
  render(
    <table>
      <tbody>
        <AttendanceRow
          character={CHARACTER}
          sessions={[SESSION]}
          canEdit={canEdit}
          recordMap={makeRecordMap(reason)}
          lockedSessionIds={new Set<string>()}
          allLocked={false}
          isEditing={isEditing}
          isSaving={false}
          draft={{}}
          onStartEdit={vi.fn()}
          onDraftChange={vi.fn()}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </tbody>
    </table>
  );
}

afterEach(cleanup);

describe("AttendanceRow", () => {
  it("hiện lý do vắng dưới trạng thái ở ô chỉ đọc", () => {
    renderRow("Bận đi công tác");

    expect(screen.getByText("Bận đi công tác")).toBeTruthy();
  });

  it("không hiện gì thêm khi bản ghi không có lý do", () => {
    renderRow(null);

    expect(screen.queryByText("Bận đi công tác")).toBeNull();
  });

  it("ô đang sửa không hiện lý do cũ", () => {
    renderRow("Bận đi công tác", true);

    expect(screen.queryByText("Bận đi công tác")).toBeNull();
  });

  it("người không được sửa thì hàng không có ô thao tác", () => {
    renderRow(null, false, false);

    expect(screen.queryByRole("button", { name: "Điểm danh" })).toBeNull();
    expect(document.querySelectorAll("td").length).toBe(2);
  });

  it("người được sửa thì hàng có nút điểm danh ở ô cuối", () => {
    renderRow(null);

    expect(screen.queryByRole("button", { name: "Điểm danh" })).not.toBeNull();
    expect(document.querySelectorAll("td").length).toBe(3);
  });
});
