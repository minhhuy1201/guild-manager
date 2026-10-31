# 04: Trả lời khảo sát trên Discord

Spec: [`docs/specs/2026-10-31-class-change-survey.md`](../../specs/2026-10-31-class-change-survey.md)

**What to build:** Bấm "Điền khảo sát" dưới tin khảo sát mở một bảng chỉ người bấm thấy: lưu phái hiện
tại, câu đã lưu, và một menu chọn ("Giữ nguyên" + mọi phái trừ phái hiện tại). Chọn "Giữ nguyên" là lưu
ngay. Chọn một phái thì bảng viết lại tại chỗ với hai nút "Chắc chắn" / "Đang cân nhắc"; bấm một nút là lưu
và bảng hiện dòng xác nhận. Lưu đi qua cùng `ClassSurveyService.answer` của web.

**Blocked by:** 01, 03

**Status:** todo

- [ ] `custom-id.ts`: id menu chọn (mang id đợt) và id nút mức độ (mang id đợt + phái + mức độ), encode +
      decode; id lạ hoặc của bản build cũ ra thông báo rõ, không crash. `custom-id.spec.ts` phủ round trip.
- [ ] Schema interaction nhận component string select (giá trị chọn trong `data.values`); router thêm nhánh
      cho nó, switch kết thúc bằng `assertNever`.
- [ ] Nút "Điền khảo sát" thay câu "sắp có" của ticket 01 bằng bảng thật. Bảng viết lại tại chỗ
      (update message) như bảng Tự động điểm danh.
- [ ] Danh tính qua `ActorResolver`; tài khoản chưa liên kết, đợt đã đóng, đợt không tồn tại, chọn trùng phái
      đều ra tin ephemeral rõ ràng (lấy thông báo từ service).
- [ ] Test qua `interaction-router.spec.ts`: mở bảng, giữ nguyên lưu ngay, chọn phái rồi chọn mức độ, đợt đã
      đóng, chưa liên kết.
- [ ] `docs/architecture.md` §3.3 (dòng `discord-bot` và sơ đồ luồng bot) nhắc menu chọn khảo sát.
