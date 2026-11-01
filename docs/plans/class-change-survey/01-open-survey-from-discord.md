# 01: Mở đợt khảo sát từ Discord

Spec: [`docs/specs/2026-10-31-class-change-survey.md`](../../specs/2026-10-31-class-change-survey.md)

**What to build:** Admin (hoặc Manager được cấp quyền) gõ `/khao-sat-luu-phai mo ten:<chữ> han:<dd/mm[/yyyy]>`.
Bot tạo một đợt Khảo sát lưu phái với hạn chót 23:59:59.999 giờ VN của ngày đó, rồi đăng tin công
khai ping role bang, kèm embed (tên, hạn chót, "Sửa lại được đến hạn chót"), nút "Điền khảo sát" và nút
link tới `/luu-phai`. Nút "Điền khảo sát" tạm trả lời ephemeral "sắp có" (ticket 04 thay bằng bảng thật).
`GET /class-surveys/current` trả đợt cùng danh sách thành viên. Demo: gõ lệnh trên Discord dev, rồi gọi
endpoint.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Prisma: bảng `ClassSurvey` (`id` cuid, `title`, `closesAt`, `createdAt` không default - ghi bằng
      `Clock`, `createdById` id thuần) và `ClassSurveyAnswer` (`surveyId` + `characterId` unique, cascade
      cả hai, `fromClass`, `targetClass?`, `confidence?`, `answeredAt`); check constraint "`targetClass` và
      `confidence` cùng null hoặc cùng có"; enum `ClassChangeConfidence` (`SURE`, `CONSIDERING`); giá trị
      `KHAO_SAT_LUU_PHAI` trong `GrantableCommand`. Migration tạo bằng `prisma:migrate`, bật RLS cho hai
      bảng, `migration-rls.spec.ts` xanh. Đọc `.claude/rules/prisma.md` trước.
- [x] `packages/shared`: enum `ClassChangeConfidence` + nhãn ("Chắc chắn", "Đang cân nhắc"); nhãn
      `/khao-sat-luu-phai` cho `KHAO_SAT_LUU_PHAI`; schema đọc `classSurveyViewSchema` (đợt `id`, `title`,
      `closesAt`, `isOpen` hoặc `null`; mỗi `Character` một dòng: `id`, tên, lưu phái hiện tại, `answer`
      `null` hoặc `{ fromClass } &` union KEEP/CHANGE của spec). Màn cấp quyền Manager trên web hiện được lệnh mới.
- [x] Module `class-survey` (module + controller + service + `class-survey.public.ts`), đăng ký trong
      `app.module.ts`. `open(title, closesAt, actor)`: trong transaction, có đợt đang mở (`now < closesAt`)
      thì từ chối bằng thông báo tiếng Việt; `closesAt <= now` thì từ chối.
- [x] `GET /class-surveys/current` (Bearer): đợt mở, nếu không có thì đợt đóng gần nhất (theo `closesAt`),
      nếu không có thì `survey: null`; luôn kèm danh sách mọi `Character`. Response qua `verifyResponse`.
- [x] Lệnh `/khao-sat-luu-phai` với subcommand `mo` (một file trong `commands/` + một dòng trong
      `commands/index.ts`), chặn bằng `requireCommand`. Ngày đọc bằng parser ngày Nghỉ phép sẵn có; ngày sai
      hoặc đã qua có thông báo rõ. `allowed_mentions` chỉ mở role bang (giống `/thong-bao`).
- [x] `custom-id.ts`: id nút "Điền khảo sát" mang id đợt, encode + decode, `custom-id.spec.ts` phủ.
- [x] Test: service (`FixedClock`, Prisma mock, kiểu `auto-attend.service.spec.ts`) - mở được, đợt thứ hai
      bị từ chối, hạn đã qua bị từ chối, `current` chọn đúng đợt; lệnh (kiểu `thong-bao.command.spec.ts`) -
      không có quyền bị từ chối, tin có mention role và đúng hai nút.
- [x] `docs/architecture.md` §3.3 (bảng module + endpoint), §5 (hai model mới) cập nhật; thuật ngữ
      **Class survey** vào `GLOSSARY.md`.
