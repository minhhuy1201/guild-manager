// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AttendanceStatus, GuildClass } from "@shared/enums";
import type { Character, SessionFormation } from "@shared/schemas";

import type { AttendanceRecordLike } from "../../lib/session-pool";
import { useFormationStore } from "../../store/formation-store";
import type { Assignment, MatchDraft } from "../../types/formation";
import { useFormationPool } from "../use-formation-pool";
import { makeSession, renderFormationHook } from "./render-formation-hook";

const SLOT = "team-1-pos-1";
const SESSION_ID = "thu-7";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "An", guildClass: GuildClass.TO_VAN },
  { id: "char-2", name: "Bình", guildClass: GuildClass.TO_VAN },
  { id: "char-3", name: "Cường", guildClass: GuildClass.THIET_Y },
];

/**
 * Build one attendance record for the battle under test.
 * @param characterId - Who marked attendance
 * @param status - What they marked
 * @returns The record
 */
function record(
  characterId: string,
  status: AttendanceStatus
): AttendanceRecordLike {
  return { characterId, sessionId: SESSION_ID, status };
}

const ALL_PRESENT = [
  record("char-1", AttendanceStatus.PRESENT),
  record("char-2", AttendanceStatus.PRESENT),
  record("char-3", AttendanceStatus.PRESENT),
];

/** The battle under test on its own, with nothing saved yet. */
const LONE_SESSION = [makeSession(SESSION_ID)];

/** An earlier battle that has a formation, then the empty battle under test. */
const SESSIONS_WITH_SOURCE = [
  makeSession("thu-4", {
    matches: [{ slots: { [SLOT]: "char-1" }, notes: { [SLOT]: "giữ buồng" } }],
  }),
  makeSession(SESSION_ID),
];

/** Every argument `useFormationPool` takes, so a test can vary just one. */
interface PoolArgs {
  sessions: SessionFormation[];
  activeSessionId: string | null;
  editable: boolean;
  records: AttendanceRecordLike[];
  assignment: Assignment;
  matches: MatchDraft[];
  activeMatchIndex: number;
}

/** Fixtures shared by most cases: the lone battle, nobody placed, all present. */
const DEFAULT_ARGS: PoolArgs = {
  sessions: LONE_SESSION,
  activeSessionId: SESSION_ID,
  editable: true,
  records: ALL_PRESENT,
  assignment: {},
  matches: [{ assignment: {}, notes: {} }],
  activeMatchIndex: 0,
};

/**
 * Render `useFormationPool` over the default fixtures with a few fields changed.
 * Every argument object is built once here, before render, because the hook
 * writes a draft in an effect — a fixture rebuilt per render would loop.
 * @param overrides - Arguments to change from the defaults
 * @param seed - Store state to put in place before the first render
 * @returns The testing-library render result
 */
function renderPool(
  overrides: Partial<PoolArgs> = {},
  seed: Parameters<typeof renderFormationHook>[1] = {}
) {
  const args: PoolArgs = { ...DEFAULT_ARGS, ...overrides };

  return renderFormationHook(
    () =>
      useFormationPool(
        args.sessions,
        args.activeSessionId,
        args.editable,
        CHARACTERS,
        args.records,
        args.assignment,
        args.matches,
        args.activeMatchIndex
      ),
    seed
  );
}

describe("useFormationPool — pool", () => {
  it("chỉ gồm người đã báo tham gia và chưa được xếp", () => {
    const { result } = renderPool({
      records: [
        record("char-1", AttendanceStatus.PRESENT),
        record("char-2", AttendanceStatus.ABSENT),
      ],
    });

    expect(result.current.pool.map((c) => c.id)).toEqual(["char-1"]);
  });

  it("người đã xếp vào ô thì rời pool", () => {
    const { result } = renderPool({
      assignment: { [SLOT]: "char-1" },
      matches: [{ assignment: { [SLOT]: "char-1" }, notes: {} }],
    });

    expect(result.current.pool.map((c) => c.id)).toEqual(["char-2", "char-3"]);
  });

  it("bộ lọc lưu phái thu hẹp pool", () => {
    const { result } = renderPool(
      {},
      { poolFilter: { guildClasses: [GuildClass.THIET_Y] } }
    );

    expect(result.current.pool.map((c) => c.id)).toEqual(["char-3"]);
  });

  it("chưa chọn ngày nào thì pool rỗng", () => {
    const { result } = renderPool({
      sessions: [],
      activeSessionId: null,
      editable: false,
    });

    expect(result.current.pool).toEqual([]);
  });

  it("charactersById tra được mọi người trong bang, kể cả người đã nghỉ", () => {
    const { result } = renderPool({ records: [] });

    expect(result.current.charactersById.get("char-1")?.name).toBe("An");
  });
});

