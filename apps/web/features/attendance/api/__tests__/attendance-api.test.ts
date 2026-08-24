import { AttendanceStatus } from "@guild/shared/enums";
import { afterEach, describe, expect, it, vi } from "vitest";

import { recordKey } from "../../lib/record-key";

/**
 * `attendance-api.ts` là file "use server" và đọc cookie phiên qua `@/features/auth`,
 * vốn kéo theo `server-only` — không nạp được trong môi trường test. Mock lại đúng
 * hàm nó cần, và cũng nhờ đó khẳng định được mọi request đều mang Bearer token.
 */
vi.mock("@/features/auth", () => ({
  getAccessToken: () => Promise.resolve(ACCESS_TOKEN),
}));

const { fetchAttendanceRecords, markAttendance } = await import(
  "../attendance-api"
);

/**
 * Tạo fetch giả trả về một response cụ thể.
 * @param options - status và body JSON mà server "trả về"
 * @returns Hàm mock thay cho global fetch
 */
function mockFetch(options: { status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    json: () => Promise.resolve(options.body),
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

/** Access token giả mà mock của `@/features/auth` trả về. */
const ACCESS_TOKEN = "access-token-gia";

const RECORD = {
  characterId: "c1",
  sessionId: "s1",
  status: AttendanceStatus.PRESENT,
  markedAt: "2026-07-22T05:00:00.000Z",
};

describe("attendance-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("đổi mảng record của API thành map theo recordKey", async () => {
    mockFetch({
      status: 200,
      body: {
        data: [
          RECORD,
          { ...RECORD, sessionId: "s2", status: AttendanceStatus.ABSENT },
        ],
      },
    });

    const records = await fetchAttendanceRecords();

    expect(Object.keys(records)).toEqual([
      recordKey("c1", "s1"),
      recordKey("c1", "s2"),
    ]);
    expect(records[recordKey("c1", "s2")].status).toBe(AttendanceStatus.ABSENT);
  });

  it("gắn Bearer token vào mọi request đọc dữ liệu", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await fetchAttendanceRecords();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/attendance/records",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      })
    );
  });

  it("gửi đúng body khi điểm danh và trả về record vừa ghi", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: RECORD } });
    const input = {
      characterId: "c1",
      sessionId: "s1",
      status: AttendanceStatus.PRESENT,
    };

    await expect(markAttendance(input)).resolves.toEqual(RECORD);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/attendance",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        }),
      })
    );
  });

  it("giữ nguyên message khi backend từ chối vì quá hạn", async () => {
    mockFetch({
      status: 409,
      body: { statusCode: 409, message: "Đã quá hạn điểm danh ngày này." },
    });

    await expect(
      markAttendance({
        characterId: "c1",
        sessionId: "s1",
        status: AttendanceStatus.PRESENT,
      })
    ).rejects.toThrowError("Đã quá hạn điểm danh ngày này.");
  });
});
