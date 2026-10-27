# 01: Bật/tắt qua API và lưới hiện "Có · Tự động"

Spec: [`docs/specs/2026-10-27-auto-attend.md`](../../specs/2026-10-27-auto-attend.md)

**What to build:** Thành viên bật/tắt Tự động điểm danh qua API cho nhân vật của mình. Khi bật, mọi
trận còn mở hiện "Có" với `source: 'auto'` ở mọi nơi đọc câu trả lời hiệu lực: lưới điểm danh trên
web hiện `Có · Tự động`, tally đếm nó, bot không nhắc người đó, pool xếp team có họ, Lịch sử và bảng
`/diem-danh` hiện "Có". Chưa có switch trên web hay nút Discord (ticket 02, 03); demo bằng cách gọi
`PUT /auto-attend/me` rồi mở web.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Bảng `AutoAttendPeriod` (`id`, `characterId` cascade, `enabledAt` không default, `disabledAt?`,
      index `characterId`) có migration tạo bằng `prisma:migrate`, bật RLS; `migration-rls.spec.ts` xanh.
- [x] Luật phủ là hàm thuần riêng: phủ khi `enabledAt < closeAt` và (`disabledAt` null hoặc
      `disabledAt >= closeAt`), `closeAt` qua `closingMoment`. Bảng test: bật trước/sau `closeAt`, tắt
      trước/sau `closeAt`, `attendanceClosedAt` vs `deadline`, bật-tắt-bật lại chỉ phủ ngày của từng lần.
- [x] Ghép câu trả lời hiệu lực theo thứ tự record > nghỉ phép > tự động; ô tự động có
      `isPresent: true`, `reason: null`, `markedAt = enabledAt`. Test: "Không" bấm trước khi bật vẫn
      thắng; ngày nghỉ phép vẫn "Không"; hủy nghỉ thì ngày còn mở về "Có".
- [x] `attendanceSourceSchema` có `'auto'`; `setAutoAttendSchema` và `autoAttendStatusSchema` trong
      `packages/shared`.
- [x] `AutoAttendService` (export qua `attendance.public.ts`): bật/tắt trong transaction sau khoá
      advisory theo nhân vật; idempotent; tối đa một lần bật đang chạy; trả trạng thái. Không có nhân
      vật → 404 `Không tìm thấy thành viên.`.
- [x] `GET /auto-attend/me` và `PUT /auto-attend/me` (`{ enabled }`), Bearer, response qua
      `verifyResponse`. Test controller theo mẫu `leave.controller.spec.ts`.
- [x] `getRecords` / `getSummary` trả và đếm ô `auto`; `ReminderService` không nhắc người đang bật.
- [x] Tắt không gỡ ai khỏi đội hình.
- [x] Mọi `switch` trên `source` ở web và bot xử lý `'auto'` và vẫn kết thúc bằng `assertNever`. Ô
      `auto` trên lưới hiện icon "Có" kèm nhãn `Có · Tự động` (tạm dùng icon "Có" hiện có; icon riêng
      do ticket 02 thiết kế). Test theo mẫu `attendance-row.test.tsx`.
- [x] `docs/architecture.md`: bảng module `attendance`, bảng endpoint, §5 model `AutoAttendPeriod` và
      giá trị `source` mới, §6 luật phủ; comment trên model trong `schema.prisma`.
- [x] `pnpm --filter api` và `pnpm --filter web` test, typecheck, lint xanh; `@guild/shared` build.