describe("useFormationPool — người đã báo nghỉ", () => {
  it("người đã xếp rồi mới báo nghỉ vẫn đứng nguyên trong ô, chỉ bị đánh dấu", () => {
    const { result } = renderPool({
      records: [record("char-1", AttendanceStatus.ABSENT)],
      assignment: { [SLOT]: "char-1" },
      matches: [{ assignment: { [SLOT]: "char-1" }, notes: {} }],
    });

    expect(result.current.absentIds.has("char-1")).toBe(true);
    expect(result.current.pool.map((c) => c.id)).not.toContain("char-1");
  });

  it("người đã xếp và vẫn báo tham gia thì không bị đánh dấu", () => {
    const { result } = renderPool({
      assignment: { [SLOT]: "char-1" },
      matches: [{ assignment: { [SLOT]: "char-1" }, notes: {} }],
    });

    expect(result.current.absentIds.size).toBe(0);
  });
});

describe("useFormationPool — trận kia", () => {
  it("gom người đang đứng ở trận không mở", () => {
    const matches: MatchDraft[] = [
      { assignment: { [SLOT]: "char-1" }, notes: {} },
      { assignment: { [SLOT]: "char-2" }, notes: {} },
    ];

    const { result } = renderPool({
      assignment: matches[0].assignment,
      matches,
    });

    expect([...result.current.otherMatchIds]).toEqual(["char-2"]);
  });
});

describe("useFormationPool — prefill", () => {
  // Đề xuất được ghi thẳng thành nháp; ngay khi nháp tồn tại thì `prefill` trả
  // về null (đã có nháp = không đề xuất lại). Nên thứ quan sát được sau khi
  // render xong là nháp trong store, không phải giá trị trả về.
  it("ngày chưa xếp gì nhận đội hình của ngày trước làm nháp", () => {
    renderPool({ sessions: SESSIONS_WITH_SOURCE });

    const draft = useFormationStore.getState().drafts[SESSION_ID];

    expect(draft).toHaveLength(1);
    expect(draft[0].assignment[SLOT]).toBe("char-1");
    expect(draft[0].notes[SLOT]).toBe("giữ buồng");
  });

  it("bỏ người không tham gia ngày này khỏi nháp, ghi chú vẫn giữ", () => {
    renderPool({
      sessions: SESSIONS_WITH_SOURCE,
      records: [record("char-1", AttendanceStatus.ABSENT)],
    });

    const draft = useFormationStore.getState().drafts[SESSION_ID];

    expect(draft[0].assignment[SLOT]).toBeNull();
    expect(draft[0].notes[SLOT]).toBe("giữ buồng");
  });

  it("ngày đã khoá thì không đề xuất và không tạo nháp", () => {
    const { result } = renderPool({
      sessions: SESSIONS_WITH_SOURCE,
      editable: false,
    });

    expect(result.current.prefill).toBeNull();
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });

  it("ngày đã có nháp thì không đề xuất lại — xoá đề xuất là xoá hẳn", () => {
    const emptyDraft = [{ assignment: {}, notes: {} }];

    const { result } = renderPool(
      { sessions: SESSIONS_WITH_SOURCE },
      { formation: { drafts: { [SESSION_ID]: emptyDraft } } }
    );

    expect(result.current.prefill).toBeNull();
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBe(emptyDraft);
  });

  it("ngày đã có đội hình lưu sẵn thì không đề xuất", () => {
    const sessions = [
      SESSIONS_WITH_SOURCE[0],
      makeSession(SESSION_ID, {
        matches: [{ slots: { [SLOT]: "char-3" }, notes: {} }],
      }),
    ];

    const { result } = renderPool({
      sessions,
      assignment: { [SLOT]: "char-3" },
      matches: [{ assignment: { [SLOT]: "char-3" }, notes: {} }],
    });

    expect(result.current.prefill).toBeNull();
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });

  it("không có ngày nào trước đó có đội hình thì không đề xuất", () => {
    const { result } = renderPool();

    expect(result.current.prefill).toBeNull();
    expect(useFormationStore.getState().drafts[SESSION_ID]).toBeUndefined();
  });
});
