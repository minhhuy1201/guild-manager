# 03: Nút "🔁 Tự động điểm danh" trên Discord

Spec: [`docs/specs/2026-10-27-auto-attend.md`](../../specs/2026-10-27-auto-attend.md)

**What to build:** Dưới tin `/thong-bao` và tin nhắc điểm danh có thêm nút `🔁 Tự động điểm danh`. Bấm
vào, bot trả một tin chỉ người bấm thấy, cho biết trạng thái hiện tại và một nút để đổi: đang tắt thì
có cảnh báo và nút `Bật`, đang bật thì có ngày bật và nút `Tắt`. Bấm nút đó thì tin cập nhật tại chỗ
sang trạng thái mới.

**Blocked by:** 01 (Bật/tắt qua API và lưới hiện "Có · Tự động")

**Status:** done

- [x] `buildEntryButtons` có nút thứ tư `🔁 Tự động điểm danh` (secondary), custom_id cố định
      `ann:tu-dong`; cả `/thong-bao` lẫn tin nhắc nhận nút. Test theo mẫu `entry-buttons.spec.ts`.
- [x] custom_id `ann:tu-dong`, `auto:bat`, `auto:tat` khai báo cùng chỗ với các id hiện có; id lạ hoặc
      cũ nhận message rõ ràng, không crash.
- [x] Bấm `ann:tu-dong` → response ephemeral. Đang tắt: "Mọi trận đánh trong tương lai sẽ được tự động
      điểm danh **CÓ** cho bạn. Lưu ý: trận nào bận thì vào đổi thành **KHÔNG** trước hạn chót, hoặc
      dùng Xin nghỉ." + nút `Bật` (`auto:bat`). Đang bật: "Bạn đang bật tự động điểm danh từ dd/mm." +
      nút `Tắt` (`auto:tat`).
- [x] Bấm `auto:bat` / `auto:tat` → gọi `AutoAttendService` qua `deps`, trả response type 7 (update
      message) với trạng thái mới và nút ngược lại. Bấm lại nút cũ hiện trạng thái thật (idempotent).
- [x] Danh tính lấy từ payload đã ký, không từ custom_id. Người bấm không có nhân vật → cùng message
      `ActorResolver` dùng cho `/diem-danh`.
- [x] Trả lời trong 3 giây, không deferred reply.
- [x] Test theo mẫu `interaction-router.spec.ts`: mở tin đúng trạng thái, bật, tắt, bấm lặp, không
      có nhân vật.
- [x] `docs/architecture.md`: bảng module `discord-bot` và sơ đồ bot ghi nút mới.
- [x] `pnpm --filter api` test, typecheck, lint xanh. Không cần `discord:register` (nút không phải lệnh).
