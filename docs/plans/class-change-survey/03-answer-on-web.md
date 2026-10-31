# 03: Trả lời khảo sát trên web

Spec: [`docs/specs/2026-10-31-class-change-survey.md`](../../specs/2026-10-31-class-change-survey.md)

**What to build:** Trên `/luu-phai`, thành viên có nhân vật chọn "Giữ nguyên" hoặc một phái khác phái hiện
tại, nếu chuyển thì chọn "Chắc chắn" / "Đang cân nhắc", rồi lưu. Form bắt đầu từ câu trả lời đã lưu, sửa
được đến hạn chót, chỉ đọc khi đợt đã đóng, ẩn với người xem không có nhân vật. Lưu xong ô số và biểu đồ
cập nhật.

**Blocked by:** 02

**Status:** todo

- [ ] Schema body trong `packages/shared` là union có discriminant (từ spec):
      `{ kind: "KEEP" } | { kind: "CHANGE"; targetClass: GuildClass; confidence: ClassChangeConfidence }`.
      Spec schema nhỏ kiểu `create-leave.schema.spec.ts`.
- [ ] `ClassSurveyService.answer(surveyId, actor, input)` (export qua `class-survey.public.ts` để Discord
      dùng ở ticket 04): upsert theo `(surveyId, characterId)`, ghi `fromClass` từ `guildClass` hiện tại và
      `answeredAt` từ `Clock`. Từ chối: đợt không tồn tại (404), đợt đã đóng (400), người gọi không có
      `Character` (404), `targetClass` trùng lưu phái hiện tại (400) - thông báo tiếng Việt.
- [ ] `PUT /class-surveys/:id/answers/me` (Bearer, chỉ chính mình). Test service + controller.
- [ ] Form: bộ chọn phái (bỏ phái hiện tại) + công tắc mức độ (khoá khi "Giữ nguyên"); mutation qua hook,
      invalidate query đọc; lỗi `ApiError` hiện nguyên thông báo; toast thành công theo quy ước sẵn có.
- [ ] Test Vitest: form điền sẵn câu đã lưu, chỉ đọc khi đóng, ẩn khi không có nhân vật, lưu gọi đúng body.
- [ ] `docs/architecture.md` bảng endpoint có `PUT`.
